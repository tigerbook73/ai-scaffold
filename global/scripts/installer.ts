/**
 * Runtime installer for aisk units.
 *
 * Invoked via the `ai-skills` CLI (bin/cli.ts), which passes the package root
 * (wherever this repo is `bun link`ed or installed from) as aiskHome — there is
 * no separate global publish step. Units are split into two mutually exclusive
 * scopes: "global" units (no rules, no hook script, no hasCustom component) are
 * managed once per machine via register/unregister and symlinked into
 * ~/.claude/skills; "local" units need project-local files (rules, a lefthook
 * hook, or AISK:CUSTOM content) and are managed per-project via init/update/remove.
 */
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  rmdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "fs";
import { dirname, join, relative } from "path";
import { homedir } from "os";
import { execFileSync } from "child_process";
import { mergeCustomContent, parseCustomBlocks } from "./libs/custom-blocks";
import { addPreCommitHook, removePreCommitHook } from "./libs/precommit-lefthook";
import type {
  UnitJson,
  InstalledComponent,
  InstalledEntry,
  InstalledJson,
  ScriptSpec,
  ComponentSpec,
  InitResult,
  RemoveResult,
  UpdateResult,
  RefreshResult,
  ShowResult,
  ListResult,
  ComponentOpResult,
  RegistryEntry,
  RegistryJson,
  RegisterResult,
  UnregisterResult,
} from "./types/installer-types";

export type {
  InitResult,
  RemoveResult,
  UpdateResult,
  RefreshResult,
  ShowResult,
  RegisterResult,
  UnregisterResult,
};

/** Fixed symlink name for the global setup skill. */
const SETUP_SKILL_NAME = "aisk-setup";
/** Registration record filename, stored directly under globalSkillsDir. */
const REGISTRY_FILENAME = ".aisk-registry.json";

// ─── Installer ───────────────────────────────────────────────────────────────

/**
 * Core installer that manages unit lifecycle for a given project directory
 * (local units: list/init/update/remove/refresh/show) and for the machine as
 * a whole (global units: register/unregister).
 */
export class Installer {
  /** Absolute path to the package root that units/ is read from (the ai-skills package itself). */
  readonly aiskHome: string;
  /** Absolute path to the target project directory. */
  readonly cwd: string;
  /** When true, output is JSON instead of human-readable text (human is the default). */
  readonly json: boolean;
  /** Absolute path to `~/.claude/skills` (injectable so tests never touch the real home dir). */
  readonly globalSkillsDir: string;

  /**
   * @param cwd            Project root to install local units into (defaults to process.cwd()).
   * @param aiskHome       Package root to read units/ from (the ai-skills package's own directory).
   * @param json           When true, output JSON instead of human-readable text.
   * @param globalSkillsDir Override for `~/.claude/skills` (defaults to the real home dir; tests inject a temp dir).
   */
  constructor(cwd: string, aiskHome: string, json = false, globalSkillsDir?: string) {
    this.cwd = cwd;
    this.aiskHome = aiskHome;
    this.json = json;
    this.globalSkillsDir = globalSkillsDir ?? join(homedir(), ".claude", "skills");
  }

  // ─── Public API — read-only, dual scope ────────────────────────────────────

  /** List units (global + local by default) with their registration/install status. */
  list(scope: "global" | "local" | "all" = "all"): void {
    this.refresh(true);
    const installed = this.readInstalled();
    const registeredUnits = new Set(this.readRegistry().entries.map((e) => e.unit));
    const unitList = this.getUnitList().filter((u) => scope === "all" || u.scope === scope);

    const units: ListResult["units"] = unitList.map((u) => {
      if (u.scope === "global") {
        return {
          name: u.name,
          description: u.description,
          scope: u.scope,
          installed: registeredUnits.has(u.name),
        };
      }
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
        scope: u.scope,
        installed: !!entry,
        ...(hasTodo ? { hasTodo: true } : {}),
      };
    });

