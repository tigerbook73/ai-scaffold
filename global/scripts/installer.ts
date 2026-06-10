/**
 * Runtime installer for published aisk units.
 *
 * This file is bundled into ~/.aisk/global/installer.js and then invoked from
 * installed skills. It manages project-local generated files, hook registration,
 * dependency resolution, and preservation of AISK:CUSTOM blocks during updates.
 */
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
import { dirname, join, relative } from "path";
import { homedir } from "os";
import { cac } from "cac";
import { mergeCustomContent, parseCustomBlocks } from "./libs/custom-blocks";
import { addPreCommitHook, removePreCommitHook } from "./libs/precommit-lefthook";
import type {
  UnitJson,
  InstalledComponent,
  InstalledEntry,
  InstalledJson,
  ScriptSpec,
  ComponentSpec,
  AddResult,
  RemoveResult,
  UpdateResult,
  RefreshResult,
  ShowResult,
  ListResult,
  ComponentOpResult,
  ResolveResult,
} from "./types/installer-types";

export type { ResolveResult, AddResult, RemoveResult, UpdateResult, RefreshResult, ShowResult };

// ─── Installer ───────────────────────────────────────────────────────────────

/**
 * Core installer that manages unit lifecycle (list, add, remove, update, refresh, show)
 * for a given project directory.
 */
export class Installer {
  /** Absolute path to the global aisk home directory (~/.aisk by default). */
  readonly aiskHome: string;
  /** Absolute path to the target project directory. */
  readonly cwd: string;
  /** When true, output is human-readable text instead of JSON. */
  readonly human: boolean;

