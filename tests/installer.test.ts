/**
 * @test-file   installer
 * @description Verifies the Installer class handles listUnits, checkDeps (topological order),
 *              skill/rule/script/resource installation, and lefthook.yml idempotent updates.
 * @ai-generated
 * @reviewed-by Shengtian Liao
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

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

    assert.equal(result.units.length, 2);
    assert.ok(result.units.every((u) => u.installed === false));
    assert.ok(result.units.some((u) => u.name === "poc-unit" && u.description === "PoC unit"));
    assert.ok(result.units.some((u) => u.name === "poc-dep-unit"));
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
    assert.equal(pocUnit?.installed, true);
    assert.equal(depUnit?.installed, false);
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

    assert.deepEqual(result.auto, ["poc-dep-unit"]);
    assert.deepEqual(result.order, ["poc-dep-unit", "poc-unit"]);
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

    assert.deepEqual(result.auto, []);
    assert.deepEqual(result.order, ["poc-unit"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer --install: skill ───────────────────────────────────────────────

test("installer installs skill to .claude/skills/aisf:{unit}:{name}/SKILL.md", () => {
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

    const skillFile = join(projectDir, ".claude", "skills", "aisf:poc-unit:poc", "SKILL.md");
    assert.ok(readFileSync(skillFile, "utf8").includes("PoC skill content"));
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

    const skillFile = join(projectDir, ".claude", "skills", "aisf:poc-unit:poc", "SKILL.md");
    assert.ok(readFileSync(skillFile, "utf8").includes("PoC skill content"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer --install: rule ────────────────────────────────────────────────

test("installer installs rule guard by reading template and applying customValues", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    // Write a template with an AISF:CUSTOM block into the fake store
    const rulesDir = join(aisfHome, "units", "poc-unit", "rules");
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(
      join(rulesDir, "poc-rule.md"),
      '---\n# AISF:CUSTOM name="paths" hint="..."\npaths: ["**/*.poc-test.*"]\n# AISF:CUSTOM:END\ndescription: poc rule\n---\nRule body.',
    );

    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aisfHome);
    installer.install(
      "poc-unit",
      JSON.stringify([
        { type: "rule", name: "poc-rule", file: "rules/poc-rule.md", customValues: { paths: '["**/*.test.ts"]' } },
      ]),
    );

    const ruleFile = join(projectDir, ".claude", "rules", "poc-unit", "poc-rule.md");
    const content = readFileSync(ruleFile, "utf8");
    assert.ok(content.includes('["**/*.test.ts"]'), "customValue must be applied");
    assert.ok(content.includes("AISF:CUSTOM"), "boundary markers must be preserved");
    assert.ok(!content.includes("poc-test"), "default value must be replaced");
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
    assert.ok(readFileSync(scriptFile, "utf8").includes("hook"));

    const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
    assert.ok(lefthook.includes("aisf-poc-unit-poc-hook:"));
    assert.ok(lefthook.includes(".aisf/poc-unit/scripts/poc-hook.js"));
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
    assert.ok(lefthook.includes("{staged_files}"), "must include lefthook template var");
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
    assert.equal(occurrences, 1, "hook entry must appear exactly once");
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
    assert.ok(lefthook.includes("existing-hook:"), "must preserve existing entries");
    assert.ok(lefthook.includes("aisf-poc-unit-poc-hook:"), "must add new entry");
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
    assert.ok(lefthook.includes("aisf-poc-unit-poc-hook:"), "must add new entry");
    // The commented block must remain untouched
    assert.ok(lefthook.includes("# pre-commit:"), "must preserve commented lines");
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
    // pre-push section must remain intact
    assert.ok(lefthook.includes("    lint:"), "must preserve pre-push commands");
    // new entry must appear in pre-commit section (after typecheck:)
    const preCommitIdx = lefthook.indexOf("pre-commit:");
    const preCommitSection = lefthook.slice(preCommitIdx);
    assert.ok(preCommitSection.includes("aisf-poc-unit-poc-hook:"), "must add to pre-commit section");
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
    assert.equal(readFileSync(resource, "utf8"), "readme content");
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
    assert.ok("poc-unit" in installed.units);
    assert.ok(installed.units["poc-unit"].installedAt);
    assert.ok(installed.units["poc-unit"].components.skills.length > 0);
    assert.ok(installed.units["poc-unit"].components.skills[0].startsWith(".claude/skills/"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
