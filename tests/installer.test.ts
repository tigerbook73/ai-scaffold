/**
 * @test-file   installer
 * @description Verifies the Installer class handles skill/rule/script/resource installation
 *              and lefthook.yml idempotent updates correctly.
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
  const unitDir = join(aisfHome, "units", "poc-unit");
  mkdirSync(join(unitDir, "skills"), { recursive: true });
  mkdirSync(join(unitDir, "scripts"), { recursive: true });
  mkdirSync(join(unitDir, "resources"), { recursive: true });
  writeFileSync(join(unitDir, "skills", "poc.md"), "# poc\nPoC skill content");
  writeFileSync(join(unitDir, "scripts", "poc-hook.js"), '"use strict";\nconsole.log("hook");');
  writeFileSync(join(unitDir, "resources", "readme.md"), "readme content");
  writeFileSync(
    join(unitDir, "unit.json"),
    JSON.stringify({ name: "poc-unit", dependencies: ["poc-dep-unit"], components: {} }),
  );

  const depDir = join(aisfHome, "units", "poc-dep-unit");
  mkdirSync(depDir, { recursive: true });
  writeFileSync(
    join(depDir, "unit.json"),
    JSON.stringify({ name: "poc-dep-unit", dependencies: [], components: {} }),
  );

  return aisfHome;
}

// ─── installer --check-deps ───────────────────────────────────────────────────

test("installer checkDeps lists unmet dependencies when nothing installed", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const installer = new Installer(projectDir, aisfHome);
    const output: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: string | Uint8Array) => {
      if (typeof chunk === "string") output.push(chunk);
      return true;
    };
    try {
      installer.checkDeps(["poc-unit"]);
    } finally {
      process.stdout.write = origWrite;
    }

    const result = JSON.parse(output.join("")) as { unmet: string[] };
    assert.deepEqual(result.unmet, ["poc-dep-unit"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installer checkDeps returns empty unmet when dependency is installed", () => {
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
    const output: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: string | Uint8Array) => {
      if (typeof chunk === "string") output.push(chunk);
      return true;
    };
    try {
      installer.checkDeps(["poc-unit"]);
    } finally {
      process.stdout.write = origWrite;
    }

    const result = JSON.parse(output.join("")) as { unmet: string[] };
    assert.deepEqual(result.unmet, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer --install: skill ───────────────────────────────────────────────

test("installer installs skill to .claude/commands/aisf:{unit}:{name}/SKILL.md", () => {
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

    const skillFile = join(projectDir, ".claude", "commands", "aisf:poc-unit:poc", "SKILL.md");
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

    const skillFile = join(projectDir, ".claude", "commands", "aisf:poc-unit:poc", "SKILL.md");
    assert.ok(readFileSync(skillFile, "utf8").includes("PoC skill content"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── installer --install: rule ────────────────────────────────────────────────

test("installer installs rule guard with resolved content to .claude/rules/", () => {
  const dir = makeTempDir();
  try {
    const aisfHome = makeFakeAisfHome(dir);
    const projectDir = join(dir, "project");
    mkdirSync(projectDir);

    const resolvedContent =
      '---\nglobs: ["**/*.test.ts"]\ndescription: poc rule\n---\nRule body.';
    const installer = new Installer(projectDir, aisfHome);
    installer.install(
      "poc-unit",
      JSON.stringify([{ type: "rule", name: "poc-rule", file: "rules/poc-rule.md", content: resolvedContent }]),
    );

    const ruleFile = join(projectDir, ".claude", "rules", "poc-unit", "poc-rule.md");
    assert.equal(readFileSync(ruleFile, "utf8"), resolvedContent);
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
    assert.ok(installed.units["poc-unit"].components.skills[0].startsWith(".claude/commands/"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
