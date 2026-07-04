/**
 * Shared read-side helpers for global unit classification and the registration
 * record — used by both the project-scoped Installer (list/show need to know
 * what's registered) and bin/aisk-register.ts (which owns the write side).
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { RegistryJson, UnitJson } from "../types/installer-types";

/** Registration record filename, stored directly under globalSkillsDir. */
export const REGISTRY_FILENAME = ".aisk-registry.json";

/** Read one unit definition from aiskHome/units. */
export function readUnitJson(aiskHome: string, unitName: string): UnitJson | null {
  const path = join(aiskHome, "units", unitName, "unit.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as UnitJson;
}

/**
 * A unit is local iff it needs any project-local file: a rules component, a
 * script with a lefthook hook, or a hasCustom skill/resource (AISK:CUSTOM
 * content is inherently per-project). Otherwise it's global. A unit is wholly
 * one or the other — never a mix of local and global components.
 */
export function isLocalUnit(unitJson: UnitJson): boolean {
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
 * aisk-walkthrough-create-walkthrough). Does not apply to any project-local path.
 */
export function globalDirName(unitName: string, skillName: string): string {
  return unitName === skillName ? `aisk-${unitName}` : `aisk-${unitName}-${skillName}`;
}

/** Read the registration record, or an empty one if register() has never run. */
export function readRegistry(globalSkillsDir: string): RegistryJson {
  const path = join(globalSkillsDir, REGISTRY_FILENAME);
  if (!existsSync(path)) return { registeredAt: "", entries: [] };
  return JSON.parse(readFileSync(path, "utf8")) as RegistryJson;
}
