/**
 * @test-file   build-claude
 * @description Verifies that pnpm build correctly syncs skill-format.md content into Claude rule files
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [1]
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

/**
 * @test-suite  skill-format.md integrity
 * @target      Validate that the canonical skill format source file exists and contains required markers
 * @strategy    Unit — reads file system directly, no mocks
 * @cases
 *   - [PASS] file exists at skills/skill-format.md
 *   - [PASS] contains ## Mandatory Rules section
 *   - [PASS] contains ## Format Tiers section
 *   - [PASS] contains EXTRACT:skill-format:start marker
 */
test("exposes Mandatory Rules and Format Tiers when skill-format.md is present", () => {
  const skillFormatPath = join(repoRoot, "skills", "skill-format.md");
  assert.equal(existsSync(skillFormatPath), true, "skills/skill-format.md not found");

  const content = readFileSync(skillFormatPath, "utf-8");
  assert.match(content, /## Mandatory Rules/);
  assert.match(content, /## Format Tiers/);
  assert.match(content, /EXTRACT:skill-format:start/);
});

/**
 * @test-suite  skill-rules.md sync
 * @target      Validate that the built Claude rules file contains the synced format spec content
 * @strategy    Unit — reads file system directly, no mocks
 * @cases
 *   - [PASS] .claude/rules/skill-rules.md exists
 *   - [PASS] contains ## Mandatory Rules section
 *   - [PASS] contains ## Format Tiers section
 */
test("contains extracted format spec when skill-rules.md is built", () => {
  const rulesPath = join(repoRoot, ".claude", "rules", "skill-rules.md");
  assert.equal(existsSync(rulesPath), true, "skill-rules.md not found");

  const content = readFileSync(rulesPath, "utf-8");
  assert.match(content, /## Mandatory Rules/);
  assert.match(content, /## Format Tiers/);
});
