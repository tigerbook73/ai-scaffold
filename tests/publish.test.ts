/**
 * @test-file   publish
 * @description Verifies Publish copies unit assets, compiles TypeScript via esbuild, manages global scripts and commands, and writes config.json
 * @ai-generated
 * @reviewed-by
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { Publish } from "../scripts/publish";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "aisk-publish-"));
}

/** Creates a minimal fake repo with an empty ai-units/ so run() does not exit. */
function makeRepoSkeleton(dir: string): void {
  mkdirSync(join(dir, "ai-units"), { recursive: true });
}

function makePublish(dir: string): Publish {
  return new Publish({
    repoRoot: dir,
    aisfHome: join(dir, ".aisf"),
    claudeSkillsDir: join(dir, ".claude", "skills"),
  });
}

// ─── publishUnit: static assets ──────────────────────────────────────────────

/**
 * @test-suite  publishUnit static assets
 * @target      Publish.run() → publishUnit(): copies unit.json, skills/, rules/, resources/
 * @strategy    integration; isolated temp dirs, real fs operations
 * @cases
 *   - [PASS] copies unit.json, skills, rules, and resources to aisfHome/units/{name}
 *   - [PASS] skips directory without unit.json
 *   - [PASS] cleans stale files when re-published
 */
test("publishUnit copies unit.json, skills, rules, resources to aisfHome/units/{name}", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const unitDir = join(dir, "ai-units", "my-unit");
    mkdirSync(join(unitDir, "skills"), { recursive: true });
    mkdirSync(join(unitDir, "rules"), { recursive: true });
    mkdirSync(join(unitDir, "resources"), { recursive: true });
    writeFileSync(join(unitDir, "unit.json"), JSON.stringify({ name: "my-unit", dependencies: [], components: {} }));
    writeFileSync(join(unitDir, "skills", "foo.md"), "# foo");
    writeFileSync(join(unitDir, "rules", "bar.md"), "# bar");
    writeFileSync(join(unitDir, "resources", "baz.md"), "baz content");

    makePublish(dir).run();

    const dest = join(dir, ".aisf", "units", "my-unit");
    assert.equal(
      readFileSync(join(dest, "unit.json"), "utf8"),
      JSON.stringify({ name: "my-unit", dependencies: [], components: {} }),
    );
    assert.equal(readFileSync(join(dest, "skills", "foo.md"), "utf8"), "# foo");
    assert.equal(readFileSync(join(dest, "rules", "bar.md"), "utf8"), "# bar");
    assert.equal(readFileSync(join(dest, "resources", "baz.md"), "utf8"), "baz content");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publishUnit skips directory without unit.json", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    mkdirSync(join(dir, "ai-units", "no-json-unit"), { recursive: true });

    makePublish(dir).run();

    assert.equal(existsSync(join(dir, ".aisf", "units", "no-json-unit")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publishUnit cleans stale files when re-published", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const unitDir = join(dir, "ai-units", "my-unit");
    mkdirSync(join(unitDir, "skills"), { recursive: true });
    writeFileSync(join(unitDir, "unit.json"), JSON.stringify({ name: "my-unit", dependencies: [], components: {} }));
    writeFileSync(join(unitDir, "skills", "v1.md"), "v1 content");

    const opts = makePublish(dir);
    opts.run();

    // Inject a stale file directly into dest (simulates a removed source file)
    writeFileSync(join(dir, ".aisf", "units", "my-unit", "skills", "stale.md"), "stale");

    opts.run();

    assert.equal(
      existsSync(join(dir, ".aisf", "units", "my-unit", "skills", "stale.md")),
      false,
      "stale file must be removed on re-publish",
    );
    assert.equal(readFileSync(join(dir, ".aisf", "units", "my-unit", "skills", "v1.md"), "utf8"), "v1 content");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── publishUnit: script compilation ─────────────────────────────────────────

/**
 * @test-suite  publishUnit script compilation
 * @target      Publish.run() → compileScripts(): esbuild bundles .ts → .js
 * @strategy    integration; creates real .ts entry, verifies compiled .js output
 * @cases
 *   - [PASS] compiles .ts to .js with CJS format and strips TypeScript syntax
 *   - [PASS] compiled output is executable by node
 *   - [PASS] non-.ts files in scripts/ are not copied to dest
 */
test("publishUnit compiles scripts/*.ts to .js with CJS format and strips TypeScript syntax", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const unitDir = join(dir, "ai-units", "my-unit");
    mkdirSync(join(unitDir, "scripts"), { recursive: true });
    writeFileSync(join(unitDir, "unit.json"), JSON.stringify({ name: "my-unit", dependencies: [], components: {} }));
    // Import from fs triggers esbuild CJS boilerplate (require() + "use strict")
    writeFileSync(
      join(unitDir, "scripts", "hook.ts"),
      'import { existsSync } from "fs";\nconst msg: string = existsSync("/") ? "hook-ok" : "hook-ok";\nprocess.stdout.write(msg + "\\n");\n',
    );

    makePublish(dir).run();

    const outJs = join(dir, ".aisf", "units", "my-unit", "scripts", "hook.js");
    assert.ok(existsSync(outJs), "hook.js must exist in dest");
    assert.equal(existsSync(join(dir, ".aisf", "units", "my-unit", "scripts", "hook.ts")), false, "hook.ts must not be in dest");

    const content = readFileSync(outJs, "utf8");
    assert.ok(content.includes('require("fs")'), "import must be converted to require() in CJS output");
    assert.doesNotMatch(content, /: string/, "TypeScript type annotations must be stripped");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("compiled unit script is executable by node", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const unitDir = join(dir, "ai-units", "my-unit");
    mkdirSync(join(unitDir, "scripts"), { recursive: true });
    writeFileSync(join(unitDir, "unit.json"), JSON.stringify({ name: "my-unit", dependencies: [], components: {} }));
    writeFileSync(
      join(unitDir, "scripts", "hook.ts"),
      'const msg: string = "hook-ok";\nprocess.stdout.write(msg + "\\n");\n',
    );

    makePublish(dir).run();

    const outJs = join(dir, ".aisf", "units", "my-unit", "scripts", "hook.js");
    const output = execSync(`node "${outJs}"`, { encoding: "utf8" });
    assert.equal(output.trim(), "hook-ok");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publishUnit does not copy non-.ts files from scripts/", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const unitDir = join(dir, "ai-units", "my-unit");
    mkdirSync(join(unitDir, "scripts"), { recursive: true });
    writeFileSync(join(unitDir, "unit.json"), JSON.stringify({ name: "my-unit", dependencies: [], components: {} }));
    writeFileSync(join(unitDir, "scripts", "hook.ts"), "process.exit(0);\n");
    writeFileSync(join(unitDir, "scripts", "readme.md"), "should not be copied");

    makePublish(dir).run();

    assert.equal(existsSync(join(dir, ".aisf", "units", "my-unit", "scripts", "readme.md")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── publishGlobalScripts ─────────────────────────────────────────────────────

/**
 * @test-suite  publishGlobalScripts
 * @target      Publish.run() → publishGlobalScripts(): global/scripts/*.ts → aisfHome/global/*.js
 * @strategy    integration; isolated temp dirs
 * @cases
 *   - [PASS] compiles global/scripts/*.ts to aisfHome/global/*.js in CJS format
 *   - [PASS] skips non-.ts files in global/scripts/
 *   - [PASS] removes stale .js files on re-publish
 */
test("publishGlobalScripts compiles global/scripts/*.ts to aisfHome/global/*.js in CJS format", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const globalScriptsDir = join(dir, "global", "scripts");
    mkdirSync(globalScriptsDir, { recursive: true });
    // Import from fs triggers esbuild CJS boilerplate (require() + "use strict")
    writeFileSync(
      join(globalScriptsDir, "tool.ts"),
      'import { existsSync } from "fs";\nconst x: number = existsSync("/") ? 42 : 0;\nprocess.stdout.write(String(x) + "\\n");\n',
    );

    makePublish(dir).run();

    const outJs = join(dir, ".aisf", "global", "tool.js");
    assert.ok(existsSync(outJs), "tool.js must exist");
    const content = readFileSync(outJs, "utf8");
    assert.ok(content.includes('require("fs")'), "import must be converted to require() in CJS output");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publishGlobalScripts skips non-.ts files in global/scripts/", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const globalScriptsDir = join(dir, "global", "scripts");
    mkdirSync(globalScriptsDir, { recursive: true });
    writeFileSync(join(globalScriptsDir, "tool.ts"), "process.exit(0);\n");
    writeFileSync(join(globalScriptsDir, "notes.md"), "notes");

    makePublish(dir).run();

    assert.equal(existsSync(join(dir, ".aisf", "global", "notes.md")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publishGlobalScripts removes stale .js files on re-publish", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const globalScriptsDir = join(dir, "global", "scripts");
    mkdirSync(globalScriptsDir, { recursive: true });
    writeFileSync(join(globalScriptsDir, "old.ts"), "process.exit(0);\n");

    makePublish(dir).run();
    assert.ok(existsSync(join(dir, ".aisf", "global", "old.js")));

    rmSync(join(globalScriptsDir, "old.ts"));
    writeFileSync(join(globalScriptsDir, "new.ts"), "process.exit(0);\n");

    makePublish(dir).run();

    assert.equal(existsSync(join(dir, ".aisf", "global", "old.js")), false, "stale file must be removed");
    assert.ok(existsSync(join(dir, ".aisf", "global", "new.js")), "new file must exist");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── publishGlobalCommands ────────────────────────────────────────────────────

/**
 * @test-suite  publishGlobalCommands
 * @target      Publish.run() → publishGlobalCommands(): global/{name}/SKILL.md → claudeSkillsDir/aisf:{name}/SKILL.md
 * @strategy    integration; isolated temp dirs
 * @cases
 *   - [PASS] copies SKILL.md to claudeSkillsDir/aisf:{name}/SKILL.md with original content
 *   - [PASS] skips the scripts entry in global/
 */
test("publishGlobalCommands copies SKILL.md to claudeSkillsDir/aisf:{name}/SKILL.md", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const cmdDir = join(dir, "global", "mycmd");
    mkdirSync(cmdDir, { recursive: true });
    writeFileSync(join(cmdDir, "SKILL.md"), "---\ndescription: my cmd\n---\nContent.");

    makePublish(dir).run();

    const installed = join(dir, ".claude", "skills", "aisf:mycmd", "SKILL.md");
    assert.ok(existsSync(installed));
    assert.equal(readFileSync(installed, "utf8"), "---\ndescription: my cmd\n---\nContent.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publishGlobalCommands skips scripts entry in global/", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    mkdirSync(join(dir, "global", "scripts"), { recursive: true });
    writeFileSync(join(dir, "global", "scripts", "SKILL.md"), "should not be installed");

    makePublish(dir).run();

    assert.equal(existsSync(join(dir, ".claude", "skills", "aisf:scripts")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── writeConfig ─────────────────────────────────────────────────────────────

/**
 * @test-suite  writeConfig
 * @target      Publish.run() → writeConfig(): writes aisfHome/config.json
 * @strategy    integration; isolated temp dirs
 * @cases
 *   - [PASS] writes config.json with correct repoPath and ISO publishedAt timestamp
 */
test("writeConfig writes config.json with repoPath and ISO publishedAt timestamp", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const before = new Date();
    makePublish(dir).run();
    const after = new Date();

    const config = JSON.parse(readFileSync(join(dir, ".aisf", "config.json"), "utf8")) as {
      repoPath: string;
      publishedAt: string;
    };
    assert.equal(config.repoPath, dir);
    const ts = new Date(config.publishedAt);
    assert.ok(ts >= before && ts <= after, "publishedAt must be within test execution window");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
