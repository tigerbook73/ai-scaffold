/**
 * @test-file   installer
 * @description Verifies the Installer class handles list, show (both scopes),
 *              init/update/remove (local units, with AISK:CUSTOM merge), refresh,
 *              global/local classification, local-to-local dependency auto-install,
 *              and lefthook.yml idempotent updates. Global unit register/unregister
 *              lives in bin/aisk-register.ts, tested separately in register.test.ts.
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY): Shengtian Liao @ [3]
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { Installer } from "../global/installer";
import { register } from "../bin/aisk-register";
import {
  addLocalUnit,
  captureStdout,
  globalSkillsDirFor,
  makeFakeAiskHome,
  makeTempDir,
} from "./helpers/fixtures";

/** Builds an Installer wired to an isolated globalSkillsDir. json defaults true (structured assertions). */
function newInstaller(
  tmpDir: string,
  projectDir: string,
  aiskHome: string,
  json = true,
): Installer {
  return new Installer(projectDir, aiskHome, json, globalSkillsDirFor(tmpDir));
}

/**
 * @test-suite  list
 * @target      Installer.list()
 * @strategy    unit; fake aiskHome tree
 * @cases
 *   - [PASS] lists global and local units together by default, tagged with scope
 *   - [PASS] --scope filters to only global or only local
 *   - [PASS] global unit installed reflects the registry record, not the project
 *   - [PASS] local unit installed reflects .aisk/installed.json, hasTodo when customStatus=todo
 */
