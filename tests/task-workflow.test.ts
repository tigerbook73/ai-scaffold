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

test("SK-create-task.md references task-context.md for both CLAUDE.md and AGENTS.md", () => {
  const src = readFileSync(join(repoRoot, "skills", "task", "SK-create-task.md"), "utf-8");
  assert.match(src, /task-context\.md/, "must reference task-context.md");
  assert.match(src, /AGENTS\.md/, "must reference AGENTS.md creation");
  assert.match(src, /\.claude\/CLAUDE\.md/, "must reference .claude/CLAUDE.md creation");
  assert.doesNotMatch(src, /resource-claude\.md/, "must not reference removed resource-claude.md");
  assert.doesNotMatch(src, /resource-codex\.md/, "must not reference removed resource-codex.md");
});
