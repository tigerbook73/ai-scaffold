/**
 * @test-file   installer
 * @description Verifies the Installer class handles listUnits, checkDeps (topological order),
 *              skill/rule/script/resource installation, prepare command, and lefthook.yml idempotent updates.
 * @ai-generated
 * @reviewed-by
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, test, vi } from "vitest";

import { Installer } from "../global/scripts/installer";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "aisk-installer-"));
}

/** Creates a minimal fake ~/.aisf tree for testing, returns its path. */
function makeFakeAisfHome(tmpDir: string): string {
  const aisfHome = join(tmpDir, ".aisf");
  mkdirSync(aisfHome, { recursive: true });
  writeFileSync(join(aisfHome, "config.json"), JSON.stringify({ repoPath: tmpDir }));

  const unitDir = join(aisfHome, "units", "poc-unit");
  mkdirSync(join(unitDir, "skills"), { recursive: true });
  mkdirSync(join(unitDir, "scripts"), { recursive: true });
  mkdirSync(join(unitDir, "resources"), { recursive: true });
  writeFileSync(join(unitDir, "skills", "poc.md"), "# poc\nPoC skill content");
  writeFileSync(join(unitDir, "scripts", "poc-hook.js"), '"use strict";\nconsole.log("hook");');
  writeFileSync(join(unitDir, "resources", "readme.md"), "readme content");
  writeFileSync(
    join(unitDir, "unit.json"),
    JSON.stringify({ name: "poc-unit", description: "PoC unit", dependencies: ["poc-dep-unit"], components: {} }),
  );

  const depDir = join(aisfHome, "units", "poc-dep-unit");
  mkdirSync(depDir, { recursive: true });
  writeFileSync(
    join(depDir, "unit.json"),
    JSON.stringify({ name: "poc-dep-unit", description: "PoC dep unit", dependencies: [], components: {} }),
  );

  return aisfHome;
}

// ─── installer --list ─────────────────────────────────────────────────────────

/**
 * @test-suite  listUnits
 * @target      Installer.listUnits()
 * @strategy    unit; fake ~/.aisf tree
 * @cases
 *   - [PASS] lists all units with installed=false when nothing installed
 *   - [PASS] marks unit as installed=true when present in installed.json
 */
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

