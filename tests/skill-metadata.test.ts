/**
 * @test-file   skill-metadata
 * @description Verifies that skill target configuration and Codex metadata meet project conventions
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [1]
 */
import assert from "node:assert/strict";
import test from "node:test";

import { scanSkills } from "../scripts/scan-skills";

const repoRoot = process.cwd();

/**
 * @test-suite  set-claude-permission target scope
 * @target      Validate that set-claude-permission is restricted to Claude only
 * @strategy    Unit — scans skills directory, no mocks
 * @cases
 *   - [PASS] set-claude-permission has claude: true and codex: false
 */
test("targets only Claude when set-claude-permission is scanned", () => {
  const entries = scanSkills(repoRoot);
  const perm = entries.find((e) => e.name === "set-claude-permission");
  assert.ok(perm, "set-claude-permission not found");
  assert.equal(perm.targets.claude, true);
  assert.equal(perm.targets.codex, false);
});

/**
 * @test-suite  dual-target skills
 * @target      Validate that all non-permission skills target both Claude and Codex
 * @strategy    Unit — scans skills directory, no mocks
 * @cases
 *   - [PASS] every non-permission skill has claude: true and codex: true
 */
test("targets both Claude and Codex when any non-permission skill is scanned", () => {
  const entries = scanSkills(repoRoot);
  for (const entry of entries) {
    if (entry.name === "set-claude-permission") continue;
    assert.equal(entry.targets.claude, true, `${entry.src} must target claude`);
    assert.equal(entry.targets.codex, true, `${entry.src} must target codex`);
  }
});

/**
 * @test-suite  Codex naming convention
 * @target      Validate that Codex skill names follow aisk- prefix and kebab-case format
 * @strategy    Unit — scans skills directory, no mocks
 * @cases
 *   - [PASS] every codex name matches /^aisk-[a-z0-9]+(?:-[a-z0-9]+)*$/
 *   - [PASS] no duplicate codex names exist
 *   - [PASS] all skills have non-empty description and shortDescription
 */
test("uses aisk- prefix and kebab-case when codex skill names are generated", () => {
  const entries = scanSkills(repoRoot).filter((e) => e.targets.codex);
  const names = new Set<string>();
  for (const entry of entries) {
    assert.match(entry.codex.name, /^aisk-[a-z0-9]+(?:-[a-z0-9]+)*$/, entry.src);
    assert.equal(names.has(entry.codex.name), false, `duplicate name: ${entry.codex.name}`);
    names.add(entry.codex.name);
    assert.ok(entry.codex.description.trim().length > 0, `${entry.src} missing codex description`);
    assert.ok(
      entry.codex.shortDescription.trim().length > 0,
      `${entry.src} missing shortDescription`,
    );
  }
});

/**
 * @test-suite  Codex skill scope
 * @target      Validate that set-claude-permission is excluded from the Codex skill list
 * @strategy    Unit — scans skills directory, no mocks
 * @cases
 *   - [PASS] set-claude-permission absent from codex-filtered entries
 */
test("excludes set-claude-permission when codex-targeted skills are listed", () => {
  const entries = scanSkills(repoRoot).filter((e) => e.targets.codex);
  assert.equal(
    entries.some((e) => e.name === "set-claude-permission"),
    false,
  );
});
