/**
 * @test-file   task-workflow
 * @description Verifies that task skill resource files contain required structure, content, and agent-neutral phrasing
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [1]
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const repoRoot = process.cwd();
const TASK_RESOURCES = join(repoRoot, "skills", "task", "resource");

/**
 * @test-suite  task-context.md structure
 * @target      Validate that task-context.md has required H1, placeholders, and subcommands section
 * @strategy    Unit — reads file system, no mocks
 * @cases
 *   - [PASS] file exists at skills/task/resource/task-context.md
 *   - [PASS] starts with H1 containing task mode heading
 *   - [PASS] contains {task-name} placeholder
 *   - [PASS] contains {task-type} placeholder
 *   - [PASS] references task-state.md
 *   - [PASS] contains subcommands section
 */
test("task-context.md exists and has required structure", () => {
  const path = join(TASK_RESOURCES, "task-context.md");
  expect(existsSync(path), "task-context.md must exist").toBe(true);

  const content = readFileSync(path, "utf-8");
  expect(content).toMatch(/^# 任务模式：/m);
  expect(content).toMatch(/\{task-name\}/);
  expect(content).toMatch(/\{task-type\}/);
  expect(content).toMatch(/task-state\.md/);
  expect(content).toMatch(/## 可用子命令/);
});

/**
 * @test-suite  task-context.md agent neutrality
 * @target      Validate that task-context.md contains no Claude-specific references
 * @strategy    Unit — reads file system, no mocks
 * @cases
 *   - [PASS] no /aisk: or /aisk/ references present
 *   - [PASS] no Claude-specific file-access trigger phrasing present
 *   - [PASS] no Skill Commands section present
 */
test("task-context.md is agent-neutral (no slash commands, no agent-specific auto-load phrasing)", () => {
  const content = readFileSync(join(TASK_RESOURCES, "task-context.md"), "utf-8");
  expect(content).not.toMatch(/\/aisk[:\/]/);
  expect(content).not.toMatch(/accessing any file in this directory/);
  expect(content).not.toMatch(/## Skill Commands/);
});

/**
 * @test-suite  task-context.md subcommand keywords
 * @target      Validate that all required subcommand keywords are present in task-context.md
 * @strategy    Unit — reads file system, no mocks
 * @cases
 *   - [PASS] contains "plan requirements" keyword
 *   - [PASS] contains "plan design" keyword
 *   - [PASS] contains "start implementation" keyword
 *   - [PASS] contains "run verification" keyword
 *   - [PASS] contains "current status" keyword
 *   - [PASS] contains "task-state.md" reference
 */
test("task-context.md contains core subcommand keywords", () => {
  const content = readFileSync(join(TASK_RESOURCES, "task-context.md"), "utf-8");
  const keywords = [
    "plan requirements",
    "plan design",
    "start implementation",
    "run verification",
    "current status",
    "task-state.md",
  ];
  for (const kw of keywords) {
    expect(content, `must contain: ${kw}`).toMatch(new RegExp(kw));
  }
});

/**
 * @test-suite  requirements-feature.md sections
 * @target      Validate that requirements-feature.md defines all required sections for feature tasks
 * @strategy    Unit — reads file system, no mocks
 * @cases
 *   - [PASS] contains ## 目标 section
 *   - [PASS] contains ## 背景与动机 section
 *   - [PASS] contains ## 功能需求 section
 *   - [PASS] contains ## 非功能性需求 section
 *   - [PASS] contains ## 范围外 section
 *   - [PASS] contains ## 验收标准 section
 */
test("resource/requirements-feature.md defines required sections for feature tasks", () => {
  const path = join(TASK_RESOURCES, "requirements-feature.md");
  expect(existsSync(path), "requirements-feature.md must exist").toBe(true);

  const content = readFileSync(path, "utf-8");
  const requiredSections = ["目标", "背景与动机", "功能需求", "非功能性需求", "范围外", "验收标准"];
  for (const section of requiredSections) {
    expect(content, `must define section: ${section}`).toMatch(new RegExp(`## ${section}`));
  }
});

/**
 * @test-suite  requirements-refactor.md sections
 * @target      Validate that requirements-refactor.md defines all required sections for refactor tasks
 * @strategy    Unit — reads file system, no mocks
 * @cases
 *   - [PASS] contains ## 目标 section
 *   - [PASS] contains ## 背景与动机 section
 *   - [PASS] contains ## 范围 section
 *   - [PASS] contains ## 范围外 section
 *   - [PASS] contains ## 约束 section
 *   - [PASS] contains ## 验收标准 section
 */
test("resource/requirements-refactor.md defines required sections for refactor tasks", () => {
  const path = join(TASK_RESOURCES, "requirements-refactor.md");
  expect(existsSync(path), "requirements-refactor.md must exist").toBe(true);

  const content = readFileSync(path, "utf-8");
  const requiredSections = ["目标", "背景与动机", "范围", "范围外", "约束", "验收标准"];
  for (const section of requiredSections) {
    expect(content, `must define section: ${section}`).toMatch(new RegExp(`## ${section}`));
  }
});

/**
 * @test-suite  design.md step type definitions
 * @target      Validate that design.md defines Step Type with intermediate and final values
 * @strategy    Unit — reads file system, no mocks
 * @cases
 *   - [PASS] contains Step Type section
 *   - [PASS] defines intermediate step type
 *   - [PASS] defines final step type
 */
test("resource/design.md defines Step Type with intermediate and final", () => {
  const path = join(TASK_RESOURCES, "design.md");
  expect(existsSync(path), "design.md must exist").toBe(true);

  const content = readFileSync(path, "utf-8");
  expect(content).toMatch(/Step Type/);
  expect(content).toMatch(/intermediate/);
  expect(content).toMatch(/final/);
});

/**
 * @test-suite  design.md automation markers
 * @target      Validate that design.md documents automation-candidate marker and verification sections
 * @strategy    Unit — reads file system, no mocks
 * @cases
 *   - [PASS] contains automation-candidate marker documentation
 *   - [PASS] defines Manual Verification section
 *   - [PASS] defines Auto Verification section
 */
test("resource/design.md defines [automation-candidate] marker", () => {
  const content = readFileSync(join(TASK_RESOURCES, "design.md"), "utf-8");
  expect(content).toMatch(/automation-candidate/);
  expect(content).toMatch(/Manual Verification/);
  expect(content).toMatch(/Auto Verification/);
});

/**
 * @test-suite  SK-create-task.md AGENTS.md generation
 * @target      Validate that SK-create-task.md references correct file generation steps and avoids removed resources
 * @strategy    Unit — reads skill file, no mocks
 * @cases
 *   - [PASS] references task-context.md
 *   - [PASS] references AGENTS.md creation
 *   - [PASS] references .claude/CLAUDE.md creation
 *   - [PASS] CLAUDE.md includes generated AGENTS.md via @../AGENTS.md
 *   - [PASS] CLAUDE.md does not duplicate task-context.md content
 *   - [PASS] does not reference removed resource-claude.md
 *   - [PASS] does not reference removed resource-codex.md
 */
test("SK-create-task.md creates AGENTS.md from task-context.md and CLAUDE.md as an include", () => {
  const src = readFileSync(join(repoRoot, "skills", "task", "SK-create-task.md"), "utf-8");
  expect(src).toMatch(/task-context\.md/);
  expect(src).toMatch(/AGENTS\.md/);
  expect(src).toMatch(/\.claude\/CLAUDE\.md/);
  expect(src).toMatch(/@..\/AGENTS\.md/);
  expect(src).not.toMatch(/\.claude\/CLAUDE\.md` from .*task-context\.md/s);
  expect(src).not.toMatch(/resource-claude\.md/);
  expect(src).not.toMatch(/resource-codex\.md/);
});
