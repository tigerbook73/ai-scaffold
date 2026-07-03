/**
 * Shared type definitions for the aisk installer, read directly from this
 * repo (aiskHome) by the installer — there is no separate publish step.
 */

// ─── unit.json ────────────────────────────────────────────────────────────────

/** A skill entry as declared in unit.json components.skills[]. */
export interface UnitSkillEntry {
  name: string;
  file: string;
  /** Whether this component contains AISK:CUSTOM blocks requiring user customization. */
  hasCustom?: boolean;
  /** If set, the component is optional. */
  condition?: string;
}

/** A rule entry as declared in unit.json components.rules[]. */
export interface UnitRuleEntry {
  name: string;
  file: string;
  hasCustom?: boolean;
  condition?: string;
  /** Hint shown when the AISK:CUSTOM block needs to be filled. */
  hint?: string;
}

/** A script entry as declared in unit.json components.scripts[]. */
export interface UnitScriptEntry {
  name: string;
  file: string;
  /** lefthook hook name to register this script under (e.g. "pre-commit"). */
  hook?: string;
  /** lefthook template variables to append as CLI args, e.g. ["staged_files"] → {staged_files} */
  params?: string[];
}

/** A resource entry as declared in unit.json components.resources[]. */
export interface UnitResourceEntry {
  name: string;
  file: string;
  hasCustom?: boolean;
  condition?: string;
}

/** Parsed structure of units/{unit}/unit.json. */
export interface UnitJson {
  name: string;
  description?: string;
  /** Names of units that must be installed before this one. */
  dependencies: string[];
  components: {
    skills?: UnitSkillEntry[];
    rules?: UnitRuleEntry[];
    scripts?: UnitScriptEntry[];
    resources?: UnitResourceEntry[];
  };
}

// ─── installed.json (local units only) ─────────────────────────────────────────

/** A single installed component, identified by name with its project-relative file path. */
export interface InstalledComponent {
  /** Component name from unit.json — stable identifier used to detect renames across installs. */
  name: string;
  /** Project-relative path of the installed file. */
  path: string;
  /** Customization status for hasCustom components. undefined = no AISK:CUSTOM blocks. */
  customStatus?: "todo" | "done";
}

/** Installation record for a single local unit, written into .aisk/installed.json. */
export interface InstalledEntry {
  installedAt: string;
  /** Every installed file, grouped by component type and keyed by component name. */
  components: {
    skills: InstalledComponent[];
    rules: InstalledComponent[];
    scripts: InstalledComponent[];
    resources: InstalledComponent[];
  };
}

/** Shape of .aisk/installed.json — tracks all installed local units in the project. */
export interface InstalledJson {
  units: Record<string, InstalledEntry>;
}

// ─── command output types ─────────────────────────────────────────────────────

/** Result for a single installed/updated/removed component. */
export interface ComponentOpResult {
  type: "skill" | "rule" | "script" | "resource";
  name: string;
  path: string;
  /** Customization status; undefined means no AISK:CUSTOM blocks. */
  customStatus?: "todo" | "done";
  /** lefthook hook name if this script was registered. */
  hook?: string;
  /** Whether this component is optional (has a condition field). */
  optional?: boolean;
}

/** Result for a single unit in a batch init/update operation. */
export interface UnitOpResult {
  name: string;
  /** True if this unit was auto-installed as a transitive (local-to-local) dependency. */
  autoDep?: boolean;
  components: ComponentOpResult[];
}

/** A unit that failed to process. */
export interface FailedUnit {
  name: string;
  reason: string;
}

/** Output of the init command. */
export interface InitResult {
  added: UnitOpResult[];
  updated: UnitOpResult[];
  failed: FailedUnit[];
}

/** Output of the remove command. */
export interface RemoveResult {
  removed: UnitOpResult[];
  failed: FailedUnit[];
}

/** Output of the update command. */
export interface UpdateResult {
  updated: UnitOpResult[];
  failed: FailedUnit[];
}

