import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

interface ComponentEntry {
  name: string;
  file: string;
  hasCustom?: boolean;
  [key: string]: unknown;
}

interface UnitJson {
  components: {
    skills?: ComponentEntry[];
    rules?: ComponentEntry[];
    resources?: ComponentEntry[];
    [key: string]: ComponentEntry[] | undefined;
  };
  [key: string]: unknown;
}

function containsAisfCustom(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  return /AISF:CUSTOM/.test(readFileSync(filePath, "utf8"));
}

/** Scans all component files in a unit source dir and writes hasCustom flags to unit.json. */
export function augmentUnit(unitSrcDir: string): boolean {
  const unitJsonPath = join(unitSrcDir, "unit.json");
  if (!existsSync(unitJsonPath)) return false;

  const unitJson = JSON.parse(readFileSync(unitJsonPath, "utf8")) as UnitJson;
  let changed = false;

  for (const subdir of ["skills", "rules", "resources"] as const) {
    for (const comp of unitJson.components[subdir] ?? []) {
      const filePath = join(unitSrcDir, comp.file);
      const found = containsAisfCustom(filePath);

      if (found && !comp.hasCustom) {
        comp.hasCustom = true;
        changed = true;
      } else if (!found && comp.hasCustom) {
        delete comp.hasCustom;
        changed = true;
      }
    }
  }

  if (changed) {
    writeFileSync(unitJsonPath, JSON.stringify(unitJson, null, 2) + "\n");
  }
  return changed;
}

if (require.main === module) {
  const repoRoot = resolve(__dirname, "..");
  const unitsDir = join(repoRoot, "ai-units");

  if (!existsSync(unitsDir)) {
    console.error("Error: ai-units/ not found");
    process.exit(1);
  }

  console.log("buildx: scanning AISF:CUSTOM blocks in unit components...\n");
  let updatedCount = 0;
  for (const unitName of readdirSync(unitsDir)) {
    if (augmentUnit(join(unitsDir, unitName))) {
      console.log(`  updated: ${unitName}`);
      updatedCount++;
    }
  }
  console.log(`\nbuildx complete. ${updatedCount} unit(s) updated.`);
}
