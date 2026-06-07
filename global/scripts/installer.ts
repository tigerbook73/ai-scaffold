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
import { basename, dirname, join } from "path";
import { homedir } from "os";
import { cac } from "cac";
import { addPreCommitHook, removePreCommitHook } from "./precommit-lefthook";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UnitJson {
  name: string;
  description?: string;
  dependencies: string[];
  components: {
    skills?: Array<{ name: string; file: string; hasCustom?: boolean; condition?: string }>;
    rules?: Array<{ name: string; file: string; condition?: string; hasCustom?: boolean }>;
    scripts?: Array<{ name: string; file: string; hook: string; params?: string[] }>;
    resources?: Array<{ name: string; file: string; hasCustom?: boolean; condition?: string }>;
  };
}

interface InstalledEntry {
  installedAt: string;
  components: {
    skills: string[];
    rules: string[];
    scripts: string[];
    resources: string[];
  };
  /** Optional component names that were selected at install time, e.g. ["rule:poc-rule"] */
  optionalComponents: string[];
}

interface InstalledJson {
  units: Record<string, InstalledEntry>;
}

// Internal component specs derived from unit.json — not passed by callers
interface SkillSpec {
  type: "skill";
  name: string;
  file: string;
  hasCustom?: boolean;
}

interface RuleSpec {
  type: "rule";
  name: string;
  file: string;
  hasCustom?: boolean;
}

interface ScriptSpec {
  type: "script";
  name: string;
  file: string;
  hook: string;
  /** lefthook template variables to append as CLI args, e.g. ["staged_files"] → {staged_files} */
  params?: string[];
}

interface ResourceSpec {
  type: "resource";
  name: string;
  file: string;
  hasCustom?: boolean;
}

type ComponentSpec = SkillSpec | RuleSpec | ScriptSpec | ResourceSpec;

export interface PrepareItem {
  componentType: "skill" | "rule" | "resource";
  templatePath: string;
  targetPath: string;
  tempPath: string;
  exists: boolean;
}

// ─── Installer ───────────────────────────────────────────────────────────────

export class Installer {
  readonly aisfHome: string;
  readonly cwd: string;

  constructor(cwd = process.cwd(), aisfHome = join(homedir(), ".aisf")) {
    this.cwd = cwd;
    this.aisfHome = aisfHome;
  }

  /**
   * Outputs JSON listing all available units with their install status.
   * Exits with an error if ~/.aisf/config.json does not exist.
   */
  listUnits(): void {
    const configPath = join(this.aisfHome, "config.json");
    if (!existsSync(configPath)) {
      console.error(
        "错误：本地仓库未找到（~/.aisf/config.json 不存在）。\n请在开发仓库运行 pnpm pub 后再试。",
      );
      process.exit(1);
    }

    const unitsDir = join(this.aisfHome, "units");
    if (!existsSync(unitsDir)) {
      process.stdout.write(JSON.stringify({ units: [] }, null, 2) + "\n");
      return;
    }

    const installed = this.readInstalled();
    const units = readdirSync(unitsDir)
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

    process.stdout.write(JSON.stringify({ units }, null, 2) + "\n");
  }

  /**
   * Resolves all transitive unmet dependencies for the given unit names and outputs
   * the full install order (topologically sorted) plus which units were auto-added.
   */
  checkDeps(unitNames: string[]): void {
    const installed = this.readInstalled();
    const toInstall = new Set<string>(unitNames);
    const auto = new Set<string>();

    const resolve = (names: string[]) => {
      for (const name of names) {
        const unitJson = this.readUnitJson(name);
        if (!unitJson) {
          console.error(`Error: unit "${name}" not found in ~/.aisf/units/`);
          process.exit(1);
        }
        for (const dep of unitJson.dependencies) {
          if (!installed.units[dep] && !toInstall.has(dep)) {
            toInstall.add(dep);
            if (!unitNames.includes(dep)) auto.add(dep);
            resolve([dep]);
          }
        }
      }
    };

    resolve(unitNames);

    const order = this.topoSort([...toInstall]);
    process.stdout.write(JSON.stringify({ order, auto: [...auto] }, null, 2) + "\n");
  }

