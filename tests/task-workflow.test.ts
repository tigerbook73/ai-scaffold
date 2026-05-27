import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const TASK_RESOURCES = join(repoRoot, "skills", "task", "resource");

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

test("resource/design.md defines Step Type with intermediate and final", () => {
  const path = join(TASK_RESOURCES, "design.md");
  assert.equal(existsSync(path), true, "design.md must exist");

  const content = readFileSync(path, "utf-8");
  assert.match(content, /Step Type/, "must define Step Type section");
  assert.match(content, /intermediate/, "must define intermediate step type");
  assert.match(content, /final/, "must define final step type");
});

test("resource/design.md defines [automation-candidate] marker", () => {
  const content = readFileSync(join(TASK_RESOURCES, "design.md"), "utf-8");
  assert.match(content, /automation-candidate/, "must document [automation-candidate] marker");
  assert.match(content, /Manual Verification/, "must define Manual Verification section");
  assert.match(content, /Auto Verification/, "must define Auto Verification section");
});

test("task-context.md start implementation references step-type and code quality rules", () => {
  const content = readFileSync(join(TASK_RESOURCES, "task-context.md"), "utf-8");
  assert.match(content, /step-type/, "must reference step-type field");
  assert.match(content, /intermediate/, "must reference intermediate step type");
  assert.match(content, /final/, "must reference final step type");
  assert.match(content, /file name/, "must enforce file naming rules");
});

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
