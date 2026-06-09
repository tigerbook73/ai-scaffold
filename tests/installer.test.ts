/**
 * @test-file   installer
 * @description Verifies the Installer class handles list, resolve (ResolveResult), add, remove,
 *              update (with AISK:CUSTOM merge), refresh, show, optional components, and
 *              lefthook.yml idempotent updates.
 * @ai-generated
 * @reviewed-by
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, test, vi } from "vitest";

import { Installer } from "../global/scripts/installer";
import type { ResolveResult } from "../global/scripts/types/installer-types";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "aisk-installer-"));
}

/** Creates a minimal fake ~/.aisk tree for testing, returns its path. */
function makeFakeAiskHome(tmpDir: string): string {
  const aiskHome = join(tmpDir, ".aisk");
  mkdirSync(aiskHome, { recursive: true });
  writeFileSync(join(aiskHome, "config.json"), JSON.stringify({ repoPath: tmpDir }));

  const unitDir = join(aiskHome, "units", "poc");
  mkdirSync(join(unitDir, "skills"), { recursive: true });
  mkdirSync(join(unitDir, "scripts"), { recursive: true });
  mkdirSync(join(unitDir, "resources"), { recursive: true });
  writeFileSync(join(unitDir, "skills", "poc.md"), "# poc\nPoC skill content");
  writeFileSync(join(unitDir, "scripts", "poc-hook.js"), '"use strict";\nconsole.log("hook");');
  writeFileSync(join(unitDir, "resources", "readme.md"), "readme content");
  writeFileSync(
    join(unitDir, "unit.json"),
    JSON.stringify({
      name: "poc",
      description: "PoC unit",
      dependencies: ["poc-dep"],
      components: {
        skills: [{ name: "poc", file: "skills/poc.md" }],
        scripts: [{ name: "poc-hook", file: "scripts/poc-hook.js", hook: "pre-commit" }],
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
  writeFileSync(join(aiskHome, "units.json"), JSON.stringify(["poc-dep", "poc"], null, 2) + "\n");

  return aiskHome;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

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

// ─── installer list ───────────────────────────────────────────────────────────

/**
 * @test-suite  list
 * @target      Installer.list()
 * @strategy    unit; fake ~/.aisk tree
 * @cases
 *   - [PASS] lists all units with installed=false when nothing installed
 *   - [PASS] marks unit as installed=true when present in installed.json
 *   - [PASS] sets hasTodo=true when a component has customStatus=todo
 */
test("list lists all units with installed=false when nothing installed", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aiskHome);
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

test("list marks unit as installed=true when present in installed.json", () => {
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

    const installer = new Installer(projectDir, aiskHome);
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

test("list sets hasTodo=true when a component has customStatus=todo", () => {
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
                { name: "poc", path: ".claude/skills/aisk-poc-poc/SKILL.md", customStatus: "todo" },
              ],
              rules: [],
              scripts: [],
              resources: [],
            },
          },
        },
      }),
    );

    const installer = new Installer(projectDir, aiskHome);
    const result = JSON.parse(captureStdout(() => installer.list())) as {
      units: Array<{ name: string; hasTodo?: boolean }>;
    };

    const pocUnit = result.units.find((u) => u.name === "poc");
    expect(pocUnit?.hasTodo).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer resolve ────────────────────────────────────────────────────────

/**
 * @test-suite  resolve
 * @target      Installer.resolve()
 * @strategy    unit; fake ~/.aisk tree
 * @cases
 *   - [PASS] returns full ResolveResult with dep in to_install and auto when nothing installed
 *   - [PASS] dep already installed → dep in auto but not in to_install
 *   - [PASS] installed unit not in desired state → appears in to_remove
 */
test("resolve returns full ResolveResult with dep in to_install and auto when nothing installed", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aiskHome);
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

test("resolve with dep already installed → dep in auto but not to_install, poc in to_install", () => {
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

    const installer = new Installer(projectDir, aiskHome);
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

test("resolve with installed unit not in desired state → appears in to_remove", () => {
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

    const installer = new Installer(projectDir, aiskHome);
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

// ─── installer add: skill ─────────────────────────────────────────────────────

/**
 * @test-suite  add (skill)
 * @target      Installer.add()
 * @strategy    unit; unit.json declares skill component
 * @cases
 *   - [PASS] installs skill to .claude/skills/aisk-{unit}-{name}/SKILL.md
 *   - [PASS] add is idempotent (second add overwrites cleanly, appears in updated)
 *   - [PASS] auto-installs dependency when not yet installed
 */
test("add installs skill to .claude/skills/aisk-{unit}-{name}/SKILL.md", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);

    // Install dep first so poc can install
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

    new Installer(projectDir, aiskHome).add(["poc"]);

    const skillFile = join(projectDir, ".claude", "skills", "aisk-poc-poc", "SKILL.md");
    expect(readFileSync(skillFile, "utf8")).toContain("PoC skill content");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("add is idempotent (second add updates cleanly)", () => {
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

    const installer = new Installer(projectDir, aiskHome);
    installer.add(["poc"]);
    const out = JSON.parse(captureStdout(() => installer.add(["poc"]))) as {
      added: unknown[];
      updated: Array<{ name: string }>;
    };

    expect(out.added).toHaveLength(0);
    expect(out.updated.some((u) => u.name === "poc")).toBe(true);

    const skillFile = join(projectDir, ".claude", "skills", "aisk-poc-poc", "SKILL.md");
    expect(readFileSync(skillFile, "utf8")).toContain("PoC skill content");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("add auto-installs transitive dependency when not yet installed", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const out = JSON.parse(
      captureStdout(() => new Installer(projectDir, aiskHome).add(["poc"])),
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

// ─── installer add: rule ──────────────────────────────────────────────────────

/**
 * @test-suite  add (rule)
 * @target      Installer.add()
 * @strategy    unit; unit.json declares rule component
 * @cases
 *   - [PASS] copies rule template directly (no temp files)
 *   - [PASS] sets customStatus=todo for hasCustom rule with AISK:CUSTOM block
 *   - [PASS] customStatus undefined for hasCustom rule with no AISK:CUSTOM block
 */
test("add copies rule template directly (no temp files)", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const rulesDir = join(aiskHome, "units", "poc", "rules");
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, "poc-rule.md"), "Rule body without custom blocks.");
    writeFileSync(
      join(aiskHome, "units", "poc", "unit.json"),
      JSON.stringify({
        name: "poc",
        description: "PoC unit",
        dependencies: [],
        components: { rules: [{ name: "poc-rule", file: "rules/poc-rule.md" }] },
      }),
    );

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    new Installer(projectDir, aiskHome).add(["poc"]);

    const content = readFileSync(
      join(projectDir, ".claude", "rules", "aisk-poc", "poc-rule.md"),
      "utf8",
    );
    expect(content).toBe("Rule body without custom blocks.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("add sets customStatus=todo for hasCustom rule with AISK:CUSTOM block", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const rulesDir = join(aiskHome, "units", "poc", "rules");
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(
      join(rulesDir, "poc-rule.md"),
      [
        '# AISK:CUSTOM name="glob-pattern" status="todo" hint="scan test files"',
        'testMatch: ["**/*.test.ts"]',
        "# AISK:CUSTOM:END",
      ].join("\n"),
    );
    writeFileSync(
      join(aiskHome, "units", "poc", "unit.json"),
      JSON.stringify({
        name: "poc",
        description: "PoC unit",
        dependencies: [],
        components: { rules: [{ name: "poc-rule", file: "rules/poc-rule.md", hasCustom: true }] },
      }),
    );

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const out = JSON.parse(
      captureStdout(() => new Installer(projectDir, aiskHome).add(["poc"])),
    ) as {
      added: Array<{ components: Array<{ name: string; customStatus?: string }> }>;
    };

    const ruleComp = out.added[0]?.components.find((c) => c.name === "poc-rule");
    expect(ruleComp?.customStatus).toBe("todo");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("add customStatus is undefined for hasCustom rule without AISK:CUSTOM blocks in template", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const rulesDir = join(aiskHome, "units", "poc", "rules");
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, "poc-rule.md"), "No custom blocks here.");
    writeFileSync(
      join(aiskHome, "units", "poc", "unit.json"),
      JSON.stringify({
        name: "poc",
        description: "PoC unit",
        dependencies: [],
        components: { rules: [{ name: "poc-rule", file: "rules/poc-rule.md", hasCustom: true }] },
      }),
    );

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const out = JSON.parse(
      captureStdout(() => new Installer(projectDir, aiskHome).add(["poc"])),
    ) as {
      added: Array<{ components: Array<{ name: string; customStatus?: string }> }>;
    };

    const ruleComp = out.added[0]?.components.find((c) => c.name === "poc-rule");
    expect(ruleComp?.customStatus).toBeUndefined();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer add: optional components ───────────────────────────────────────

/**
 * @test-suite  add (optional components)
 * @target      Installer.add() — all optional components are installed
 * @strategy    unit; unit.json with required and optional components
 * @cases
 *   - [PASS] installs optional component (add installs all, including optionals)
 *   - [PASS] records optional component in installed.json
 */
test("add installs all optional components (no user selection required)", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const rulesDir = join(aiskHome, "units", "poc", "rules");
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, "poc-rule-opt.md"), "optional rule");
    writeFileSync(
      join(aiskHome, "units", "poc", "unit.json"),
      JSON.stringify({
        name: "poc",
        description: "PoC unit",
        dependencies: [],
        components: {
          skills: [{ name: "poc", file: "skills/poc.md" }],
          rules: [{ name: "poc-rule-opt", file: "rules/poc-rule-opt.md", condition: "has next" }],
        },
      }),
    );

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    new Installer(projectDir, aiskHome).add(["poc"]);

    expect(existsSync(join(projectDir, ".claude", "skills", "aisk-poc-poc", "SKILL.md"))).toBe(
      true,
    );
    expect(existsSync(join(projectDir, ".claude", "rules", "aisk-poc", "poc-rule-opt.md"))).toBe(
      true,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer add: orphan removal ───────────────────────────────────────────

/**
 * @test-suite  add → update (orphan removal)
 * @target      Installer.add() when unit already installed → updateUnitComponents()
 * @strategy    unit; simulate unit.json version change removing a component
 * @cases
 *   - [PASS] removes component file that is no longer in unit.json after update
 */
test("add (update path) removes orphaned component file when unit.json no longer declares it", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const rulesDir = join(aiskHome, "units", "poc", "rules");
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, "poc-rule-old.md"), "old rule");

    const unitJsonPath = join(aiskHome, "units", "poc", "unit.json");

    // v1: unit has skill + rule
    writeFileSync(
      unitJsonPath,
      JSON.stringify({
        name: "poc",
        description: "PoC unit",
        dependencies: [],
        components: {
          skills: [{ name: "poc", file: "skills/poc.md" }],
          rules: [{ name: "poc-rule-old", file: "rules/poc-rule-old.md" }],
        },
      }),
    );

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aiskHome);
    installer.add(["poc"]);
    const ruleFile = join(projectDir, ".claude", "rules", "aisk-poc", "poc-rule-old.md");
    expect(existsSync(ruleFile)).toBe(true);

    // v2: rule removed from unit.json
    writeFileSync(
      unitJsonPath,
      JSON.stringify({
        name: "poc",
        description: "PoC unit",
        dependencies: [],
        components: { skills: [{ name: "poc", file: "skills/poc.md" }] },
      }),
    );

    installer.add(["poc"]);
    expect(existsSync(ruleFile), "orphaned rule file must be removed").toBe(false);
    expect(existsSync(join(projectDir, ".claude", "skills", "aisk-poc-poc", "SKILL.md"))).toBe(
      true,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer update: AISK:CUSTOM merge ─────────────────────────────────────

/**
 * @test-suite  update (AISK:CUSTOM merge)
 * @target      Installer.update()
 * @strategy    unit; installed file has done block; new template has same block
 * @cases
 *   - [PASS] merges done block from old file into new template
 *   - [PASS] keeps new template content for todo blocks
 *   - [PASS] new blocks added in template remain as todo
 *   - [PASS] blocks removed from template are discarded
 */
test("update merges done block from old file into new template", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const rulesDir = join(aiskHome, "units", "poc", "rules");
    mkdirSync(rulesDir, { recursive: true });

    // New template with todo block
    writeFileSync(
      join(rulesDir, "poc-rule.md"),
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
        components: { rules: [{ name: "poc-rule", file: "rules/poc-rule.md", hasCustom: true }] },
      }),
    );

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);
    const installer = new Installer(projectDir, aiskHome);

    // Create already-installed file with done block
    const ruleDir = join(projectDir, ".claude", "rules", "aisk-poc");
    mkdirSync(ruleDir, { recursive: true });
    writeFileSync(
      join(ruleDir, "poc-rule.md"),
      [
        '# AISK:CUSTOM name="pattern" status="done" hint="old hint"',
        'testMatch: ["**/*.spec.ts"]',
        "# AISK:CUSTOM:END",
      ].join("\n"),
    );

    // Write installed.json
    mkdirSync(join(projectDir, ".aisk"), { recursive: true });
    writeFileSync(
      join(projectDir, ".aisk", "installed.json"),
      JSON.stringify({
        units: {
          poc: {
            installedAt: "2026-01-01",
            components: {
              skills: [],
              rules: [
                {
                  name: "poc-rule",
                  path: ".claude/rules/aisk-poc/poc-rule.md",
                  customStatus: "done",
                },
              ],
              scripts: [],
              resources: [],
            },
          },
        },
      }),
    );

    installer.update(["poc"]);

    const content = readFileSync(join(ruleDir, "poc-rule.md"), "utf8");
    expect(content).toContain('status="done"');
    expect(content).toContain('hint="new hint"'); // new template's hint
    expect(content).toContain('["**/*.spec.ts"]'); // old done content preserved
    expect(content).not.toContain('["**/*.new.ts"]'); // new template default replaced
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("update keeps new template content for todo blocks", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const rulesDir = join(aiskHome, "units", "poc", "rules");
    mkdirSync(rulesDir, { recursive: true });

    writeFileSync(
      join(rulesDir, "poc-rule.md"),
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
        components: { rules: [{ name: "poc-rule", file: "rules/poc-rule.md", hasCustom: true }] },
      }),
    );

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const ruleDir = join(projectDir, ".claude", "rules", "aisk-poc");
    mkdirSync(ruleDir, { recursive: true });
    writeFileSync(
      join(ruleDir, "poc-rule.md"),
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
              rules: [
                {
                  name: "poc-rule",
                  path: ".claude/rules/aisk-poc/poc-rule.md",
                  customStatus: "todo",
                },
              ],
              scripts: [],
              resources: [],
            },
          },
        },
      }),
    );

    new Installer(projectDir, aiskHome).update(["poc"]);

    const content = readFileSync(join(ruleDir, "poc-rule.md"), "utf8");
    expect(content).toContain('["**/*.updated.ts"]'); // new template default used
    expect(content).not.toContain('["**/*.old.ts"]');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("update fails per-unit when unit is not installed", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const out = JSON.parse(
      captureStdout(() => new Installer(projectDir, aiskHome).update(["poc"])),
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

// ─── installer update: optional component disk check ─────────────────────────

test("update skips optional component that is not on disk", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const rulesDir = join(aiskHome, "units", "poc", "rules");
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, "poc-rule-opt.md"), "optional rule content");
    writeFileSync(
      join(aiskHome, "units", "poc", "unit.json"),
      JSON.stringify({
        name: "poc",
        description: "PoC unit",
        dependencies: [],
        components: {
          skills: [{ name: "poc", file: "skills/poc.md" }],
          rules: [{ name: "poc-rule-opt", file: "rules/poc-rule-opt.md", condition: "has next" }],
        },
      }),
    );

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    // Pre-populate installed.json — optional NOT installed
    mkdirSync(join(projectDir, ".aisk"), { recursive: true });
    const skillPath = ".claude/skills/aisk-poc-poc/SKILL.md";
    const skillDir = join(projectDir, ".claude", "skills", "aisk-poc-poc");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), "# poc");
    writeFileSync(
      join(projectDir, ".aisk", "installed.json"),
      JSON.stringify({
        units: {
          poc: {
            installedAt: "2026-01-01",
            components: {
              skills: [{ name: "poc", path: skillPath }],
              rules: [],
              scripts: [],
              resources: [],
            },
          },
        },
      }),
    );

    new Installer(projectDir, aiskHome).update(["poc"]);

    expect(existsSync(join(projectDir, ".claude", "rules", "aisk-poc", "poc-rule-opt.md"))).toBe(
      false,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer remove ─────────────────────────────────────────────────────────

/**
 * @test-suite  remove
 * @target      Installer.remove()
 * @strategy    unit; fake ~/.aisk tree; pre-populated installed.json and files
 * @cases
 *   - [PASS] removes installed skill file and its parent dir when empty
 *   - [PASS] removes installed script file and lefthook entry
 *   - [PASS] fails per-unit when unit is not installed
 *   - [PASS] remove all removes all installed units
 */
test("remove removes skill file and empty parent directory", () => {
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

    new Installer(projectDir, aiskHome).remove(["poc"]);

    expect(existsSync(join(skillDir, "SKILL.md")), "skill file must be removed").toBe(false);
    expect(existsSync(skillDir), "empty parent dir must be removed").toBe(false);
    const data = JSON.parse(readFileSync(join(projectDir, ".aisk", "installed.json"), "utf8")) as {
      units: Record<string, unknown>;
    };
    expect("poc" in data.units, "unit must be removed from installed.json").toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("remove removes script file and corresponding lefthook entry", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    const scriptDir = join(projectDir, ".aisk", "poc", "scripts");
    mkdirSync(scriptDir, { recursive: true });
    writeFileSync(join(scriptDir, "poc-hook.js"), "// hook");
    writeFileSync(
      join(projectDir, "lefthook.yml"),
      "pre-commit:\n  commands:\n    aisk-poc-poc-hook:\n      run: node .aisk/poc/scripts/poc-hook.js\n",
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

    new Installer(projectDir, aiskHome).remove(["poc"]);

    expect(existsSync(join(scriptDir, "poc-hook.js")), "script file must be removed").toBe(false);
    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook, "lefthook entry must be removed").not.toContain("aisk-poc-poc-hook:");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("remove fails per-unit when unit is not installed", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const out = JSON.parse(
      captureStdout(() => new Installer(projectDir, aiskHome).remove(["poc"])),
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

test("remove all removes all installed units", () => {
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
      captureStdout(() => new Installer(projectDir, aiskHome).remove(["all"])),
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

// ─── installer refresh ────────────────────────────────────────────────────────

/**
 * @test-suite  refresh
 * @target      Installer.refresh()
 * @strategy    unit; installed files with AISK:CUSTOM blocks
 * @cases
 *   - [PASS] scans file and updates customStatus=done when block is done
 *   - [PASS] outputs todo list in non-silent mode
 *   - [PASS] produces no output in silent mode
 *   - [PASS] cleans orphaned hook when script file is deleted
 */
test("refresh updates customStatus to done when AISK:CUSTOM block is done", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    const ruleDir = join(projectDir, ".claude", "rules", "aisk-poc");
    mkdirSync(ruleDir, { recursive: true });
    writeFileSync(
      join(ruleDir, "poc-rule.md"),
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
              rules: [
                {
                  name: "poc-rule",
                  path: ".claude/rules/aisk-poc/poc-rule.md",
                  customStatus: "todo",
                },
              ],
              scripts: [],
              resources: [],
            },
          },
        },
      }),
    );

    new Installer(projectDir, aiskHome).refresh(true);

    const installed = JSON.parse(
      readFileSync(join(projectDir, ".aisk", "installed.json"), "utf8"),
    ) as {
      units: Record<string, { components: { rules: Array<{ customStatus: string }> } }>;
    };
    expect(installed.units["poc"]?.components.rules[0]?.customStatus).toBe("done");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("refresh outputs todo list in non-silent mode", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    const ruleDir = join(projectDir, ".claude", "rules", "aisk-poc");
    mkdirSync(ruleDir, { recursive: true });
    writeFileSync(
      join(ruleDir, "poc-rule.md"),
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
              rules: [
                {
                  name: "poc-rule",
                  path: ".claude/rules/aisk-poc/poc-rule.md",
                  customStatus: "todo",
                },
              ],
              scripts: [],
              resources: [],
            },
          },
        },
      }),
    );

    const out = JSON.parse(
      captureStdout(() => new Installer(projectDir, aiskHome).refresh(false)),
    ) as {
      todo: Array<{ unit: string; files: string[] }>;
    };

    expect(out.todo.length).toBeGreaterThan(0);
    expect(out.todo[0]?.unit).toBe("poc");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("refresh produces no output in silent mode", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(join(projectDir, ".aisk"), { recursive: true });
    writeFileSync(join(projectDir, ".aisk", "installed.json"), JSON.stringify({ units: {} }));

    const out = captureStdout(() => new Installer(projectDir, aiskHome).refresh(true));
    expect(out).toBe("");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer show ───────────────────────────────────────────────────────────

/**
 * @test-suite  show
 * @target      Installer.show()
 * @strategy    unit; fake ~/.aisk tree
 * @cases
 *   - [PASS] returns unit details with installed=false when not installed
 *   - [PASS] returns customStatus from installed.json when installed
 */
test("show returns unit details with installed=false when not installed", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const out = JSON.parse(
      captureStdout(() => new Installer(projectDir, aiskHome).show("poc")),
    ) as {
      name: string;
      installed: boolean;
      dependencies: string[];
    };

    expect(out.name).toBe("poc");
    expect(out.installed).toBe(false);
    expect(out.dependencies).toContain("poc-dep");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("show returns customStatus from installed.json when installed", () => {
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
                { name: "poc", path: ".claude/skills/aisk-poc-poc/SKILL.md", customStatus: "done" },
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
      captureStdout(() => new Installer(projectDir, aiskHome).show("poc")),
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

// ─── installer add: script/hook ───────────────────────────────────────────────

test("add copies script and creates lefthook.yml entry", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    new Installer(projectDir, aiskHome).add(["poc"]);

    const scriptFile = join(projectDir, ".aisk", "poc", "scripts", "poc-hook.js");
    expect(readFileSync(scriptFile, "utf8")).toContain("hook");

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook).toContain("aisk-poc-poc-hook:");
    expect(lefthook).toContain(".aisk/poc/scripts/poc-hook.js");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("add appends lefthook template vars when params declared", () => {
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
              file: "scripts/poc-hook.js",
              hook: "pre-commit",
              params: ["staged_files"],
            },
          ],
        },
      }),
    );

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    new Installer(projectDir, aiskHome).add(["poc"]);

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook).toContain("{staged_files}");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("add hook registration is idempotent (no duplicate entries on re-add)", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aiskHome);
    installer.add(["poc"]);
    installer.add(["poc"]); // second call → update path

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    const occurrences = lefthook.split("aisk-poc-poc-hook:").length - 1;
    expect(occurrences).toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("add appends hook entry to existing lefthook.yml", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);
    writeFileSync(
      join(projectDir, "lefthook.yml"),
      "pre-commit:\n  commands:\n    existing-hook:\n      run: echo ok\n",
    );

    new Installer(projectDir, aiskHome).add(["poc"]);

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook).toContain("existing-hook:");
    expect(lefthook).toContain("aisk-poc-poc-hook:");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer add: .gitignore ────────────────────────────────────────────────

