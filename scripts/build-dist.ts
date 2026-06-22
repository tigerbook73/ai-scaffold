/**
 * Compiles all distribution artifacts for npm package consumption.
 *
 * Outputs:
 *   dist/cli.js                              — bundled CLI entry point
 *   units/<unit>/scripts/<name>.cjs          — compiled unit hook scripts
 *   units.json                               — copy of units/units.json at package root
 *
 * These artifacts are committed to the repository so that GitHub-installed
 * packages work without a prepare step.
 */
import { buildSync } from "esbuild";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import type { UnitJson } from "../global/scripts/types/installer-types";

const repoRoot = resolve(__dirname, "..");
const unitsDir = join(repoRoot, "units");
const distDir = join(repoRoot, "dist");

function bundle(entryPoint: string, outfile: string): void {
  buildSync({
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    platform: "node",
    format: "cjs",
    minify: false,
    // esbuild itself must not be bundled — it uses native binaries resolved at runtime.
    external: ["esbuild"],
  });
}

function buildCli(): void {
  mkdirSync(distDir, { recursive: true });
  const entry = join(repoRoot, "bin", "cli.ts");
  const out = join(distDir, "cli.js");
  // Override require.main so that installer.ts's own `if (require.main === module)` guard
  // evaluates to false when bundled — prevents its internal CLI from auto-running.
  buildSync({
    entryPoints: [entry],
    outfile: out,
    bundle: true,
    platform: "node",
    format: "cjs",
    minify: false,
    external: ["esbuild"],
    define: { "require.main": "null" },
  });
  console.log("  cli: dist/cli.js");
}

function buildUnitScripts(): void {
  for (const unitName of readdirSync(unitsDir)) {
    const unitJsonPath = join(unitsDir, unitName, "unit.json");
    if (!existsSync(unitJsonPath)) continue;

    const unitJson = JSON.parse(readFileSync(unitJsonPath, "utf8")) as UnitJson;
    const scripts = unitJson.components.scripts ?? [];
    if (scripts.length === 0) continue;

    const scriptsSrc = join(unitsDir, unitName, "scripts");
    const scriptsDest = join(unitsDir, unitName, "scripts");

    for (const script of scripts) {
      const entryFile = script.file.replace(/^scripts\//, "");
      const entryPoint = join(scriptsSrc, entryFile);
      const outfile = join(scriptsDest, `${script.name}.cjs`);
      bundle(entryPoint, outfile);
      console.log(`  script: units/${unitName}/scripts/${script.name}.cjs`);
    }
  }
}

function copyUnitsJson(): void {
  const src = join(unitsDir, "units.json");
  const dest = join(repoRoot, "units.json");
  if (!existsSync(src)) {
    console.warn("  warn: units/units.json not found, skipping");
    return;
  }
  const content = readFileSync(src, "utf8");
  writeFileSync(dest, content);
  console.log("  order: units.json");
}

console.log("Building dist artifacts...\n");
buildCli();
buildUnitScripts();
copyUnitsJson();
console.log("\nDone.");
