/**
 * @test-file   publish
 * @description Verifies Publish cleans previous install first, copies unit assets, compiles TypeScript via esbuild, copies and chmod+x shell scripts, manages global commands, writes config.json, adds PATH entry to ~/.bashrc, and writes install.log recording all persistent operations
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY): Shengtian Liao @ [3]
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { Publish } from "../scripts/publish";
import { AISK_BLOCK_START, AISK_PATH_LINE } from "../scripts/libs/bashrc";
import { InstallLog, INSTALL_LOG_FILENAME } from "../scripts/libs/install-log";

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
    bashrcPath: join(dir, ".bashrc"),
  });
}

/**
 * @test-suite  publishUnit static assets
 * @target      Publish.run() → publishUnit(): copies unit.json, skills/, rules/, resources/
 * @strategy    integration; isolated temp dirs, real fs operations
 * @cases
 *   - [PASS] copies unit.json, skills, rules, resources to aiskHome/units/{name}
 *   - [PASS] skips directory without unit.json
 *   - [PASS] cleans stale files when re-published
 */
describe("publishUnit static assets", () => {
  test("copies unit.json, skills, rules, resources to aiskHome/units/{name}", () => {
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

  test("skips directory without unit.json", () => {
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

  test("cleans stale files when re-published", () => {
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
});

/**
 * @test-suite  publishUnit script compilation
 * @target      Publish.run() → compileUnitScripts(): esbuild bundles declared .ts scripts → .cjs
 * @strategy    integration; creates real .ts entry, verifies compiled .cjs output
 * @cases
 *   - [PASS] compiles declared scripts/*.ts to .cjs with CJS format and strips TypeScript syntax
 *   - [PASS] compiled unit script is executable by node
 *   - [PASS] does not copy non-.ts files from scripts/
 *   - [PASS] does not compile nested .ts files from scripts/
 */
describe("publishUnit script compilation", () => {
  test("compiles declared scripts/*.ts to .cjs with CJS format and strips TypeScript syntax", () => {
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

      const outJs = join(dir, ".aisk", "units", "my-unit", "scripts", "hook.cjs");
      expect(existsSync(outJs), "hook.cjs must exist in dest").toBe(true);
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

      const outJs = join(dir, ".aisk", "units", "my-unit", "scripts", "hook.cjs");
      const output = execFileSync("node", [outJs], { encoding: "utf8" });
      expect(output.trim()).toBe("hook-ok");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("does not copy non-.ts files from scripts/", () => {
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

      expect(existsSync(join(dir, ".aisk", "units", "my-unit", "scripts", "readme.md"))).toBe(
        false,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("does not compile nested .ts files from scripts/", () => {
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

      expect(existsSync(join(dir, ".aisk", "units", "my-unit", "scripts", "hook.cjs"))).toBe(true);
      expect(existsSync(join(dir, ".aisk", "units", "my-unit", "scripts", "hook.test.cjs"))).toBe(
        false,
      );
      expect(existsSync(join(dir, ".aisk", "units", "my-unit", "scripts", "types.cjs"))).toBe(
        false,
      );
      expect(existsSync(join(dir, ".aisk", "units", "my-unit", "scripts", "types"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  publishGlobalScripts
 * @target      Publish.run() → publishGlobalScripts(): global/scripts/*.ts → aiskHome/global/*.cjs, *.sh → aiskHome/global/*.sh (chmod 755)
 * @strategy    integration; isolated temp dirs
 * @cases
 *   - [PASS] compiles global/scripts/*.ts to aiskHome/global/*.cjs in CJS format
 *   - [PASS] bundles imported libs modules without publishing them separately
 *   - [PASS] copies .sh files from global/scripts/ to aiskHome/global/ with executable permission
 *   - [PASS] skips non-.ts and non-.sh files in global/scripts/
 *   - [PASS] removes stale .cjs files on re-publish
 */
describe("publishGlobalScripts", () => {
  test("compiles global/scripts/*.ts to aiskHome/global/*.cjs in CJS format", () => {
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

      const outJs = join(dir, ".aisk", "global", "tool.cjs");
      expect(existsSync(outJs), "tool.cjs must exist").toBe(true);
      const content = readFileSync(outJs, "utf8");
      expect(content, "import must be converted to require() in CJS output").toContain(
        'require("fs")',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("bundles imported libs modules without publishing them separately", () => {
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

      const outJs = join(dir, ".aisk", "global", "tool.cjs");
      expect(existsSync(outJs), "tool.cjs must exist").toBe(true);
      expect(readFileSync(outJs, "utf8")).toContain("helper-ok");
      expect(existsSync(join(dir, ".aisk", "global", "libs", "helper.cjs"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("copies .sh files from global/scripts/ to aiskHome/global/ with executable permission", () => {
    const dir = makeTempDir();
    try {
      makeRepoSkeleton(dir);
      const globalScriptsDir = join(dir, "global", "scripts");
      mkdirSync(globalScriptsDir, { recursive: true });
      writeFileSync(join(globalScriptsDir, "aisk-setup.sh"), "#!/usr/bin/env bash\necho hello\n");

      makePublish(dir).run();

      const dest = join(dir, ".aisk", "global", "aisk-setup.sh");
      expect(existsSync(dest), "aisk-setup.sh must be copied").toBe(true);
      expect(readFileSync(dest, "utf8")).toBe("#!/usr/bin/env bash\necho hello\n");
      expect(statSync(dest).mode & 0o100, "owner execute bit must be set").toBeTruthy();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skips non-.ts and non-.sh files in global/scripts/", () => {
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

  test("removes stale .cjs files on re-publish", () => {
    const dir = makeTempDir();
    try {
      makeRepoSkeleton(dir);
      const globalScriptsDir = join(dir, "global", "scripts");
      mkdirSync(globalScriptsDir, { recursive: true });
      writeFileSync(join(globalScriptsDir, "old.ts"), "process.exit(0);\n");

      makePublish(dir).run();
      expect(existsSync(join(dir, ".aisk", "global", "old.cjs"))).toBe(true);

      rmSync(join(globalScriptsDir, "old.ts"));
      writeFileSync(join(globalScriptsDir, "new.ts"), "process.exit(0);\n");

      makePublish(dir).run();

      expect(
        existsSync(join(dir, ".aisk", "global", "old.cjs")),
        "stale file must be removed",
      ).toBe(false);
      expect(existsSync(join(dir, ".aisk", "global", "new.cjs")), "new file must exist").toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  publishGlobalCommands
 * @target      Publish.run() → publishGlobalCommands(): global/{name}/SKILL.md → claudeSkillsDir/aisk-{name}/SKILL.md
 * @strategy    integration; isolated temp dirs
 * @cases
 *   - [PASS] copies SKILL.md to claudeSkillsDir/aisk-{name}/SKILL.md
 *   - [PASS] skips scripts entry in global/
 */
describe("publishGlobalCommands", () => {
  test("copies SKILL.md to claudeSkillsDir/aisk-{name}/SKILL.md", () => {
    const dir = makeTempDir();
    try {
      makeRepoSkeleton(dir);
      const cmdDir = join(dir, "global", "mycmd");
      mkdirSync(cmdDir, { recursive: true });
      writeFileSync(join(cmdDir, "SKILL.md"), "---\ndescription: my cmd\n---\nContent.");

      makePublish(dir).run();

      const installed = join(dir, ".claude", "skills", "aisk-mycmd", "SKILL.md");
      expect(existsSync(installed)).toBe(true);
      expect(readFileSync(installed, "utf8")).toBe("---\ndescription: my cmd\n---\nContent.");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skips scripts entry in global/", () => {
    const dir = makeTempDir();
    try {
      makeRepoSkeleton(dir);
      mkdirSync(join(dir, "global", "scripts"), { recursive: true });
      writeFileSync(join(dir, "global", "scripts", "SKILL.md"), "should not be installed");

      makePublish(dir).run();

      expect(existsSync(join(dir, ".claude", "skills", "aisk-scripts"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  writeConfig
 * @target      Publish.run() → writeConfig(): writes aiskHome/config.json
 * @strategy    integration; isolated temp dirs
 * @cases
 *   - [PASS] writes config.json with repoPath and ISO publishedAt timestamp
 */
describe("writeConfig", () => {
  test("writes config.json with repoPath and ISO publishedAt timestamp", () => {
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
});

/**
 * @test-suite  publishBashrc
 * @target      Publish.run() → publishBashrc(): adds AISK block to .bashrc
 * @strategy    integration; isolated temp dirs
 * @cases
 *   - [PASS] adds AISK block to .bashrc with one blank line above when not already present
 *   - [PASS] does not duplicate AISK block when already present
 *   - [PASS] skips when .bashrc does not exist
 */
describe("publishBashrc", () => {
  test("adds AISK block to .bashrc with one blank line above when not already present", () => {
    const dir = makeTempDir();
    try {
      makeRepoSkeleton(dir);
      writeFileSync(join(dir, ".bashrc"), "# existing content\n");

      makePublish(dir).run();

      const content = readFileSync(join(dir, ".bashrc"), "utf8");
      expect(content).toContain(AISK_BLOCK_START);
      expect(content).toContain(AISK_PATH_LINE);
      expect(content).toMatch(/\n\n# AISK start/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("does not duplicate AISK block when already present", () => {
    const dir = makeTempDir();
    try {
      makeRepoSkeleton(dir);
      writeFileSync(
        join(dir, ".bashrc"),
        `# existing\n\n${AISK_BLOCK_START}\n${AISK_PATH_LINE}\n# AISK end\n`,
      );

      makePublish(dir).run();

      const content = readFileSync(join(dir, ".bashrc"), "utf8");
      const count = content.split(AISK_BLOCK_START).length - 1;
      expect(count).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skips when .bashrc does not exist", () => {
    const dir = makeTempDir();
    try {
      makeRepoSkeleton(dir);

      expect(() => makePublish(dir).run()).not.toThrow();
      expect(existsSync(join(dir, ".bashrc"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  writeInstallLog
 * @target      Publish.run() → log.write(): writes ~/.aisk/install.log with entries for every persistent operation
 * @strategy    integration; isolated temp dirs
 * @cases
 *   - [PASS] writes install.log containing entries for unit dir, units.json, global dir, claude skill dir, and config.json
 *   - [PASS] last entry in install.log is the log file itself
 *   - [PASS] cleans previous install.log before publishing a fresh one
 */
describe("writeInstallLog", () => {
  test("writes install.log containing entries for unit dir, units.json, global dir, claude skill dir, and config.json", () => {
    const dir = makeTempDir();
    try {
      makeRepoSkeleton(dir);

      // Unit
      const unitDir = join(dir, "units", "my-unit");
      mkdirSync(join(unitDir, "skills"), { recursive: true });
      writeFileSync(
        join(unitDir, "unit.json"),
        JSON.stringify({ name: "my-unit", dependencies: [], components: {} }),
      );

      // units.json
      writeFileSync(join(dir, "units", "units.json"), "[]");

      // Global scripts
      mkdirSync(join(dir, "global", "scripts"), { recursive: true });
      writeFileSync(join(dir, "global", "scripts", "tool.ts"), "process.exit(0);\n");

      // Global command
      mkdirSync(join(dir, "global", "mycmd"), { recursive: true });
      writeFileSync(join(dir, "global", "mycmd", "SKILL.md"), "---\ndescription: cmd\n---\n");

      makePublish(dir).run();

      const logPath = join(dir, ".aisk", INSTALL_LOG_FILENAME);
      expect(existsSync(logPath), "install.log must exist").toBe(true);

      const log = InstallLog.load(logPath)!;
      const paths = log.entries.map((e) => e.path);

      expect(paths).toContain(join(dir, ".aisk", "units", "my-unit"));
      expect(paths).toContain(join(dir, ".aisk", "units.json"));
      expect(paths).toContain(join(dir, ".aisk", "global"));
      expect(paths).toContain(join(dir, ".claude", "skills", "aisk-mycmd"));
      expect(paths).toContain(join(dir, ".aisk", "config.json"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("last entry in install.log is the log file itself", () => {
    const dir = makeTempDir();
    try {
      makeRepoSkeleton(dir);

      makePublish(dir).run();

      const logPath = join(dir, ".aisk", INSTALL_LOG_FILENAME);
      const log = InstallLog.load(logPath)!;
      const last = log.entries[log.entries.length - 1];

      expect(last).toEqual({ type: "file", path: logPath });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("cleans previous install.log before publishing a fresh one", () => {
    const dir = makeTempDir();
    try {
      makeRepoSkeleton(dir);

      // First publish
      const unitDir = join(dir, "units", "first-unit");
      mkdirSync(join(unitDir, "skills"), { recursive: true });
      writeFileSync(
        join(unitDir, "unit.json"),
        JSON.stringify({ name: "first-unit", dependencies: [], components: {} }),
      );
      makePublish(dir).run();

      expect(existsSync(join(dir, ".aisk", "units", "first-unit"))).toBe(true);

      // Remove unit from source and re-publish
      rmSync(unitDir, { recursive: true, force: true });
      makePublish(dir).run();

      // Stale unit dir from first publish must be gone
      expect(existsSync(join(dir, ".aisk", "units", "first-unit"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
