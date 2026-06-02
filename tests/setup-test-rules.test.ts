/**
 * @test-file   setup-test-rules
 * @description Verifies that SetupTestRules correctly writes the rules file and updates the husky pre-commit hook
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [2]
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { SetupTestRules, HuskyNotFoundError } from "../src/test-rules/setup-test-rules";

function makeProjectDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "aisk-setup-test-rules-"));
  mkdirSync(join(dir, ".git"), { recursive: true });
  mkdirSync(join(dir, ".husky"), { recursive: true });
  return dir;
}

/**
 * @test-suite  writeRules
 * @target      Validate that .claude/rules/test-rules.md is created with correct content from template
 * @strategy    Integration — uses isolated temp directory with .git stub, no mocks
 * @cases
 *   - [PASS] .claude/rules/test-rules.md exists after run
 *   - [PASS] file contains paths frontmatter with test file globs
 *   - [PASS] file contains AI test review rules heading
 */
test("writes .claude/rules/test-rules.md with template content when run in a project", () => {
  const dir = makeProjectDir();
  try {
    new SetupTestRules(dir).run();
    const rulesPath = join(dir, ".claude", "rules", "test-rules.md");
    assert.equal(existsSync(rulesPath), true, "test-rules.md must be created");
    const content = readFileSync(rulesPath, "utf-8");
    assert.match(content, /paths:/);
    assert.match(content, /\*\*\/\*\.test\.ts/);
    assert.match(content, /AI 测试审查规则/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  checkHusky — no .husky directory
 * @target      Validate that HuskyNotFoundError is thrown when husky is not initialized
 * @strategy    Integration — uses isolated temp directory without .husky, no mocks
 * @cases
 *   - [PASS] throws HuskyNotFoundError when .husky directory is absent
 *   - [PASS] thrown error has exitCode 2
 */
test("throws HuskyNotFoundError with exitCode 2 when .husky directory does not exist", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-setup-test-rules-no-husky-"));
  mkdirSync(join(dir, ".git"), { recursive: true });
  // No .husky directory — simulates project without husky
  try {
    assert.throws(
      () => new SetupTestRules(dir).run(),
      (e: unknown) => e instanceof HuskyNotFoundError && e.exitCode === 2,
      "must throw HuskyNotFoundError with exitCode 2 when .husky is absent",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  updateHook — no existing hook
 * @target      Validate that a new pre-commit hook is created with marker when hook is absent
 * @strategy    Integration — uses isolated temp directory with .git and .husky stubs, no mocks
 * @cases
 *   - [PASS] .husky/pre-commit file created when it does not exist
 *   - [PASS] created hook contains aisk:test-rules-check marker
 */
test("creates .husky/pre-commit with marker when hook does not exist", () => {
  const dir = makeProjectDir();
  try {
    new SetupTestRules(dir).run();
    const hookPath = join(dir, ".husky", "pre-commit");
    assert.equal(existsSync(hookPath), true, ".husky/pre-commit must be created");
    const content = readFileSync(hookPath, "utf-8");
    assert.match(content, /aisk:test-rules-check/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  updateHook — existing hook without marker
 * @target      Validate that the snippet is appended while preserving the original hook content
 * @strategy    Integration — uses isolated temp directory with .husky stub, no mocks
 * @cases
 *   - [PASS] original hook content preserved after append
 *   - [PASS] aisk:test-rules-check marker present after append
 */
test("appends marker to existing .husky/pre-commit when hook is present without marker", () => {
  const dir = makeProjectDir();
  try {
    const hookPath = join(dir, ".husky", "pre-commit");
    writeFileSync(hookPath, "npx lint-staged\n");
    new SetupTestRules(dir).run();
    const content = readFileSync(hookPath, "utf-8");
    assert.match(content, /npx lint-staged/);
    assert.match(content, /aisk:test-rules-check/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  updateHook — marker already present
 * @target      Validate that an existing hook entry is replaced with the latest snippet
 * @strategy    Integration — uses isolated temp directory with .husky stub, no mocks
 * @cases
 *   - [PASS] old marker entry removed and new snippet appended when marker already exists
 *   - [PASS] other hook content preserved when marker entry is replaced
 */
test("replaces existing hook entry with latest snippet when marker is already present", () => {
  const dir = makeProjectDir();
  try {
    const hookPath = join(dir, ".husky", "pre-commit");
    writeFileSync(
      hookPath,
      'npx lint-staged\n# aisk:test-rules-check\nnode "$HOME/.sk-skills/old/path.js"\n',
    );
    new SetupTestRules(dir).run();
    const content = readFileSync(hookPath, "utf-8");
    assert.match(content, /npx lint-staged/);
    assert.match(content, /aisk:test-rules-check/);
    assert.match(content, /out\/test-rules\/test-rules-check\.js/);
    assert.doesNotMatch(content, /old\/path\.js/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
