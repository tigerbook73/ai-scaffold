import {
  cpSync,
  existsSync,
  mkdirSync,
  rmdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import { cac } from "cac";
import { addPreCommitHook, removePreCommitHook } from "./precommit-lefthook";
import type {
  UnitJson,
  InstalledComponent,
  InstalledEntry,
  InstalledJson,
  SkillSpec,
  RuleSpec,
  ScriptSpec,
  ResourceSpec,
  ComponentSpec,
  PrepareItem,
  ResolveResult,
} from "./installer-types";

export type { PrepareItem, ResolveResult };

// ─── Installer ───────────────────────────────────────────────────────────────

/**
 * Core installer that manages unit lifecycle (list, resolve, prepare, install, uninstall)
 * for a given project directory.
 */
export class Installer {
  /** Absolute path to the global aisf home directory (~/.aisf by default). */
  readonly aisfHome: string;
  /** Absolute path to the target project directory. */
  readonly cwd: string;

  /**
   * @param cwd      Project root to install units into (defaults to process.cwd()).
   * @param aisfHome Global aisf home directory (defaults to ~/.aisf).
   */
  constructor(cwd = process.cwd(), aisfHome = join(homedir(), ".aisf")) {
    this.cwd = cwd;
    this.aisfHome = aisfHome;
  }

  /** Outputs JSON listing all available units with their install status. */
  listUnits(): void {
    const units = this.getUnitList();
    process.stdout.write(JSON.stringify({ units }, null, 2) + "\n");
  }

  /**
   * Scans ~/.aisf/units/ and returns metadata for every available unit,
   * ordered by the pre-computed global order from ~/.aisf/units.json.
   *
   * @returns Array of unit descriptors in dependency-stable order.
   */
  private getUnitList(): Array<{ name: string; description: string; installed: boolean }> {
    const unitsDir = join(this.aisfHome, "units");
    if (!existsSync(unitsDir)) return [];

    const installed = this.readInstalled();
    const globalOrder = this.readGlobalOrder();
    const names =
      globalOrder.length > 0
        ? globalOrder.filter((n) => existsSync(join(unitsDir, n, "unit.json")))
        : readdirSync(unitsDir)
            .filter((n) => existsSync(join(unitsDir, n, "unit.json")))
            .sort();

    return names
      .map((dir) => {
        const unitJson = this.readUnitJson(dir);
        if (!unitJson) return null;
        return {
          name: dir,
          description: unitJson.description ?? "",
          installed: dir in installed.units,
        };
      })
      .filter((u): u is NonNullable<typeof u> => u !== null);
  }

  /**
   * Computes the full changeset for the given desired state and outputs it as JSON.
   * The desired state is the complete list of unit names the user wants installed.
   *
   * @param selectedNames Full list of unit names in the desired installed state.
   */
  checkDeps(selectedNames: string[]): void {
    const result = this.resolveDeps(selectedNames);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  }

  /**
   * Computes the full changeset by comparing the desired state against the current
   * installed state. Resolves transitive dependencies automatically.
   *
   * @param selectedNames Full desired state — the unit names the user wants installed.
   * @returns Complete changeset including to_remove, to_install, to_update, order, and auto.
   */
  private resolveDeps(selectedNames: string[]): ResolveResult {
    const installed = this.readInstalled();
    const installedNames = new Set(Object.keys(installed.units));
    const selectedSet = new Set(selectedNames);

    // Expand selected units with all their transitive dependencies
    const fullRequired = new Set<string>(selectedNames);
    const auto = new Set<string>();

    const resolveTransitive = (names: string[]) => {
      for (const name of names) {
        const unitJson = this.readUnitJson(name);
        if (!unitJson) {
          console.error(`Error: unit "${name}" not found in ~/.aisf/units/`);
          process.exit(1);
        }
        for (const dep of unitJson.dependencies) {
          if (!fullRequired.has(dep)) {
            fullRequired.add(dep);
            if (!selectedSet.has(dep)) auto.add(dep);
            resolveTransitive([dep]);
          }
        }
      }
    };

    resolveTransitive(selectedNames);

    const to_remove = this.sortByGlobalOrder(
      [...installedNames].filter((n) => !fullRequired.has(n)),
    );
    const to_install = this.sortByGlobalOrder(
      [...fullRequired].filter((n) => !installedNames.has(n)),
    );
    const to_update = this.sortByGlobalOrder(selectedNames.filter((n) => installedNames.has(n)));
    const order = this.sortByGlobalOrder([...to_install, ...to_update]);

    return { to_remove, to_install, to_update, order, auto: this.sortByGlobalOrder([...auto]) };
  }

  /**
   * Sorts the given unit names by the pre-computed global order from ~/.aisf/units.json.
   * Units not present in the order file are appended sorted lexicographically.
   *
   * @param names Unit names to sort.
   * @returns Sorted copy of the input array.
   */
  private sortByGlobalOrder(names: string[]): string[] {
    const order = this.readGlobalOrder();
    const index = new Map(order.map((n, i) => [n, i]));
    return [...names].sort((a, b) => {
      const ai = index.get(a) ?? Infinity;
      const bi = index.get(b) ?? Infinity;
      return ai !== bi ? ai - bi : a.localeCompare(b);
    });
  }

  /**
   * Reads the pre-computed global unit order from ~/.aisf/units.json.
   * Falls back to an empty array (callers handle the missing-order case via localeCompare).
   */
  private readGlobalOrder(): string[] {
    const orderPath = join(this.aisfHome, "units.json");
    if (!existsSync(orderPath)) return [];
    return JSON.parse(readFileSync(orderPath, "utf8")) as string[];
  }

  /**
   * Returns info for all hasCustom components that will be installed so the AI can
   * generate their content into temp files before calling install.
   * Only includes optional components (those with a condition) if they appear in optionalNames.
   * Also cleans up any orphaned .aisf-tmp-* files from previous interrupted runs.
   *
   * @param unitName      Name of the unit to prepare.
   * @param optionalNames Typed component names the user selected, e.g. ["rule:poc-rule"].
   */
  prepare(unitName: string, optionalNames: string[] = []): void {
    this.cleanOrphanTempFiles();

    const unitJson = this.readUnitJson(unitName);
    if (!unitJson) {
      console.error(`Error: unit "${unitName}" not found in ~/.aisf/units/`);
      process.exit(1);
    }

    const items = this.buildPrepareItems(unitName, unitJson, optionalNames);
    process.stdout.write(JSON.stringify(items, null, 2) + "\n");
  }

  /**
   * Builds the PrepareItem list for all hasCustom components in the given unit.
   * Looks up previously installed paths from installed.json to populate `currentPath`.
   *
   * @param unitName      Name of the unit being prepared.
   * @param unitJson      Parsed unit.json for the unit.
   * @param optionalNames Typed component names the user selected.
   * @returns Array of items describing each hasCustom component that needs AI-generated content.
   */
  private buildPrepareItems(
    unitName: string,
    unitJson: UnitJson,
    optionalNames: string[],
  ): PrepareItem[] {
    const entry = this.readInstalled().units[unitName];
    const items: PrepareItem[] = [];

    for (const comp of unitJson.components.skills ?? []) {
      if (!comp.hasCustom) continue;
      if (comp.condition && !optionalNames.includes(`skill:${comp.name}`)) continue;
      const templatePath = join(this.aisfHome, "units", unitName, comp.file);
      const targetPath = join(
        this.cwd,
        ".claude",
        "skills",
        `aisf-${unitName}-${comp.name}`,
        "SKILL.md",
      );
      const tempPath = this.makeTempPath(targetPath, unitName, comp.name);
      mkdirSync(dirname(targetPath), { recursive: true });
      const currentPath = entry?.components.skills.find((c) => c.name === comp.name)?.path;
      items.push({
        componentType: "skill",
        templatePath,
        targetPath,
        currentPath,
        tempPath,
        exists: existsSync(targetPath),
      });
    }

    for (const comp of unitJson.components.rules ?? []) {
      if (!comp.hasCustom) continue;
      if (comp.condition && !optionalNames.includes(`rule:${comp.name}`)) continue;
      const templatePath = join(this.aisfHome, "units", unitName, comp.file);
      const targetPath = join(this.cwd, ".claude", "rules", `aisf-${unitName}`, `${comp.name}.md`);
      const tempPath = this.makeTempPath(targetPath, unitName, comp.name);
      mkdirSync(dirname(targetPath), { recursive: true });
      const currentPath = entry?.components.rules.find((c) => c.name === comp.name)?.path;
      items.push({
        componentType: "rule",
        templatePath,
        targetPath,
        currentPath,
        tempPath,
        exists: existsSync(targetPath),
      });
    }

    for (const comp of unitJson.components.resources ?? []) {
      if (!comp.hasCustom) continue;
      if (comp.condition && !optionalNames.includes(`resource:${comp.name}`)) continue;
      const templatePath = join(this.aisfHome, "units", unitName, comp.file);
      const targetPath = join(this.cwd, ".aisf", unitName, comp.file);
      const tempPath = this.makeTempPath(targetPath, unitName, comp.name);
      mkdirSync(dirname(targetPath), { recursive: true });
      const currentPath = entry?.components.resources.find((c) => c.name === comp.name)?.path;
      items.push({
        componentType: "resource",
        templatePath,
        targetPath,
        currentPath,
        tempPath,
        exists: existsSync(targetPath),
      });
    }

    return items;
  }

  /**
   * Builds the staging temp-file path for a hasCustom component.
   *
   * @param targetPath Final destination path of the component file.
   * @param unitName   Name of the owning unit.
   * @param compName   Component name within the unit.
   * @returns Absolute path to the temporary staging file.
   */
  private makeTempPath(targetPath: string, unitName: string, compName: string): string {
    return join(dirname(targetPath), `.aisf-tmp-${unitName}-${compName}`);
  }

  /** Removes any .aisf-tmp-* staging files left behind by interrupted install runs. */
  private cleanOrphanTempFiles(): void {
    for (const dir of [join(this.cwd, ".claude"), join(this.cwd, ".aisf")]) {
      if (existsSync(dir)) this.removeTempFilesIn(dir);
    }
  }

  /**
   * Recursively walks `dir` and deletes any file whose name starts with ".aisf-tmp-".
   *
   * @param dir Absolute path to the directory to scan.
   */
  private removeTempFilesIn(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        this.removeTempFilesIn(fullPath);
      } else if (entry.name.startsWith(".aisf-tmp-")) {
        rmSync(fullPath);
      }
    }
  }

  /**
   * Uninstalls all components for a unit and removes its entry from installed.json.
   *
   * @param unitName Name of the unit to uninstall.
   */
  uninstall(unitName: string): void {
    const installed = this.readInstalled();
    const entry = installed.units[unitName];
    if (!entry) {
      console.error(`Error: unit "${unitName}" is not installed`);
      process.exit(1);
    }

    for (const comp of [
      ...entry.components.skills,
      ...entry.components.rules,
      ...entry.components.resources,
    ]) {
      const fullPath = join(this.cwd, comp.path);
      if (existsSync(fullPath)) {
        rmSync(fullPath);
        this.tryRemoveEmptyDir(fullPath);
      }
    }

    for (const comp of entry.components.scripts) {
      removePreCommitHook(this.cwd, `aisf-${unitName}-${comp.name}`);
      const fullPath = join(this.cwd, comp.path);
      if (existsSync(fullPath)) {
        rmSync(fullPath);
        this.tryRemoveEmptyDir(fullPath);
      }
    }

    delete installed.units[unitName];
    writeFileSync(
      join(this.cwd, ".aisf", "installed.json"),
      JSON.stringify(installed, null, 2) + "\n",
    );
    console.log(`Uninstalled: ${unitName}`);
  }

  /**
   * Installs a unit by reading its component list from unit.json.
   * Required components (no condition) are always installed.
   * Optional components (have a condition) are installed only if their typed name
   * appears in optionalNames, e.g. ["rule:poc-rule", "resource:config"].
   * Previously installed components that are no longer selected are removed.
   *
   * @param unitName      Name of the unit to install.
   * @param optionalNames Typed component names the user selected for this install.
   */
  install(unitName: string, optionalNames: string[]): void {
    const unitJson = this.readUnitJson(unitName);
    if (!unitJson) {
      console.error(`Error: unit "${unitName}" not found in ~/.aisf/units/`);
      process.exit(1);
    }

    const specs = this.resolveComponents(unitJson, optionalNames);
    this.removeOrphans(unitName, unitJson, optionalNames);

    const installedComps: InstalledEntry["components"] = {
      skills: [],
      rules: [],
      scripts: [],
      resources: [],
    };

    for (const spec of specs) {
      switch (spec.type) {
        case "skill":
          installedComps.skills.push(this.installSkill(unitName, spec));
          break;
        case "rule":
          installedComps.rules.push(this.installRule(unitName, spec));
          break;
        case "script":
          installedComps.scripts.push(this.installScript(unitName, spec));
          break;
        case "resource":
          installedComps.resources.push(this.installResource(unitName, spec));
          break;
      }
    }

    this.updateInstalled(unitName, installedComps);
    this.ensureGitignores();
    console.log(`Installed: ${unitName}`);
  }

  /**
   * Builds the list of ComponentSpecs to install based on unit.json and the selected optionals.
   *
   * @param unitJson      Parsed unit.json for the unit being installed.
   * @param optionalNames Typed component names the user selected (e.g. ["rule:poc-rule"]).
   * @returns Flat list of resolved component specs to pass to the individual install methods.
   */
  private resolveComponents(unitJson: UnitJson, optionalNames: string[]): ComponentSpec[] {
    const specs: ComponentSpec[] = [];

    for (const comp of unitJson.components.skills ?? []) {
      if (!comp.condition || optionalNames.includes(`skill:${comp.name}`)) {
        specs.push({ type: "skill", name: comp.name, file: comp.file, hasCustom: comp.hasCustom });
      }
    }
    for (const comp of unitJson.components.rules ?? []) {
      if (!comp.condition || optionalNames.includes(`rule:${comp.name}`)) {
        specs.push({ type: "rule", name: comp.name, file: comp.file, hasCustom: comp.hasCustom });
      }
    }
    for (const comp of unitJson.components.scripts ?? []) {
      specs.push({
        type: "script",
        name: comp.name,
        file: comp.file,
        hook: comp.hook,
        params: comp.params,
      });
    }
    for (const comp of unitJson.components.resources ?? []) {
      if (!comp.condition || optionalNames.includes(`resource:${comp.name}`)) {
        specs.push({
          type: "resource",
          name: comp.name,
          file: comp.file,
          hasCustom: comp.hasCustom,
        });
      }
    }

    return specs;
  }

  /**
   * Removes components that were previously installed but are no longer in scope —
   * either because they were removed from unit.json or because an optional was deselected.
   * Matches by component name so that path changes (renames) are correctly detected.
   *
   * @param unitName      Name of the unit being re-installed.
   * @param unitJson      Current unit.json content (defines the new desired state).
   * @param optionalNames Optional component names selected for this install run.
   */
  private removeOrphans(unitName: string, unitJson: UnitJson, optionalNames: string[]): void {
    const installed = this.readInstalled();
    const entry = installed.units[unitName];
    if (!entry) return;

    const newSkillNames = new Set(
      (unitJson.components.skills ?? [])
        .filter((c) => !c.condition || optionalNames.includes(`skill:${c.name}`))
        .map((c) => c.name),
    );
    const newRuleNames = new Set(
      (unitJson.components.rules ?? [])
        .filter((c) => !c.condition || optionalNames.includes(`rule:${c.name}`))
        .map((c) => c.name),
    );
    const newResourceNames = new Set(
      (unitJson.components.resources ?? [])
        .filter((c) => !c.condition || optionalNames.includes(`resource:${c.name}`))
        .map((c) => c.name),
    );
    const newScriptNames = new Set((unitJson.components.scripts ?? []).map((c) => c.name));

    for (const comp of entry.components.skills) {
      if (!newSkillNames.has(comp.name)) {
        const fullPath = join(this.cwd, comp.path);
        if (existsSync(fullPath)) {
          rmSync(fullPath);
          this.tryRemoveEmptyDir(fullPath);
        }
      }
    }
    for (const comp of entry.components.rules) {
      if (!newRuleNames.has(comp.name)) {
        const fullPath = join(this.cwd, comp.path);
        if (existsSync(fullPath)) {
          rmSync(fullPath);
          this.tryRemoveEmptyDir(fullPath);
        }
      }
    }
    for (const comp of entry.components.resources) {
      if (!newResourceNames.has(comp.name)) {
        const fullPath = join(this.cwd, comp.path);
        if (existsSync(fullPath)) {
          rmSync(fullPath);
          this.tryRemoveEmptyDir(fullPath);
        }
      }
    }
    for (const comp of entry.components.scripts) {
      if (!newScriptNames.has(comp.name)) {
        removePreCommitHook(this.cwd, `aisf-${unitName}-${comp.name}`);
        const fullPath = join(this.cwd, comp.path);
        if (existsSync(fullPath)) {
          rmSync(fullPath);
          this.tryRemoveEmptyDir(fullPath);
        }
      }
    }
  }

  /**
   * Removes the parent directory of `fullPath` if it is now empty.
   * Silently ignores errors (e.g. non-empty dirs, permission issues).
   *
   * @param fullPath Absolute path to the file that was just deleted.
   */
  private tryRemoveEmptyDir(fullPath: string): void {
    const parentDir = dirname(fullPath);
    try {
      if (readdirSync(parentDir).length === 0) rmdirSync(parentDir);
    } catch {
      /* ignore */
    }
  }

  /**
   * Copies a skill component into .claude/skills/aisf-{unit}-{name}/SKILL.md.
   * For hasCustom skills, reads content from the AI-written temp file instead of the template.
   *
   * @param unitName Name of the owning unit.
   * @param spec     Resolved skill spec from unit.json.
   * @returns Installed component record with name and project-relative path.
   */
  private installSkill(unitName: string, spec: SkillSpec): InstalledComponent {
    const destDir = join(this.cwd, ".claude", "skills", `aisf-${unitName}-${spec.name}`);
    mkdirSync(destDir, { recursive: true });
    const destFile = join(destDir, "SKILL.md");

    if (spec.hasCustom) {
      const tempPath = this.makeTempPath(destFile, unitName, spec.name);
      if (!existsSync(tempPath)) {
        console.error(
          `Error: temp file not found for skill "${spec.name}" — run prepare first: ${tempPath}`,
        );
        process.exit(1);
      }
      cpSync(tempPath, destFile);
      rmSync(tempPath);
    } else {
      const src = join(this.aisfHome, "units", unitName, spec.file);
      if (!existsSync(src)) {
        console.error(`Error: skill file not found: ${src}`);
        process.exit(1);
      }
      cpSync(src, destFile);
    }

    return {
      name: spec.name,
      path: join(".claude", "skills", `aisf-${unitName}-${spec.name}`, "SKILL.md"),
    };
  }

  /**
   * Copies a rule component into .claude/rules/aisf-{unit}/{name}.md.
   * For hasCustom rules, reads content from the AI-written temp file instead of the template.
   *
   * @param unitName Name of the owning unit.
   * @param spec     Resolved rule spec from unit.json.
   * @returns Installed component record with name and project-relative path.
   */
  private installRule(unitName: string, spec: RuleSpec): InstalledComponent {
    const destDir = join(this.cwd, ".claude", "rules", `aisf-${unitName}`);
    mkdirSync(destDir, { recursive: true });
    const destFile = join(destDir, `${spec.name}.md`);

    if (spec.hasCustom) {
      const tempPath = this.makeTempPath(destFile, unitName, spec.name);
      if (!existsSync(tempPath)) {
        console.error(
          `Error: temp file not found for rule "${spec.name}" — run prepare first: ${tempPath}`,
        );
        process.exit(1);
      }
      cpSync(tempPath, destFile);
      rmSync(tempPath);
    } else {
      const templatePath = join(this.aisfHome, "units", unitName, spec.file);
      if (!existsSync(templatePath)) {
        console.error(`Error: rule template not found: ${templatePath}`);
        process.exit(1);
      }
      cpSync(templatePath, destFile);
    }

    return {
      name: spec.name,
      path: join(".claude", "rules", `aisf-${unitName}`, `${spec.name}.md`),
    };
  }

  /**
   * Copies a compiled script into .aisf/{unit}/scripts/{name}.js and registers
   * it as a lefthook pre-commit hook with the specified params as template args.
   *
   * @param unitName Name of the owning unit.
   * @param spec     Resolved script spec from unit.json.
   * @returns Installed component record with name and project-relative path.
   */
  private installScript(unitName: string, spec: ScriptSpec): InstalledComponent {
    const srcJs = join(this.aisfHome, "units", unitName, "scripts", `${spec.name}.js`);
    if (!existsSync(srcJs)) {
      console.error(`Error: compiled script not found: ${srcJs}`);
      process.exit(1);
    }
    const destDir = join(this.cwd, ".aisf", unitName, "scripts");
    mkdirSync(destDir, { recursive: true });
    const destFile = join(destDir, `${spec.name}.js`);
    cpSync(srcJs, destFile);
    const relPath = join(".aisf", unitName, "scripts", `${spec.name}.js`);
    const paramStr = (spec.params ?? []).map((p) => `{${p}}`).join(" ");
    const runCmd = paramStr ? `node ${relPath} ${paramStr}` : `node ${relPath}`;
    addPreCommitHook(this.cwd, `aisf-${unitName}-${spec.name}`, runCmd);
    return { name: spec.name, path: relPath };
  }

  /**
   * Copies a resource file into .aisf/{unit}/{spec.file}.
   * For hasCustom resources, reads content from the AI-written temp file instead of the source.
   *
   * @param unitName Name of the owning unit.
   * @param spec     Resolved resource spec from unit.json.
   * @returns Installed component record with name and project-relative path.
   */
  private installResource(unitName: string, spec: ResourceSpec): InstalledComponent {
    const destFile = join(this.cwd, ".aisf", unitName, spec.file);
    mkdirSync(dirname(destFile), { recursive: true });

    if (spec.hasCustom) {
      const tempPath = this.makeTempPath(destFile, unitName, spec.name);
      if (!existsSync(tempPath)) {
        console.error(
          `Error: temp file not found for resource "${spec.name}" — run prepare first: ${tempPath}`,
        );
        process.exit(1);
      }
      cpSync(tempPath, destFile);
      rmSync(tempPath);
    } else {
      const srcFile = join(this.aisfHome, "units", unitName, spec.file);
      if (!existsSync(srcFile)) {
        console.error(`Error: resource file not found: ${srcFile}`);
        process.exit(1);
      }
      cpSync(srcFile, destFile);
    }

    return { name: spec.name, path: join(".aisf", unitName, spec.file) };
  }

  /**
   * Creates .gitignore files inside .aisf/ and .claude/ to prevent aisf-managed
   * files from being accidentally committed to the project repository.
   */
  private ensureGitignores(): void {
    const entries: Array<{ dir: string; content: string }> = [
      { dir: join(this.cwd, ".aisf"), content: "*\n" },
      { dir: join(this.cwd, ".claude"), content: "skills/aisf-*/\nrules/aisf-*/\n" },
    ];
    for (const { dir, content } of entries) {
      mkdirSync(dir, { recursive: true });
      const gitignorePath = join(dir, ".gitignore");
      if (!existsSync(gitignorePath)) {
        writeFileSync(gitignorePath, content);
      }
    }
  }

  /**
   * Reads and parses .aisf/installed.json from the project directory.
   * Returns an empty record if the file does not exist.
   */
  readInstalled(): InstalledJson {
    const installedPath = join(this.cwd, ".aisf", "installed.json");
    if (!existsSync(installedPath)) return { units: {} };
    return JSON.parse(readFileSync(installedPath, "utf8")) as InstalledJson;
  }

  /**
   * Writes the updated installation record for a unit into .aisf/installed.json.
   *
   * @param unitName   Name of the unit that was just installed.
   * @param components Installed component records grouped by component type.
   */
  private updateInstalled(unitName: string, components: InstalledEntry["components"]): void {
    const installedPath = join(this.cwd, ".aisf", "installed.json");
    mkdirSync(join(this.cwd, ".aisf"), { recursive: true });
    const data = this.readInstalled();
    data.units[unitName] = { installedAt: new Date().toISOString(), components };
    writeFileSync(installedPath, JSON.stringify(data, null, 2) + "\n");
  }

  /**
   * Reads and parses the unit.json manifest for the given unit from ~/.aisf/units/.
   *
   * @param unitName Name of the unit whose manifest to load.
   * @returns Parsed UnitJson, or null if the file does not exist.
   */
  private readUnitJson(unitName: string): UnitJson | null {
    const unitJsonPath = join(this.aisfHome, "units", unitName, "unit.json");
    if (!existsSync(unitJsonPath)) return null;
    return JSON.parse(readFileSync(unitJsonPath, "utf8")) as UnitJson;
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const cli = cac("installer");

  cli
    .command("list", "List all available units with install status")
    .action(() => new Installer().listUnits());

  cli
    .command(
      "resolve [...units]",
      "Resolve transitive deps and output install order; no args means uninstall all",
    )
    .action((units: string[]) => new Installer().checkDeps(units ?? []));

  cli
    .command("prepare <unit>", "Return hasCustom component info and pre-create target dirs")
    .option("--optional <json>", "JSON array of selected optional component names")
    .action((unit: string, options: { optional?: string }) => {
      const optionalNames = parseOptional(options.optional);
      new Installer().prepare(unit, optionalNames);
    });

  cli
    .command("uninstall <unit>", "Uninstall a unit from the current project")
    .action((unit: string) => new Installer().uninstall(unit));

  cli
    .command("install <unit>", "Install a unit into the current project")
    .option(
      "--optional <json>",
      'JSON array of selected optional component names, e.g. ["rule:poc-rule"]',
    )
    .action((unit: string, options: { optional?: string }) => {
      const optionalNames = parseOptional(options.optional);
      new Installer().install(unit, optionalNames);
    });

  cli.help();
  cli.parse();
}

/**
 * Parses the raw `--optional` CLI argument into a string array.
 * Exits with an error if the value is not valid JSON.
 *
 * @param raw Raw string value from the --optional flag, or undefined if not provided.
 * @returns Parsed array of optional component names, or an empty array.
 */
function parseOptional(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    console.error("Error: --optional must be a valid JSON array");
    process.exit(1);
  }
}
