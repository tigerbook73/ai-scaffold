import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const startMarker = "<!-- EXTRACT:skill-format:start -->";
const endMarker = "<!-- EXTRACT:skill-format:end -->";

function readRepoFile(path: string): string {
  return readFileSync(join(repoRoot, path), "utf-8");
}

function extractMarkedContent(content: string, path: string): string {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  assert.notEqual(startIdx, -1, `${path} is missing start marker`);
  assert.notEqual(endIdx, -1, `${path} is missing end marker`);
  assert.ok(endIdx > startIdx, `${path} has markers in the wrong order`);

  return content.slice(startIdx + startMarker.length, endIdx).trim();
}

test("skill format source is synchronized to generated resources", () => {
  const sourceContent = extractMarkedContent(
    readRepoFile("docs/SKILL-SOURCE-FORMAT.md"),
    "docs/SKILL-SOURCE-FORMAT.md",
  );

  const claudeRuleContent = extractMarkedContent(
    readRepoFile(".claude/rules/skill-rules.md"),
    ".claude/rules/skill-rules.md",
  );

  const generatedSkillFormat = readRepoFile("skills/create-skill/resource/skill-format.md");

  assert.equal(claudeRuleContent, sourceContent);
  assert.match(generatedSkillFormat, /Source: docs\/SKILL-SOURCE-FORMAT\.md/);
  assert.match(generatedSkillFormat, /To regenerate: pnpm build/);
  assert.ok(generatedSkillFormat.includes(sourceContent));
});
