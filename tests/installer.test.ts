/**
 * @test-file   installer
 * @description Verifies the Installer class handles listUnits, checkDeps (ResolveResult with
 *              to_install/to_update/to_remove/auto/order), skill/rule/script/resource installation,
 *              prepare command, optional components, orphan removal, and lefthook.yml idempotent updates.
 * @ai-generated
 * @reviewed-by
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, test, vi } from "vitest";

import { Installer } from "../global/scripts/installer";
import type { ResolveResult } from "../global/scripts/installer-types";

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

// ─── installer --list ─────────────────────────────────────────────────────────

/**
 * @test-suite  listUnits
 * @target      Installer.listUnits()
 * @strategy    unit; fake ~/.aisk tree
 * @cases
 *   - [PASS] lists all units with installed=false when nothing installed
 *   - [PASS] marks unit as installed=true when present in installed.json
 */
test("listUnits lists all units with installed=false when nothing installed", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aiskHome);
    const result = JSON.parse(captureStdout(() => installer.listUnits())) as {
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

test("listUnits marks unit as installed=true when present in installed.json", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(join(projectDir, ".aisk"), { recursive: true });
    writeFileSync(
      join(projectDir, ".aisk", "installed.json"),
      JSON.stringify({
        units: { poc: { installedAt: "2026-01-01", components: {} } },
      }),
    );

    const installer = new Installer(projectDir, aiskHome);
    const result = JSON.parse(captureStdout(() => installer.listUnits())) as {
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

// ─── installer --check-deps ───────────────────────────────────────────────────

/**
 * @test-suite  checkDeps
 * @target      Installer.checkDeps()
 * @strategy    unit; fake ~/.aisk tree
 * @cases
 *   - [PASS] returns full ResolveResult with dep in to_install and auto when nothing installed
 *   - [PASS] dep already installed → dep in auto (not explicitly selected) but not in to_install
 *   - [PASS] installed unit not in desired state → appears in to_remove
 */
test("checkDeps returns full ResolveResult with dep in to_install and auto when nothing installed", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aiskHome);
    const result = JSON.parse(captureStdout(() => installer.checkDeps(["poc"]))) as ResolveResult;

    expect(result.to_remove).toEqual([]);
    expect(result.to_install).toEqual(["poc-dep", "poc"]);
    expect(result.to_update).toEqual([]);
    expect(result.auto).toEqual(["poc-dep"]);
    expect(result.order).toEqual(["poc-dep", "poc"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkDeps with dep already installed → dep in auto but not to_install, poc in to_install", () => {
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
    const result = JSON.parse(captureStdout(() => installer.checkDeps(["poc"]))) as ResolveResult;

    expect(result.to_remove).toEqual([]);
    expect(result.to_install).toEqual(["poc"]);
    expect(result.to_update).toEqual([]);
    // poc-dep is auto (not explicitly selected) even though already installed
    expect(result.auto).toEqual(["poc-dep"]);
    expect(result.order).toEqual(["poc"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkDeps with installed unit not in desired state → appears in to_remove", () => {
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
    // Desired state: nothing selected — uninstall everything
    const result = JSON.parse(captureStdout(() => installer.checkDeps([]))) as ResolveResult;

    expect(result.to_remove).toEqual(["poc-dep", "poc"]);
    expect(result.to_install).toEqual([]);
    expect(result.to_update).toEqual([]);
    expect(result.auto).toEqual([]);
    expect(result.order).toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer install: skill ─────────────────────────────────────────────────

/**
 * @test-suite  install (skill)
 * @target      Installer.install() → installSkill()
 * @strategy    unit; unit.json declares skill component
 * @cases
 *   - [PASS] installs skill to .claude/skills/aisk-{unit}-{name}/SKILL.md
 *   - [PASS] install is idempotent (second install overwrites cleanly)
 */
test("installer installs skill to .claude/skills/aisk-{unit}-{name}/SKILL.md", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    new Installer(projectDir, aiskHome).install("poc", []);

    const skillFile = join(projectDir, ".claude", "skills", "aisk-poc-poc", "SKILL.md");
    expect(readFileSync(skillFile, "utf8")).toContain("PoC skill content");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer skill install is idempotent (second install overwrites cleanly)", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aiskHome);
    installer.install("poc", []);
    installer.install("poc", []);

    const skillFile = join(projectDir, ".claude", "skills", "aisk-poc-poc", "SKILL.md");
    expect(readFileSync(skillFile, "utf8")).toContain("PoC skill content");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer install: rule ──────────────────────────────────────────────────

/**
 * @test-suite  install (rule)
 * @target      Installer.install() → installRule()
 * @strategy    unit; unit.json declares rule component
 * @cases
 *   - [PASS] copies rule template directly when hasCustom is absent
 *   - [PASS] copies from tempPath and deletes it when hasCustom is true
 *   - [FAIL] exits with error when hasCustom is true but tempPath does not exist
 */
test("installer install copies rule template directly when hasCustom is absent", () => {
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

    new Installer(projectDir, aiskHome).install("poc", []);

    const content = readFileSync(
      join(projectDir, ".claude", "rules", "aisk-poc", "poc-rule.md"),
      "utf8",
    );
    expect(content).toBe("Rule body without custom blocks.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer install copies rule from tempPath and deletes it when hasCustom is true", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
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
    const ruleDestDir = join(projectDir, ".claude", "rules", "aisk-poc");
    mkdirSync(ruleDestDir, { recursive: true });

    const tempPath = join(ruleDestDir, ".aisk-tmp-poc-poc-rule");
    writeFileSync(tempPath, 'paths: ["**/*.test.ts"]\ndescription: rendered rule');

    new Installer(projectDir, aiskHome).install("poc", []);

    const destFile = join(ruleDestDir, "poc-rule.md");
    expect(readFileSync(destFile, "utf8"), "rendered content must be written").toContain(
      '["**/*.test.ts"]',
    );
    expect(existsSync(tempPath), "tempPath must be deleted after install").toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer install errors when hasCustom rule has no tempPath", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
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

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code ?? ""})`);
    });

    try {
      expect(() => new Installer(projectDir, aiskHome).install("poc", [])).toThrow(
        "process.exit(1)",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
    }

    expect(existsSync(join(projectDir, ".claude", "rules", "aisk-poc", "poc-rule.md"))).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer install: resource ──────────────────────────────────────────────

/**
 * @test-suite  install (resource)
 * @target      Installer.install() → installResource()
 * @strategy    unit; unit.json declares resource component
 * @cases
 *   - [PASS] copies resource file to .aisk/{unit}/{file} when hasCustom is absent
 *   - [PASS] copies from tempPath and deletes it when hasCustom is true
 */
test("installer install copies resource file when hasCustom is absent", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    new Installer(projectDir, aiskHome).install("poc", []);

    const content = readFileSync(
      join(projectDir, ".aisk", "poc", "resources", "readme.md"),
      "utf8",
    );
    expect(content).toBe("readme content");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer install copies resource from tempPath and deletes it when hasCustom is true", () => {
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
          resources: [{ name: "readme", file: "resources/readme.md", hasCustom: true }],
        },
      }),
    );

    const projectDir = join(dir, "project");
    const resourceDestDir = join(projectDir, ".aisk", "poc", "resources");
    mkdirSync(resourceDestDir, { recursive: true });

    const tempPath = join(resourceDestDir, ".aisk-tmp-poc-readme");
    writeFileSync(tempPath, "rendered readme content");

    new Installer(projectDir, aiskHome).install("poc", []);

    expect(readFileSync(join(resourceDestDir, "readme.md"), "utf8")).toBe(
      "rendered readme content",
    );
    expect(existsSync(tempPath), "tempPath must be deleted after install").toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer install: optional components ───────────────────────────────────

/**
 * @test-suite  install (optional components)
 * @target      Installer.install() — optional selection via condition field
 * @strategy    unit; unit.json with required and optional components
 * @cases
 *   - [PASS] installs required component but skips optional when not in optionalNames
 *   - [PASS] installs optional component when its typed name is in optionalNames
 *   - [PASS] removes previously installed optional when deselected on re-install
 */
test("installer skips optional component when not in optionalNames", () => {
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

    new Installer(projectDir, aiskHome).install("poc", []);

    expect(existsSync(join(projectDir, ".claude", "skills", "aisk-poc-poc", "SKILL.md"))).toBe(
      true,
    );
    expect(existsSync(join(projectDir, ".claude", "rules", "aisk-poc", "poc-rule-opt.md"))).toBe(
      false,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer installs optional component when typed name is in optionalNames", () => {
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
          rules: [{ name: "poc-rule-opt", file: "rules/poc-rule-opt.md", condition: "has next" }],
        },
      }),
    );

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    new Installer(projectDir, aiskHome).install("poc", ["rule:poc-rule-opt"]);

    expect(existsSync(join(projectDir, ".claude", "rules", "aisk-poc", "poc-rule-opt.md"))).toBe(
      true,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer removes previously installed optional rule when deselected on re-install", () => {
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
    installer.install("poc", ["rule:poc-rule-opt"]);
    expect(existsSync(join(projectDir, ".claude", "rules", "aisk-poc", "poc-rule-opt.md"))).toBe(
      true,
    );

    installer.install("poc", []);
    expect(
      existsSync(join(projectDir, ".claude", "rules", "aisk-poc", "poc-rule-opt.md")),
      "deselected optional must be removed",
    ).toBe(false);
    expect(
      existsSync(join(projectDir, ".claude", "skills", "aisk-poc-poc", "SKILL.md")),
      "required skill must still exist",
    ).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer install: orphan removal ───────────────────────────────────────

/**
 * @test-suite  install (orphan removal)
 * @target      Installer.install() → removeOrphans()
 * @strategy    unit; simulate unit.json version change removing a component
 * @cases
 *   - [PASS] removes component file that is no longer in unit.json after update
 */
test("installer removes orphaned component file when unit.json no longer declares it", () => {
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
    installer.install("poc", []);
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

    installer.install("poc", []);
    expect(existsSync(ruleFile), "orphaned rule file must be removed").toBe(false);
    expect(
      existsSync(join(projectDir, ".claude", "skills", "aisk-poc-poc", "SKILL.md")),
      "skill must still exist",
    ).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer prepare ────────────────────────────────────────────────────────

/**
 * @test-suite  prepare
 * @target      Installer.prepare()
 * @strategy    unit; fake ~/.aisk tree with hasCustom components
 * @cases
 *   - [PASS] returns PrepareItem list for hasCustom rules and pre-creates target dirs
 *   - [PASS] excludes optional hasCustom component when not in optionalNames
 *   - [PASS] includes optional hasCustom component when in optionalNames
 *   - [PASS] cleans orphaned .aisk-tmp-* files before returning
 */
test("prepare returns PrepareItem list for hasCustom rule and pre-creates target dir", () => {
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
          rules: [{ name: "poc-rule", file: "rules/poc-rule.md", hasCustom: true }],
        },
      }),
    );
    mkdirSync(join(aiskHome, "units", "poc", "rules"), { recursive: true });
    writeFileSync(join(aiskHome, "units", "poc", "rules", "poc-rule.md"), "template content");

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const output = captureStdout(() => new Installer(projectDir, aiskHome).prepare("poc"));
    const items = JSON.parse(output) as Array<{
      componentType: string;
      exists: boolean;
      tempPath: string;
    }>;

    expect(items.length).toBe(1);
    expect(items[0].componentType).toBe("rule");
    expect(items[0].exists).toBe(false);
    expect(items[0].tempPath).toContain(".aisk-tmp-poc-poc-rule");
    expect(existsSync(join(projectDir, ".claude", "rules", "aisk-poc"))).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prepare excludes optional hasCustom component when not in optionalNames", () => {
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
          rules: [
            {
              name: "poc-rule-opt",
              file: "rules/poc-rule-opt.md",
              hasCustom: true,
              condition: "has next",
            },
          ],
        },
      }),
    );

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const output = captureStdout(() => new Installer(projectDir, aiskHome).prepare("poc", []));
    const items = JSON.parse(output) as unknown[];
    expect(items.length).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prepare includes optional hasCustom component when in optionalNames", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    mkdirSync(join(aiskHome, "units", "poc", "rules"), { recursive: true });
    writeFileSync(join(aiskHome, "units", "poc", "rules", "poc-rule-opt.md"), "template");
    writeFileSync(
      join(aiskHome, "units", "poc", "unit.json"),
      JSON.stringify({
        name: "poc",
        description: "PoC unit",
        dependencies: [],
        components: {
          rules: [
            {
              name: "poc-rule-opt",
              file: "rules/poc-rule-opt.md",
              hasCustom: true,
              condition: "has next",
            },
          ],
        },
      }),
    );

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const output = captureStdout(() =>
      new Installer(projectDir, aiskHome).prepare("poc", ["rule:poc-rule-opt"]),
    );
    const items = JSON.parse(output) as Array<{ componentType: string }>;
    expect(items.length).toBe(1);
    expect(items[0].componentType).toBe("rule");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prepare cleans orphaned .aisk-tmp-* files before returning items", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");

    const orphanDir = join(projectDir, ".claude", "rules", "some-unit");
    mkdirSync(orphanDir, { recursive: true });
    const orphan = join(orphanDir, ".aisk-tmp-some-unit-some-rule");
    writeFileSync(orphan, "stale");

    writeFileSync(
      join(aiskHome, "units", "poc", "unit.json"),
      JSON.stringify({ name: "poc", description: "PoC", dependencies: [], components: {} }),
    );

    captureStdout(() => new Installer(projectDir, aiskHome).prepare("poc"));

    expect(existsSync(orphan), "orphan temp file must be removed").toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer install: script/hook ──────────────────────────────────────────

test("installer copies script and creates lefthook.yml entry", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    new Installer(projectDir, aiskHome).install("poc", []);

    const scriptFile = join(projectDir, ".aisk", "poc", "scripts", "poc-hook.js");
    expect(readFileSync(scriptFile, "utf8")).toContain("hook");

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook).toContain("aisk-poc-poc-hook:");
    expect(lefthook).toContain(".aisk/poc/scripts/poc-hook.js");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer appends lefthook template vars when params declared", () => {
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

    new Installer(projectDir, aiskHome).install("poc", []);

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook, "must include lefthook template var").toContain("{staged_files}");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer hook registration is idempotent (no duplicate entries)", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aiskHome);
    installer.install("poc", []);
    installer.install("poc", []);

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    const occurrences = lefthook.split("aisk-poc-poc-hook:").length - 1;
    expect(occurrences, "hook entry must appear exactly once").toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer appends hook entry to existing lefthook.yml", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);
    writeFileSync(
      join(projectDir, "lefthook.yml"),
      "pre-commit:\n  commands:\n    existing-hook:\n      run: echo ok\n",
    );

    new Installer(projectDir, aiskHome).install("poc", []);

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook, "must preserve existing entries").toContain("existing-hook:");
    expect(lefthook, "must add new entry").toContain("aisk-poc-poc-hook:");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer appends pre-commit section when pre-commit is commented out", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);
    writeFileSync(
      join(projectDir, "lefthook.yml"),
      "# pre-commit:\n#   commands:\n#     some-hook:\n#       run: echo disabled\n",
    );

    new Installer(projectDir, aiskHome).install("poc", []);

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook, "must add new entry").toContain("aisk-poc-poc-hook:");
    expect(lefthook, "must preserve commented lines").toContain("# pre-commit:");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer adds hook to correct section when multiple sections exist", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);
    writeFileSync(
      join(projectDir, "lefthook.yml"),
      [
        "pre-push:",
        "  commands:",
        "    lint:",
        "      run: pnpm lint",
        "",
        "pre-commit:",
        "  commands:",
        "    typecheck:",
        "      run: pnpm typecheck",
        "",
      ].join("\n"),
    );

    new Installer(projectDir, aiskHome).install("poc", []);

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook, "must preserve pre-push commands").toContain("    lint:");
    const preCommitIdx = lefthook.indexOf("pre-commit:");
    const preCommitSection = lefthook.slice(preCommitIdx);
    expect(preCommitSection, "must add to pre-commit section").toContain("aisk-poc-poc-hook:");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer uninstall ──────────────────────────────────────────────────────

/**
 * @test-suite  uninstall
 * @target      Installer.uninstall()
 * @strategy    unit; fake ~/.aisk tree; pre-populated installed.json and files
 * @cases
 *   - [PASS] removes installed skill file and its parent dir when empty
 *   - [PASS] removes installed rule file and lefthook entry
 *   - [FAIL] exits with error when unit is not installed
 */
test("uninstall removes skill file and empty parent directory", () => {
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

    new Installer(projectDir, aiskHome).uninstall("poc");

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

test("uninstall removes script file and corresponding lefthook entry", () => {
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

    new Installer(projectDir, aiskHome).uninstall("poc");

    expect(existsSync(join(scriptDir, "poc-hook.js")), "script file must be removed").toBe(false);
    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook, "lefthook entry must be removed").not.toContain("aisk-poc-poc-hook:");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("uninstall exits with error when unit is not installed", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code ?? ""})`);
    });
    try {
      expect(() => new Installer(projectDir, aiskHome).uninstall("poc")).toThrow("process.exit(1)");
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer: .gitignore ────────────────────────────────────────────────────

/**
 * @test-suite  ensureGitignores
 * @target      Installer.install() → ensureGitignores()
 * @strategy    unit; fake ~/.aisk tree
 * @cases
 *   - [PASS] creates .gitignore in .aisk/ and .claude/ when not present
 *   - [PASS] does not overwrite existing .gitignore
 */
test("installer creates .gitignore files in .aisk/ and .claude/ on install", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    new Installer(projectDir, aiskHome).install("poc", []);

    expect(readFileSync(join(projectDir, ".aisk", ".gitignore"), "utf8")).toBe("*\n");
    expect(readFileSync(join(projectDir, ".claude", ".gitignore"), "utf8")).toBe(
      "skills/aisk-*/\nrules/aisk-*/\n",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer does not overwrite existing .gitignore files", () => {
  const dir = makeTempDir();
  try {
    const aiskHome = makeFakeAiskHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(join(projectDir, ".claude"), { recursive: true });
    writeFileSync(join(projectDir, ".claude", ".gitignore"), "custom-content\n");

    new Installer(projectDir, aiskHome).install("poc", []);

    expect(readFileSync(join(projectDir, ".claude", ".gitignore"), "utf8")).toBe(
      "custom-content\n",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer: installed.json ────────────────────────────────────────────────

test("installer writes installed.json with correct component records after install", () => {
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
    installer.install("poc", ["rule:poc-rule-opt"]);

    const installed = installer.readInstalled();
    expect("poc" in installed.units).toBe(true);
    expect(installed.units["poc"].installedAt).toBeTruthy();
    expect(installed.units["poc"].components.skills.length).toBe(1);
    expect(installed.units["poc"].components.rules.length).toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
