/**
 * @test-file   custom-blocks
 * @description Verifies AISF:CUSTOM block parsing and merge behavior
 * @ai-generated
 * @reviewed-by
 */
import { expect, test } from "vitest";

import { mergeCustomContent, parseCustomBlocks } from "./custom-blocks";

/**
 * @test-suite  parseCustomBlocks
 * @target      parseCustomBlocks()
 * @strategy    unit; hash-comment and HTML-comment custom blocks
 * @cases
 *   - [PASS] parses hash-style AISF:CUSTOM blocks
 *   - [PASS] parses HTML-style AISF:CUSTOM blocks
 */
test("parseCustomBlocks parses hash-style AISF:CUSTOM blocks", () => {
  const blocks = parseCustomBlocks(
    [
      '# AISF:CUSTOM name="paths" status="todo" hint="fill paths"',
      "- src/**/*.ts",
      "# AISF:CUSTOM:END",
    ].join("\n"),
  );

  expect(blocks).toEqual([
    {
      name: "paths",
      status: "todo",
      hint: "fill paths",
      startLine: 0,
      endLine: 2,
      content: ["- src/**/*.ts"],
    },
  ]);
});

test("parseCustomBlocks parses HTML-style AISF:CUSTOM blocks", () => {
  const blocks = parseCustomBlocks(
    [
      '<!-- AISF:CUSTOM name="notes" status="done" hint="add notes" -->',
      "user content",
      "<!-- AISF:CUSTOM:END -->",
    ].join("\n"),
  );

  expect(blocks).toEqual([
    {
      name: "notes",
      status: "done",
      hint: "add notes",
      startLine: 0,
      endLine: 2,
      content: ["user content"],
    },
  ]);
});

/**
 * @test-suite  mergeCustomContent
 * @target      mergeCustomContent()
 * @strategy    unit; old installed content merged into fresh template content
 * @cases
 *   - [PASS] merges done block content while preserving new template metadata
 *   - [PASS] keeps new template body for todo blocks
 *   - [PASS] returns the new template unchanged when old content has no done blocks
 */
test("mergeCustomContent merges done block content while preserving new template metadata", () => {
  const oldContent = [
    '# AISF:CUSTOM name="paths" status="done" hint="old hint"',
    "- user/**/*.ts",
    "# AISF:CUSTOM:END",
  ].join("\n");
  const newTemplate = [
    '# AISF:CUSTOM name="paths" status="todo" hint="new hint"',
    "- default/**/*.ts",
    "# AISF:CUSTOM:END",
  ].join("\n");

  expect(mergeCustomContent(oldContent, newTemplate)).toBe(
    [
      '# AISF:CUSTOM name="paths" status="done" hint="new hint"',
      "- user/**/*.ts",
      "# AISF:CUSTOM:END",
    ].join("\n"),
  );
});

test("mergeCustomContent keeps new template body for todo blocks", () => {
  const oldContent = [
    '# AISF:CUSTOM name="paths" status="todo" hint="old hint"',
    "- user-draft/**/*.ts",
    "# AISF:CUSTOM:END",
  ].join("\n");
  const newTemplate = [
    '# AISF:CUSTOM name="paths" status="todo" hint="new hint"',
    "- new-default/**/*.ts",
    "# AISF:CUSTOM:END",
  ].join("\n");

  expect(mergeCustomContent(oldContent, newTemplate)).toBe(newTemplate);
});

test("mergeCustomContent returns the new template unchanged when old content has no done blocks", () => {
  const newTemplate = [
    '<!-- AISF:CUSTOM name="notes" status="todo" hint="new hint" -->',
    "new template body",
    "<!-- AISF:CUSTOM:END -->",
  ].join("\n");

  expect(mergeCustomContent("plain installed content", newTemplate)).toBe(newTemplate);
});
