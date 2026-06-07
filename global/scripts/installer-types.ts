/**
 * Shared type definitions for the aisf installer.
 * Published as source (.ts) to ~/.aisf/global/installer-types.ts so that
 * skill files can reference authoritative type definitions at runtime.
 */

// ─── unit.json ────────────────────────────────────────────────────────────────

/** A skill entry as declared in unit.json components.skills[]. */
export interface UnitSkillEntry {
  name: string;
  file: string;
  /** Whether this component requires AI-generated custom content before installation. */
  hasCustom?: boolean;
  /** If set, the component is optional and must be explicitly selected to be installed. */
  condition?: string;
}

/** A rule entry as declared in unit.json components.rules[]. */
export interface UnitRuleEntry {
  name: string;
  file: string;
  hasCustom?: boolean;
  condition?: string;
}

/** A script entry as declared in unit.json components.scripts[]. */
export interface UnitScriptEntry {
  name: string;
  file: string;
  /** lefthook hook name to register this script under (e.g. "pre-commit"). */
  hook: string;
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

/** Parsed structure of ~/.aisf/units/{unit}/unit.json. */
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
}

/** Installation record for a single unit, written into .aisf/installed.json. */
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

/** Shape of .aisf/installed.json — tracks all installed units in the project. */
export interface InstalledJson {
  units: Record<string, InstalledEntry>;
}

// ─── prepare command output ───────────────────────────────────────────────────

/**
 * One item in the array returned by `installer prepare`.
 * Describes a hasCustom component that needs AI-generated content before installation.
 * The caller writes rendered content to `tempPath`, then calls `installer install`.
 */
export interface PrepareItem {
  componentType: "skill" | "rule" | "resource";
  /** Path to the unit's source template file. */
  templatePath: string;
  /** Final destination path where the component will be installed. */
  targetPath: string;
  /**
   * Previously installed path for this component name, if recorded in installed.json.
   * Present when the component was installed before, even if the path changed since the last install.
   * Use this to read existing content when generating updated content.
   */
  currentPath?: string;
  /** Temporary staging path — write rendered content here; install() moves it to targetPath. */
  tempPath: string;
  /** Whether targetPath already exists (true = update, false = first install). */
  exists: boolean;
}

// ─── internal component specs (installer-only) ───────────────────────────────

/** Resolved install spec for a skill component (condition stripped — filter-only field). */
export interface SkillSpec extends Omit<UnitSkillEntry, "condition"> {
  type: "skill";
}

/** Resolved install spec for a rule component. */
export interface RuleSpec extends Omit<UnitRuleEntry, "condition"> {
  type: "rule";
}

/** Resolved install spec for a pre-commit script component. */
export interface ScriptSpec extends UnitScriptEntry {
  type: "script";
}

/** Resolved install spec for a resource component. */
export interface ResourceSpec extends Omit<UnitResourceEntry, "condition"> {
  type: "resource";
}

/** Union of all resolved component spec types. */
export type ComponentSpec = SkillSpec | RuleSpec | ScriptSpec | ResourceSpec;