describe("list", () => {
  test("lists global and local units together by default, tagged with scope", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const result = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).list()),
      ) as { units: Array<{ name: string; scope: string }> };

      expect(result.units.find((u) => u.name === "poc")?.scope).toBe("global");
      expect(result.units.find((u) => u.name === "poc-dep")?.scope).toBe("global");
      expect(result.units.find((u) => u.name === "loc")?.scope).toBe("local");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("--scope filters to only global or only local", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      const globalOnly = JSON.parse(captureStdout(() => installer.list("global"))) as {
        units: Array<{ name: string }>;
      };
      expect(globalOnly.units.some((u) => u.name === "loc")).toBe(false);
      expect(globalOnly.units.some((u) => u.name === "poc")).toBe(true);

      const localOnly = JSON.parse(captureStdout(() => installer.list("local"))) as {
        units: Array<{ name: string }>;
      };
      expect(localOnly.units.some((u) => u.name === "poc")).toBe(false);
      expect(localOnly.units.some((u) => u.name === "loc")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("global unit installed reflects the registry record, not the project", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      const before = JSON.parse(captureStdout(() => installer.list("global"))) as {
        units: Array<{ name: string; installed: boolean }>;
      };
      expect(before.units.find((u) => u.name === "poc")?.installed).toBe(false);

      register(aiskHome, globalSkillsDirFor(dir));

      const after = JSON.parse(captureStdout(() => installer.list("global"))) as {
        units: Array<{ name: string; installed: boolean }>;
      };
      expect(after.units.find((u) => u.name === "poc")?.installed).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("local unit installed reflects .aisk/installed.json, hasTodo when customStatus=todo", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", hasCustomResource: true, hook: false });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      installer.init(["loc"]);

      const result = JSON.parse(captureStdout(() => installer.list("local"))) as {
        units: Array<{ name: string; installed: boolean; hasTodo?: boolean }>;
      };
      const loc = result.units.find((u) => u.name === "loc");
      expect(loc?.installed).toBe(true);
      expect(loc?.hasTodo).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  show
 * @target      Installer.show()
 * @strategy    unit; fake aiskHome tree
 * @cases
 *   - [PASS] global unit: scope "global", installed from registry, component installed from disk symlink
 *   - [PASS] local unit: scope "local", installed from .aisk/installed.json, component customStatus
 */
describe("show", () => {
  test("global unit: scope global, installed from registry, component installed from disk symlink", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      const before = JSON.parse(captureStdout(() => installer.show("poc"))) as {
        scope: string;
        installed: boolean;
        components: Array<{ name: string; installed: boolean }>;
      };
      expect(before.scope).toBe("global");
      expect(before.installed).toBe(false);
      expect(before.components.find((c) => c.name === "poc")?.installed).toBe(false);

      register(aiskHome, globalSkillsDirFor(dir));

      const after = JSON.parse(captureStdout(() => installer.show("poc"))) as {
        installed: boolean;
        components: Array<{ name: string; installed: boolean }>;
      };
      expect(after.installed).toBe(true);
      expect(after.components.find((c) => c.name === "poc")?.installed).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("local unit: scope local, installed from .aisk/installed.json, component customStatus", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", hasCustomResource: true, hook: false });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      installer.init(["loc"]);

      const result = JSON.parse(captureStdout(() => installer.show("loc"))) as {
        scope: string;
        installed: boolean;
        components: Array<{ name: string; customStatus?: string }>;
      };
      expect(result.scope).toBe("local");
      expect(result.installed).toBe(true);
      expect(result.components.find((c) => c.name === "readme")?.customStatus).toBe("todo");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  init (local unit)
 * @target      Installer.init()
 * @strategy    unit; fake aiskHome tree
 * @cases
 *   - [PASS] installs every component of a local unit unconditionally
 *   - [PASS] fails to init a global unit by name
 *   - [PASS] re-init on an already-installed unit converts to update
 *   - [PASS] init all installs every not-yet-installed local unit, no global units
 *   - [PASS] auto-installs a local-to-local dependency (autoDep)
 *   - [PASS] a dependency on a global unit needs no action (no failure, nothing auto-installed)
 */
describe("init (local unit)", () => {
  test("installs every component of a local unit unconditionally", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).init(["loc"]);

      expect(existsSync(join(projectDir, ".claude", "skills", "aisk-loc-loc", "SKILL.md"))).toBe(
        true,
      );
      expect(existsSync(join(projectDir, ".aisk", "loc", "resources", "readme.md"))).toBe(true);
      expect(existsSync(join(projectDir, ".aisk", "loc", "scripts", "loc-script.js"))).toBe(true);
      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      expect(lefthook).toContain("aisk-loc-loc-script:");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails to init a global unit by name", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).init(["poc"])),
      ) as { added: unknown[]; failed: Array<{ name: string; reason: string }> };

      expect(out.added).toHaveLength(0);
      expect(out.failed[0]?.name).toBe("poc");
      expect(out.failed[0]?.reason).toContain("register");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("re-init on an already-installed unit converts to update", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      installer.init(["loc"]);
      const out = JSON.parse(captureStdout(() => installer.init(["loc"]))) as {
        added: unknown[];
        updated: Array<{ name: string }>;
        failed: unknown[];
      };

      expect(out.added).toHaveLength(0);
      expect(out.failed).toHaveLength(0);
      expect(out.updated.some((u) => u.name === "loc")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("init all installs every not-yet-installed local unit, no global units", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc-a" });
      addLocalUnit(aiskHome, { name: "loc-b" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).init(["all"])),
      ) as { added: Array<{ name: string }> };

      expect(out.added.some((u) => u.name === "loc-a")).toBe(true);
      expect(out.added.some((u) => u.name === "loc-b")).toBe(true);
      expect(out.added.some((u) => u.name === "poc")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("auto-installs a local-to-local dependency (autoDep)", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc-dep" });
      addLocalUnit(aiskHome, { name: "loc-main", dependencies: ["loc-dep"] });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).init(["loc-main"])),
      ) as { added: Array<{ name: string; autoDep?: boolean }>; failed: unknown[] };

      expect(out.failed).toHaveLength(0);
      const dep = out.added.find((u) => u.name === "loc-dep");
      expect(dep).toBeTruthy();
      expect(dep?.autoDep).toBe(true);
      expect(out.added.some((u) => u.name === "loc-main" && !u.autoDep)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a dependency on a global unit needs no action", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc-with-global-dep", dependencies: ["poc"] });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).init(["loc-with-global-dep"])),
      ) as { added: Array<{ name: string }>; failed: unknown[] };

      expect(out.failed).toHaveLength(0);
      expect(out.added.some((u) => u.name === "loc-with-global-dep")).toBe(true);
      expect(out.added.some((u) => u.name === "poc")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  init (script/hook)
 * @target      Installer.init() — local unit scripts are always bundled, hook optional
 * @strategy    unit; local unit with and without a hook script
 * @cases
 *   - [PASS] bundles the script and registers the hook when declared
 *   - [PASS] bundles the script but registers no hook when not declared
 *   - [PASS] hook registration is idempotent (no duplicate entries on re-init)
 *   - [PASS] appends hook entry to existing lefthook.yml
 */
describe("init (script/hook)", () => {
  test("bundles the script and registers the hook when declared", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", hook: true });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).init(["loc"]);

      const scriptFile = join(projectDir, ".aisk", "loc", "scripts", "loc-script.js");
      expect(readFileSync(scriptFile, "utf8")).toContain("script");
      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      expect(lefthook).toContain("aisk-loc-loc-script:");
      expect(lefthook).toContain("bun .aisk/loc/scripts/loc-script.js");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("bundles the script but registers no hook when not declared", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", hook: false, rules: true });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).init(["loc"]);

      expect(existsSync(join(projectDir, ".aisk", "loc", "scripts", "loc-script.js"))).toBe(true);
      expect(existsSync(join(projectDir, "lefthook.yml"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("hook registration is idempotent (no duplicate entries on re-init)", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      installer.init(["loc"]);
      installer.init(["loc"]);

      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      const occurrences = lefthook.split("aisk-loc-loc-script:").length - 1;
      expect(occurrences).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("appends hook entry to existing lefthook.yml", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      writeFileSync(
        join(projectDir, "lefthook.yml"),
        "pre-commit:\n  commands:\n    existing-hook:\n      run: echo ok\n",
      );

      newInstaller(dir, projectDir, aiskHome).init(["loc"]);

      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      expect(lefthook).toContain("existing-hook:");
      expect(lefthook).toContain("aisk-loc-loc-script:");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  init → update (orphan removal)
 * @target      Installer.init() when unit already installed → updateUnitComponents()
 * @strategy    unit; simulate unit.json version change removing a resource
 * @cases
 *   - [PASS] removes orphaned resource file when unit.json no longer declares it
 */
describe("init → update (orphan removal)", () => {
  test("removes orphaned resource file when unit.json no longer declares it", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const unitJsonPath = join(aiskHome, "units", "loc", "unit.json");
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const installer = newInstaller(dir, projectDir, aiskHome);
      installer.init(["loc"]);
      const resourceFile = join(projectDir, ".aisk", "loc", "resources", "readme.md");
      expect(existsSync(resourceFile)).toBe(true);

      // v2: resource removed from unit.json
      writeFileSync(
        unitJsonPath,
        JSON.stringify({
          name: "loc",
          description: "loc unit",
          dependencies: [],
          components: {
            skills: [{ name: "loc", file: "skills/loc.md" }],
            scripts: [{ name: "loc-script", file: "scripts/loc-script.ts", hook: "pre-commit" }],
          },
        }),
      );

      installer.init(["loc"]);
      expect(existsSync(resourceFile), "orphaned resource file must be removed").toBe(false);
      expect(existsSync(join(projectDir, ".claude", "skills", "aisk-loc-loc", "SKILL.md"))).toBe(
        true,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  update (AISK:CUSTOM merge)
 * @target      Installer.update()
 * @strategy    unit; installed local resource has done block; new template has same block
 * @cases
 *   - [PASS] merges done block from old file into new template
 *   - [PASS] keeps new template content for todo blocks
 */
describe("update (AISK:CUSTOM merge)", () => {
  test("merges done block from old file into new template", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", hook: false, hasCustomResource: true });

      writeFileSync(
        join(aiskHome, "units", "loc", "resources", "readme.md"),
        [
          '# AISK:CUSTOM name="pattern" status="todo" hint="new hint"',
          'testMatch: ["**/*.new.ts"]',
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);
      installer.init(["loc"]);

      const resourceFile = join(projectDir, ".aisk", "loc", "resources", "readme.md");
      writeFileSync(
        resourceFile,
        [
          '# AISK:CUSTOM name="pattern" status="done" hint="old hint"',
          'testMatch: ["**/*.spec.ts"]',
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );
      const installedPath = join(projectDir, ".aisk", "installed.json");
      const installed = JSON.parse(readFileSync(installedPath, "utf8")) as {
        units: Record<string, { components: { resources: Array<{ customStatus: string }> } }>;
      };
      installed.units["loc"]!.components.resources[0]!.customStatus = "done";
      writeFileSync(installedPath, JSON.stringify(installed, null, 2) + "\n");

      installer.update(["loc"]);

      const content = readFileSync(resourceFile, "utf8");
      expect(content).toContain('status="done"');
      expect(content).toContain('hint="new hint"');
      expect(content).toContain('["**/*.spec.ts"]');
      expect(content).not.toContain('["**/*.new.ts"]');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("keeps new template content for todo blocks", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", hook: false, hasCustomResource: true });
      writeFileSync(
        join(aiskHome, "units", "loc", "resources", "readme.md"),
        [
          '# AISK:CUSTOM name="pattern" status="todo" hint="hint"',
          'testMatch: ["**/*.updated.ts"]',
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);
      installer.init(["loc"]);

      const resourceFile = join(projectDir, ".aisk", "loc", "resources", "readme.md");
      writeFileSync(
        resourceFile,
        [
          '# AISK:CUSTOM name="pattern" status="todo" hint="hint"',
          'testMatch: ["**/*.old.ts"]',
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );

      installer.update(["loc"]);

      const content = readFileSync(resourceFile, "utf8");
      expect(content).toContain('["**/*.updated.ts"]');
      expect(content).not.toContain('["**/*.old.ts"]');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  update
 * @target      Installer.update()
 * @strategy    unit; fake aiskHome tree
 * @cases
 *   - [PASS] fails per-unit when unit is not installed
 *   - [PASS] skips optional component that is not on disk
 */
describe("update", () => {
  test("fails per-unit when unit is not installed", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).update(["loc"])),
      ) as { updated: unknown[]; failed: Array<{ name: string; reason: string }> };

      expect(out.updated).toHaveLength(0);
      expect(out.failed[0]?.name).toBe("loc");
      expect(out.failed[0]?.reason).toContain("未安装");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skips optional component that is not on disk", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", rules: true });
      writeFileSync(
        join(aiskHome, "units", "loc", "unit.json"),
        JSON.stringify({
          name: "loc",
          description: "loc unit",
          dependencies: [],
          components: {
            skills: [{ name: "loc", file: "skills/loc.md" }],
            rules: [{ name: "loc-rule", file: "rules/loc-rule.md", condition: "has next" }],
          },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      const skillDir = join(projectDir, ".claude", "skills", "aisk-loc-loc");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "# loc");
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            loc: {
              installedAt: "2026-01-01",
              components: {
                skills: [{ name: "loc", path: ".claude/skills/aisk-loc-loc/SKILL.md" }],
                rules: [],
                scripts: [],
                resources: [],
              },
            },
          },
        }),
      );

      newInstaller(dir, projectDir, aiskHome).update(["loc"]);

      expect(existsSync(join(projectDir, ".claude", "rules", "aisk-loc", "loc-rule.md"))).toBe(
        false,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  remove
 * @target      Installer.remove()
 * @strategy    unit; fake aiskHome tree; pre-populated installed.json and files
 * @cases
 *   - [PASS] removes skill file and empty parent directory
 *   - [PASS] removes script file and corresponding lefthook entry
 *   - [PASS] fails per-unit when unit is not installed
 *   - [PASS] all removes all installed units
 */
describe("remove", () => {
  test("removes skill file and empty parent directory", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      const skillDir = join(projectDir, ".claude", "skills", "aisk-loc-loc");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "# loc");
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            loc: {
              installedAt: "2026-01-01",
              components: {
                skills: [{ name: "loc", path: ".claude/skills/aisk-loc-loc/SKILL.md" }],
                rules: [],
                scripts: [],
                resources: [],
              },
            },
          },
        }),
      );

      newInstaller(dir, projectDir, aiskHome).remove(["loc"]);

      expect(existsSync(join(skillDir, "SKILL.md")), "skill file must be removed").toBe(false);
      expect(existsSync(skillDir), "empty parent dir must be removed").toBe(false);
      const data = JSON.parse(
        readFileSync(join(projectDir, ".aisk", "installed.json"), "utf8"),
      ) as { units: Record<string, unknown> };
      expect("loc" in data.units, "unit must be removed from installed.json").toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("removes script file and corresponding lefthook entry", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      const scriptDir = join(projectDir, ".aisk", "loc", "scripts");
      mkdirSync(scriptDir, { recursive: true });
      writeFileSync(join(scriptDir, "loc-script.js"), "// hook");
      writeFileSync(
        join(projectDir, "lefthook.yml"),
        "pre-commit:\n  commands:\n    aisk-loc-loc-script:\n      run: bun .aisk/loc/scripts/loc-script.js\n",
      );
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            loc: {
              installedAt: "2026-01-01",
              components: {
                skills: [],
                rules: [],
                scripts: [{ name: "loc-script", path: ".aisk/loc/scripts/loc-script.js" }],
                resources: [],
              },
            },
          },
        }),
      );

      newInstaller(dir, projectDir, aiskHome).remove(["loc"]);

      expect(existsSync(join(scriptDir, "loc-script.js")), "script file must be removed").toBe(
        false,
      );
      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      expect(lefthook, "lefthook entry must be removed").not.toContain("aisk-loc-loc-script:");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails per-unit when unit is not installed", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).remove(["loc"])),
      ) as { removed: unknown[]; failed: Array<{ name: string; reason: string }> };

      expect(out.removed).toHaveLength(0);
      expect(out.failed[0]?.name).toBe("loc");
      expect(out.failed[0]?.reason).toContain("未安装");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("all removes all installed units", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      const skillDir = join(projectDir, ".claude", "skills", "aisk-loc-loc");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "# loc");
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            loc: {
              installedAt: "2026-01-01",
              components: {
                skills: [{ name: "loc", path: ".claude/skills/aisk-loc-loc/SKILL.md" }],
                rules: [],
                scripts: [],
                resources: [],
              },
            },
          },
        }),
      );

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).remove(["all"])),
      ) as { removed: Array<{ name: string }>; failed: unknown[] };

      expect(out.removed.some((u) => u.name === "loc")).toBe(true);
      expect(out.failed).toHaveLength(0);
      expect(existsSync(join(skillDir, "SKILL.md"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  refresh
 * @target      Installer.refresh()
 * @strategy    unit; installed local files with AISK:CUSTOM blocks
 * @cases
 *   - [PASS] updates customStatus to done when AISK:CUSTOM block is done
 *   - [PASS] outputs todo list in non-silent mode
 *   - [PASS] produces no output in silent mode
 */
describe("refresh", () => {
  test("updates customStatus to done when AISK:CUSTOM block is done", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      const resourceDir = join(projectDir, ".aisk", "loc", "resources");
      mkdirSync(resourceDir, { recursive: true });
      writeFileSync(
        join(resourceDir, "readme.md"),
        [
          '# AISK:CUSTOM name="pattern" status="done" hint="hint"',
          'testMatch: ["**/*.spec.ts"]',
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            loc: {
              installedAt: "2026-01-01",
              components: {
                skills: [],
                rules: [],
                scripts: [],
                resources: [
                  {
                    name: "readme",
                    path: ".aisk/loc/resources/readme.md",
                    customStatus: "todo",
                  },
                ],
              },
            },
          },
        }),
      );

      newInstaller(dir, projectDir, aiskHome).refresh(true);

      const installed = JSON.parse(
        readFileSync(join(projectDir, ".aisk", "installed.json"), "utf8"),
      ) as {
        units: Record<string, { components: { resources: Array<{ customStatus: string }> } }>;
      };
      expect(installed.units["loc"]?.components.resources[0]?.customStatus).toBe("done");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("outputs todo list in non-silent mode", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      const resourceDir = join(projectDir, ".aisk", "loc", "resources");
      mkdirSync(resourceDir, { recursive: true });
      writeFileSync(
        join(resourceDir, "readme.md"),
        [
          '# AISK:CUSTOM name="pattern" status="todo" hint="hint"',
          "content",
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            loc: {
              installedAt: "2026-01-01",
              components: {
                skills: [],
                rules: [],
                scripts: [],
                resources: [
                  {
                    name: "readme",
                    path: ".aisk/loc/resources/readme.md",
                    customStatus: "todo",
                  },
                ],
              },
            },
          },
        }),
      );

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).refresh(false)),
      ) as { todo: Array<{ unit: string; files: string[] }> };

      expect(out.todo.length).toBeGreaterThan(0);
      expect(out.todo[0]?.unit).toBe("loc");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("produces no output in silent mode", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(join(projectDir, ".aisk", "installed.json"), JSON.stringify({ units: {} }));

      const out = captureStdout(() => newInstaller(dir, projectDir, aiskHome).refresh(true));
      expect(out).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  init (.gitignore)
 * @target      Installer.init() — .gitignore file management
 * @strategy    unit; isolated project dirs
 * @cases
 *   - [PASS] creates .gitignore files in .aisk/ and .claude/ on install
 *   - [PASS] does not overwrite existing .gitignore files
 */
describe("init (.gitignore)", () => {
  test("creates .gitignore files in .aisk/ and .claude/ on install", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).init(["loc"]);

      expect(readFileSync(join(projectDir, ".aisk", ".gitignore"), "utf8")).toBe("*\n");
      expect(readFileSync(join(projectDir, ".claude", ".gitignore"), "utf8")).toBe(
        "skills/aisk-*/\nrules/aisk-*/\n",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("does not overwrite existing .gitignore files", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(join(projectDir, ".claude"), { recursive: true });
      writeFileSync(join(projectDir, ".claude", ".gitignore"), "custom-content\n");

      newInstaller(dir, projectDir, aiskHome).init(["loc"]);

      expect(readFileSync(join(projectDir, ".claude", ".gitignore"), "utf8")).toBe(
        "custom-content\n",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  init (installed record)
 * @target      Installer.init() — installed.json record writing
 * @strategy    unit; local unit with a required skill and an optional rule
 * @cases
 *   - [PASS] writes installed.json with every component tracked (no local/global split within the unit)
 */
describe("init (installed record)", () => {
  test("writes installed.json with every component tracked", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", rules: true });
      writeFileSync(
        join(aiskHome, "units", "loc", "unit.json"),
        JSON.stringify({
          name: "loc",
          description: "loc unit",
          dependencies: [],
          components: {
            skills: [{ name: "loc", file: "skills/loc.md" }],
            rules: [{ name: "loc-rule", file: "rules/loc-rule.md", condition: "has next" }],
          },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const installer = newInstaller(dir, projectDir, aiskHome);
      installer.init(["loc"]);

      const installed = installer.readInstalled();
      expect("loc" in installed.units).toBe(true);
      expect(installed.units["loc"]?.installedAt).toBeTruthy();
      expect(installed.units["loc"]?.components.skills.length).toBe(1);
      expect(installed.units["loc"]?.components.rules.length).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  human-readable output (default)
 * @target      Installer output formatting when json=false (the default)
 * @strategy    unit; construct with json=false explicitly
 * @cases
 *   - [PASS] list prints Chinese section headers for global/local units
 *   - [PASS] init failure prints the Chinese reason text
 */
describe("human-readable output (default)", () => {
  test("list prints Chinese section headers for global/local units", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = captureStdout(() => newInstaller(dir, projectDir, aiskHome, false).list());

      expect(out).toContain("全局 unit");
      expect(out).toContain("本地 unit");
      expect(() => JSON.parse(out)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("init failure prints the Chinese reason text", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = captureStdout(() => newInstaller(dir, projectDir, aiskHome, false).init(["poc"]));

      expect(out).toContain("失败");
      expect(out).toContain("register");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
