/**
 * @test-file   check-test-review
 * @description Verifies that the pre-commit check correctly validates @reviewed-by in staged test files, including renamed files
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [2]
 */
import assert from "node:assert/strict";
import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(__dirname, "..");
const tsxBin = join(repoRoot, "node_modules", ".bin", "tsx");
const scriptPath = join(repoRoot, "src", "test-review-gate", "check-test-review.ts");

function initRepo(dir: string): void {
  execSync("git init", { cwd: dir });
  execSync('git config user.email "test@test.com"', { cwd: dir });
  execSync('git config user.name "Tester"', { cwd: dir });
}

function runCheck(cwd: string) {
  return spawnSync(tsxBin, [scriptPath], { cwd });
}

/**
 * @test-suite  no staged test files
 * @target      Validate that the check exits 0 when no test files are staged
 * @strategy    Integration — uses isolated temp git repo
 * @cases
 *   - [PASS] exits with code 0 when only non-test files are staged
 */
test("exits 0 when no test files are staged", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
  try {
    initRepo(dir);
    writeFileSync(join(dir, "utils.ts"), "export {}");
    execSync("git add .", { cwd: dir });
    assert.equal(runCheck(dir).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  new test file without @reviewed-by
 * @target      Validate that the check blocks a new test file lacking @reviewed-by
 * @strategy    Integration — uses isolated temp git repo
 * @cases
 *   - [FAIL] exits with code 1 when new test file is staged without @reviewed-by
 */
test("exits 1 when new test file is staged without @reviewed-by", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
  try {
    initRepo(dir);
    writeFileSync(join(dir, "service.test.ts"), "// no annotation");
    execSync("git add .", { cwd: dir });
    assert.equal(runCheck(dir).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  new test file with valid @reviewed-by
 * @target      Validate that the check passes a new test file with a valid @reviewed-by
 * @strategy    Integration — uses isolated temp git repo
 * @cases
 *   - [PASS] exits with code 0 when new test file is staged with @reviewed-by Name @ [1]
 */
test("exits 0 when new test file is staged with valid @reviewed-by", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
  try {
    initRepo(dir);
    writeFileSync(join(dir, "service.test.ts"), "// @reviewed-by Tom @ [1]");
    execSync("git add .", { cwd: dir });
    assert.equal(runCheck(dir).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  modified test file with stale version
 * @target      Validate that the check blocks a modified test file with an unchanged version number
 * @strategy    Integration — uses isolated temp git repo with initial commit
 * @cases
 *   - [FAIL] exits with code 1 when modified test file is staged with the same version number
 */
test("exits 1 when modified test file is staged with unchanged @reviewed-by version", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
  try {
    initRepo(dir);
    writeFileSync(join(dir, "service.test.ts"), "// @reviewed-by Tom @ [1]");
    execSync("git add . && git commit -m init", { cwd: dir });
    writeFileSync(join(dir, "service.test.ts"), "// updated\n// @reviewed-by Tom @ [1]");
    execSync("git add .", { cwd: dir });
    assert.equal(runCheck(dir).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  modified test file with incremented version
 * @target      Validate that the check passes a modified test file with an incremented version number
 * @strategy    Integration — uses isolated temp git repo with initial commit
 * @cases
 *   - [PASS] exits with code 0 when modified test file is staged with an incremented version number
 */
test("exits 0 when modified test file is staged with incremented @reviewed-by version", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
  try {
    initRepo(dir);
    writeFileSync(join(dir, "service.test.ts"), "// @reviewed-by Tom @ [1]");
    execSync("git add . && git commit -m init", { cwd: dir });
    writeFileSync(join(dir, "service.test.ts"), "// updated\n// @reviewed-by Tom @ [2]");
    execSync("git add .", { cwd: dir });
    assert.equal(runCheck(dir).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  renamed test file — counter not incremented
 * @target      Validate that a renamed test file with unchanged @reviewed-by version is blocked
 * @strategy    Integration — uses isolated temp git repo with initial commit and git mv
 * @cases
 *   - [FAIL] exits 1 when renamed test file is staged with the same version as the old file
 */
test("exits 1 when renamed test file is staged with unchanged @reviewed-by version", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
  // Files need enough content for git's rename detection to trigger (small files are ignored)
  const filler = "// filler\n".repeat(5);
  try {
    initRepo(dir);
    writeFileSync(join(dir, "old.test.ts"), filler + "// @reviewed-by Tom @ [3]");
    execSync("git add . && git commit -m init", { cwd: dir });
    execSync("git mv old.test.ts new.test.ts", { cwd: dir });
    writeFileSync(join(dir, "new.test.ts"), filler + "// updated\n// @reviewed-by Tom @ [3]");
    execSync("git add .", { cwd: dir });
    assert.equal(runCheck(dir).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  renamed test file — counter incremented
 * @target      Validate that a renamed test file with incremented @reviewed-by version passes
 * @strategy    Integration — uses isolated temp git repo with initial commit and git mv
 * @cases
 *   - [PASS] exits 0 when renamed test file is staged with an incremented version number
 */
test("exits 0 when renamed test file is staged with incremented @reviewed-by version", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
  // Files need enough content for git's rename detection to trigger (small files are ignored)
  const filler = "// filler\n".repeat(5);
  try {
    initRepo(dir);
    writeFileSync(join(dir, "old.test.ts"), filler + "// @reviewed-by Tom @ [3]");
    execSync("git add . && git commit -m init", { cwd: dir });
    execSync("git mv old.test.ts new.test.ts", { cwd: dir });
    writeFileSync(join(dir, "new.test.ts"), filler + "// updated\n// @reviewed-by Tom @ [4]");
    execSync("git add .", { cwd: dir });
    assert.equal(runCheck(dir).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
