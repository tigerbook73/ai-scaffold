/**
 * @test-file   installer
 * @description Verifies the Installer class handles list, resolve (ResolveResult), add, remove,
 *              update (with AISK:CUSTOM merge), refresh, show, optional components, disabled
 *              (rules) units, sync-global symlink management, and lefthook.yml idempotent updates.
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY): Shengtian Liao @ [2]
 */
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";

import { Installer } from "../global/scripts/installer";
import type { ResolveResult, SyncGlobalResult } from "../global/scripts/types/installer-types";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "aisk-installer-"));
}

/** Isolated `~/.claude/skills` stand-in under the same temp dir — never touches the real home dir. */
function globalSkillsDirFor(tmpDir: string): string {
  return join(tmpDir, "global-skills");
}

/** Builds an Installer wired to an isolated globalSkillsDir so tests never write to the real home dir. */
function newInstaller(
  tmpDir: string,
  projectDir: string,
  aiskHome: string,
  human = false,
): Installer {
  return new Installer(projectDir, aiskHome, human, globalSkillsDirFor(tmpDir));
}

/** Creates a minimal fake aiskHome (package root) tree for testing, returns its path. */
function makeFakeAiskHome(tmpDir: string): string {
  const aiskHome = join(tmpDir, ".aisk");
  mkdirSync(aiskHome, { recursive: true });

  const unitDir = join(aiskHome, "units", "poc");
  mkdirSync(join(unitDir, "skills"), { recursive: true });
  mkdirSync(join(unitDir, "scripts"), { recursive: true });
  mkdirSync(join(unitDir, "resources"), { recursive: true });
  writeFileSync(join(unitDir, "skills", "poc.md"), "# poc\nPoC skill content");
  writeFileSync(join(unitDir, "scripts", "poc-hook.ts"), 'console.log("hook");');
  writeFileSync(join(unitDir, "resources", "readme.md"), "readme content");
  writeFileSync(
    join(unitDir, "unit.json"),
    JSON.stringify({
      name: "poc",
      description: "PoC unit",
      dependencies: ["poc-dep"],
      components: {
        skills: [{ name: "poc", file: "skills/poc.md" }],
        scripts: [{ name: "poc-hook", file: "scripts/poc-hook.ts", hook: "pre-commit" }],
        resources: [{ name: "readme", file: "resources/readme.md" }],
      },
    }),
  );

  const depDir = join(aiskHome, "units", "poc-dep");
  mkdirSync(depDir, { recursive: true });
  writeFileSync(
    join(depDir, "unit.json"),
    JSON.stringify({
      name: "poc-dep",
      description: "PoC dep unit",
      dependencies: [],
      components: {},
    }),
  );

  // Pre-computed global order (dep before dependent, alphabetical within same depth)
  writeFileSync(
    join(aiskHome, "units", "units.json"),
    JSON.stringify(["poc-dep", "poc"], null, 2) + "\n",
  );

  // global/setup — the fixed symlink target for `ai-skills sync-global`.
  mkdirSync(join(aiskHome, "global", "setup"), { recursive: true });
  writeFileSync(join(aiskHome, "global", "setup", "SKILL.md"), "# setup\nSetup skill content");

  return aiskHome;
}

/**
 * Adds a disabled (rules-declaring) unit to the fake aiskHome, returns its name.
 * Also appends it to units.json — the precomputed global order build.ts produces,
 * which (like the real registry) still lists disabled units by name.
 */
function addDisabledUnit(aiskHome: string, name = "poc-rules"): string {
  const unitDir = join(aiskHome, "units", name);
  mkdirSync(unitDir, { recursive: true });
  writeFileSync(
    join(unitDir, "unit.json"),
    JSON.stringify({
      name,
      description: "PoC unit with rules (disabled)",
      dependencies: [],
      components: {
        skills: [{ name, file: "skills/poc-rules.md" }],
        rules: [{ name: `${name}-rule`, file: "rules/poc-rules-rule.md" }],
      },
    }),
  );

  const orderPath = join(aiskHome, "units", "units.json");
  const order = JSON.parse(readFileSync(orderPath, "utf8")) as string[];
  writeFileSync(orderPath, JSON.stringify([...order, name], null, 2) + "\n");

  return name;
}

function captureStdout(fn: () => void): string {
  const output: string[] = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk: string | Uint8Array) => {
    if (typeof chunk === "string") output.push(chunk);
    return true;
  };
  try {
    fn();
  } finally {
    process.stdout.write = orig;
  }
  return output.join("");
}

/**
 * @test-suite  list
 * @target      Installer.list()
 * @strategy    unit; fake aiskHome tree
 * @cases
 *   - [PASS] lists all units with installed=false when nothing installed
 *   - [PASS] marks unit as installed=true when present in installed.json
 *   - [PASS] sets hasTodo=true when a component has customStatus=todo
 *   - [PASS] excludes disabled (rules-declaring) units by default
 */
