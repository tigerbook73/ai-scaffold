/**
 * Compiles dist/aisk-setup.js and dist/aisk-register.js — the Node-runnable
 * entry points for a real npm publish (see package.json `publishConfig.bin`).
 * This is dormant scaffolding for a future "install from the npm registry"
 * mode and is not exercised by the day-to-day `bun link` dev workflow (which
 * runs bin/aisk-setup.ts and bin/aisk-register.ts directly).
 *
 * Known limitation: Installer.installScript() shells out to `bun build` at
 * install time regardless of what runtime the CLI itself is running under, so
 * `aisk-setup init` still requires bun on PATH even when dist/aisk-setup.js is
 * invoked via node. Solving that is out of scope until the npm-publish path
 * is actually implemented.
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const repoRoot = resolve(__dirname, "..");
const distDir = join(repoRoot, "dist");

async function buildBin(name: string): Promise<void> {
  mkdirSync(distDir, { recursive: true });
  const entry = join(repoRoot, "bin", `${name}.ts`);
  const out = join(distDir, `${name}.js`);

  const result = await Bun.build({
    entrypoints: [entry],
    outdir: distDir,
    naming: `${name}.js`,
    target: "node",
    format: "cjs",
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }

  // bin/*.ts's shebang targets bun (for `bun link`); the published dist targets node.
  const content = readFileSync(out, "utf8");
  writeFileSync(out, content.replace(/^#!.*\n/, "#!/usr/bin/env node\n"));
  console.log(`  ${name}: dist/${name}.js`);
}

console.log("Building dist artifacts...\n");
Promise.all([buildBin("aisk-setup"), buildBin("aisk-register")])
  .then(() => {
    console.log("\nDone.");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