    const result: ListResult = { units };
    if (this.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } else {
      this.printListHuman(result);
    }
  }

  /** Show details for a single unit, dispatching to global or local presentation by its scope. */
  show(unitName: string): void {
    const unitJson = this.readUnitJson(unitName);
    if (!unitJson) {
      console.error(`Error: unit "${unitName}" not found in units/`);
      process.exit(1);
    }

    const local = this.isLocalUnit(unitJson);
    const components: ShowResult["components"] = [];
    let installed: boolean;

    if (local) {
      const entry = this.readInstalled().units[unitName];
      installed = !!entry;

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
    } else {
      const registry = this.readRegistry();
      installed = registry.entries.some((e) => e.unit === unitName);
      const firstSkillName = (unitJson.components.skills ?? [])[0]?.name;
      const globalDir = (skillName: string) =>
        join(this.globalSkillsDir, this.globalDirName(unitName, skillName));

      for (const comp of unitJson.components.skills ?? []) {
        components.push({
          type: "skill",
          name: comp.name,
          optional: !!comp.condition,
          condition: comp.condition,
          installed: existsSync(join(globalDir(comp.name), "SKILL.md")),
        });
      }
      for (const comp of unitJson.components.scripts ?? []) {
        components.push({
          type: "script",
          name: comp.name,
          optional: false,
          hook: comp.hook,
          installed: !!firstSkillName && existsSync(join(globalDir(firstSkillName), comp.file)),
        });
      }
      for (const comp of unitJson.components.resources ?? []) {
        components.push({
          type: "resource",
          name: comp.name,
          optional: !!comp.condition,
          condition: comp.condition,
          installed: !!firstSkillName && existsSync(join(globalDir(firstSkillName), comp.file)),
        });
      }
      // A global unit has no rules component by construction (rules ⇒ local).
    }

    const result: ShowResult = {
      name: unitName,
      description: unitJson.description ?? "",
      dependencies: unitJson.dependencies,
      scope: local ? "local" : "global",
      installed,
      components,
    };

    if (this.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } else {
      this.printShowHuman(result);
    }
  }

  // ─── Public API — global units (machine-wide, no project scoping) ─────────

  /**
   * Rebuild everything under `~/.claude/skills`: unregister whatever the previous
   * registration record listed, then symlink `aisk-setup` and every global unit's
   * skill (+ resources/scripts when declared) fresh, and persist the new record.
   * Local units are skipped entirely. Cleanup is driven only by the registry file —
   * there is no naming-prefix fallback scan.
   */
  register(): void {
    const result = this.registerInternal();
    if (this.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } else {
      this.printRegisterHuman(result);
    }
  }

  /** Remove everything the registry record lists and delete the record itself. Whole-registry only. */
  unregister(): void {
    const prev = this.readRegistry();
    const removed = this.unregisterInternal(prev.entries);
    const registryPath = join(this.globalSkillsDir, REGISTRY_FILENAME);
    if (existsSync(registryPath)) rmSync(registryPath);

    const result: UnregisterResult = { removed };
    if (this.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } else {
      this.printUnregisterHuman(result);
    }
  }

  // ─── Public API — local units (project-scoped) ─────────────────────────────

  /**
   * Install one or more local units into the current project. "all" installs every
   * not-yet-installed local unit. Already-installed units convert to an update.
   * Local-to-local dependencies are auto-installed (autoDep); a dependency that is
   * a global unit needs no action since it's always available once registered.
   */
  init(names: string[]): void {
    this.refresh(true);
    const installed = this.readInstalled();
    const allUnits = this.getUnitList();
    const availableSet = new Set(allUnits.map((u) => u.name));
    const localSet = new Set(allUnits.filter((u) => u.scope === "local").map((u) => u.name));

    const requestedNames = names.includes("all")
      ? [...localSet].filter((n) => !installed.units[n])
      : names;

    const result: InitResult = { added: [], updated: [], failed: [] };

    const toInstall: string[] = [];
    const toUpdate: string[] = [];

    for (const name of requestedNames) {
      if (!availableSet.has(name)) {
        result.failed.push({ name, reason: "unit 不在注册表中" });
        continue;
      }
      if (!localSet.has(name)) {
        result.failed.push({
          name,
          reason: "unit 为全局 unit,已通过 ai-skills register 在所有项目可用,无需 init",
        });
        continue;
      }
      if (installed.units[name]) {
        toUpdate.push(name);
      } else {
        toInstall.push(name);
      }
    }

    const { order, autoDeps } = this.resolveFreshDeps(
      toInstall,
      new Set(Object.keys(installed.units)),
    );

    for (const name of order) {
      try {
        const comps = this.installUnitAllComponents(name);
        result.added.push({ name, autoDep: autoDeps.has(name), components: comps });
      } catch (e) {
        result.failed.push({ name, reason: String(e) });
      }
    }

    for (const name of toUpdate) {
      try {
        const comps = this.updateUnitComponents(name);
        result.updated.push({ name, components: comps });
      } catch (e) {
        result.failed.push({ name, reason: String(e) });
      }
    }

    if (this.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } else {
      this.printInitHuman(result);
    }
  }

  /**
   * Remove one or more installed local units. "all" removes all installed units.
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

    if (this.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } else {
      this.printRemoveHuman(result);
    }
  }

  /**
   * Update one or more installed local units. "all" updates all installed units.
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

    if (this.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } else {
      this.printUpdateHuman(result);
    }
  }

  /**
   * Scan all installed local component files for AISK:CUSTOM block status,
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

      // Clean up hooks for scripts whose files no longer exist.
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
      if (this.json) {
        process.stdout.write(JSON.stringify(refreshResult, null, 2) + "\n");
      } else {
        this.printRefreshHuman(refreshResult);
      }
    }
  }

  /** Reads and parses .aisk/installed.json from the project directory. */
  readInstalled(): InstalledJson {
    const installedPath = join(this.cwd, ".aisk", "installed.json");
    if (!existsSync(installedPath)) return { units: {} };
    return JSON.parse(readFileSync(installedPath, "utf8")) as InstalledJson;
  }

  // ─── Local unit — unit-level operations ────────────────────────────────────

  /**
   * Install a local unit with ALL components (required + optional). Every
   * component is copied unconditionally — a local unit is wholly local, there
   * is no per-component global/local mixing.
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
          const ic = this.installScriptLocal(unitName, spec);
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
   * Update an installed local unit.
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
          const ic = this.installScriptLocal(unitName, spec);
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

  /** Remove all components of an installed local unit and clean up hooks. */
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
   * Bundle a local unit's script (source .ts, plus any local imports/deps such as
   * ./libs or npm packages) into a single file at .aisk/{unit}/scripts/{name}.js
   * and register its hook if declared. Every local unit script is bundled
   * unconditionally — global units never reach this path (a hook script makes
   * a unit local by definition).
   */
  private installScriptLocal(unitName: string, spec: ScriptSpec): InstalledComponent {
    const entry = join(this.aiskHome, "units", unitName, spec.file);
    if (!existsSync(entry)) throw new Error(`script source not found: ${entry}`);

    const destDir = join(this.cwd, ".aisk", unitName, "scripts");
    mkdirSync(destDir, { recursive: true });
    const destFile = join(destDir, `${spec.name}.js`);
    execFileSync("bun", ["build", entry, "--outfile", destFile, "--target", "node"]);

    const relPath = join(".aisk", unitName, "scripts", `${spec.name}.js`);
    if (spec.hook) {
      const paramStr = (spec.params ?? []).map((p) => `{${p}}`).join(" ");
      const runCmd = paramStr ? `bun ${relPath} ${paramStr}` : `bun ${relPath}`;
      addPreCommitHook(this.cwd, `aisk-${unitName}-${spec.name}`, runCmd);
    }

    return { name: spec.name, path: relPath };
  }

  // ─── Global units — register/unregister ────────────────────────────────────

  private registerInternal(): RegisterResult {
    const skillsDir = this.globalSkillsDir;
    mkdirSync(skillsDir, { recursive: true });

    const prev = this.readRegistry();
    const unregisteredPrevious = this.unregisterInternal(prev.entries);

    const registered: RegistryEntry[] = [];
    const skippedLocal: string[] = [];

    const setupDir = join(skillsDir, SETUP_SKILL_NAME);
    this.ensureSymlink(join(this.aiskHome, "global", "setup"), setupDir);
    registered.push({ unit: "setup", dir: setupDir });

    const unitsDir = join(this.aiskHome, "units");
    const unitNames = existsSync(unitsDir)
      ? readdirSync(unitsDir).filter((n) => existsSync(join(unitsDir, n, "unit.json")))
      : [];

    for (const unitName of unitNames) {
      const unitJson = this.readUnitJson(unitName);
      if (!unitJson) continue;
      if (this.isLocalUnit(unitJson)) {
        skippedLocal.push(unitName);
        continue;
      }

      for (const skill of unitJson.components.skills ?? []) {
        const dirName = this.globalDirName(unitName, skill.name);
        const dest = join(skillsDir, dirName);
        mkdirSync(dest, { recursive: true });

        this.ensureSymlink(
          join(this.aiskHome, "units", unitName, skill.file),
          join(dest, "SKILL.md"),
        );

        const resourcesDest = join(dest, "resources");
        if ((unitJson.components.resources ?? []).length > 0) {
          this.ensureSymlink(join(this.aiskHome, "units", unitName, "resources"), resourcesDest);
        } else {
          this.removeIfSymlink(resourcesDest);
        }

        const scriptsDest = join(dest, "scripts");
        if ((unitJson.components.scripts ?? []).length > 0) {
          this.ensureSymlink(join(this.aiskHome, "units", unitName, "scripts"), scriptsDest);
        } else {
          this.removeIfSymlink(scriptsDest);
        }

        registered.push({ unit: unitName, skill: skill.name, dir: dest });
      }
    }

    this.writeRegistry({ registeredAt: new Date().toISOString(), entries: registered });

    return { registered, unregisteredPrevious, skippedLocal };
  }

  /** Remove every directory the given registry entries point at. Idempotent (missing dirs are a no-op). */
  private unregisterInternal(entries: RegistryEntry[]): RegistryEntry[] {
    for (const e of entries) {
      rmSync(e.dir, { recursive: true, force: true });
    }
    return entries;
  }

  /** Create/replace a symlink at dest pointing to src. No-op if already correct. */
  private ensureSymlink(src: string, dest: string): void {
    let existingType: "symlink" | "other" | "none" = "none";
    try {
      existingType = lstatSync(dest).isSymbolicLink() ? "symlink" : "other";
    } catch {
      existingType = "none";
    }

    if (existingType === "symlink") {
      if (readlinkSync(dest) === src) return;
      rmSync(dest);
    } else if (existingType === "other") {
      // Everything under a registered aisk-* directory is owned by register().
      rmSync(dest, { recursive: true, force: true });
    }

    mkdirSync(dirname(dest), { recursive: true });
    symlinkSync(src, dest);
  }

  /** Remove dest if it is a symlink (used to prune components a unit no longer declares). */
  private removeIfSymlink(dest: string): void {
    try {
      if (lstatSync(dest).isSymbolicLink()) rmSync(dest);
    } catch {
      /* doesn't exist */
    }
  }

  /** Read the registration record, or an empty one if register() has never run. */
  private readRegistry(): RegistryJson {
    const path = join(this.globalSkillsDir, REGISTRY_FILENAME);
    if (!existsSync(path)) return { registeredAt: "", entries: [] };
    return JSON.parse(readFileSync(path, "utf8")) as RegistryJson;
  }

  /** Persist the registration record. */
  private writeRegistry(registry: RegistryJson): void {
    mkdirSync(this.globalSkillsDir, { recursive: true });
    writeFileSync(
      join(this.globalSkillsDir, REGISTRY_FILENAME),
      JSON.stringify(registry, null, 2) + "\n",
    );
  }

  // ─── Classification & naming ────────────────────────────────────────────────

  /**
   * A unit is local iff it needs any project-local file: a rules component, a
   * script with a lefthook hook, or a hasCustom skill/resource (AISK:CUSTOM
   * content is inherently per-project). Otherwise it's global. A unit is wholly
   * one or the other — never a mix of local and global components.
   */
  private isLocalUnit(unitJson: UnitJson): boolean {
    return (
      (unitJson.components.rules ?? []).length > 0 ||
      (unitJson.components.scripts ?? []).some((s) => s.hook) ||
      (unitJson.components.skills ?? []).some((s) => s.hasCustom) ||
      (unitJson.components.resources ?? []).some((r) => r.hasCustom)
    );
  }

  /**
   * Global directory name under globalSkillsDir. When the skill's name equals
   * the unit's name the segment isn't repeated (e.g. staged-plan → aisk-staged-plan);
   * otherwise both names appear (e.g. walkthrough/create-walkthrough →
   * aisk-walkthrough-create-walkthrough). Does not apply to aisk-setup or to any
   * project-local path.
   */
  private globalDirName(unitName: string, skillName: string): string {
    return unitName === skillName ? `aisk-${unitName}` : `aisk-${unitName}-${skillName}`;
  }

  // ─── Dependency resolution (init only — local-to-local, no separate command) ──

  /**
   * Resolve transitive local-to-local dependencies for a fresh-install list.
   * A dependency that is itself a global unit needs no action (always available)
   * and is skipped; a dangling dependency name (not in the registry) is also
   * skipped — that's a unit.json data issue, not something init can act on.
   * Already-installed deps are silently skipped.
   */
  private resolveFreshDeps(
    names: string[],
    installedSet: Set<string>,
  ): { order: string[]; autoDeps: Set<string> } {
    const toInstall = new Set<string>(names);
    const autoDeps = new Set<string>();

    const expand = (name: string) => {
      const unitJson = this.readUnitJson(name);
      if (!unitJson) return;
      for (const dep of unitJson.dependencies) {
        const depJson = this.readUnitJson(dep);
        if (!depJson || !this.isLocalUnit(depJson)) continue;
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

  /** Persist the latest component paths and customStatus for a local unit. */
  private updateInstalled(unitName: string, components: InstalledEntry["components"]): void {
    const installedPath = join(this.cwd, ".aisk", "installed.json");
    mkdirSync(join(this.cwd, ".aisk"), { recursive: true });
    const data = this.readInstalled();
    data.units[unitName] = { installedAt: new Date().toISOString(), components };
    writeFileSync(installedPath, JSON.stringify(data, null, 2) + "\n");
  }

  /** Read one unit definition from aiskHome/units. */
  private readUnitJson(unitName: string): UnitJson | null {
    const path = join(this.aiskHome, "units", unitName, "unit.json");
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as UnitJson;
  }

  /** List every published unit in registry order, tagged with its global/local scope. */
  private getUnitList(): Array<{ name: string; description: string; scope: "global" | "local" }> {
    const unitsDir = join(this.aiskHome, "units");
    if (!existsSync(unitsDir)) return [];

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
          scope: (this.isLocalUnit(unitJson) ? "local" : "global") as "global" | "local",
        };
      })
      .filter((u): u is NonNullable<typeof u> => u !== null);
  }

  /** Read the registry order produced by build.ts at units/units.json. */
  private readGlobalOrder(): string[] {
    const orderPath = join(this.aiskHome, "units", "units.json");
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

  // ─── Human-readable output (Chinese; default output format) ───────────────

  private printListHuman({ units }: ListResult): void {
    if (units.length === 0) {
      process.stdout.write("没有可用的 unit。\n");
      return;
    }

    const globalUnits = units.filter((u) => u.scope === "global");
    const localUnits = units.filter((u) => u.scope === "local");

    if (globalUnits.length > 0) {
      process.stdout.write("全局 unit(register 管理,所有项目自动可用):\n");
      const maxLen = Math.max(...globalUnits.map((u) => u.name.length));
      for (const u of globalUnits) {
        const mark = u.installed ? "✓" : "·";
        process.stdout.write(`  ${mark} ${u.name.padEnd(maxLen + 2)}${u.description}\n`);
      }
    }
    if (localUnits.length > 0) {
      if (globalUnits.length > 0) process.stdout.write("\n");
      process.stdout.write("本地 unit(init/update/remove 管理,按项目安装):\n");
      const maxLen = Math.max(...localUnits.map((u) => u.name.length));
      for (const u of localUnits) {
        const mark = u.installed ? "✓" : "·";
        const todo = u.hasTodo ? "  [有待定制]" : "";
        process.stdout.write(`  ${mark} ${u.name.padEnd(maxLen + 2)}${u.description}${todo}\n`);
      }
    }
  }

  private printInitHuman({ added, updated, failed }: InitResult): void {
    const regular = added.filter((a) => !a.autoDep);
    const auto = added.filter((a) => a.autoDep);
    if (regular.length > 0) {
      process.stdout.write(`已添加:${regular.map((a) => a.name).join(", ")}\n`);
    }
    if (auto.length > 0) {
      process.stdout.write(`  自动依赖:${auto.map((a) => a.name).join(", ")}\n`);
    }
    if (updated.length > 0) {
      process.stdout.write(`已更新:${updated.map((u) => u.name).join(", ")}\n`);
    }
    for (const f of failed) {
      process.stdout.write(`失败:${f.name} — ${f.reason}\n`);
    }
    if (added.length === 0 && updated.length === 0 && failed.length === 0) {
      process.stdout.write("没有需要处理的内容。\n");
    }
  }

  private printRemoveHuman({ removed, failed }: RemoveResult): void {
    if (removed.length > 0) {
      process.stdout.write(`已删除:${removed.map((r) => r.name).join(", ")}\n`);
    }
    for (const f of failed) {
      process.stdout.write(`失败:${f.name} — ${f.reason}\n`);
    }
    if (removed.length === 0 && failed.length === 0) {
      process.stdout.write("没有需要删除的内容。\n");
    }
  }

  private printUpdateHuman({ updated, failed }: UpdateResult): void {
    if (updated.length > 0) {
      process.stdout.write(`已更新:${updated.map((u) => u.name).join(", ")}\n`);
    }
    for (const f of failed) {
      process.stdout.write(`失败:${f.name} — ${f.reason}\n`);
    }
    if (updated.length === 0 && failed.length === 0) {
      process.stdout.write("没有需要更新的内容。\n");
    }
  }

  private printRefreshHuman({ todo }: RefreshResult): void {
    if (todo.length === 0) {
      process.stdout.write("所有定制项已完成。\n");
      return;
    }
    const totalFiles = todo.reduce((n, u) => n + u.files.length, 0);
    process.stdout.write(`${totalFiles} 个文件在 ${todo.length} 个 unit 中待定制:\n`);
    for (const { unit, files } of todo) {
      for (const f of files) {
        process.stdout.write(`  ${unit}: ${f}\n`);
      }
    }
  }

  private printShowHuman(result: ShowResult): void {
    process.stdout.write(`${result.name} — ${result.description}\n`);
    process.stdout.write(
      `范围:${result.scope === "global" ? "全局(register 管理)" : "本地(init 管理)"}\n`,
    );
    if (result.dependencies.length > 0) {
      process.stdout.write(`依赖:${result.dependencies.join(", ")}\n`);
    }
    process.stdout.write(`状态:${result.installed ? "已安装" : "未安装"}\n\n`);
    process.stdout.write("组件:\n");
    for (const c of result.components) {
      const mark = !c.installed ? "·" : c.customStatus === "todo" ? "!" : "✓";
      const typePad = c.type.padEnd(8);
      const todo = c.customStatus === "todo" ? "  [待定制]" : "";
      const notInstalled = !c.installed && c.optional ? "  (可选,未安装)" : "";
      process.stdout.write(`  ${mark} ${typePad} ${c.name}${todo}${notInstalled}\n`);
    }
  }

  private printRegisterHuman({
    registered,
    unregisteredPrevious,
    skippedLocal,
  }: RegisterResult): void {
    process.stdout.write(`已注册 ${registered.length} 个:\n`);
    for (const r of registered) {
      process.stdout.write(`  ${r.unit}${r.skill ? "/" + r.skill : ""} -> ${r.dir}\n`);
    }
    if (unregisteredPrevious.length > 0) {
      process.stdout.write(`\n清理了上次注册的 ${unregisteredPrevious.length} 个条目\n`);
    }
    if (skippedLocal.length > 0) {
      process.stdout.write(`\n跳过的本地 unit:${skippedLocal.join(", ")}\n`);
    }
  }

  private printUnregisterHuman({ removed }: UnregisterResult): void {
    if (removed.length === 0) {
      process.stdout.write("没有已注册的内容。\n");
      return;
    }
    process.stdout.write(`已清空 ${removed.length} 个已注册条目:\n`);
    for (const r of removed) {
      process.stdout.write(`  ${r.unit}${r.skill ? "/" + r.skill : ""} -> ${r.dir}\n`);
    }
  }
}