test("listUnits lists all units with installed=false when nothing installed", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aisfHome);
    const result = JSON.parse(captureStdout(() => installer.listUnits())) as {
      units: Array<{ name: string; description: string; installed: boolean }>;
    };

    expect(result.units.length).toBe(2);
    expect(result.units.every((u) => u.installed === false)).toBe(true);
    expect(result.units.some((u) => u.name === "poc-unit" && u.description === "PoC unit")).toBe(true);
    expect(result.units.some((u) => u.name === "poc-dep-unit")).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("listUnits marks unit as installed=true when present in installed.json", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(join(projectDir, ".aisf"), { recursive: true });
    writeFileSync(
      join(projectDir, ".aisf", "installed.json"),
      JSON.stringify({ units: { "poc-unit": { installedAt: "2026-01-01", components: {} } } }),
    );

    const installer = new Installer(projectDir, aisfHome);
    const result = JSON.parse(captureStdout(() => installer.listUnits())) as {
      units: Array<{ name: string; installed: boolean }>;
    };

    const pocUnit = result.units.find((u) => u.name === "poc-unit");
    const depUnit = result.units.find((u) => u.name === "poc-dep-unit");
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
 * @strategy    unit; fake ~/.aisf tree
 * @cases
 *   - [PASS] returns dep in auto and topological order when dep not installed
 *   - [PASS] returns empty auto and only selected unit in order when dep already installed
 */
test("checkDeps returns dep in auto and topological order when dep not installed", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aisfHome);
    const result = JSON.parse(captureStdout(() => installer.checkDeps(["poc-unit"]))) as {
      order: string[];
      auto: string[];
    };

    expect(result.auto).toEqual(["poc-dep-unit"]);
    expect(result.order).toEqual(["poc-dep-unit", "poc-unit"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkDeps returns empty auto and only selected unit in order when dep already installed", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(join(projectDir, ".aisf"), { recursive: true });
    writeFileSync(
      join(projectDir, ".aisf", "installed.json"),
      JSON.stringify({ units: { "poc-dep-unit": { installedAt: "2026-01-01", components: {} } } }),
    );

    const installer = new Installer(projectDir, aisfHome);
    const result = JSON.parse(captureStdout(() => installer.checkDeps(["poc-unit"]))) as {
      order: string[];
      auto: string[];
    };

    expect(result.auto).toEqual([]);
    expect(result.order).toEqual(["poc-unit"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer --install: skill ───────────────────────────────────────────────

test("installer installs skill to .claude/skills/aisf-{unit}-{name}/SKILL.md", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aisfHome);
    installer.install(
      "poc-unit",
      JSON.stringify([{ type: "skill", name: "poc", file: "skills/poc.md" }]),
    );

    const skillFile = join(projectDir, ".claude", "skills", "aisf-poc-unit-poc", "SKILL.md");
    expect(readFileSync(skillFile, "utf8")).toContain("PoC skill content");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer skill install is idempotent (second install overwrites cleanly)", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aisfHome);
    const components = JSON.stringify([{ type: "skill", name: "poc", file: "skills/poc.md" }]);
    installer.install("poc-unit", components);
    installer.install("poc-unit", components);

    const skillFile = join(projectDir, ".claude", "skills", "aisf-poc-unit-poc", "SKILL.md");
    expect(readFileSync(skillFile, "utf8")).toContain("PoC skill content");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer --install: rule ────────────────────────────────────────────────

/**
 * @test-suite  installRule
 * @target      Installer.install() → installRule()
 * @strategy    unit; fake ~/.aisf tree with rule templates
 * @cases
 *   - [PASS] copies rule template directly when hasCustom is absent
 *   - [PASS] copies from tempPath and deletes it when hasCustom is true
 *   - [FAIL] exits with error when hasCustom is true but tempPath does not exist
 */
test("installer install copies rule template directly when hasCustom is absent", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const rulesDir = join(aisfHome, "units", "poc-unit", "rules");
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, "poc-rule.md"), "Rule body without custom blocks.");

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    new Installer(projectDir, aisfHome).install(
      "poc-unit",
      JSON.stringify([{ type: "rule", name: "poc-rule", file: "rules/poc-rule.md" }]),
    );

    const content = readFileSync(join(projectDir, ".claude", "rules", "aisf-poc-unit", "poc-rule.md"), "utf8");
    expect(content).toBe("Rule body without custom blocks.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer install copies rule from tempPath and deletes it when hasCustom is true", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    const ruleDestDir = join(projectDir, ".claude", "rules", "aisf-poc-unit");
    mkdirSync(ruleDestDir, { recursive: true });

    const tempPath = join(ruleDestDir, ".aisf-tmp-poc-unit-poc-rule");
    writeFileSync(tempPath, 'paths: ["**/*.test.ts"]\ndescription: rendered rule');

    new Installer(projectDir, aisfHome).install(
      "poc-unit",
      JSON.stringify([{ type: "rule", name: "poc-rule", file: "rules/poc-rule.md", hasCustom: true }]),
    );

    const destFile = join(ruleDestDir, "poc-rule.md");
    expect(readFileSync(destFile, "utf8"), "rendered content must be written").toContain('["**/*.test.ts"]');
    expect(existsSync(tempPath), "tempPath must be deleted after install").toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer install errors when hasCustom rule has no tempPath", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code ?? ""})`);
    });

    try {
      expect(() =>
        new Installer(projectDir, aisfHome).install(
          "poc-unit",
          JSON.stringify([{ type: "rule", name: "poc-rule", file: "rules/poc-rule.md", hasCustom: true }]),
        ),
      ).toThrow("process.exit(1)");
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
    }

    expect(existsSync(join(projectDir, ".claude", "rules", "aisf-poc-unit", "poc-rule.md"))).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer --install: resource ───────────────────────────────────────────

/**
 * @test-suite  installResource
 * @target      Installer.install() → installResource()
 * @strategy    unit; fake ~/.aisf tree
 * @cases
 *   - [PASS] copies resource file to .aisf/{unit}/{file} when hasCustom is absent
 *   - [PASS] copies from tempPath and deletes it when hasCustom is true
 */
test("installer install copies resource file when hasCustom is absent", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    new Installer(projectDir, aisfHome).install(
      "poc-unit",
      JSON.stringify([{ type: "resource", name: "readme", file: "resources/readme.md" }]),
    );

    const content = readFileSync(join(projectDir, ".aisf", "poc-unit", "resources", "readme.md"), "utf8");
    expect(content).toBe("readme content");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer install copies resource from tempPath and deletes it when hasCustom is true", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    const resourceDestDir = join(projectDir, ".aisf", "poc-unit", "resources");
    mkdirSync(resourceDestDir, { recursive: true });

    const tempPath = join(resourceDestDir, ".aisf-tmp-poc-unit-readme");
    writeFileSync(tempPath, "rendered readme content");

    new Installer(projectDir, aisfHome).install(
      "poc-unit",
      JSON.stringify([{ type: "resource", name: "readme", file: "resources/readme.md", hasCustom: true }]),
    );

    expect(readFileSync(join(resourceDestDir, "readme.md"), "utf8")).toBe("rendered readme content");
    expect(existsSync(tempPath), "tempPath must be deleted after install").toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer prepare ────────────────────────────────────────────────────────

/**
 * @test-suite  prepare
 * @target      Installer.prepare()
 * @strategy    unit; fake ~/.aisf tree with hasCustom components
 * @cases
 *   - [PASS] returns PrepareItem list for hasCustom rules and pre-creates target dirs
 *   - [PASS] cleans orphaned .aisf-tmp-* files before returning
 */
test("prepare returns PrepareItem list for hasCustom rule and pre-creates target dir", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const unitJsonPath = join(aisfHome, "units", "poc-unit", "unit.json");
    writeFileSync(
      unitJsonPath,
      JSON.stringify({
        name: "poc-unit",
        description: "PoC unit",
        dependencies: [],
        components: {
          rules: [{ name: "poc-rule", file: "rules/poc-rule.md", hasCustom: true }],
        },
      }),
    );
    mkdirSync(join(aisfHome, "units", "poc-unit", "rules"), { recursive: true });
    writeFileSync(join(aisfHome, "units", "poc-unit", "rules", "poc-rule.md"), "template content");

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const output = captureStdout(() => new Installer(projectDir, aisfHome).prepare("poc-unit"));
    const items = JSON.parse(output) as Array<{ componentType: string; exists: boolean; tempPath: string }>;

    expect(items.length).toBe(1);
    expect(items[0].componentType).toBe("rule");
    expect(items[0].exists).toBe(false);
    expect(items[0].tempPath).toContain(".aisf-tmp-poc-unit-poc-rule");

    expect(existsSync(join(projectDir, ".claude", "rules", "aisf-poc-unit"))).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prepare cleans orphaned .aisf-tmp-* files before returning items", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");

    const orphanDir = join(projectDir, ".claude", "rules", "some-unit");
    mkdirSync(orphanDir, { recursive: true });
    const orphan = join(orphanDir, ".aisf-tmp-some-unit-some-rule");
    writeFileSync(orphan, "stale");

    const unitJsonPath = join(aisfHome, "units", "poc-unit", "unit.json");
    writeFileSync(
      unitJsonPath,
      JSON.stringify({ name: "poc-unit", description: "PoC", dependencies: [], components: {} }),
    );

    captureStdout(() => new Installer(projectDir, aisfHome).prepare("poc-unit"));

    expect(existsSync(orphan), "orphan temp file must be removed").toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer --install: script/hook ────────────────────────────────────────

test("installer copies script and creates lefthook.yml entry", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aisfHome);
    installer.install(
      "poc-unit",
      JSON.stringify([{ type: "script", name: "poc-hook", file: "scripts/poc-hook.js", hook: "pre-commit" }]),
    );

    const scriptFile = join(projectDir, ".aisf", "poc-unit", "scripts", "poc-hook.js");
    expect(readFileSync(scriptFile, "utf8")).toContain("hook");

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook).toContain("aisf-poc-unit-poc-hook:");
    expect(lefthook).toContain(".aisf/poc-unit/scripts/poc-hook.js");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer appends lefthook template vars when params declared", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aisfHome);
    installer.install(
      "poc-unit",
      JSON.stringify([
        { type: "script", name: "poc-hook", file: "scripts/poc-hook.js", hook: "pre-commit", params: ["staged_files"] },
      ]),
    );

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook, "must include lefthook template var").toContain("{staged_files}");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer hook registration is idempotent (no duplicate entries)", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aisfHome);
    const components = JSON.stringify([
      { type: "script", name: "poc-hook", file: "scripts/poc-hook.js", hook: "pre-commit" },
    ]);
    installer.install("poc-unit", components);
    installer.install("poc-unit", components);

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    const occurrences = lefthook.split("aisf-poc-unit-poc-hook:").length - 1;
    expect(occurrences, "hook entry must appear exactly once").toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer appends hook entry to existing lefthook.yml", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);
    writeFileSync(
      join(projectDir, "lefthook.yml"),
      "pre-commit:\n  commands:\n    existing-hook:\n      run: echo ok\n",
    );

    const installer = new Installer(projectDir, aisfHome);
    installer.install(
      "poc-unit",
      JSON.stringify([{ type: "script", name: "poc-hook", file: "scripts/poc-hook.js", hook: "pre-commit" }]),
    );

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook, "must preserve existing entries").toContain("existing-hook:");
    expect(lefthook, "must add new entry").toContain("aisf-poc-unit-poc-hook:");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer appends pre-commit section when pre-commit is commented out", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);
    writeFileSync(
      join(projectDir, "lefthook.yml"),
      "# pre-commit:\n#   commands:\n#     some-hook:\n#       run: echo disabled\n",
    );

    const installer = new Installer(projectDir, aisfHome);
    installer.install(
      "poc-unit",
      JSON.stringify([{ type: "script", name: "poc-hook", file: "scripts/poc-hook.js", hook: "pre-commit" }]),
    );

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook, "must add new entry").toContain("aisf-poc-unit-poc-hook:");
    expect(lefthook, "must preserve commented lines").toContain("# pre-commit:");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer adds hook to correct section when multiple sections exist", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
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

    const installer = new Installer(projectDir, aisfHome);
    installer.install(
      "poc-unit",
      JSON.stringify([{ type: "script", name: "poc-hook", file: "scripts/poc-hook.js", hook: "pre-commit" }]),
    );

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook, "must preserve pre-push commands").toContain("    lint:");
    const preCommitIdx = lefthook.indexOf("pre-commit:");
    const preCommitSection = lefthook.slice(preCommitIdx);
    expect(preCommitSection, "must add to pre-commit section").toContain("aisf-poc-unit-poc-hook:");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer --install: resource ───────────────────────────────────────────

