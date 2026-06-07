/**
 * @test-file   skill-format-sync
 * @description Verifies that pnpm build keeps skill-rules.md in sync with the canonical skill-format.md source
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [1]
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const repoRoot = process.cwd();
const startMarker = "<!-- EXTRACT:skill-format:start -->";
const endMarker = "<!-- EXTRACT:skill-format:end -->";

function readRepoFile(path: string): string {
  return readFileSync(join(repoRoot, path), "utf-8");
}

function extractMarkedContent(content: string, path: string): string {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  expect(startIdx, `${path} is missing start marker`).not.toBe(-1);
  expect(endIdx, `${path} is missing end marker`).not.toBe(-1);
  expect(endIdx > startIdx, `${path} has markers in the wrong order`).toBe(true);

  return content.slice(startIdx + startMarker.length, endIdx).trim();
}

/**
 * @test-suite  skill format synchronization
 * @target      Validate that extracted content between markers is identical in source and generated file
 * @strategy    Unit — reads two files and compares extracted sections, no mocks
 * @cases
 *   - [PASS] extracted content between markers is identical in skill-format.md and skill-rules.md
 */
test("skill format source is synchronized to generated resources", () => {
  const sourceContent = extractMarkedContent(
    readRepoFile("skills/skill-format.md"),
    "skills/skill-format.md",
  );

  const claudeRuleContent = extractMarkedContent(
    readRepoFile(".claude/rules/skill-rules.md"),
    ".claude/rules/skill-rules.md",
  );

  expect(claudeRuleContent).toBe(sourceContent);
});
