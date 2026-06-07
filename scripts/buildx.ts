import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { basename, extname, join, resolve } from "path";

interface SkillEntry {
  name: string;
  file: string;
}

interface RuleEntry {
  name: string;
  file: string;
  condition?: string;
  hint?: string;
  hasCustom?: boolean;
}

interface ScriptEntry {
  name: string;
  file: string;
  hook?: string;
  params?: string[];
}

interface ResourceEntry {
  name: string;
  file: string;
}

interface UnitJson {
  name: string;
  description: string;
  dependencies: string[];
  components: {
    skills?: SkillEntry[];
    rules?: RuleEntry[];
    scripts?: ScriptEntry[];
    resources?: ResourceEntry[];
  };
}

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

function scanFiles(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => exts.includes(extname(f)))
    .sort();
}

function nameFromFilename(filename: string): string {
  return basename(filename, extname(filename));
}

function hasAisfCustom(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  return /AISF:CUSTOM/.test(readFileSync(filePath, "utf8"));
}

function extractHint(filePath: string): string | undefined {
  if (!existsSync(filePath)) return undefined;
  const match = readFileSync(filePath, "utf8").match(/AISF:CUSTOM.*?hint="([^"]+)"/);
  return match?.[1];
}

/**
 * Refreshes unit.json from the filesystem.
 * - Auto-discovers component files in skills/, rules/, scripts/, resources/
 * - Preserves manually-maintained fields: description, dependencies, rules[].condition, scripts[].hook/params
 * - Extracts rules[].hint from AISF:CUSTOM blocks
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

  const skills: SkillEntry[] = scanFiles(join(unitSrcDir, "skills"), [".md"]).map((f) => ({
    name: nameFromFilename(f),
    file: `skills/${f}`,
  }));

  const rules: RuleEntry[] = scanFiles(join(unitSrcDir, "rules"), [".md"]).map((f) => {
    const name = nameFromFilename(f);
    const filePath = join(unitSrcDir, "rules", f);
    const prev = existingRules.get(name);
    const entry: RuleEntry = { name, file: `rules/${f}` };
    if (prev?.condition) entry.condition = prev.condition;
    const hint = extractHint(filePath);
    if (hint) entry.hint = hint;
    if (hasAisfCustom(filePath)) entry.hasCustom = true;
    return entry;
  });

  const scripts: ScriptEntry[] = scanFiles(join(unitSrcDir, "scripts"), [".ts"]).map((f) => {
    const name = nameFromFilename(f);
    const prev = existingScripts.get(name);
    const entry: ScriptEntry = { name, file: `scripts/${f}` };
    if (prev?.hook) entry.hook = prev.hook;
    if (prev?.params?.length) entry.params = prev.params;
    return entry;
  });

  const resources: ResourceEntry[] = scanFiles(join(unitSrcDir, "resources"), [".md"]).map((f) => ({
    name: nameFromFilename(f),
    file: `resources/${f}`,
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
  const unitsDir = join(repoRoot, "ai-units");

  if (!existsSync(unitsDir)) {
    console.error("Error: ai-units/ not found");
    process.exit(1);
  }

  console.log("buildx: refreshing unit.json files...");
  let updatedCount = 0;
  for (const unitName of readdirSync(unitsDir)) {
    if (refreshUnit(join(unitsDir, unitName))) {
      console.log(`  updated: ${unitName}`);
      updatedCount++;
    }
  }

  console.log("\nbuildx: checking dependencies...");
  if (!checkDependencies(unitsDir)) {
    process.exit(1);
  }

  const order = computeGlobalOrder(unitsDir);
  writeFileSync(join(unitsDir, "units.json"), JSON.stringify(order, null, 2) + "\n");
  console.log(`\nbuildx complete. ${updatedCount} unit(s) updated. Order: [${order.join(", ")}]`);
}
