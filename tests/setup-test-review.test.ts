/**
 * @test-file   setup-test-review
 * @description Verifies that SetupTestReview correctly writes the rules file and updates the pre-commit hook
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [1]
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { SetupTestReview } from "../scripts/setup-test-review";

function makeProjectDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "aisk-setup-test-review-"));
  mkdirSync(join(dir, ".git", "hooks"), { recursive: true });
  return dir;
}

/**
 * @test-suite  writeRules
 * @target      Validate that .claude/rules/test-review.md is created with correct content from template
 * @strategy    Integration — uses isolated temp directory with .git stub, no mocks
 * @cases
 *   - [PASS] .claude/rules/test-review.md exists after run
 *   - [PASS] file contains paths frontmatter with test file globs
 *   - [PASS] file contains AI Test Review Rules heading
 */
test("writes .claude/rules/test-review.md with template content when run in a project", () => {
  const dir = makeProjectDir();
  try {
    new SetupTestReview(dir).run();
    const rulesPath = join(dir, ".claude", "rules", "test-review.md");
    assert.equal(existsSync(rulesPath), true, "test-review.md must be created");
    const content = readFileSync(rulesPath, "utf-8");
    assert.match(content, /paths:/);
    assert.match(content, /\*\*\/\*\.test\.ts/);
    assert.match(content, /AI Test Review Rules/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  updateHook — no existing hook
 * @target      Validate that a new pre-commit hook is created with shebang and marker when hook is absent
 * @strategy    Integration — uses isolated temp directory with .git stub, no mocks
 * @cases
 *   - [PASS] pre-commit file created when it does not exist
 *   - [PASS] created hook starts with #!/bin/sh
 *   - [PASS] created hook contains aisk:test-review-check marker
 */
test("creates pre-commit hook with shebang and marker when hook does not exist", () => {
  const dir = makeProjectDir();
  try {
    new SetupTestReview(dir).run();
    const hookPath = join(dir, ".git", "hooks", "pre-commit");
    assert.equal(existsSync(hookPath), true, "pre-commit hook must be created");
    const content = readFileSync(hookPath, "utf-8");
    assert.match(content, /^#!\/bin\/sh/);
    assert.match(content, /aisk:test-review-check/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  updateHook — existing hook without marker
 * @target      Validate that the snippet is appended while preserving the original hook content
 * @strategy    Integration — uses isolated temp directory with .git stub, no mocks
 * @cases
 *   - [PASS] original hook content preserved after append
 *   - [PASS] aisk:test-review-check marker present after append
 */
test("appends marker to existing hook when hook is present without marker", () => {
  const dir = makeProjectDir();
  try {
    const hookPath = join(dir, ".git", "hooks", "pre-commit");
    writeFileSync(hookPath, "#!/bin/sh\nnpx lint-staged\n");
    new SetupTestReview(dir).run();
    const content = readFileSync(hookPath, "utf-8");
    assert.match(content, /npx lint-staged/);
    assert.match(content, /aisk:test-review-check/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  updateHook — marker already present
 * @target      Validate that the hook is not modified when the marker is already present
 * @strategy    Integration — uses isolated temp directory with .git stub, no mocks
 * @cases
 *   - [PASS] hook content unchanged when marker already exists
 */
test("skips hook update when aisk:test-review-check marker is already present", () => {
  const dir = makeProjectDir();
  try {
    const hookPath = join(dir, ".git", "hooks", "pre-commit");
    const original = "#!/bin/sh\n# aisk:test-review-check\nnode ...\n";
    writeFileSync(hookPath, original);
    new SetupTestReview(dir).run();
    assert.equal(readFileSync(hookPath, "utf-8"), original);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
