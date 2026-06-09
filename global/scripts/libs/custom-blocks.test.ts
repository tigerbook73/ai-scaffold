/**
 * @test-file   custom-blocks
 * @description Verifies AISK:CUSTOM block parsing and merge behavior
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY): Shengtian Liao @ [1]
 */
import { describe, expect, test } from "vitest";

import { mergeCustomContent, parseCustomBlocks } from "./custom-blocks";

/**
 * @test-suite  parseCustomBlocks
 * @target      parseCustomBlocks()
 * @strategy    unit; hash-comment and HTML-comment custom blocks
 * @cases
 *   - [PASS] parseCustomBlocks parses hash-style AISK:CUSTOM blocks
 *   - [PASS] parseCustomBlocks parses HTML-style AISK:CUSTOM blocks
 *   - [PASS] parseCustomBlocks parses indented hash-style AISK:CUSTOM blocks
 *   - [PASS] parseCustomBlocks parses indented HTML-style AISK:CUSTOM blocks
 */
describe("parseCustomBlocks", () => {
  test("parseCustomBlocks parses hash-style AISK:CUSTOM blocks", () => {
    const blocks = parseCustomBlocks(
      [
        '# AISK:CUSTOM name="paths" status="todo" hint="fill paths"',
        "- src/**/*.ts",
        "# AISK:CUSTOM:END",
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

  test("parseCustomBlocks parses HTML-style AISK:CUSTOM blocks", () => {
    const blocks = parseCustomBlocks(
      [
        '<!-- AISK:CUSTOM name="notes" status="done" hint="add notes" -->',
        "user content",
        "<!-- AISK:CUSTOM:END -->",
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

  test("parseCustomBlocks parses indented hash-style AISK:CUSTOM blocks", () => {
    const blocks = parseCustomBlocks(
      [
        "paths:",
        '  # AISK:CUSTOM name="paths" status="todo" hint="fill paths"',
        '  - "**/*.test.ts"',
        "  # AISK:CUSTOM:END",
      ].join("\n"),
    );

    expect(blocks).toEqual([
      {
        name: "paths",
        status: "todo",
        hint: "fill paths",
        startLine: 1,
        endLine: 3,
        content: ['  - "**/*.test.ts"'],
      },
    ]);
  });

  test("parseCustomBlocks parses indented HTML-style AISK:CUSTOM blocks", () => {
    const blocks = parseCustomBlocks(
      [
        "description:",
        '  <!-- AISK:CUSTOM name="desc" status="todo" hint="fill description" -->',
        "  placeholder text",
        "  <!-- AISK:CUSTOM:END -->",
      ].join("\n"),
    );

    expect(blocks).toEqual([
      {
        name: "desc",
        status: "todo",
        hint: "fill description",
        startLine: 1,
        endLine: 3,
        content: ["  placeholder text"],
      },
    ]);
  });
});

/**
 * @test-suite  mergeCustomContent
 * @target      mergeCustomContent()
 * @strategy    unit; old installed content merged into fresh template content
 * @cases
 *   - [PASS] mergeCustomContent merges done block content while preserving new template metadata
 *   - [PASS] mergeCustomContent keeps new template body for todo blocks
 *   - [PASS] mergeCustomContent returns the new template unchanged when old content has no done blocks
 */
describe("mergeCustomContent", () => {
  test("mergeCustomContent merges done block content while preserving new template metadata", () => {
    const oldContent = [
      '# AISK:CUSTOM name="paths" status="done" hint="old hint"',
      "- user/**/*.ts",
      "# AISK:CUSTOM:END",
    ].join("\n");
    const newTemplate = [
      '# AISK:CUSTOM name="paths" status="todo" hint="new hint"',
      "- default/**/*.ts",
      "# AISK:CUSTOM:END",
    ].join("\n");

    expect(mergeCustomContent(oldContent, newTemplate)).toBe(
      [
        '# AISK:CUSTOM name="paths" status="done" hint="new hint"',
        "- user/**/*.ts",
        "# AISK:CUSTOM:END",
      ].join("\n"),
    );
  });

  test("mergeCustomContent keeps new template body for todo blocks", () => {
    const oldContent = [
      '# AISK:CUSTOM name="paths" status="todo" hint="old hint"',
      "- user-draft/**/*.ts",
      "# AISK:CUSTOM:END",
    ].join("\n");
    const newTemplate = [
      '# AISK:CUSTOM name="paths" status="todo" hint="new hint"',
      "- new-default/**/*.ts",
      "# AISK:CUSTOM:END",
    ].join("\n");

    expect(mergeCustomContent(oldContent, newTemplate)).toBe(newTemplate);
  });

  test("mergeCustomContent returns the new template unchanged when old content has no done blocks", () => {
    const newTemplate = [
      '<!-- AISK:CUSTOM name="notes" status="todo" hint="new hint" -->',
      "new template body",
      "<!-- AISK:CUSTOM:END -->",
    ].join("\n");

    expect(mergeCustomContent("plain installed content", newTemplate)).toBe(newTemplate);
  });
});
