import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

test("skill-format.md is generated and non-empty", () => {
  const skillFormatPath = join(repoRoot, "skills", "create-skill", "resource", "skill-format.md");
  assert.equal(existsSync(skillFormatPath), true, "skill-format.md not found");

  const content = readFileSync(skillFormatPath, "utf-8");
  assert.match(content, /AUTO-GENERATED/);
  assert.match(content, /# Skill Format Specification/);
  assert.ok(content.trim().length > 100, "skill-format.md appears empty");
});

test("claude skill-rules.md contains format spec content", () => {
  const rulesPath = join(repoRoot, ".claude", "rules", "skill-rules.md");
  assert.equal(existsSync(rulesPath), true, "skill-rules.md not found");

  const content = readFileSync(rulesPath, "utf-8");
  assert.match(content, /## Mandatory Rules/);
  assert.match(content, /## Format Tiers/);
});
