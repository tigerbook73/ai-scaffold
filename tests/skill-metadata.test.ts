/**
 * @test-file   skill-metadata
 * @description Verifies that skill target configuration and Codex metadata meet project conventions
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [1]
 */
import { expect, test } from "vitest";

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
  expect(perm, "set-claude-permission not found").toBeTruthy();
  expect(perm!.targets.claude).toBe(true);
  expect(perm!.targets.codex).toBe(false);
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
    expect(entry.targets.claude, `${entry.src} must target claude`).toBe(true);
    expect(entry.targets.codex, `${entry.src} must target codex`).toBe(true);
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
    expect(entry.codex.name, entry.src).toMatch(/^aisk-[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(names.has(entry.codex.name), `duplicate name: ${entry.codex.name}`).toBe(false);
    names.add(entry.codex.name);
    expect(entry.codex.description.trim().length > 0, `${entry.src} missing codex description`).toBe(true);
    expect(
      entry.codex.shortDescription.trim().length > 0,
      `${entry.src} missing shortDescription`,
    ).toBe(true);
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
  expect(entries.some((e) => e.name === "set-claude-permission")).toBe(false);
});