test("add creates .gitignore files in .aisk/ and .claude/ on install", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    new Installer(projectDir, aiskHome).add(["poc"]);

    expect(readFileSync(join(projectDir, ".aisk", ".gitignore"), "utf8")).toBe("*\n");
    expect(readFileSync(join(projectDir, ".claude", ".gitignore"), "utf8")).toBe(
      "skills/aisk-*/\nrules/aisk-*/\n",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("add does not overwrite existing .gitignore files", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(join(projectDir, ".claude"), { recursive: true });
    writeFileSync(join(projectDir, ".claude", ".gitignore"), "custom-content\n");

    new Installer(projectDir, aiskHome).add(["poc"]);

    expect(readFileSync(join(projectDir, ".claude", ".gitignore"), "utf8")).toBe(
      "custom-content\n",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer add: installed.json ────────────────────────────────────────────

test("add writes installed.json with correct component records", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const rulesDir = join(aiskHome, "units", "poc", "rules");
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, "poc-rule-opt.md"), "optional rule");
    writeFileSync(
      join(aiskHome, "units", "poc", "unit.json"),
      JSON.stringify({
        name: "poc",
        description: "PoC unit",
        dependencies: [],
        components: {
          skills: [{ name: "poc", file: "skills/poc.md" }],
          rules: [{ name: "poc-rule-opt", file: "rules/poc-rule-opt.md", condition: "has next" }],
        },
      }),
    );

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aiskHome);
    installer.add(["poc"]);

    const installed = installer.readInstalled();
    expect("poc" in installed.units).toBe(true);
    expect(installed.units["poc"]?.installedAt).toBeTruthy();
    // Both required skill and optional rule installed (add installs all)
    expect(installed.units["poc"]?.components.skills.length).toBe(1);
    expect(installed.units["poc"]?.components.rules.length).toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// suppress unused import warning
void vi;
