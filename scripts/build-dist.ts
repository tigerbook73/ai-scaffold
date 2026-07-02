/**
 * Compiles dist/cli.js — the Node-runnable CLI entry point for a real npm
 * publish (see package.json `publishConfig.bin`). This is dormant scaffolding
 * for a future "install from the npm registry" mode and is not exercised by
 * the day-to-day `bun link` dev workflow (which runs bin/cli.ts directly).
 *
 * Known limitation: Installer.installScript() shells out to `bun build` at
 * install time regardless of what runtime the CLI itself is running under, so
 * `ai-skills install` still requires bun on PATH even when dist/cli.js is
 * invoked via node. Solving that is out of scope until the npm-publish path
 * is actually implemented.
 */
import { buildSync } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const repoRoot = resolve(__dirname, "..");
const distDir = join(repoRoot, "dist");

function buildCli(): void {
  mkdirSync(distDir, { recursive: true });
  const entry = join(repoRoot, "bin", "cli.ts");
  const out = join(distDir, "cli.js");
  buildSync({
    entryPoints: [entry],
    outfile: out,
    bundle: true,
    platform: "node",
    format: "cjs",
    minify: false,
    // esbuild itself must not be bundled — it uses native binaries resolved at runtime.
    external: ["esbuild"],
  });
  // bin/cli.ts's shebang targets bun (for `bun link`); the published dist targets node.
  const content = readFileSync(out, "utf8");
  writeFileSync(out, content.replace(/^#!.*\n/, "#!/usr/bin/env node\n"));
  console.log("  cli: dist/cli.js");
}

console.log("Building dist artifacts...\n");
buildCli();
console.log("\nDone.");