describe("list", () => {
  test("lists all units with installed=false when nothing installed", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const installer = newInstaller(dir, projectDir, aiskHome);
      const result = JSON.parse(captureStdout(() => installer.list())) as {
        units: Array<{ name: string; description: string; installed: boolean }>;
      };

      expect(result.units.length).toBe(2);
      expect(result.units.every((u) => u.installed === false)).toBe(true);
      expect(result.units.some((u) => u.name === "poc" && u.description === "PoC unit")).toBe(true);
      expect(result.units.some((u) => u.name === "poc-dep")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("marks unit as installed=true when present in installed.json", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            poc: {
              installedAt: "2026-01-01",
              components: { skills: [], rules: [], scripts: [], resources: [] },
            },
          },
        }),
      );

      const installer = newInstaller(dir, projectDir, aiskHome);
      const result = JSON.parse(captureStdout(() => installer.list())) as {
        units: Array<{ name: string; installed: boolean }>;
      };

      const pocUnit = result.units.find((u) => u.name === "poc");
      const depUnit = result.units.find((u) => u.name === "poc-dep");
      expect(pocUnit?.installed).toBe(true);
      expect(depUnit?.installed).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("sets hasTodo=true when a component has customStatus=todo", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      const skillPath = join(projectDir, ".claude", "skills", "aisk-poc-poc");
      mkdirSync(skillPath, { recursive: true });
      writeFileSync(
        join(skillPath, "SKILL.md"),
        '# AISK:CUSTOM name="paths" status="todo" hint="scan test files"\n# AISK:CUSTOM:END\n',
      );
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            poc: {
              installedAt: "2026-01-01",
              components: {
                skills: [
                  {
                    name: "poc",
                    path: ".claude/skills/aisk-poc-poc/SKILL.md",
                    customStatus: "todo",
                  },
                ],
                rules: [],
                scripts: [],
                resources: [],
              },
            },
          },
        }),
      );

      const installer = newInstaller(dir, projectDir, aiskHome);
      const result = JSON.parse(captureStdout(() => installer.list())) as {
        units: Array<{ name: string; hasTodo?: boolean }>;
      };

      const pocUnit = result.units.find((u) => u.name === "poc");
      expect(pocUnit?.hasTodo).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("excludes disabled (rules-declaring) units by default", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addDisabledUnit(aiskHome);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const installer = newInstaller(dir, projectDir, aiskHome);
      const result = JSON.parse(captureStdout(() => installer.list())) as {
        units: Array<{ name: string }>;
      };

      expect(result.units.some((u) => u.name === "poc-rules")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  resolve
 * @target      Installer.resolve()
 * @strategy    unit; fake aiskHome tree
 * @cases
 *   - [PASS] returns full ResolveResult with dep in to_install and auto when nothing installed
 *   - [PASS] dep already installed → dep in auto but not to_install, poc in to_install
 *   - [PASS] installed unit not in desired state → appears in to_remove
 */
describe("resolve", () => {
  test("returns full ResolveResult with dep in to_install and auto when nothing installed", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const installer = newInstaller(dir, projectDir, aiskHome);
      const result = JSON.parse(captureStdout(() => installer.resolve(["poc"]))) as ResolveResult;

      expect(result.to_remove).toEqual([]);
      expect(result.to_install).toEqual(["poc-dep", "poc"]);
      expect(result.to_update).toEqual([]);
      expect(result.auto).toEqual(["poc-dep"]);
      expect(result.order).toEqual(["poc-dep", "poc"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("dep already installed → dep in auto but not to_install, poc in to_install", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            "poc-dep": {
              installedAt: "2026-01-01",
              components: { skills: [], rules: [], scripts: [], resources: [] },
            },
          },
        }),
      );

      const installer = newInstaller(dir, projectDir, aiskHome);
      const result = JSON.parse(captureStdout(() => installer.resolve(["poc"]))) as ResolveResult;

      expect(result.to_remove).toEqual([]);
      expect(result.to_install).toEqual(["poc"]);
      expect(result.to_update).toEqual([]);
      expect(result.auto).toEqual(["poc-dep"]);
      expect(result.order).toEqual(["poc"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("installed unit not in desired state → appears in to_remove", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            poc: {
              installedAt: "2026-01-01",
              components: { skills: [], rules: [], scripts: [], resources: [] },
            },
            "poc-dep": {
              installedAt: "2026-01-01",
              components: { skills: [], rules: [], scripts: [], resources: [] },
            },
          },
        }),
      );

      const installer = newInstaller(dir, projectDir, aiskHome);
      const result = JSON.parse(captureStdout(() => installer.resolve([]))) as ResolveResult;

      expect(result.to_remove).toEqual(["poc-dep", "poc"]);
      expect(result.to_install).toEqual([]);
      expect(result.to_update).toEqual([]);
      expect(result.auto).toEqual([]);
      expect(result.order).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  add (skill — global scope)
 * @target      Installer.add() — plain skills are served by the global symlink, not copied
 * @strategy    unit; unit.json declares a skill with no hasCustom/localCopy
 * @cases
 *   - [PASS] does not copy the skill file into the project
 *   - [PASS] still records the unit in installed.json (with an empty skills array)
 *   - [PASS] auto-installs transitive dependency when not yet installed
 *   - [PASS] is idempotent (second add updates cleanly, still no local file)
 */
describe("add (skill — global scope)", () => {
  test("does not copy the skill file into the project", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).add(["poc"]);

      const skillFile = join(projectDir, ".claude", "skills", "aisk-poc-poc", "SKILL.md");
      expect(existsSync(skillFile)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("still records the unit in installed.json with an empty skills array", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const installer = newInstaller(dir, projectDir, aiskHome);
      installer.add(["poc"]);

      const installed = installer.readInstalled();
      expect("poc" in installed.units).toBe(true);
      expect(installed.units["poc"]?.components.skills).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("auto-installs transitive dependency when not yet installed", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).add(["poc"])),
      ) as {
        added: Array<{ name: string; autoDep?: boolean }>;
        failed: unknown[];
      };

      expect(out.failed).toHaveLength(0);
      const dep = out.added.find((u) => u.name === "poc-dep");
      expect(dep).toBeTruthy();
      expect(dep?.autoDep).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("is idempotent (second add updates cleanly, still no local file)", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const installer = newInstaller(dir, projectDir, aiskHome);
      installer.add(["poc"]);
      const out = JSON.parse(captureStdout(() => installer.add(["poc"]))) as {
        added: unknown[];
        updated: Array<{ name: string }>;
      };

      expect(out.added).toHaveLength(0);
      expect(out.updated.some((u) => u.name === "poc")).toBe(true);
      expect(existsSync(join(projectDir, ".claude", "skills", "aisk-poc-poc", "SKILL.md"))).toBe(
        false,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  add (skill — local copy)
 * @target      Installer.add() — hasCustom/localCopy skills are still copied into the project
 * @strategy    unit; unit.json skill component with hasCustom or localCopy
 * @cases
 *   - [PASS] hasCustom skill is copied and its customStatus is scanned
 *   - [PASS] localCopy skill (no hasCustom) is copied without a customStatus
 */
describe("add (skill — local copy)", () => {
  test("hasCustom skill is copied and its customStatus is scanned", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      writeFileSync(
        join(aiskHome, "units", "poc", "skills", "poc.md"),
        '# poc\n# AISK:CUSTOM name="paths" status="todo" hint="scan"\n# AISK:CUSTOM:END\n',
      );
      writeFileSync(
        join(aiskHome, "units", "poc", "unit.json"),
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: { skills: [{ name: "poc", file: "skills/poc.md", hasCustom: true }] },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).add(["poc"])),
      ) as {
        added: Array<{ components: Array<{ name: string; customStatus?: string }> }>;
      };

      const skillFile = join(projectDir, ".claude", "skills", "aisk-poc-poc", "SKILL.md");
      expect(existsSync(skillFile)).toBe(true);
      expect(out.added[0]?.components.find((c) => c.name === "poc")?.customStatus).toBe("todo");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("localCopy skill (no hasCustom) is copied without a customStatus", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      writeFileSync(
        join(aiskHome, "units", "poc", "unit.json"),
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: { skills: [{ name: "poc", file: "skills/poc.md", localCopy: true }] },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).add(["poc"]);

      const skillFile = join(projectDir, ".claude", "skills", "aisk-poc-poc", "SKILL.md");
      expect(readFileSync(skillFile, "utf8")).toContain("PoC skill content");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  add (disabled unit — rules)
 * @target      Installer.add() — units declaring rules components are wholesale disabled
 * @strategy    unit; unit.json declares a rules component
 * @cases
 *   - [PASS] explicit add of a disabled unit fails with a disabled reason
 *   - [PASS] add(["all"]) silently skips disabled units (not added, not failed)
 */
describe("add (disabled unit — rules)", () => {
  test("explicit add of a disabled unit fails with a disabled reason", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addDisabledUnit(aiskHome);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).add(["poc-rules"])),
      ) as {
        added: unknown[];
        failed: Array<{ name: string; reason: string }>;
      };

      expect(out.added).toHaveLength(0);
      expect(out.failed[0]?.name).toBe("poc-rules");
      expect(out.failed[0]?.reason).toContain("rules");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('add(["all"]) silently skips disabled units', () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addDisabledUnit(aiskHome);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).add(["all"])),
      ) as {
        added: Array<{ name: string }>;
        failed: Array<{ name: string }>;
      };

      expect(out.added.some((u) => u.name === "poc-rules")).toBe(false);
      expect(out.failed.some((f) => f.name === "poc-rules")).toBe(false);
      expect(out.added.some((u) => u.name === "poc")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  add (optional components)
 * @target      Installer.add() — all optional components are installed, incl. local ones
 * @strategy    unit; unit.json with a required skill and an optional localCopy resource
 * @cases
 *   - [PASS] installs the optional local resource (no user selection required)
 */
describe("add (optional components)", () => {
  test("installs the optional local resource (no user selection required)", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      writeFileSync(
        join(aiskHome, "units", "poc", "resources", "opt.md"),
        "optional resource content",
      );
      writeFileSync(
        join(aiskHome, "units", "poc", "unit.json"),
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: {
            skills: [{ name: "poc", file: "skills/poc.md" }],
            resources: [
              {
                name: "opt-res",
                file: "resources/opt.md",
                condition: "has next",
                localCopy: true,
              },
            ],
          },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).add(["poc"]);

      expect(existsSync(join(projectDir, ".aisk", "poc", "resources", "opt.md"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  add → update (orphan removal)
 * @target      Installer.add() when unit already installed → updateUnitComponents()
 * @strategy    unit; simulate unit.json version change removing a localCopy resource
 * @cases
 *   - [PASS] removes orphaned local resource file when unit.json no longer declares it
 */
describe("add → update (orphan removal)", () => {
  test("removes orphaned local resource file when unit.json no longer declares it", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      writeFileSync(join(aiskHome, "units", "poc", "resources", "opt.md"), "old resource");

      const unitJsonPath = join(aiskHome, "units", "poc", "unit.json");

      // v1: unit has skill + a localCopy resource
      writeFileSync(
        unitJsonPath,
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: {
            skills: [{ name: "poc", file: "skills/poc.md", localCopy: true }],
            resources: [{ name: "opt-res", file: "resources/opt.md", localCopy: true }],
          },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const installer = newInstaller(dir, projectDir, aiskHome);
      installer.add(["poc"]);
      const resourceFile = join(projectDir, ".aisk", "poc", "resources", "opt.md");
      expect(existsSync(resourceFile)).toBe(true);

      // v2: resource removed from unit.json
      writeFileSync(
        unitJsonPath,
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: { skills: [{ name: "poc", file: "skills/poc.md", localCopy: true }] },
        }),
      );

      installer.add(["poc"]);
      expect(existsSync(resourceFile), "orphaned resource file must be removed").toBe(false);
      expect(existsSync(join(projectDir, ".claude", "skills", "aisk-poc-poc", "SKILL.md"))).toBe(
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

      // New template with todo block
      writeFileSync(
        join(aiskHome, "units", "poc", "resources", "readme.md"),
        [
          '# AISK:CUSTOM name="pattern" status="todo" hint="new hint"',
          'testMatch: ["**/*.new.ts"]',
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );
      writeFileSync(
        join(aiskHome, "units", "poc", "unit.json"),
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: {
            resources: [{ name: "readme", file: "resources/readme.md", hasCustom: true }],
          },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      // Create already-installed file with done block
      const resourceDir = join(projectDir, ".aisk", "poc", "resources");
      mkdirSync(resourceDir, { recursive: true });
      writeFileSync(
        join(resourceDir, "readme.md"),
        [
          '# AISK:CUSTOM name="pattern" status="done" hint="old hint"',
          'testMatch: ["**/*.spec.ts"]',
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );

      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            poc: {
              installedAt: "2026-01-01",
              components: {
                skills: [],
                rules: [],
                scripts: [],
                resources: [
                  {
                    name: "readme",
                    path: ".aisk/poc/resources/readme.md",
                    customStatus: "done",
                  },
                ],
              },
            },
          },
        }),
      );

      installer.update(["poc"]);

      const content = readFileSync(join(resourceDir, "readme.md"), "utf8");
      expect(content).toContain('status="done"');
      expect(content).toContain('hint="new hint"'); // new template's hint
      expect(content).toContain('["**/*.spec.ts"]'); // old done content preserved
      expect(content).not.toContain('["**/*.new.ts"]'); // new template default replaced
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("keeps new template content for todo blocks", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);

      writeFileSync(
        join(aiskHome, "units", "poc", "resources", "readme.md"),
        [
          '# AISK:CUSTOM name="pattern" status="todo" hint="hint"',
          'testMatch: ["**/*.updated.ts"]',
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );
      writeFileSync(
        join(aiskHome, "units", "poc", "unit.json"),
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: {
            resources: [{ name: "readme", file: "resources/readme.md", hasCustom: true }],
          },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const resourceDir = join(projectDir, ".aisk", "poc", "resources");
      mkdirSync(resourceDir, { recursive: true });
      writeFileSync(
        join(resourceDir, "readme.md"),
        [
          '# AISK:CUSTOM name="pattern" status="todo" hint="hint"',
          'testMatch: ["**/*.old.ts"]',
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );

      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            poc: {
              installedAt: "2026-01-01",
              components: {
                skills: [],
                rules: [],
                scripts: [],
                resources: [
                  {
                    name: "readme",
                    path: ".aisk/poc/resources/readme.md",
                    customStatus: "todo",
                  },
                ],
              },
            },
          },
        }),
      );

      newInstaller(dir, projectDir, aiskHome).update(["poc"]);

      const content = readFileSync(join(resourceDir, "readme.md"), "utf8");
      expect(content).toContain('["**/*.updated.ts"]'); // new template default used
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
 *   - [PASS] skips optional local component that is not on disk
 */
describe("update", () => {
  test("fails per-unit when unit is not installed", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).update(["poc"])),
      ) as {
        updated: unknown[];
        failed: Array<{ name: string; reason: string }>;
      };

      expect(out.updated).toHaveLength(0);
      expect(out.failed[0]?.name).toBe("poc");
      expect(out.failed[0]?.reason).toContain("未安装");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skips optional local component that is not on disk", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      writeFileSync(
        join(aiskHome, "units", "poc", "resources", "opt.md"),
        "optional resource content",
      );
      writeFileSync(
        join(aiskHome, "units", "poc", "unit.json"),
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: {
            skills: [{ name: "poc", file: "skills/poc.md" }],
            resources: [
              {
                name: "opt-res",
                file: "resources/opt.md",
                condition: "has next",
                localCopy: true,
              },
            ],
          },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      // Pre-populate installed.json — optional resource NOT installed
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            poc: {
              installedAt: "2026-01-01",
              components: { skills: [], rules: [], scripts: [], resources: [] },
            },
          },
        }),
      );

      newInstaller(dir, projectDir, aiskHome).update(["poc"]);

      expect(existsSync(join(projectDir, ".aisk", "poc", "resources", "opt.md"))).toBe(false);
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
 *   - [PASS] removes local script file and corresponding lefthook entry
 *   - [PASS] removes hook registration for a global-hook script without deleting the global path
 *   - [PASS] fails per-unit when unit is not installed
 *   - [PASS] all removes all installed units
 */
describe("remove", () => {
  test("removes skill file and empty parent directory", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      const skillDir = join(projectDir, ".claude", "skills", "aisk-poc-poc");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "# poc");
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            poc: {
              installedAt: "2026-01-01",
              components: {
                skills: [{ name: "poc", path: ".claude/skills/aisk-poc-poc/SKILL.md" }],
                rules: [],
                scripts: [],
                resources: [],
              },
            },
          },
        }),
      );

      newInstaller(dir, projectDir, aiskHome).remove(["poc"]);

      expect(existsSync(join(skillDir, "SKILL.md")), "skill file must be removed").toBe(false);
      expect(existsSync(skillDir), "empty parent dir must be removed").toBe(false);
      const data = JSON.parse(
        readFileSync(join(projectDir, ".aisk", "installed.json"), "utf8"),
      ) as {
        units: Record<string, unknown>;
      };
      expect("poc" in data.units, "unit must be removed from installed.json").toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("removes local script file and corresponding lefthook entry", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      const scriptDir = join(projectDir, ".aisk", "poc", "scripts");
      mkdirSync(scriptDir, { recursive: true });
      writeFileSync(join(scriptDir, "poc-hook.js"), "// hook");
      writeFileSync(
        join(projectDir, "lefthook.yml"),
        "pre-commit:\n  commands:\n    aisk-poc-poc-hook:\n      run: bun .aisk/poc/scripts/poc-hook.js\n",
      );
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            poc: {
              installedAt: "2026-01-01",
              components: {
                skills: [],
                rules: [],
                scripts: [{ name: "poc-hook", path: ".aisk/poc/scripts/poc-hook.js" }],
                resources: [],
              },
            },
          },
        }),
      );

      newInstaller(dir, projectDir, aiskHome).remove(["poc"]);

      expect(existsSync(join(scriptDir, "poc-hook.js")), "script file must be removed").toBe(false);
      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      expect(lefthook, "lefthook entry must be removed").not.toContain("aisk-poc-poc-hook:");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("removes hook registration for a global-hook script without deleting the global path", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const globalScriptPath = join(
        globalSkillsDirFor(dir),
        "aisk-poc-poc",
        "scripts",
        "poc-hook.ts",
      );
      mkdirSync(join(globalSkillsDirFor(dir), "aisk-poc-poc", "scripts"), { recursive: true });
      writeFileSync(globalScriptPath, "// global script, owned by sync-global");
      writeFileSync(
        join(projectDir, "lefthook.yml"),
        `pre-commit:\n  commands:\n    aisk-poc-poc-hook:\n      run: bun ${globalScriptPath}\n`,
      );
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            poc: {
              installedAt: "2026-01-01",
              components: {
                skills: [],
                rules: [],
                scripts: [{ name: "poc-hook", path: globalScriptPath }],
                resources: [],
              },
            },
          },
        }),
      );

      newInstaller(dir, projectDir, aiskHome).remove(["poc"]);

      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      expect(lefthook, "lefthook entry must be removed").not.toContain("aisk-poc-poc-hook:");
      expect(existsSync(globalScriptPath), "global script must not be deleted").toBe(true);
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
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).remove(["poc"])),
      ) as {
        removed: unknown[];
        failed: Array<{ name: string; reason: string }>;
      };

      expect(out.removed).toHaveLength(0);
      expect(out.failed[0]?.name).toBe("poc");
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
      const skillDir = join(projectDir, ".claude", "skills", "aisk-poc-poc");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "# poc");
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            poc: {
              installedAt: "2026-01-01",
              components: {
                skills: [{ name: "poc", path: ".claude/skills/aisk-poc-poc/SKILL.md" }],
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
      ) as {
        removed: Array<{ name: string }>;
        failed: unknown[];
      };

      expect(out.removed.some((u) => u.name === "poc")).toBe(true);
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
      const resourceDir = join(projectDir, ".aisk", "poc", "resources");
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
            poc: {
              installedAt: "2026-01-01",
              components: {
                skills: [],
                rules: [],
                scripts: [],
                resources: [
                  {
                    name: "readme",
                    path: ".aisk/poc/resources/readme.md",
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
      expect(installed.units["poc"]?.components.resources[0]?.customStatus).toBe("done");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("outputs todo list in non-silent mode", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      const resourceDir = join(projectDir, ".aisk", "poc", "resources");
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
            poc: {
              installedAt: "2026-01-01",
              components: {
                skills: [],
                rules: [],
                scripts: [],
                resources: [
                  {
                    name: "readme",
                    path: ".aisk/poc/resources/readme.md",
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
      ) as {
        todo: Array<{ unit: string; files: string[] }>;
      };

      expect(out.todo.length).toBeGreaterThan(0);
      expect(out.todo[0]?.unit).toBe("poc");
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
 * @test-suite  show
 * @target      Installer.show()
 * @strategy    unit; fake aiskHome tree
 * @cases
 *   - [PASS] returns unit details with installed=false when not installed
 *   - [PASS] returns customStatus from installed.json when installed
 *   - [PASS] marks disabled:true with a reason for a unit that declares rules
 *   - [PASS] plain skill has scope "global"; hasCustom skill has scope "local"
 *   - [PASS] global skill installed=true once its sync-global symlink file exists on disk
 */
describe("show", () => {
  test("returns unit details with installed=false when not installed", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).show("poc")),
      ) as {
        name: string;
        installed: boolean;
        dependencies: string[];
        disabled: boolean;
      };

      expect(out.name).toBe("poc");
      expect(out.installed).toBe(false);
      expect(out.disabled).toBe(false);
      expect(out.dependencies).toContain("poc-dep");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("returns customStatus from installed.json when installed", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            poc: {
              installedAt: "2026-01-01",
              components: {
                skills: [
                  {
                    name: "poc",
                    path: ".claude/skills/aisk-poc-poc/SKILL.md",
                    customStatus: "done",
                  },
                ],
                rules: [],
                scripts: [],
                resources: [],
              },
            },
          },
        }),
      );

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).show("poc")),
      ) as {
        installed: boolean;
        components: Array<{ name: string; customStatus?: string }>;
      };

      expect(out.installed).toBe(true);
      const skillComp = out.components.find((c) => c.name === "poc");
      expect(skillComp?.customStatus).toBe("done");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("marks disabled:true with a reason for a unit that declares rules", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addDisabledUnit(aiskHome);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).show("poc-rules")),
      ) as { disabled: boolean; disabledReason?: string };

      expect(out.disabled).toBe(true);
      expect(out.disabledReason).toBeTruthy();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('plain skill has scope "global"; hasCustom skill has scope "local"', () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      writeFileSync(
        join(aiskHome, "units", "poc", "unit.json"),
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: {
            skills: [
              { name: "poc", file: "skills/poc.md" },
              { name: "poc-custom", file: "skills/poc.md", hasCustom: true },
            ],
          },
        }),
      );
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).show("poc")),
      ) as { components: Array<{ name: string; scope: string }> };

      expect(out.components.find((c) => c.name === "poc")?.scope).toBe("global");
      expect(out.components.find((c) => c.name === "poc-custom")?.scope).toBe("local");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("global skill installed=true once its sync-global symlink file exists on disk", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const before = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).show("poc")),
      ) as { components: Array<{ name: string; installed: boolean }> };
      expect(before.components.find((c) => c.name === "poc")?.installed).toBe(false);

      mkdirSync(join(globalSkillsDirFor(dir), "aisk-poc-poc"), { recursive: true });
      writeFileSync(join(globalSkillsDirFor(dir), "aisk-poc-poc", "SKILL.md"), "# poc");

      const after = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).show("poc")),
      ) as { components: Array<{ name: string; installed: boolean }> };
      expect(after.components.find((c) => c.name === "poc")?.installed).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  add (script/hook — global default)
 * @target      Installer.add() — hook scripts point at the global symlink path by default
 * @strategy    unit; unit.json declares a script component with a hook, no localCopy
 * @cases
 *   - [PASS] registers a lefthook entry pointing at the global script path, no local bundle
 *   - [PASS] appends lefthook template vars when params declared
 *   - [PASS] hook registration is idempotent (no duplicate entries on re-add)
 *   - [PASS] appends hook entry to existing lefthook.yml
 *   - [PASS] fails the unit when it declares a hook script but has no skill to host it
 */