  /**
   * @param cwd      Project root to install units into (defaults to process.cwd()).
   * @param aiskHome Global aisk home directory (defaults to ~/.aisk).
   * @param human    When true, output human-readable text instead of JSON.
   */
  constructor(cwd = process.cwd(), aiskHome = join(homedir(), ".aisk"), human = false) {
    this.cwd = cwd;
    this.aiskHome = aiskHome;
    this.human = human;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** List all available units with their install and customization status. */
  list(): void {
    this.refresh(true);
    const installed = this.readInstalled();
    const unitList = this.getUnitList();

    const units: ListResult["units"] = unitList.map((u) => {
      const entry = installed.units[u.name];
      const hasTodo = entry
        ? [
            ...entry.components.skills,
            ...entry.components.rules,
            ...entry.components.resources,
          ].some((c) => c.customStatus === "todo")
        : undefined;

      return {
        name: u.name,
        description: u.description,
        installed: u.installed,
        ...(hasTodo ? { hasTodo: true } : {}),
      };
    });

    const result: ListResult = { units };
    if (this.human) {
      this.printListHuman(result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    }
  }

  /**
   * Add one or more units. "all" installs all available units.
   * If a unit is already installed, it is updated instead.
   * Transitive dependencies that are not installed are auto-installed.
   */
  add(names: string[]): void {
    this.refresh(true);
    const installed = this.readInstalled();
    const available = this.getUnitList().map((u) => u.name);
    const availableSet = new Set(available);

    const requestedNames = names.includes("all")
      ? available.filter((n) => !installed.units[n])
      : names;

    const result: AddResult = { added: [], updated: [], failed: [] };

    // Validate and split
    const toInstall: string[] = [];
    const toUpdate: string[] = [];

    for (const name of requestedNames) {
      if (!availableSet.has(name)) {
        result.failed.push({ name, reason: "unit 不在注册表中" });
        continue;
      }
      if (installed.units[name]) {
        toUpdate.push(name);
      } else {
        toInstall.push(name);
      }
    }

    // Resolve transitive deps for fresh installs (only install uninstalled deps)
    const { order, autoDeps } = this.resolveFreshDeps(
      toInstall,
      new Set(Object.keys(installed.units)),
      result,
    );

    // Process fresh installs in dep order
    for (const name of order) {
      try {
        const comps = this.installUnitAllComponents(name);
        result.added.push({ name, autoDep: autoDeps.has(name), components: comps });
      } catch (e) {
        result.failed.push({ name, reason: String(e) });
      }
    }

    // Process converts-to-update
    for (const name of toUpdate) {
      try {
        const comps = this.updateUnitComponents(name);
        result.updated.push({ name, components: comps });
      } catch (e) {
        result.failed.push({ name, reason: String(e) });
      }
    }

    if (this.human) {
      this.printAddHuman(result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    }
  }

  /**
   * Remove one or more installed units. "all" removes all installed units.
   * Fails per-unit if not installed.
   */
  remove(names: string[]): void {
    this.refresh(true);
    const installed = this.readInstalled();

    const requestedNames = names.includes("all") ? Object.keys(installed.units) : names;

    const result: RemoveResult = { removed: [], failed: [] };

    for (const name of requestedNames) {
      if (!installed.units[name]) {
        result.failed.push({ name, reason: "unit 未安装" });
        continue;
      }
      try {
        const comps = this.removeUnitComponents(name);
        result.removed.push({ name, components: comps });
      } catch (e) {
        result.failed.push({ name, reason: String(e) });
      }
    }

    if (this.human) {
      this.printRemoveHuman(result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    }
  }

  /**
   * Update one or more installed units. "all" updates all installed units.
   * Fails per-unit if not installed. Optional components that are not on disk are skipped.
   * AISK:CUSTOM done blocks are merged into the new template.
   */
  update(names: string[]): void {
    this.refresh(true);
    const installed = this.readInstalled();
    const availableSet = new Set(this.getUnitList().map((u) => u.name));

    const requestedNames = names.includes("all") ? Object.keys(installed.units) : names;

    const result: UpdateResult = { updated: [], failed: [] };

    for (const name of requestedNames) {
      if (!installed.units[name]) {
        result.failed.push({ name, reason: "unit 未安装" });
        continue;
      }
      if (!availableSet.has(name)) {
        result.failed.push({ name, reason: "unit 不在注册表中" });
        continue;
      }
      try {
        const comps = this.updateUnitComponents(name);
        result.updated.push({ name, components: comps });
      } catch (e) {
        result.failed.push({ name, reason: String(e) });
      }
    }

    if (this.human) {
      this.printUpdateHuman(result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    }
  }

  /**
   * Scan all installed component files for AISK:CUSTOM block status,
   * sync customStatus back to installed.json, and clean up orphaned hooks.
   * In silent mode (internal calls), produces no output.
   */
  refresh(silent = false): void {
    const installed = this.readInstalled();
    const todoUnits: RefreshResult["todo"] = [];
    let anyChanged = false;

    for (const [unitName, entry] of Object.entries(installed.units)) {
      const todoFiles: string[] = [];
      let changed = false;

      for (const compList of [
        entry.components.skills,
        entry.components.rules,
        entry.components.resources,
      ]) {
        for (const comp of compList) {
          const absPath = join(this.cwd, comp.path);

          if (!existsSync(absPath)) {
            // File was manually deleted — clear customStatus
            if (comp.customStatus !== undefined) {
              comp.customStatus = undefined;
              changed = true;
            }
            continue;
          }

          const scanned = this.scanCustomStatus(absPath);
          if (scanned !== comp.customStatus) {
            comp.customStatus = scanned;
            changed = true;
          }
          if (scanned === "todo") {
            todoFiles.push(comp.path);
          }
        }
      }

      // Clean up hooks for scripts whose files no longer exist
      for (const comp of entry.components.scripts) {
        const absPath = join(this.cwd, comp.path);
        if (!existsSync(absPath)) {
          removePreCommitHook(this.cwd, `aisk-${unitName}-${comp.name}`);
        }
      }

      if (changed) anyChanged = true;

      if (todoFiles.length > 0) {
        todoUnits.push({ unit: unitName, files: todoFiles });
      }
    }

    const installedPath = join(this.cwd, ".aisk", "installed.json");
    if (anyChanged && existsSync(installedPath)) {
      writeFileSync(installedPath, JSON.stringify(installed, null, 2) + "\n");
    }

    if (!silent) {
      const refreshResult: RefreshResult = { todo: todoUnits };
      if (this.human) {
        this.printRefreshHuman(refreshResult);
      } else {
        process.stdout.write(JSON.stringify(refreshResult, null, 2) + "\n");
      }
    }
  }

  /** Show details for a single unit including component status. */
  show(unitName: string): void {
    const unitJson = this.readUnitJson(unitName);
    if (!unitJson) {
      console.error(`Error: unit "${unitName}" not found in ~/.aisk/units/`);
      process.exit(1);
    }

    const installed = this.readInstalled();
    const entry = installed.units[unitName];

    const components: ShowResult["components"] = [];

    for (const comp of unitJson.components.skills ?? []) {
      const ic = entry?.components.skills.find((c) => c.name === comp.name);
      components.push({
        type: "skill",
        name: comp.name,
        optional: !!comp.condition,
        condition: comp.condition,
        customStatus: ic?.customStatus,
        installed: !!ic,
      });
    }
    for (const comp of unitJson.components.rules ?? []) {
      const ic = entry?.components.rules.find((c) => c.name === comp.name);
      components.push({
        type: "rule",
        name: comp.name,
        optional: !!comp.condition,
        condition: comp.condition,
        customStatus: ic?.customStatus,
        installed: !!ic,
      });
    }
    for (const comp of unitJson.components.scripts ?? []) {
      const ic = entry?.components.scripts.find((c) => c.name === comp.name);
      components.push({
        type: "script",
        name: comp.name,
        optional: false,
        hook: comp.hook,
        installed: !!ic,
      });
    }
    for (const comp of unitJson.components.resources ?? []) {
      const ic = entry?.components.resources.find((c) => c.name === comp.name);
      components.push({
        type: "resource",
        name: comp.name,
        optional: !!comp.condition,
        condition: comp.condition,
        customStatus: ic?.customStatus,
        installed: !!ic,
      });
    }

    const result: ShowResult = {
      name: unitName,
      description: unitJson.description ?? "",
      dependencies: unitJson.dependencies,
      installed: !!entry,
      components,
    };

    if (this.human) {
      this.printShowHuman(result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    }
  }

  /**
   * Computes the full changeset for the given desired state and outputs it as JSON.
   * The desired state is the complete list of unit names the user wants installed.
   */
  resolve(selectedNames: string[]): void {
    const result = this.resolveDeps(selectedNames);
    if (this.human) {
      this.printResolveHuman(result);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    }
  }

  /** Reads and parses .aisk/installed.json from the project directory. */
  readInstalled(): InstalledJson {
    const installedPath = join(this.cwd, ".aisk", "installed.json");
    if (!existsSync(installedPath)) return { units: {} };
    return JSON.parse(readFileSync(installedPath, "utf8")) as InstalledJson;
  }

  // ─── Unit-level operations ─────────────────────────────────────────────────

  /**
   * Install a unit with ALL components (required + optional).
   * Copies files directly from templates; scans AISK:CUSTOM blocks for customStatus.
   */
  private installUnitAllComponents(unitName: string): ComponentOpResult[] {
    const unitJson = this.readUnitJson(unitName)!;
    const specs = this.resolveComponents(unitJson, null);

    const comps: InstalledEntry["components"] = {
      skills: [],
      rules: [],
      scripts: [],
      resources: [],
    };
    const results: ComponentOpResult[] = [];

    for (const spec of specs) {
      switch (spec.type) {
        case "skill": {
          const ic = this.copyComponentDirect(
            join(this.aiskHome, "units", unitName, spec.file),
            join(this.cwd, ".claude", "skills", `aisk-${unitName}-${spec.name}`, "SKILL.md"),
            spec.name,
            spec.hasCustom,
          );
          comps.skills.push(ic);
          results.push({
            type: "skill",
            name: spec.name,
            path: ic.path,
            customStatus: ic.customStatus,
          });
          break;
        }
        case "rule": {
          const ic = this.copyComponentDirect(
            join(this.aiskHome, "units", unitName, spec.file),
            join(this.cwd, ".claude", "rules", `aisk-${unitName}`, `${spec.name}.md`),
            spec.name,
            spec.hasCustom,
          );
          comps.rules.push(ic);
          results.push({
            type: "rule",
            name: spec.name,
            path: ic.path,
            customStatus: ic.customStatus,
            optional: spec.optional,
          });
          break;
        }
        case "script": {
          const ic = this.installScript(unitName, spec);
          comps.scripts.push(ic);
          results.push({ type: "script", name: spec.name, path: ic.path, hook: spec.hook });
          break;
        }
        case "resource": {
          const ic = this.copyComponentDirect(
            join(this.aiskHome, "units", unitName, spec.file),
            join(this.cwd, ".aisk", unitName, spec.file),
            spec.name,
            spec.hasCustom,
          );
          comps.resources.push(ic);
          results.push({
            type: "resource",
            name: spec.name,
            path: ic.path,
            customStatus: ic.customStatus,
            optional: spec.optional,
          });
          break;
        }
      }
    }

    this.updateInstalled(unitName, comps);
    this.ensureGitignores();
    return results;
  }

  /**
   * Update an installed unit.
   * Optional components: checked by file existence; skipped if not on disk.
   * hasCustom components: done blocks merged from existing file into new template.
   */
  private updateUnitComponents(unitName: string): ComponentOpResult[] {
    const unitJson = this.readUnitJson(unitName)!;
    const entry = this.readInstalled().units[unitName];

    // For optional components, update preserves the user's original install choice.
    const installedOptionals = this.getInstalledOptionalNames(unitJson, entry);
    const specs = this.resolveComponents(unitJson, installedOptionals);

    this.removeOrphans(unitName, unitJson, installedOptionals);

    const comps: InstalledEntry["components"] = {
      skills: [],
      rules: [],
      scripts: [],
      resources: [],
    };
    const results: ComponentOpResult[] = [];

    for (const spec of specs) {
      switch (spec.type) {
        case "skill": {
          const destFile = join(
            this.cwd,
            ".claude",
            "skills",
            `aisk-${unitName}-${spec.name}`,
            "SKILL.md",
          );
          const existingPath = entry?.components.skills.find((c) => c.name === spec.name)?.path;
          const ic = this.updateComponentDirect(
            join(this.aiskHome, "units", unitName, spec.file),
            destFile,
            spec.name,
            spec.hasCustom,
            existingPath ? join(this.cwd, existingPath) : undefined,
          );
          comps.skills.push(ic);
          results.push({
            type: "skill",
            name: spec.name,
            path: ic.path,
            customStatus: ic.customStatus,
          });
          break;
        }
        case "rule": {
          const destFile = join(
            this.cwd,
            ".claude",
            "rules",
            `aisk-${unitName}`,
            `${spec.name}.md`,
          );
          const existingPath = entry?.components.rules.find((c) => c.name === spec.name)?.path;
          const ic = this.updateComponentDirect(
            join(this.aiskHome, "units", unitName, spec.file),
            destFile,
            spec.name,
            spec.hasCustom,
            existingPath ? join(this.cwd, existingPath) : undefined,
          );
          comps.rules.push(ic);
          results.push({
            type: "rule",
            name: spec.name,
            path: ic.path,
            customStatus: ic.customStatus,
            optional: spec.optional,
          });
          break;
        }
        case "script": {
          const ic = this.installScript(unitName, spec);
          comps.scripts.push(ic);
          results.push({ type: "script", name: spec.name, path: ic.path, hook: spec.hook });
          break;
        }
        case "resource": {
          const destFile = join(this.cwd, ".aisk", unitName, spec.file);
          const existingPath = entry?.components.resources.find((c) => c.name === spec.name)?.path;
          const ic = this.updateComponentDirect(
            join(this.aiskHome, "units", unitName, spec.file),
            destFile,
            spec.name,
            spec.hasCustom,
            existingPath ? join(this.cwd, existingPath) : undefined,
          );
          comps.resources.push(ic);
          results.push({
            type: "resource",
            name: spec.name,
            path: ic.path,
            customStatus: ic.customStatus,
            optional: spec.optional,
          });
          break;
        }
      }
    }

    this.updateInstalled(unitName, comps);
    this.ensureGitignores();
    return results;
  }

  /** Remove all components of an installed unit and clean up hooks. */
  private removeUnitComponents(unitName: string): ComponentOpResult[] {
    const installed = this.readInstalled();
    const entry = installed.units[unitName];
    const results: ComponentOpResult[] = [];

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
      results.push({ type: "skill", name: comp.name, path: comp.path });
    }

    for (const comp of entry.components.scripts) {
      removePreCommitHook(this.cwd, `aisk-${unitName}-${comp.name}`);
      const fullPath = join(this.cwd, comp.path);
      if (existsSync(fullPath)) {
        rmSync(fullPath);
        this.tryRemoveEmptyDir(fullPath);
      }
      results.push({ type: "script", name: comp.name, path: comp.path });
    }

    delete installed.units[unitName];
    writeFileSync(
      join(this.cwd, ".aisk", "installed.json"),
      JSON.stringify(installed, null, 2) + "\n",
    );

    return results;
  }

  // ─── Component-level copy/update ───────────────────────────────────────────

  /**
   * Copy a file directly from src to dest, creating parent dirs.
   * If hasCustom, scans dest for AISK:CUSTOM block status after copy.
   */
  private copyComponentDirect(
    src: string,
    dest: string,
    compName: string,
    hasCustom?: boolean,
  ): InstalledComponent {
    if (!existsSync(src)) throw new Error(`source file not found: ${src}`);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
    const path = relative(this.cwd, dest);
    const customStatus = hasCustom ? this.scanCustomStatus(dest) : undefined;
    return { name: compName, path, customStatus };
  }

  /**
   * Update a component file, merging AISK:CUSTOM done blocks from the existing file.
   * Falls back to direct copy if the file doesn't exist yet or has no done blocks.
   */
  private updateComponentDirect(
    src: string,
    dest: string,
    compName: string,
    hasCustom?: boolean,
    existingFilePath?: string,
  ): InstalledComponent {
    if (!existsSync(src)) throw new Error(`source file not found: ${src}`);
    mkdirSync(dirname(dest), { recursive: true });

    // Prefer the recorded path so renamed components can still carry old custom content forward.
    const currentPath = existingFilePath ?? dest;
    if (hasCustom && existsSync(currentPath)) {
      const oldContent = readFileSync(currentPath, "utf8");
      const newTemplate = readFileSync(src, "utf8");
      const merged = mergeCustomContent(oldContent, newTemplate);
      writeFileSync(dest, merged);
    } else {
      cpSync(src, dest);
    }

    const path = relative(this.cwd, dest);
    const customStatus = hasCustom ? this.scanCustomStatus(dest) : undefined;
    return { name: compName, path, customStatus };
  }

  /**
   * Copy a compiled script to .aisk/{unit}/scripts/ and register its hook.
   */
  private installScript(unitName: string, spec: ScriptSpec): InstalledComponent {
    const srcJs = join(this.aiskHome, "units", unitName, "scripts", `${spec.name}.js`);
    if (!existsSync(srcJs)) throw new Error(`compiled script not found: ${srcJs}`);

    const destDir = join(this.cwd, ".aisk", unitName, "scripts");
    mkdirSync(destDir, { recursive: true });
    const destFile = join(destDir, `${spec.name}.js`);
    cpSync(srcJs, destFile);

    const relPath = join(".aisk", unitName, "scripts", `${spec.name}.js`);
    if (spec.hook) {
      const paramStr = (spec.params ?? []).map((p) => `{${p}}`).join(" ");
      const runCmd = paramStr ? `node ${relPath} ${paramStr}` : `node ${relPath}`;
      addPreCommitHook(this.cwd, `aisk-${unitName}-${spec.name}`, runCmd);
    }

    return { name: spec.name, path: relPath };
  }

  // ─── Dependency resolution ─────────────────────────────────────────────────

  /**
   * Resolve transitive deps for a fresh-install list.
   * Only adds uninstalled deps; already-installed deps are silently skipped.
   * Failed lookups are pushed to result.failed and excluded from order.
   */
  private resolveFreshDeps(
    names: string[],
    installedSet: Set<string>,
    result: AddResult,
  ): { order: string[]; autoDeps: Set<string> } {
    const toInstall = new Set<string>(names);
    const autoDeps = new Set<string>();

    // Depth-first expansion is only used to collect the closure; final ordering
    // is delegated to the precomputed global order shared by build/publish.
    const expand = (name: string) => {
      const unitJson = this.readUnitJson(name);
      if (!unitJson) {
        result.failed.push({ name, reason: "unit 不在注册表中" });
        toInstall.delete(name);
        return;
      }
      for (const dep of unitJson.dependencies) {
        if (!installedSet.has(dep) && !toInstall.has(dep)) {
          toInstall.add(dep);
          autoDeps.add(dep);
          expand(dep);
        }
      }
    };

    for (const name of [...names]) expand(name);

    const order = this.sortByGlobalOrder([...toInstall]);
    return { order, autoDeps };
  }

  /**
   * Full dep resolution for resolve command using a desired-state model.
   *
   * The selected names represent the complete target state. Any currently
   * installed unit outside the transitive closure becomes a removal candidate.
   */
  private resolveDeps(selectedNames: string[]): ResolveResult {
    const installed = this.readInstalled();
    const installedNames = new Set(Object.keys(installed.units));
    const selectedSet = new Set(selectedNames);
    const fullRequired = new Set<string>(selectedNames);
    const auto = new Set<string>();

    const resolveTransitive = (names: string[]) => {
      for (const name of names) {
        const unitJson = this.readUnitJson(name);
        if (!unitJson) {
          console.error(`Error: unit "${name}" not found in ~/.aisk/units/`);
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

    const globalOrder = this.readGlobalOrder();
    const sort = (ns: string[]) => this.sortByGlobalOrder(ns, globalOrder);
    const to_remove = sort([...installedNames].filter((n) => !fullRequired.has(n)));
    const to_install = sort([...fullRequired].filter((n) => !installedNames.has(n)));
    const to_update = sort(selectedNames.filter((n) => installedNames.has(n)));
    const order = sort([...to_install, ...to_update]);

    return { to_remove, to_install, to_update, order, auto: sort([...auto]) };
  }

  // ─── Optional component helpers ────────────────────────────────────────────

  /** Return typed names for optional components recorded in installed.json for this unit. */
  private getInstalledOptionalNames(unitJson: UnitJson, entry: InstalledEntry): string[] {
    const names: string[] = [];
    for (const c of unitJson.components.skills ?? []) {
      if (c.condition && entry.components.skills.some((ic) => ic.name === c.name)) {
        names.push(`skill:${c.name}`);
      }
    }
    for (const c of unitJson.components.rules ?? []) {
      if (c.condition && entry.components.rules.some((ic) => ic.name === c.name)) {
        names.push(`rule:${c.name}`);
      }
    }
    for (const c of unitJson.components.resources ?? []) {
      if (c.condition && entry.components.resources.some((ic) => ic.name === c.name)) {
        names.push(`resource:${c.name}`);
      }
    }
    return names;
  }

  // ─── Component resolution & orphan removal ─────────────────────────────────

  /**
   * Resolve unit.json component declarations into concrete install specs.
   *
   * optionalNames === null means fresh install and includes all optional
   * components; otherwise only recorded optional components are preserved.
   */
  private resolveComponents(unitJson: UnitJson, optionalNames: string[] | null): ComponentSpec[] {
    const selected = (key: string) => optionalNames === null || optionalNames.includes(key);
    const specs: ComponentSpec[] = [];

    for (const comp of unitJson.components.skills ?? []) {
      if (!comp.condition || selected(`skill:${comp.name}`)) {
        specs.push({
          type: "skill",
          name: comp.name,
          file: comp.file,
          hasCustom: comp.hasCustom,
          optional: !!comp.condition,
        });
      }
    }
    for (const comp of unitJson.components.rules ?? []) {
      if (!comp.condition || selected(`rule:${comp.name}`)) {
        specs.push({
          type: "rule",
          name: comp.name,
          file: comp.file,
          hasCustom: comp.hasCustom,
          hint: comp.hint,
          optional: !!comp.condition,
        });
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
      if (!comp.condition || selected(`resource:${comp.name}`)) {
        specs.push({
          type: "resource",
          name: comp.name,
          file: comp.file,
          hasCustom: comp.hasCustom,
          optional: !!comp.condition,
        });
      }
    }

    return specs;
  }

  /** Remove files and hooks that existed in installed.json but no longer resolve from unit.json. */
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
      if (!newSkillNames.has(comp.name)) this.deleteFile(join(this.cwd, comp.path));
    }
    for (const comp of entry.components.rules) {
      if (!newRuleNames.has(comp.name)) this.deleteFile(join(this.cwd, comp.path));
    }
    for (const comp of entry.components.resources) {
      if (!newResourceNames.has(comp.name)) this.deleteFile(join(this.cwd, comp.path));
    }
    for (const comp of entry.components.scripts) {
      if (!newScriptNames.has(comp.name)) {
        removePreCommitHook(this.cwd, `aisk-${unitName}-${comp.name}`);
        this.deleteFile(join(this.cwd, comp.path));
      }
    }
  }

  // ─── File system utilities ─────────────────────────────────────────────────

  /** Delete a generated file and prune its immediate directory when it becomes empty. */
  private deleteFile(fullPath: string): void {
    if (existsSync(fullPath)) {
      rmSync(fullPath);
      this.tryRemoveEmptyDir(fullPath);
    }
  }

  /** Best-effort cleanup for component wrapper directories after their file is removed. */
  private tryRemoveEmptyDir(fullPath: string): void {
    const parentDir = dirname(fullPath);
    try {
      if (readdirSync(parentDir).length === 0) rmdirSync(parentDir);
    } catch {
      /* ignore */
    }
  }

  /** Scan a file for AISK:CUSTOM blocks and return the aggregate customStatus. */
  private scanCustomStatus(filePath: string): "todo" | "done" | undefined {
    if (!existsSync(filePath)) return undefined;
    const blocks = parseCustomBlocks(readFileSync(filePath, "utf8"));
    if (blocks.length === 0) return undefined;
    return blocks.some((b) => b.status === "todo") ? "todo" : "done";
  }

  /** Ensure generated installer output stays out of the host project's git history. */
  private ensureGitignores(): void {
    const entries: Array<{ dir: string; content: string }> = [
      { dir: join(this.cwd, ".aisk"), content: "*\n" },
      { dir: join(this.cwd, ".claude"), content: "skills/aisk-*/\nrules/aisk-*/\n" },
    ];
    for (const { dir, content } of entries) {
      mkdirSync(dir, { recursive: true });
      const gitignorePath = join(dir, ".gitignore");
      if (!existsSync(gitignorePath)) writeFileSync(gitignorePath, content);
    }
  }

  // ─── Data access ───────────────────────────────────────────────────────────

  /** Persist the latest component paths and customStatus for a unit. */
  private updateInstalled(unitName: string, components: InstalledEntry["components"]): void {
    const installedPath = join(this.cwd, ".aisk", "installed.json");
    mkdirSync(join(this.cwd, ".aisk"), { recursive: true });
    const data = this.readInstalled();
    data.units[unitName] = { installedAt: new Date().toISOString(), components };
    writeFileSync(installedPath, JSON.stringify(data, null, 2) + "\n");
  }

  /** Read one published unit definition from ~/.aisk/units. */
  private readUnitJson(unitName: string): UnitJson | null {
    const path = join(this.aiskHome, "units", unitName, "unit.json");
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as UnitJson;
  }

  /** List published units in registry order with their current project install state. */
  private getUnitList(): Array<{ name: string; description: string; installed: boolean }> {
    const unitsDir = join(this.aiskHome, "units");
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

  /** Read the registry order produced by build.ts and published to ~/.aisk/units.json. */
  private readGlobalOrder(): string[] {
    const orderPath = join(this.aiskHome, "units.json");
    if (!existsSync(orderPath)) return [];
    return JSON.parse(readFileSync(orderPath, "utf8")) as string[];
  }

  /** Sort names by registry order, falling back to lexical order for unknown names. */
  private sortByGlobalOrder(names: string[], order?: string[]): string[] {
    const ord = order ?? this.readGlobalOrder();
    const index = new Map(ord.map((n, i) => [n, i]));
    return [...names].sort((a, b) => {
      const ai = index.get(a) ?? Infinity;
      const bi = index.get(b) ?? Infinity;
      return ai !== bi ? ai - bi : a.localeCompare(b);
    });
  }

  // ─── Human-readable output ─────────────────────────────────────────────────

  private printListHuman({ units }: ListResult): void {
    const installedCount = units.filter((u) => u.installed).length;
    process.stdout.write(
      `${units.length} unit${units.length !== 1 ? "s" : ""} available, ${installedCount} installed\n`,
    );
    if (units.length === 0) return;
    process.stdout.write("\n");
    const maxLen = Math.max(...units.map((u) => u.name.length));
    for (const u of units) {
      const mark = u.installed ? "✓" : "·";
      const todo = u.hasTodo ? "  [!]" : "";
      process.stdout.write(`  ${mark} ${u.name.padEnd(maxLen + 2)}${u.description}${todo}\n`);
    }
  }

  private printAddHuman({ added, updated, failed }: AddResult): void {
    const regular = added.filter((a) => !a.autoDep);
    const auto = added.filter((a) => a.autoDep);
    if (regular.length > 0) {
      process.stdout.write(`Added: ${regular.map((a) => a.name).join(", ")}\n`);
    }
    if (auto.length > 0) {
      process.stdout.write(`  auto: ${auto.map((a) => a.name).join(", ")}\n`);
    }
    if (updated.length > 0) {
      process.stdout.write(`Updated: ${updated.map((u) => u.name).join(", ")}\n`);
    }
    for (const f of failed) {
      process.stdout.write(`Failed: ${f.name} — ${f.reason}\n`);
    }
    if (added.length === 0 && updated.length === 0 && failed.length === 0) {
      process.stdout.write("Nothing to do.\n");
    }
  }

  private printRemoveHuman({ removed, failed }: RemoveResult): void {
    if (removed.length > 0) {
      process.stdout.write(`Removed: ${removed.map((r) => r.name).join(", ")}\n`);
    }
    for (const f of failed) {
      process.stdout.write(`Failed: ${f.name} — ${f.reason}\n`);
    }
    if (removed.length === 0 && failed.length === 0) {
      process.stdout.write("Nothing to remove.\n");
    }
  }

  private printUpdateHuman({ updated, failed }: UpdateResult): void {
    if (updated.length > 0) {
      process.stdout.write(`Updated: ${updated.map((u) => u.name).join(", ")}\n`);
    }
    for (const f of failed) {
      process.stdout.write(`Failed: ${f.name} — ${f.reason}\n`);
    }
    if (updated.length === 0 && failed.length === 0) {
      process.stdout.write("Nothing to update.\n");
    }
  }

  private printRefreshHuman({ todo }: RefreshResult): void {
    if (todo.length === 0) {
      process.stdout.write("All custom blocks up to date.\n");
      return;
    }
    const totalFiles = todo.reduce((n, u) => n + u.files.length, 0);
    process.stdout.write(
      `${totalFiles} file${totalFiles !== 1 ? "s" : ""} with pending todos in ${todo.length} unit${todo.length !== 1 ? "s" : ""}:\n`,
    );
    for (const { unit, files } of todo) {
      for (const f of files) {
        process.stdout.write(`  ${unit}: ${f}\n`);
      }
    }
  }

  private printShowHuman(result: ShowResult): void {
    process.stdout.write(`${result.name} — ${result.description}\n`);
    if (result.dependencies.length > 0) {
      process.stdout.write(`Dependencies: ${result.dependencies.join(", ")}\n`);
    }
    process.stdout.write(`Status: ${result.installed ? "installed" : "not installed"}\n\n`);
    process.stdout.write("Components:\n");
    for (const c of result.components) {
      const mark = !c.installed ? "·" : c.customStatus === "todo" ? "!" : "✓";
      const typePad = c.type.padEnd(8);
      const todo = c.customStatus === "todo" ? "  [todo]" : "";
      const notInstalled = !c.installed && c.optional ? "  (optional, not installed)" : "";
      process.stdout.write(`  ${mark} ${typePad} ${c.name}${todo}${notInstalled}\n`);
    }
  }

  private printResolveHuman(result: ResolveResult): void {
    const autoSet = new Set(result.auto);
    if (result.to_install.length > 0) {
      const regular = result.to_install.filter((n) => !autoSet.has(n));
      const auto = result.to_install.filter((n) => autoSet.has(n));
      if (regular.length > 0) {
        process.stdout.write(`Install (${regular.length}): ${regular.join(", ")}\n`);
      }
      if (auto.length > 0) {
        process.stdout.write(`  auto (${auto.length}): ${auto.join(", ")}\n`);
      }
    }
    if (result.to_update.length > 0) {
      process.stdout.write(`Update (${result.to_update.length}): ${result.to_update.join(", ")}\n`);
    }
    if (result.to_remove.length > 0) {
      process.stdout.write(`Remove (${result.to_remove.length}): ${result.to_remove.join(", ")}\n`);
    }
    if (
      result.to_install.length === 0 &&
      result.to_update.length === 0 &&
      result.to_remove.length === 0
    ) {
      process.stdout.write("Nothing to change.\n");
    }
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const cli = cac("installer");

  cli.option("--human", "Output in human-readable text format instead of JSON");

  cli
    .command("list", "List all available units with install and customization status")
    .action((options: { human?: boolean }) =>
      new Installer(undefined, undefined, options.human).list(),
    );

  cli
    .command("add [...units]", 'Install units; use "all" to install all available units')
    .action((units: string[], options: { human?: boolean }) =>
      new Installer(undefined, undefined, options.human).add(units ?? []),
    );

  cli
    .command("remove [...units]", 'Uninstall units; use "all" to remove all installed units')
    .action((units: string[], options: { human?: boolean }) =>
      new Installer(undefined, undefined, options.human).remove(units ?? []),
    );

  cli
    .command("update [...units]", 'Update installed units; use "all" to update all')
    .action((units: string[], options: { human?: boolean }) =>
      new Installer(undefined, undefined, options.human).update(units ?? []),
    );

  cli
    .command("refresh", "Sync customStatus from disk, output TODO list, clean orphaned hooks")
    .option("--silent", "Suppress output (used for internal pre-operation refresh)")
    .action((options: { silent?: boolean; human?: boolean }) =>
      new Installer(undefined, undefined, options.human).refresh(options.silent ?? false),
    );

  cli
    .command("show <unit>", "Show unit details and component status")
    .action((unit: string, options: { human?: boolean }) =>
      new Installer(undefined, undefined, options.human).show(unit),
    );

  cli
    .command(
      "resolve [...units]",
      "Resolve transitive deps and output changeset; no args means uninstall all",
    )
    .action((units: string[], options: { human?: boolean }) =>
      new Installer(undefined, undefined, options.human).resolve(units ?? []),
    );

  cli.help();
  cli.parse();
}
