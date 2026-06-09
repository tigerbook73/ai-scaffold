/**
 * @test-file   publish
 * @description Verifies Publish copies unit assets, compiles TypeScript via esbuild, manages global scripts and commands, and writes config.json
 * @ai-generated
 * @reviewed-by
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

import { Publish } from "../scripts/publish";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "aisk-publish-"));
}

/** Creates a minimal fake repo with an empty units/ so run() does not exit. */
function makeRepoSkeleton(dir: string): void {
  mkdirSync(join(dir, "units"), { recursive: true });
}

function makePublish(dir: string): Publish {
  return new Publish({
    repoRoot: dir,
    aiskHome: join(dir, ".aisk"),
    claudeSkillsDir: join(dir, ".claude", "skills"),
  });
}

// ─── publishUnit: static assets ──────────────────────────────────────────────

/**
 * @test-suite  publishUnit static assets
 * @target      Publish.run() → publishUnit(): copies unit.json, skills/, rules/, resources/
 * @strategy    integration; isolated temp dirs, real fs operations
 * @cases
 *   - [PASS] copies unit.json, skills, rules, and resources to aiskHome/units/{name}
 *   - [PASS] skips directory without unit.json
 *   - [PASS] cleans stale files when re-published
 */
test("publishUnit copies unit.json, skills, rules, resources to aiskHome/units/{name}", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const unitDir = join(dir, "units", "my-unit");
    mkdirSync(join(unitDir, "skills"), { recursive: true });
    mkdirSync(join(unitDir, "rules"), { recursive: true });
    mkdirSync(join(unitDir, "resources"), { recursive: true });
    writeFileSync(
      join(unitDir, "unit.json"),
      JSON.stringify({ name: "my-unit", dependencies: [], components: {} }),
    );
    writeFileSync(join(unitDir, "skills", "foo.md"), "# foo");
    writeFileSync(join(unitDir, "rules", "bar.md"), "# bar");
    writeFileSync(join(unitDir, "resources", "baz.md"), "baz content");

    makePublish(dir).run();

    const dest = join(dir, ".aisk", "units", "my-unit");
    expect(readFileSync(join(dest, "unit.json"), "utf8")).toBe(
      JSON.stringify({ name: "my-unit", dependencies: [], components: {} }),
    );
    expect(readFileSync(join(dest, "skills", "foo.md"), "utf8")).toBe("# foo");
    expect(readFileSync(join(dest, "rules", "bar.md"), "utf8")).toBe("# bar");
    expect(readFileSync(join(dest, "resources", "baz.md"), "utf8")).toBe("baz content");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publishUnit skips directory without unit.json", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    mkdirSync(join(dir, "units", "no-json-unit"), { recursive: true });

    makePublish(dir).run();

    expect(existsSync(join(dir, ".aisk", "units", "no-json-unit"))).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publishUnit cleans stale files when re-published", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const unitDir = join(dir, "units", "my-unit");
    mkdirSync(join(unitDir, "skills"), { recursive: true });
    writeFileSync(
      join(unitDir, "unit.json"),
      JSON.stringify({ name: "my-unit", dependencies: [], components: {} }),
    );
    writeFileSync(join(unitDir, "skills", "v1.md"), "v1 content");

    const opts = makePublish(dir);
    opts.run();

    writeFileSync(join(dir, ".aisk", "units", "my-unit", "skills", "stale.md"), "stale");

    opts.run();

    expect(
      existsSync(join(dir, ".aisk", "units", "my-unit", "skills", "stale.md")),
      "stale file must be removed on re-publish",
    ).toBe(false);
    expect(readFileSync(join(dir, ".aisk", "units", "my-unit", "skills", "v1.md"), "utf8")).toBe(
      "v1 content",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── publishUnit: script compilation ─────────────────────────────────────────

/**
 * @test-suite  publishUnit script compilation
 * @target      Publish.run() → compileUnitScripts(): esbuild bundles declared .ts scripts → .js
 * @strategy    integration; creates real .ts entry, verifies compiled .js output
 * @cases
 *   - [PASS] compiles declared .ts scripts to .js with CJS format and strips TypeScript syntax
 *   - [PASS] compiled output is executable by node
 *   - [PASS] non-.ts files in scripts/ are not copied to dest
 *   - [PASS] nested .ts files in scripts/ are not compiled
 */
test("publishUnit compiles declared scripts/*.ts to .js with CJS format and strips TypeScript syntax", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const unitDir = join(dir, "units", "my-unit");
    mkdirSync(join(unitDir, "scripts"), { recursive: true });
    writeFileSync(
      join(unitDir, "unit.json"),
      JSON.stringify({
        name: "my-unit",
        dependencies: [],
        components: { scripts: [{ name: "hook", file: "scripts/hook.ts" }] },
      }),
    );
    writeFileSync(
      join(unitDir, "scripts", "hook.ts"),
      'import { existsSync } from "fs";\nconst msg: string = existsSync("/") ? "hook-ok" : "hook-ok";\nprocess.stdout.write(msg + "\\n");\n',
    );

    makePublish(dir).run();

    const outJs = join(dir, ".aisk", "units", "my-unit", "scripts", "hook.js");
    expect(existsSync(outJs), "hook.js must exist in dest").toBe(true);
    expect(
      existsSync(join(dir, ".aisk", "units", "my-unit", "scripts", "hook.ts")),
      "hook.ts must not be in dest",
    ).toBe(false);

    const content = readFileSync(outJs, "utf8");
    expect(content, "import must be converted to require() in CJS output").toContain(
      'require("fs")',
    );
    expect(content).not.toMatch(/: string/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("compiled unit script is executable by node", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const unitDir = join(dir, "units", "my-unit");
    mkdirSync(join(unitDir, "scripts"), { recursive: true });
    writeFileSync(
      join(unitDir, "unit.json"),
      JSON.stringify({
        name: "my-unit",
        dependencies: [],
        components: { scripts: [{ name: "hook", file: "scripts/hook.ts" }] },
      }),
    );
    writeFileSync(
      join(unitDir, "scripts", "hook.ts"),
      'const msg: string = "hook-ok";\nprocess.stdout.write(msg + "\\n");\n',
    );

    makePublish(dir).run();

    const outJs = join(dir, ".aisk", "units", "my-unit", "scripts", "hook.js");
    const output = execFileSync("node", [outJs], { encoding: "utf8" });
    expect(output.trim()).toBe("hook-ok");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publishUnit does not copy non-.ts files from scripts/", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const unitDir = join(dir, "units", "my-unit");
    mkdirSync(join(unitDir, "scripts"), { recursive: true });
    writeFileSync(
      join(unitDir, "unit.json"),
      JSON.stringify({
        name: "my-unit",
        dependencies: [],
        components: { scripts: [{ name: "hook", file: "scripts/hook.ts" }] },
      }),
    );
    writeFileSync(join(unitDir, "scripts", "hook.ts"), "process.exit(0);\n");
    writeFileSync(join(unitDir, "scripts", "readme.md"), "should not be copied");

    makePublish(dir).run();

    expect(existsSync(join(dir, ".aisk", "units", "my-unit", "scripts", "readme.md"))).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publishUnit does not compile nested .ts files from scripts/", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const unitDir = join(dir, "units", "my-unit");
    mkdirSync(join(unitDir, "scripts"), { recursive: true });
    mkdirSync(join(unitDir, "scripts", "types"), { recursive: true });
    writeFileSync(
      join(unitDir, "unit.json"),
      JSON.stringify({
        name: "my-unit",
        dependencies: [],
        components: { scripts: [{ name: "hook", file: "scripts/hook.ts" }] },
      }),
    );
    writeFileSync(join(unitDir, "scripts", "hook.ts"), "process.exit(0);\n");
    writeFileSync(join(unitDir, "scripts", "hook.test.ts"), "process.exit(0);\n");
    writeFileSync(join(unitDir, "scripts", "types", "types.ts"), "export type X = string;\n");

    makePublish(dir).run();

    expect(existsSync(join(dir, ".aisk", "units", "my-unit", "scripts", "hook.js"))).toBe(true);
    expect(existsSync(join(dir, ".aisk", "units", "my-unit", "scripts", "hook.test.js"))).toBe(
      false,
    );
    expect(existsSync(join(dir, ".aisk", "units", "my-unit", "scripts", "types.js"))).toBe(false);
    expect(existsSync(join(dir, ".aisk", "units", "my-unit", "scripts", "types"))).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── publishGlobalScripts ─────────────────────────────────────────────────────

/**
 * @test-suite  publishGlobalScripts
 * @target      Publish.run() → publishGlobalScripts(): global/scripts/*.ts → aiskHome/global/*.js
 * @strategy    integration; isolated temp dirs
 * @cases
 *   - [PASS] compiles global/scripts/*.ts to aiskHome/global/*.js in CJS format
 *   - [PASS] bundles imported libs modules without publishing them separately
 *   - [PASS] skips non-.ts files in global/scripts/
 *   - [PASS] removes stale .js files on re-publish
 */
test("publishGlobalScripts compiles global/scripts/*.ts to aiskHome/global/*.js in CJS format", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const globalScriptsDir = join(dir, "global", "scripts");
    mkdirSync(globalScriptsDir, { recursive: true });
    writeFileSync(
      join(globalScriptsDir, "tool.ts"),
      'import { existsSync } from "fs";\nconst x: number = existsSync("/") ? 42 : 0;\nprocess.stdout.write(String(x) + "\\n");\n',
    );

    makePublish(dir).run();

    const outJs = join(dir, ".aisk", "global", "tool.js");
    expect(existsSync(outJs), "tool.js must exist").toBe(true);
    const content = readFileSync(outJs, "utf8");
    expect(content, "import must be converted to require() in CJS output").toContain(
      'require("fs")',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publishGlobalScripts bundles imported libs modules without publishing them separately", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const globalScriptsDir = join(dir, "global", "scripts");
    mkdirSync(join(globalScriptsDir, "libs"), { recursive: true });
    writeFileSync(
      join(globalScriptsDir, "tool.ts"),
      'import { message } from "./libs/helper";\nprocess.stdout.write(message + "\\n");\n',
    );
    writeFileSync(
      join(globalScriptsDir, "libs", "helper.ts"),
      'export const message = "helper-ok";\n',
    );

    makePublish(dir).run();

    const outJs = join(dir, ".aisk", "global", "tool.js");
    expect(existsSync(outJs), "tool.js must exist").toBe(true);
    expect(readFileSync(outJs, "utf8")).toContain("helper-ok");
    expect(existsSync(join(dir, ".aisk", "global", "libs", "helper.js"))).toBe(false);
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

    expect(existsSync(join(dir, ".aisk", "global", "notes.md"))).toBe(false);
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
    expect(existsSync(join(dir, ".aisk", "global", "old.js"))).toBe(true);

    rmSync(join(globalScriptsDir, "old.ts"));
    writeFileSync(join(globalScriptsDir, "new.ts"), "process.exit(0);\n");

    makePublish(dir).run();

    expect(existsSync(join(dir, ".aisk", "global", "old.js")), "stale file must be removed").toBe(
      false,
    );
    expect(existsSync(join(dir, ".aisk", "global", "new.js")), "new file must exist").toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── publishGlobalCommands ────────────────────────────────────────────────────

/**
 * @test-suite  publishGlobalCommands
 * @target      Publish.run() → publishGlobalCommands(): global/{name}/SKILL.md → claudeSkillsDir/aisk:{name}/SKILL.md
 * @strategy    integration; isolated temp dirs
 * @cases
 *   - [PASS] copies SKILL.md to claudeSkillsDir/aisk:{name}/SKILL.md with original content
 *   - [PASS] skips the scripts entry in global/
 */
test("publishGlobalCommands copies SKILL.md to claudeSkillsDir/aisk:{name}/SKILL.md", () => {
  const dir = makeTempDir();
  try {
    makeRepoSkeleton(dir);
    const cmdDir = join(dir, "global", "mycmd");
    mkdirSync(cmdDir, { recursive: true });
    writeFileSync(join(cmdDir, "SKILL.md"), "---\ndescription: my cmd\n---\nContent.");

    makePublish(dir).run();

    const installed = join(dir, ".claude", "skills", "aisk:mycmd", "SKILL.md");
    expect(existsSync(installed)).toBe(true);
    expect(readFileSync(installed, "utf8")).toBe("---\ndescription: my cmd\n---\nContent.");
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

    expect(existsSync(join(dir, ".claude", "skills", "aisk:scripts"))).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── writeConfig ─────────────────────────────────────────────────────────────

/**
 * @test-suite  writeConfig
 * @target      Publish.run() → writeConfig(): writes aiskHome/config.json
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

    const config = JSON.parse(readFileSync(join(dir, ".aisk", "config.json"), "utf8")) as {
      repoPath: string;
      publishedAt: string;
    };
    expect(config.repoPath).toBe(dir);
    const ts = new Date(config.publishedAt);
    expect(ts >= before && ts <= after, "publishedAt must be within test execution window").toBe(
      true,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
