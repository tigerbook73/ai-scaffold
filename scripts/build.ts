/**
 * Rebuilds unit metadata from the units/ directory.
 *
 * This script is the source of truth for generated registry files: it refreshes
 * each unit.json from component folders and writes units/units.json in
 * dependency order for deterministic publish/install behavior.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { basename, extname, join, resolve } from "path";
import type {
  UnitSkillEntry,
  UnitRuleEntry,
  UnitScriptEntry,
  UnitResourceEntry,
  UnitJson,
} from "../global/scripts/types/installer-types";

interface ExistingUnitJson {
  name?: string;
  description?: string;
  dependencies?: string[];
  components?: {
    rules?: Array<{ name?: string; condition?: string; [key: string]: unknown }>;
    scripts?: Array<{ name?: string; hook?: string; params?: string[]; [key: string]: unknown }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Return sorted file names in a component directory, or an empty list if absent. */
function scanFiles(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => exts.includes(extname(f)))
    .sort();
}

/**
 * Return sorted relative file paths in a directory tree, or an empty list if absent.
 * Paths use forward slashes and are relative to `dir`.
 */
function scanFilesRecursive(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const nested of scanFilesRecursive(abs, exts)) {
        results.push(`${entry.name}/${nested}`);
      }
    } else if (exts.includes(extname(entry.name))) {
      results.push(entry.name);
    }
  }
  return results;
}

/** Test scripts are intentionally excluded from installable unit script components. */
function isTestScript(filename: string): boolean {
  return /\.(test|spec)\.ts$/.test(filename);
}

/** Derive the component name used in unit.json from its source filename. */
function nameFromFilename(filename: string): string {
  return basename(filename, extname(filename));
}

/** Detect whether a component declares user-preserved customization regions. */
function hasAiskCustom(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  return /AISK:CUSTOM/.test(readFileSync(filePath, "utf8"));
}

/** Extract the first customization hint advertised by a component template. */
function extractHint(filePath: string): string | undefined {
  if (!existsSync(filePath)) return undefined;
  const match = readFileSync(filePath, "utf8").match(/AISK:CUSTOM.*?hint="([^"]+)"/);
  return match?.[1];
}

/**
 * Refreshes unit.json from the filesystem.
 * - Auto-discovers component files in skills/, rules/, scripts/, resources/
 * - Preserves manually-maintained fields: description, dependencies, rules[].condition, scripts[].hook/params
 * - Extracts rules[].hint from AISK:CUSTOM blocks
 * - Removes deprecated fields (scope, provides, required)
 * Returns true if unit.json was updated, false if unchanged or unit.json does not exist.
 */
export function refreshUnit(unitSrcDir: string): boolean {
  const unitJsonPath = join(unitSrcDir, "unit.json");

  const existing: ExistingUnitJson = existsSync(unitJsonPath)
    ? (JSON.parse(readFileSync(unitJsonPath, "utf8")) as ExistingUnitJson)
    : {};

  const existingRules = new Map((existing.components?.rules ?? []).map((r) => [r.name, r]));
  const existingScripts = new Map((existing.components?.scripts ?? []).map((s) => [s.name, s]));

  // The filesystem decides component membership; existing unit.json only keeps
  // fields that are intentionally manual and cannot be inferred from filenames.
  const skills: UnitSkillEntry[] = scanFiles(join(unitSrcDir, "skills"), [".md"]).map((f) => ({
    name: nameFromFilename(f),
    file: `skills/${f}`,
  }));

  const rules: UnitRuleEntry[] = scanFiles(join(unitSrcDir, "rules"), [".md"]).map((f) => {
    const name = nameFromFilename(f);
    const filePath = join(unitSrcDir, "rules", f);
    const prev = existingRules.get(name);
    const entry: UnitRuleEntry = { name, file: `rules/${f}` };
    if (prev?.condition) entry.condition = prev.condition;
    const hint = extractHint(filePath);
    if (hint) entry.hint = hint;
    if (hasAiskCustom(filePath)) entry.hasCustom = true;
    return entry;
  });

  const scripts: UnitScriptEntry[] = scanFiles(join(unitSrcDir, "scripts"), [".ts"])
    .filter((f) => !isTestScript(f))
    .map((f) => {
      const name = nameFromFilename(f);
      const prev = existingScripts.get(name);
      const entry: UnitScriptEntry = { name, file: `scripts/${f}` };
      if (prev?.hook) entry.hook = prev.hook;
      if (prev?.params?.length) entry.params = prev.params;
      return entry;
    });

  const resources: UnitResourceEntry[] = scanFilesRecursive(join(unitSrcDir, "resources"), [
    ".md",
  ]).map((relPath) => ({
    name: relPath.slice(0, -extname(relPath).length),
    file: `resources/${relPath}`,
  }));

  const updated: UnitJson = {
    name: basename(unitSrcDir),
    description: existing.description ?? "TODO",
    dependencies: existing.dependencies ?? [],
    components: {},
  };

  if (skills.length) updated.components.skills = skills;
  if (rules.length) updated.components.rules = rules;
  if (scripts.length) updated.components.scripts = scripts;
  if (resources.length) updated.components.resources = resources;

  const hasComponents = skills.length + rules.length + scripts.length + resources.length > 0;
  const unitJsonExists = existsSync(unitJsonPath);
  // Empty directories without a pre-existing unit.json are not considered units.
  if (!hasComponents && !unitJsonExists) return false;

  const newContent = JSON.stringify(updated, null, 2) + "\n";
  const oldContent = unitJsonExists ? readFileSync(unitJsonPath, "utf8") : "";

  if (newContent === oldContent) return false;
  writeFileSync(unitJsonPath, newContent);
  return true;
}