describe("add (script/hook — global default)", () => {
  test("registers a lefthook entry pointing at the global script path, no local bundle", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).add(["poc"]);

      expect(existsSync(join(projectDir, ".aisk", "poc", "scripts", "poc-hook.js"))).toBe(false);

      const globalScriptPath = join(
        globalSkillsDirFor(dir),
        "aisk-poc-poc",
        "scripts",
        "poc-hook.ts",
      );
      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      expect(lefthook).toContain("aisk-poc-poc-hook:");
      expect(lefthook).toContain(`bun ${globalScriptPath}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("appends lefthook template vars when params declared", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      writeFileSync(
        join(aiskHome, "units", "poc", "unit.json"),
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: {
            skills: [{ name: "poc", file: "skills/poc.md" }],
            scripts: [
              {
                name: "poc-hook",
                file: "scripts/poc-hook.ts",
                hook: "pre-commit",
                params: ["staged_files"],
              },
            ],
          },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).add(["poc"]);

      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      expect(lefthook).toContain("{staged_files}");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("hook registration is idempotent (no duplicate entries on re-add)", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const installer = newInstaller(dir, projectDir, aiskHome);
      installer.add(["poc"]);
      installer.add(["poc"]); // second call → update path

      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      const occurrences = lefthook.split("aisk-poc-poc-hook:").length - 1;
      expect(occurrences).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("appends hook entry to existing lefthook.yml", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      writeFileSync(
        join(projectDir, "lefthook.yml"),
        "pre-commit:\n  commands:\n    existing-hook:\n      run: echo ok\n",
      );

      newInstaller(dir, projectDir, aiskHome).add(["poc"]);

      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      expect(lefthook).toContain("existing-hook:");
      expect(lefthook).toContain("aisk-poc-poc-hook:");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails the unit when it declares a hook script but has no skill to host it", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      writeFileSync(
        join(aiskHome, "units", "poc", "unit.json"),
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: {
            scripts: [{ name: "poc-hook", file: "scripts/poc-hook.ts", hook: "pre-commit" }],
          },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).add(["poc"])),
      ) as {
        added: unknown[];
        failed: Array<{ name: string; reason: string }>;
      };

      expect(out.added).toHaveLength(0);
      expect(out.failed[0]?.name).toBe("poc");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  add (script/hook — localCopy)
 * @target      Installer.add() — localCopy scripts are still bundled into the project
 * @strategy    unit; unit.json declares a script component with hook + localCopy
 * @cases
 *   - [PASS] bundles the script into .aisk/{unit}/scripts and registers a local hook
 */
describe("add (script/hook — localCopy)", () => {
  test("bundles the script into .aisk/{unit}/scripts and registers a local hook", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      writeFileSync(
        join(aiskHome, "units", "poc", "unit.json"),
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: {
            scripts: [
              {
                name: "poc-hook",
                file: "scripts/poc-hook.ts",
                hook: "pre-commit",
                localCopy: true,
              },
            ],
          },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).add(["poc"]);

      const scriptFile = join(projectDir, ".aisk", "poc", "scripts", "poc-hook.js");
      expect(readFileSync(scriptFile, "utf8")).toContain("hook");

      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      expect(lefthook).toContain("aisk-poc-poc-hook:");
      expect(lefthook).toContain("bun .aisk/poc/scripts/poc-hook.js");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  add (.gitignore)
 * @target      Installer.add() — .gitignore file management
 * @strategy    unit; isolated project dirs
 * @cases
 *   - [PASS] creates .gitignore files in .aisk/ and .claude/ on install
 *   - [PASS] does not overwrite existing .gitignore files
 */
describe("add (.gitignore)", () => {
  test("creates .gitignore files in .aisk/ and .claude/ on install", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).add(["poc"]);

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
      const projectDir = join(dir, "project");
      mkdirSync(join(projectDir, ".claude"), { recursive: true });
      writeFileSync(join(projectDir, ".claude", ".gitignore"), "custom-content\n");

      newInstaller(dir, projectDir, aiskHome).add(["poc"]);

      expect(readFileSync(join(projectDir, ".claude", ".gitignore"), "utf8")).toBe(
        "custom-content\n",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  add (installed record)
 * @target      Installer.add() — installed.json only tracks local (hasCustom/localCopy) components
 * @strategy    unit; unit.json with a plain required skill and an optional localCopy resource
 * @cases
 *   - [PASS] writes installed.json with only the local resource tracked
 */
describe("add (installed record)", () => {
  test("writes installed.json with only the local resource tracked", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      writeFileSync(
        join(aiskHome, "units", "poc", "resources", "opt.md"),
        "optional resource content",
      );
      writeFileSync(
        join(aiskHome, "units", "poc", "unit.json"),
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: {
            skills: [{ name: "poc", file: "skills/poc.md" }],
            resources: [
              {
                name: "opt-res",
                file: "resources/opt.md",
                condition: "has next",
                localCopy: true,
              },
            ],
          },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const installer = newInstaller(dir, projectDir, aiskHome);
      installer.add(["poc"]);

      const installed = installer.readInstalled();
      expect("poc" in installed.units).toBe(true);
      expect(installed.units["poc"]?.installedAt).toBeTruthy();
      // Plain skill served globally (not tracked); optional local resource tracked.
      expect(installed.units["poc"]?.components.skills.length).toBe(0);
      expect(installed.units["poc"]?.components.resources.length).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  sync-global
 * @target      Installer.syncGlobal()
 * @strategy    unit; fake aiskHome tree; isolated globalSkillsDir under the temp dir
 * @cases
 *   - [PASS] creates the aisk-setup symlink pointing at aiskHome/global/setup
 *   - [PASS] creates aisk-{unit}-{skill}/SKILL.md as a symlink to the unit's skill file
 *   - [PASS] symlinks resources/ and scripts/ when the unit declares them
 *   - [PASS] does not create resources/scripts symlinks for a unit with neither
 *   - [PASS] is idempotent — a second run makes no changes and reports nothing removed
 *   - [PASS] skips disabled (rules) units and reports them in skippedDisabled
 *   - [PASS] removes stale managed entries whose unit/skill no longer resolves
 *   - [PASS] does not touch non-managed entries in the skills dir
 */
describe("sync-global", () => {
  test("creates the aisk-setup symlink pointing at aiskHome/global/setup", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).syncGlobal();

      const setupLink = join(globalSkillsDirFor(dir), "aisk-setup");
      expect(lstatSync(setupLink).isSymbolicLink()).toBe(true);
      expect(readlinkSync(setupLink)).toBe(join(aiskHome, "global", "setup"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("creates aisk-{unit}-{skill}/SKILL.md as a symlink to the unit's skill file", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).syncGlobal();

      const skillLink = join(globalSkillsDirFor(dir), "aisk-poc-poc", "SKILL.md");
      expect(lstatSync(skillLink).isSymbolicLink()).toBe(true);
      expect(readlinkSync(skillLink)).toBe(join(aiskHome, "units", "poc", "skills", "poc.md"));
      expect(readFileSync(skillLink, "utf8")).toContain("PoC skill content");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("symlinks resources/ and scripts/ when the unit declares them", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).syncGlobal();

      const skillDir = join(globalSkillsDirFor(dir), "aisk-poc-poc");
      expect(readlinkSync(join(skillDir, "resources"))).toBe(
        join(aiskHome, "units", "poc", "resources"),
      );
      expect(readlinkSync(join(skillDir, "scripts"))).toBe(
        join(aiskHome, "units", "poc", "scripts"),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("does not create resources/scripts symlinks for a unit with neither", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      writeFileSync(
        join(aiskHome, "units", "poc", "unit.json"),
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: { skills: [{ name: "poc", file: "skills/poc.md" }] },
        }),
      );
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).syncGlobal();

      const skillDir = join(globalSkillsDirFor(dir), "aisk-poc-poc");
      expect(existsSync(join(skillDir, "resources"))).toBe(false);
      expect(existsSync(join(skillDir, "scripts"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("is idempotent — a second run makes no changes and reports nothing removed", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      installer.syncGlobal();
      const out = JSON.parse(captureStdout(() => installer.syncGlobal())) as SyncGlobalResult;

      expect(out.removedStale).toEqual([]);
      const skillLink = join(globalSkillsDirFor(dir), "aisk-poc-poc", "SKILL.md");
      expect(lstatSync(skillLink).isSymbolicLink()).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skips disabled (rules) units and reports them in skippedDisabled", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addDisabledUnit(aiskHome);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).syncGlobal()),
      ) as SyncGlobalResult;

      expect(out.skippedDisabled).toContain("poc-rules");
      expect(existsSync(join(globalSkillsDirFor(dir), "aisk-poc-rules-poc-rules"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("removes stale managed entries whose unit/skill no longer resolves", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const staleDir = join(globalSkillsDirFor(dir), "aisk-poc-old-skill");
      mkdirSync(staleDir, { recursive: true });
      writeFileSync(join(staleDir, "SKILL.md"), "stale");

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).syncGlobal()),
      ) as SyncGlobalResult;

      expect(existsSync(staleDir)).toBe(false);
      expect(out.removedStale).toContain(staleDir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("does not touch non-managed entries in the skills dir", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const unmanagedDir = join(globalSkillsDirFor(dir), "not-managed-by-aisk");
      mkdirSync(unmanagedDir, { recursive: true });
      writeFileSync(join(unmanagedDir, "SKILL.md"), "user-owned");

      newInstaller(dir, projectDir, aiskHome).syncGlobal();

      expect(existsSync(join(unmanagedDir, "SKILL.md"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