/** A file with pending todo customization, grouped by unit. */
export interface RefreshTodoUnit {
  unit: string;
  files: string[];
}

/** Output of the refresh command (silent mode omits this). */
export interface RefreshResult {
  todo: RefreshTodoUnit[];
}

/** A component entry in the show command output. Scope is unit-level (see ShowResult), not per-component. */
export interface ShowComponentResult {
  type: "skill" | "rule" | "script" | "resource";
  name: string;
  optional: boolean;
  condition?: string;
  /** Present only for local units' hasCustom components. */
  customStatus?: "todo" | "done";
  hook?: string;
  /** Global unit: whether the registered symlink exists on disk. Local unit: whether the project file exists. */
  installed: boolean;
}

/** Output of the show command. */
export interface ShowResult {
  name: string;
  description: string;
  dependencies: string[];
  /** "global": managed only via register/unregister. "local": managed via init/update/remove per project. */
  scope: "global" | "local";
  /** Global unit: whether it's in the registry record. Local unit: whether it's installed in this project. */
  installed: boolean;
  components: ShowComponentResult[];
}

/** A unit entry in the list command output. */
export interface ListUnit {
  name: string;
  description: string;
  scope: "global" | "local";
  /** Global unit: whether it's in the registry record. Local unit: whether it's installed in this project. */
  installed: boolean;
  /** True if any installed component has customStatus "todo" (local units only). */
  hasTodo?: boolean;
}

/** Output of the list command. */
export interface ListResult {
  units: ListUnit[];
}

// ─── register/unregister command output (global units) ────────────────────────

/** One symlinked directory under ~/.claude/skills, tracked so unregister can wipe it deterministically. */
export interface RegistryEntry {
  /** "setup" for the fixed aisk-setup entry. */
  unit: string;
  /** Absent for the aisk-setup entry. */
  skill?: string;
  /** Absolute path of the aisk-* directory under globalSkillsDir. */
  dir: string;
}

/** Persisted at {globalSkillsDir}/.aisk-registry.json — the source of truth for what register() must clean up. */
export interface RegistryJson {
  registeredAt: string;
  entries: RegistryEntry[];
}

/** Output of the register command. */
export interface RegisterResult {
  registered: RegistryEntry[];
  /** Entries removed before rebuilding, read from the previous registry record (not a naming-prefix scan). */
  unregisteredPrevious: RegistryEntry[];
  /** Local unit names skipped — they have no global presence. */
  skippedLocal: string[];
}

/** Output of the unregister command (whole-registry wipe only, no per-unit granularity). */
export interface UnregisterResult {
  removed: RegistryEntry[];
}

// ─── internal component specs (installer-only) ───────────────────────────────

/** Resolved install spec for a skill component (condition stripped — filter-only field). */
export interface SkillSpec extends Omit<UnitSkillEntry, "condition"> {
  type: "skill";
  optional?: boolean;
}

/** Resolved install spec for a rule component. */
export interface RuleSpec extends Omit<UnitRuleEntry, "condition"> {
  type: "rule";
  optional?: boolean;
}

/** Resolved install spec for a pre-commit script component. */
export interface ScriptSpec extends UnitScriptEntry {
  type: "script";
}

/** Resolved install spec for a resource component. */
export interface ResourceSpec extends Omit<UnitResourceEntry, "condition"> {
  type: "resource";
  optional?: boolean;
}

/** Union of all resolved component spec types. */
export type ComponentSpec = SkillSpec | RuleSpec | ScriptSpec | ResourceSpec;

// ─── AISK:CUSTOM block (installer-internal) ───────────────────────────────────

/** A parsed AISK:CUSTOM block found in an installed component file. */
export interface CustomBlock {
  name: string;
  status: "todo" | "done";
  hint: string;
  /** 0-indexed line number of the start marker. */
  startLine: number;
  /** 0-indexed line number of the end marker. */
  endLine: number;
  /** Lines between start and end markers (exclusive). */
  content: string[];
}
