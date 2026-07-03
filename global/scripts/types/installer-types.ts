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
  /** If true, this component is copied into the project even without hasCustom (e.g. must run per-project). */
  localCopy?: true;
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
  /** If true, bundle this script into the project instead of pointing hooks at the global symlink copy. */
  localCopy?: true;
}

/** A resource entry as declared in unit.json components.resources[]. */
export interface UnitResourceEntry {
  name: string;
  file: string;
  hasCustom?: boolean;
  condition?: string;
  /** If true, this component is copied into the project even without hasCustom. */
  localCopy?: true;
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

// ─── installed.json ───────────────────────────────────────────────────────────

/** A single installed component, identified by name with its project-relative file path. */
export interface InstalledComponent {
  /** Component name from unit.json — stable identifier used to detect renames across installs. */
  name: string;
  /** Project-relative path of the installed file. */
  path: string;
  /** Customization status for hasCustom components. undefined = no AISK:CUSTOM blocks. */
  customStatus?: "todo" | "done";
}

/** Installation record for a single unit, written into .aisk/installed.json. */
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

/** Shape of .aisk/installed.json — tracks all installed units in the project. */
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

/** Result for a single unit in a batch add/update operation. */
export interface UnitOpResult {
  name: string;
  /** True if this unit was auto-added as a transitive dependency. */
  autoDep?: boolean;
  components: ComponentOpResult[];
}

/** A unit that failed to process. */
export interface FailedUnit {
  name: string;
  reason: string;
}

/** Output of the add command. */
export interface AddResult {
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

/** A component entry in the show command output. */
export interface ShowComponentResult {
  type: "skill" | "rule" | "script" | "resource";
  name: string;
  optional: boolean;
  condition?: string;
  /** "global": served by the sync-global symlink; "local": copied into the project (hasCustom/localCopy). */
  scope: "global" | "local";
  /** Present only for local, hasCustom components. */
  customStatus?: "todo" | "done";
  hook?: string;
  /** For scope "global": whether the sync-global symlink exists on disk. For "local": whether the project file exists. */
  installed: boolean;
}

/** Output of the show command. */
export interface ShowResult {
  name: string;
  description: string;
  dependencies: string[];
  installed: boolean;
  /** True if the unit is temporarily disabled (declares rules components). */
  disabled: boolean;
  disabledReason?: string;
  components: ShowComponentResult[];
}

/** A unit entry in the list command output. */
export interface ListUnit {
  name: string;
  description: string;
  installed: boolean;
  /** True if any installed component has customStatus "todo". */
  hasTodo?: boolean;
}

// ─── sync-global command output ───────────────────────────────────────────────

/** A single global skill directory that was created/verified by sync-global. */
export interface SyncGlobalLinkResult {
  unit: string;
  skill: string;
  /** Absolute path of the skill directory under ~/.claude/skills. */
  path: string;
}

/** Output of the sync-global command. */
export interface SyncGlobalResult {
  /** Skill directories linked (created or already up to date), including aisk-setup. */
  linked: SyncGlobalLinkResult[];
  /** Stale managed (aisk-*) entries removed because their unit/skill is gone or disabled. */
  removedStale: string[];
  /** Unit names skipped because they are disabled (declare rules components). */
  skippedDisabled: string[];
}

/** Output of the list command. */
export interface ListResult {
  units: ListUnit[];
}

// ─── resolve command output ───────────────────────────────────────────────────

/**
 * Full changeset returned by `installer resolve`.
 * Computed from the desired state (selected unit names) vs. the current installed state.
 */
export interface ResolveResult {
  /** Currently installed units that are not in the desired state and will be removed. */
  to_remove: string[];
  /** Units that need to be freshly installed (from selected list + auto-added deps). */
  to_install: string[];
  /** Units in the selected list that are already installed and will be updated. */
  to_update: string[];
  /** Topologically sorted install order for to_install ∪ to_update. */
  order: string[];
  /** Transitive dependencies that were automatically added to to_install. */
  auto: string[];
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
