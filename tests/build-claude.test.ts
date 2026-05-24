import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

test("skills/skill-format.md exists and contains format spec", () => {
  const skillFormatPath = join(repoRoot, "skills", "skill-format.md");
  assert.equal(existsSync(skillFormatPath), true, "skills/skill-format.md not found");

  const content = readFileSync(skillFormatPath, "utf-8");
  assert.match(content, /## Mandatory Rules/);
  assert.match(content, /## Format Tiers/);
  assert.match(content, /EXTRACT:skill-format:start/);
});

test("claude skill-rules.md contains format spec content", () => {
  const rulesPath = join(repoRoot, ".claude", "rules", "skill-rules.md");
  assert.equal(existsSync(rulesPath), true, "skill-rules.md not found");

  const content = readFileSync(rulesPath, "utf-8");
  assert.match(content, /## Mandatory Rules/);
  assert.match(content, /## Format Tiers/);
});