test("installer copies resources to .aisf/{unit}/resources/", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aisfHome);
    installer.install(
      "poc-unit",
      JSON.stringify([{ type: "resource", name: "readme", file: "resources/readme.md" }]),
    );

    const resource = join(projectDir, ".aisf", "poc-unit", "resources", "readme.md");
    expect(readFileSync(resource, "utf8")).toBe("readme content");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer: installed.json ────────────────────────────────────────────────

// ─── installer uninstall ──────────────────────────────────────────────────────

/**
 * @test-suite  uninstall
 * @target      Installer.uninstall()
 * @strategy    unit; fake ~/.aisf tree; pre-populated installed.json and files
 * @cases
 *   - [PASS] removes installed skill file and its parent dir when empty
 *   - [PASS] removes installed rule file and lefthook entry
 *   - [FAIL] exits with error when unit is not installed
 */
test("uninstall removes skill file and empty parent directory", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    const skillDir = join(projectDir, ".claude", "skills", "aisf-poc-unit-poc");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), "# poc");
    mkdirSync(join(projectDir, ".aisf"), { recursive: true });
    writeFileSync(
      join(projectDir, ".aisf", "installed.json"),
      JSON.stringify({
        units: {
          "poc-unit": {
            installedAt: "2026-01-01",
            components: {
              skills: [".claude/skills/aisf-poc-unit-poc/SKILL.md"],
              rules: [],
              scripts: [],
              resources: [],
            },
          },
        },
      }),
    );

    new Installer(projectDir, aisfHome).uninstall("poc-unit");

    expect(existsSync(join(skillDir, "SKILL.md")), "skill file must be removed").toBe(false);
    expect(existsSync(skillDir), "empty parent dir must be removed").toBe(false);
    const data = JSON.parse(readFileSync(join(projectDir, ".aisf", "installed.json"), "utf8")) as {
      units: Record<string, unknown>;
    };
    expect("poc-unit" in data.units, "unit must be removed from installed.json").toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("uninstall removes script file and corresponding lefthook entry", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    const scriptDir = join(projectDir, ".aisf", "poc-unit", "scripts");
    mkdirSync(scriptDir, { recursive: true });
    writeFileSync(join(scriptDir, "poc-hook.js"), "// hook");
    writeFileSync(
      join(projectDir, "lefthook.yml"),
      "pre-commit:\n  commands:\n    aisf-poc-unit-poc-hook:\n      run: node .aisf/poc-unit/scripts/poc-hook.js\n",
    );
    writeFileSync(
      join(projectDir, ".aisf", "installed.json"),
      JSON.stringify({
        units: {
          "poc-unit": {
            installedAt: "2026-01-01",
            components: {
              skills: [],
              rules: [],
              scripts: [".aisf/poc-unit/scripts/poc-hook.js"],
              resources: [],
            },
          },
        },
      }),
    );

    new Installer(projectDir, aisfHome).uninstall("poc-unit");

    expect(existsSync(join(scriptDir, "poc-hook.js")), "script file must be removed").toBe(false);
    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    expect(lefthook, "lefthook entry must be removed").not.toContain("aisf-poc-unit-poc-hook:");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("uninstall exits with error when unit is not installed", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code ?? ""})`);
    });
    try {
      expect(() => new Installer(projectDir, aisfHome).uninstall("poc-unit")).toThrow("process.exit(1)");
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
 * @strategy    unit; fake ~/.aisf tree
 * @cases
 *   - [PASS] creates .gitignore in .aisf/, .claude/, .skills/ when not present
 *   - [PASS] does not overwrite existing .gitignore
 */
test("installer creates .gitignore files in .aisf/, .claude/, .skills/ on install", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    new Installer(projectDir, aisfHome).install(
      "poc-unit",
      JSON.stringify([{ type: "skill", name: "poc", file: "skills/poc.md" }]),
    );

    expect(readFileSync(join(projectDir, ".aisf", ".gitignore"), "utf8")).toBe("*\n");
    expect(readFileSync(join(projectDir, ".claude", ".gitignore"), "utf8")).toBe("skills/aisf-*/\nrules/aisf-*/\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer does not overwrite existing .gitignore files", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(join(projectDir, ".claude"), { recursive: true });
    writeFileSync(join(projectDir, ".claude", ".gitignore"), "custom-content\n");

    new Installer(projectDir, aisfHome).install(
      "poc-unit",
      JSON.stringify([{ type: "skill", name: "poc", file: "skills/poc.md" }]),
    );

    expect(readFileSync(join(projectDir, ".claude", ".gitignore"), "utf8")).toBe("custom-content\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer: installed.json ────────────────────────────────────────────────

test("installer writes installed.json after install", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aisfHome);
    installer.install(
      "poc-unit",
      JSON.stringify([{ type: "skill", name: "poc", file: "skills/poc.md" }]),
    );

    const installed = installer.readInstalled();
    expect("poc-unit" in installed.units).toBe(true);
    expect(installed.units["poc-unit"].installedAt).toBeTruthy();
    expect(installed.units["poc-unit"].components.skills.length > 0).toBe(true);
    expect(installed.units["poc-unit"].components.skills[0].startsWith(".claude/skills/")).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
