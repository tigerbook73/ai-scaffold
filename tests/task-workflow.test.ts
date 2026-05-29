/**
 * @test-file   task-workflow
 * @description Verifies that task skill resource files contain required structure, content, and agent-neutral phrasing
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [1]
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const TASK_RESOURCES = join(repoRoot, "skills", "task", "resource");

/**
 * @test-suite  task-context.md structure
 * @target      Validate that task-context.md has required H1, placeholders, and subcommands section
 * @strategy    Unit — reads file system, no mocks
 * @cases
 *   - [PASS] file exists at skills/task/resource/task-context.md
 *   - [PASS] starts with H1 "# Task Mode:"
 *   - [PASS] contains {task-name} placeholder
 *   - [PASS] contains {task-type} placeholder
 *   - [PASS] references task-state.md
 *   - [PASS] contains ## Available Subcommands section
 */
test("task-context.md exists and has required structure", () => {
  const path = join(TASK_RESOURCES, "task-context.md");
  assert.equal(existsSync(path), true, "task-context.md must exist");

  const content = readFileSync(path, "utf-8");
  assert.match(content, /^# Task Mode:/m, "must start with H1 Task Mode");
  assert.match(content, /\{task-name\}/, "must contain {task-name} placeholder");
  assert.match(content, /\{task-type\}/, "must contain {task-type} placeholder");
  assert.match(content, /task-state\.md/, "must reference task-state.md");
  assert.match(content, /## Available Subcommands/, "must have Subcommands section");
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
  assert.doesNotMatch(content, /\/aisk[:\/]/, "must not contain /aisk: or /aisk/ references");
  assert.doesNotMatch(
    content,
    /accessing any file in this directory/,
    "must not use Claude-specific file-access trigger phrasing",
  );
  assert.doesNotMatch(content, /## Skill Commands/, "must not have a Skill Commands section");
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
    assert.match(content, new RegExp(kw), `must contain: ${kw}`);
  }
});

/**
 * @test-suite  requirements-feature.md sections
 * @target      Validate that requirements-feature.md defines all required sections for feature tasks
 * @strategy    Unit — reads file system, no mocks
 * @cases
 *   - [PASS] contains ## Goal section
 *   - [PASS] contains ## Background and Motivation section
 *   - [PASS] contains ## Functional Requirements section
 *   - [PASS] contains ## Non-Functional Requirements section
 *   - [PASS] contains ## Out of Scope section
 *   - [PASS] contains ## Acceptance Criteria section
 */
test("resource/requirements-feature.md defines required sections for feature tasks", () => {
  const path = join(TASK_RESOURCES, "requirements-feature.md");
  assert.equal(existsSync(path), true, "requirements-feature.md must exist");

  const content = readFileSync(path, "utf-8");
  const requiredSections = [
    "Goal",
    "Background and Motivation",
    "Functional Requirements",
    "Non-Functional Requirements",
    "Out of Scope",
    "Acceptance Criteria",
  ];
  for (const section of requiredSections) {
    assert.match(content, new RegExp(`## ${section}`), `must define section: ${section}`);
  }
});

/**
 * @test-suite  requirements-refactor.md sections
 * @target      Validate that requirements-refactor.md defines all required sections for refactor tasks
 * @strategy    Unit — reads file system, no mocks
 * @cases
 *   - [PASS] contains ## Goal section
 *   - [PASS] contains ## Background and Motivation section
 *   - [PASS] contains ## Scope section
 *   - [PASS] contains ## Out of Scope section
 *   - [PASS] contains ## Constraints section
 *   - [PASS] contains ## Acceptance Criteria section
 */
test("resource/requirements-refactor.md defines required sections for refactor tasks", () => {
  const path = join(TASK_RESOURCES, "requirements-refactor.md");
  assert.equal(existsSync(path), true, "requirements-refactor.md must exist");

  const content = readFileSync(path, "utf-8");
  const requiredSections = [
    "Goal",
    "Background and Motivation",
    "Scope",
    "Out of Scope",
    "Constraints",
    "Acceptance Criteria",
  ];
  for (const section of requiredSections) {
    assert.match(content, new RegExp(`## ${section}`), `must define section: ${section}`);
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
  assert.equal(existsSync(path), true, "design.md must exist");

  const content = readFileSync(path, "utf-8");
  assert.match(content, /Step Type/, "must define Step Type section");
  assert.match(content, /intermediate/, "must define intermediate step type");
  assert.match(content, /final/, "must define final step type");
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
  assert.match(content, /automation-candidate/, "must document [automation-candidate] marker");
  assert.match(content, /Manual Verification/, "must define Manual Verification section");
  assert.match(content, /Auto Verification/, "must define Auto Verification section");
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
  assert.match(src, /task-context\.md/, "must reference task-context.md");
  assert.match(src, /AGENTS\.md/, "must reference AGENTS.md creation");
  assert.match(src, /\.claude\/CLAUDE\.md/, "must reference .claude/CLAUDE.md creation");
  assert.match(src, /@..\/AGENTS\.md/, "CLAUDE.md must include the generated AGENTS.md");
  assert.doesNotMatch(
    src,
    /\.claude\/CLAUDE\.md` from .*task-context\.md/s,
    "CLAUDE.md must not duplicate task-context.md",
  );
  assert.doesNotMatch(src, /resource-claude\.md/, "must not reference removed resource-claude.md");
  assert.doesNotMatch(src, /resource-codex\.md/, "must not reference removed resource-codex.md");
});