/**
 * Computes the global topological order of all units in the registry.
 * Uses Kahn's algorithm with lexicographic priority so that units at the same
 * dependency depth are always sorted alphabetically, giving a stable, predictable order.
 *
 * @param unitsDir Absolute path to the directory containing all unit subdirectories.
 * @returns Sorted array of unit names (dependencies before dependents).
 */
export function computeGlobalOrder(unitsDir: string): string[] {
  const deps = new Map<string, string[]>();

  for (const name of readdirSync(unitsDir).sort()) {
    const unitJsonPath = join(unitsDir, name, "unit.json");
    if (!existsSync(unitJsonPath)) continue;
    const unit = JSON.parse(readFileSync(unitJsonPath, "utf8")) as ExistingUnitJson;
    const validDeps = (unit.dependencies ?? []).filter((d) =>
      existsSync(join(unitsDir, d, "unit.json")),
    );
    deps.set(name, validDeps);
  }

  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const name of deps.keys()) {
    inDegree.set(name, 0);
    dependents.set(name, []);
  }
  for (const [name, unitDeps] of deps) {
    for (const dep of unitDeps) {
      inDegree.set(name, (inDegree.get(name) ?? 0) + 1);
      dependents.get(dep)!.push(name);
    }
  }

  const queue = [...deps.keys()].filter((n) => inDegree.get(n) === 0).sort();
  const result: string[] = [];

  // Re-sort after every release so same-depth units remain deterministic even
  // when dependency traversal order changes.
  while (queue.length > 0) {
    const name = queue.shift()!;
    result.push(name);
    const newReady: string[] = [];
    for (const dependent of dependents.get(name) ?? []) {
      const deg = (inDegree.get(dependent) ?? 1) - 1;
      inDegree.set(dependent, deg);
      if (deg === 0) newReady.push(dependent);
    }
    if (newReady.length > 0) {
      queue.push(...newReady);
      queue.sort();
    }
  }

  return result;
}

/**
 * Validate that every declared dependency refers to a unit directory.
 *
 * Missing deps are reported here instead of silently ignored so publish fails
 * before installers see an incomplete registry.
 */
export function checkDependencies(unitsDir: string): boolean {
  const unitNames = new Set(readdirSync(unitsDir));
  let valid = true;

  for (const unitName of unitNames) {
    const unitJsonPath = join(unitsDir, unitName, "unit.json");
    if (!existsSync(unitJsonPath)) continue;

    const unit = JSON.parse(readFileSync(unitJsonPath, "utf8")) as ExistingUnitJson;
    for (const dep of unit.dependencies ?? []) {
      if (!unitNames.has(dep)) {
        console.error(`  error: ${unitName} → dependency "${dep}" not found`);
        valid = false;
      }
    }
  }

  return valid;
}

if (require.main === module) {
  const repoRoot = resolve(__dirname, "..");
  const unitsDir = join(repoRoot, "units");

  if (!existsSync(unitsDir)) {
    console.error("Error: units/ not found");
    process.exit(1);
  }

  console.log("build: refreshing unit.json files...");
  let updatedCount = 0;
  for (const unitName of readdirSync(unitsDir)) {
    if (refreshUnit(join(unitsDir, unitName))) {
      console.log(`  updated: ${unitName}`);
      updatedCount++;
    }
  }

  console.log("\nbuild: checking dependencies...");
  if (!checkDependencies(unitsDir)) {
    process.exit(1);
  }

  const order = computeGlobalOrder(unitsDir);
  writeFileSync(join(unitsDir, "units.json"), JSON.stringify(order, null, 2) + "\n");
  console.log(`\nbuild complete. ${updatedCount} unit(s) updated. Order: [${order.join(", ")}]`);
}