  private topoSort(unitNames: string[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);
      const unitJson = this.readUnitJson(name);
      if (unitJson) {
        for (const dep of unitJson.dependencies) {
          if (unitNames.includes(dep)) visit(dep);
        }
      }
      result.push(name);
    };

    for (const name of unitNames) visit(name);
    return result;
  }

  /**
   * Returns info for all hasCustom components that will be installed so the AI can
   * generate their content into temp files before calling install.
   * Only includes optional components (those with a condition) if they appear in optionalNames.
   * Also cleans up any orphaned .aisf-tmp-* files from previous interrupted runs.
   */
  prepare(unitName: string, optionalNames: string[] = []): void {
    this.cleanOrphanTempFiles();

    const unitJson = this.readUnitJson(unitName);
    if (!unitJson) {
      console.error(`Error: unit "${unitName}" not found in ~/.aisf/units/`);
      process.exit(1);
    }

    const items: PrepareItem[] = [];

    for (const comp of unitJson.components.skills ?? []) {
      if (!comp.hasCustom) continue;
      if (comp.condition && !optionalNames.includes(`skill:${comp.name}`)) continue;
      const templatePath = join(this.aisfHome, "units", unitName, comp.file);
      const targetPath = join(this.cwd, ".claude", "skills", `aisf-${unitName}-${comp.name}`, "SKILL.md");
      const tempPath = this.makeTempPath(targetPath, unitName, comp.name);
      mkdirSync(dirname(targetPath), { recursive: true });
      items.push({ componentType: "skill", templatePath, targetPath, tempPath, exists: existsSync(targetPath) });
    }

    for (const comp of unitJson.components.rules ?? []) {
      if (!comp.hasCustom) continue;
      if (comp.condition && !optionalNames.includes(`rule:${comp.name}`)) continue;
      const templatePath = join(this.aisfHome, "units", unitName, comp.file);
      const targetPath = join(this.cwd, ".claude", "rules", `aisf-${unitName}`, `${comp.name}.md`);
      const tempPath = this.makeTempPath(targetPath, unitName, comp.name);
      mkdirSync(dirname(targetPath), { recursive: true });
      items.push({ componentType: "rule", templatePath, targetPath, tempPath, exists: existsSync(targetPath) });
    }

    for (const comp of unitJson.components.resources ?? []) {
      if (!comp.hasCustom) continue;
      if (comp.condition && !optionalNames.includes(`resource:${comp.name}`)) continue;
      const templatePath = join(this.aisfHome, "units", unitName, comp.file);
      const targetPath = join(this.cwd, ".aisf", unitName, comp.file);
      const tempPath = this.makeTempPath(targetPath, unitName, comp.name);
      mkdirSync(dirname(targetPath), { recursive: true });
      items.push({ componentType: "resource", templatePath, targetPath, tempPath, exists: existsSync(targetPath) });
    }

    process.stdout.write(JSON.stringify(items, null, 2) + "\n");
  }

  private makeTempPath(targetPath: string, unitName: string, compName: string): string {
    return join(dirname(targetPath), `.aisf-tmp-${unitName}-${compName}`);
  }

  private cleanOrphanTempFiles(): void {
    for (const dir of [join(this.cwd, ".claude"), join(this.cwd, ".aisf")]) {
      if (existsSync(dir)) this.removeTempFilesIn(dir);
    }
  }

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
   */
  uninstall(unitName: string): void {
    const installed = this.readInstalled();
    const entry = installed.units[unitName];
    if (!entry) {
      console.error(`Error: unit "${unitName}" is not installed`);
      process.exit(1);
    }

    for (const rel of [
      ...entry.components.skills,
      ...entry.components.rules,
      ...entry.components.resources,
    ]) {
      const fullPath = join(this.cwd, rel);
      if (existsSync(fullPath)) {
        rmSync(fullPath);
        this.tryRemoveEmptyDir(fullPath);
      }
    }

    for (const rel of entry.components.scripts) {
      const hookName = `aisf-${unitName}-${basename(rel, ".js")}`;
      removePreCommitHook(this.cwd, hookName);
      const fullPath = join(this.cwd, rel);
      if (existsSync(fullPath)) {
        rmSync(fullPath);
        this.tryRemoveEmptyDir(fullPath);
      }
    }

    const data = this.readInstalled();
    delete data.units[unitName];
    writeFileSync(join(this.cwd, ".aisf", "installed.json"), JSON.stringify(data, null, 2) + "\n");
    console.log(`Uninstalled: ${unitName}`);
  }

  /**
   * Installs a unit by reading its component list from unit.json.
   * Required components (no condition) are always installed.
   * Optional components (have a condition) are installed only if their typed name
   * appears in optionalNames, e.g. ["rule:poc-rule", "resource:config"].
   * Previously installed components that are no longer selected are removed.
   */
  install(unitName: string, optionalNames: string[]): void {
    const unitJson = this.readUnitJson(unitName);
    if (!unitJson) {
      console.error(`Error: unit "${unitName}" not found in ~/.aisf/units/`);
      process.exit(1);
    }

    const specs = this.resolveComponents(unitJson, optionalNames);
    this.removeOrphans(unitName, unitJson, optionalNames);

    const installedPaths: InstalledEntry["components"] = {
      skills: [],
      rules: [],
      scripts: [],
      resources: [],
    };

    for (const spec of specs) {
      switch (spec.type) {
        case "skill":
          installedPaths.skills.push(this.installSkill(unitName, spec));
          break;
        case "rule":
          installedPaths.rules.push(this.installRule(unitName, spec));
          break;
        case "script":
          installedPaths.scripts.push(this.installScript(unitName, spec));
          break;
        case "resource":
          installedPaths.resources.push(this.installResource(unitName, spec));
          break;
      }
    }

    this.updateInstalled(unitName, installedPaths, optionalNames);
    this.ensureGitignores();
    console.log(`Installed: ${unitName}`);
  }

  /** Builds the list of ComponentSpecs to install based on unit.json and the selected optionals. */
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
      specs.push({ type: "script", name: comp.name, file: comp.file, hook: comp.hook, params: comp.params });
    }
    for (const comp of unitJson.components.resources ?? []) {
      if (!comp.condition || optionalNames.includes(`resource:${comp.name}`)) {
        specs.push({ type: "resource", name: comp.name, file: comp.file, hasCustom: comp.hasCustom });
      }
    }

    return specs;
  }

  /**
   * Removes components that were previously installed but are no longer in scope —
   * either because they were removed from unit.json or because an optional was deselected.
   */
  private removeOrphans(unitName: string, unitJson: UnitJson, optionalNames: string[]): void {
    const installed = this.readInstalled();
    const entry = installed.units[unitName];
    if (!entry) return;

    const newSkillPaths = new Set(
      (unitJson.components.skills ?? [])
        .filter((c) => !c.condition || optionalNames.includes(`skill:${c.name}`))
        .map((c) => join(".claude", "skills", `aisf-${unitName}-${c.name}`, "SKILL.md")),
    );
    const newRulePaths = new Set(
      (unitJson.components.rules ?? [])
        .filter((c) => !c.condition || optionalNames.includes(`rule:${c.name}`))
        .map((c) => join(".claude", "rules", `aisf-${unitName}`, `${c.name}.md`)),
    );
    const newResourcePaths = new Set(
      (unitJson.components.resources ?? [])
        .filter((c) => !c.condition || optionalNames.includes(`resource:${c.name}`))
        .map((c) => join(".aisf", unitName, c.file)),
    );
    const newScriptNames = new Set((unitJson.components.scripts ?? []).map((c) => c.name));

    for (const rel of [...entry.components.skills, ...entry.components.rules, ...entry.components.resources]) {
      if (!newSkillPaths.has(rel) && !newRulePaths.has(rel) && !newResourcePaths.has(rel)) {
        const fullPath = join(this.cwd, rel);
        if (existsSync(fullPath)) {
          rmSync(fullPath);
          this.tryRemoveEmptyDir(fullPath);
        }
      }
    }

    for (const rel of entry.components.scripts) {
      const scriptName = basename(rel, ".js");
      if (!newScriptNames.has(scriptName)) {
        removePreCommitHook(this.cwd, `aisf-${unitName}-${scriptName}`);
        const fullPath = join(this.cwd, rel);
        if (existsSync(fullPath)) {
          rmSync(fullPath);
          this.tryRemoveEmptyDir(fullPath);
        }
      }
    }
  }

  private tryRemoveEmptyDir(fullPath: string): void {
    const parentDir = dirname(fullPath);
    try {
      if (readdirSync(parentDir).length === 0) rmdirSync(parentDir);
    } catch { /* ignore */ }
  }

  private installSkill(unitName: string, spec: SkillSpec): string {
    const destDir = join(this.cwd, ".claude", "skills", `aisf-${unitName}-${spec.name}`);
    mkdirSync(destDir, { recursive: true });
    const destFile = join(destDir, "SKILL.md");

    if (spec.hasCustom) {
      const tempPath = this.makeTempPath(destFile, unitName, spec.name);
      if (!existsSync(tempPath)) {
        console.error(`Error: temp file not found for skill "${spec.name}" — run prepare first: ${tempPath}`);
        process.exit(1);
      }
      cpSync(tempPath, destFile);
      rmSync(tempPath);
    } else {
      const src = join(this.aisfHome, "units", unitName, spec.file);
      cpSync(src, destFile);
    }

    return join(".claude", "skills", `aisf-${unitName}-${spec.name}`, "SKILL.md");
  }

  private installRule(unitName: string, spec: RuleSpec): string {
    const destDir = join(this.cwd, ".claude", "rules", `aisf-${unitName}`);
    mkdirSync(destDir, { recursive: true });
    const destFile = join(destDir, `${spec.name}.md`);

    if (spec.hasCustom) {
      const tempPath = this.makeTempPath(destFile, unitName, spec.name);
      if (!existsSync(tempPath)) {
        console.error(`Error: temp file not found for rule "${spec.name}" — run prepare first: ${tempPath}`);
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

    return join(".claude", "rules", `aisf-${unitName}`, `${spec.name}.md`);
  }

  private installScript(unitName: string, spec: ScriptSpec): string {
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
    return relPath;
  }

  private installResource(unitName: string, spec: ResourceSpec): string {
    const destFile = join(this.cwd, ".aisf", unitName, spec.file);
    mkdirSync(dirname(destFile), { recursive: true });

    if (spec.hasCustom) {
      const tempPath = this.makeTempPath(destFile, unitName, spec.name);
      if (!existsSync(tempPath)) {
        console.error(`Error: temp file not found for resource "${spec.name}" — run prepare first: ${tempPath}`);
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

    return join(".aisf", unitName, spec.file);
  }

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

  readInstalled(): InstalledJson {
    const installedPath = join(this.cwd, ".aisf", "installed.json");
    if (!existsSync(installedPath)) return { units: {} };
    return JSON.parse(readFileSync(installedPath, "utf8")) as InstalledJson;
  }

  private updateInstalled(
    unitName: string,
    components: InstalledEntry["components"],
    optionalComponents: string[],
  ): void {
    const installedPath = join(this.cwd, ".aisf", "installed.json");
    mkdirSync(join(this.cwd, ".aisf"), { recursive: true });
    const data = this.readInstalled();
    data.units[unitName] = { installedAt: new Date().toISOString(), components, optionalComponents };
    writeFileSync(installedPath, JSON.stringify(data, null, 2) + "\n");
  }

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
    .command("resolve <...units>", "Resolve transitive deps and output install order")
    .action((units: string[]) => new Installer().checkDeps(units));

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
    .option("--optional <json>", "JSON array of selected optional component names, e.g. [\"rule:poc-rule\"]")
    .action((unit: string, options: { optional?: string }) => {
      const optionalNames = parseOptional(options.optional);
      new Installer().install(unit, optionalNames);
    });

  cli.help();
  cli.parse();
}

function parseOptional(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    console.error("Error: --optional must be a valid JSON array");
    process.exit(1);
  }
}
