/**
 * @test-file   check-reviewed-by-commit-marker
 * @description Verifies that the pre-commit check validates declared @reviewed-by markers in staged test files, including renamed files
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [3]
 */
import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const repoRoot = resolve(__dirname, "../../..");
const tsxBin = join(repoRoot, "node_modules", ".bin", "tsx");
const scriptPath = join(__dirname, "check-reviewed-by-commit-marker.ts");

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
 *   - [PASS] exits 0 when no test files are staged
 */
describe("no staged test files", () => {
  test("exits 0 when no test files are staged", () => {
    const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
    try {
      initRepo(dir);
      writeFileSync(join(dir, "utils.ts"), "export {}");
      execSync("git add .", { cwd: dir });
      expect(runCheck(dir).status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  new test file without @reviewed-by
 * @target      Validate that the check ignores a new test file with no @reviewed-by field
 * @strategy    Integration — uses isolated temp git repo
 * @cases
 *   - [PASS] exits 0 when new test file is staged without @reviewed-by
 */
describe("new test file without @reviewed-by", () => {
  test("exits 0 when new test file is staged without @reviewed-by", () => {
    const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
    try {
      initRepo(dir);
      writeFileSync(join(dir, "service.test.ts"), "// no annotation");
      execSync("git add .", { cwd: dir });
      expect(runCheck(dir).status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  new test file with empty @reviewed-by
 * @target      Validate that the check blocks a declared @reviewed-by field without a marker
 * @strategy    Integration — uses isolated temp git repo
 * @cases
 *   - [FAIL] exits 1 when new test file declares @reviewed-by without a valid marker
 */
describe("new test file with empty @reviewed-by", () => {
  test("exits 1 when new test file declares @reviewed-by without a valid marker", () => {
    const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
    try {
      initRepo(dir);
      writeFileSync(join(dir, "service.test.ts"), "// @reviewed-by (!HUMAN EDIT ONLY):");
      execSync("git add .", { cwd: dir });
      expect(runCheck(dir).status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  new test file with valid @reviewed-by
 * @target      Validate that the check passes a new test file with a valid @reviewed-by marker
 * @strategy    Integration — uses isolated temp git repo
 * @cases
 *   - [PASS] exits 0 when new test file is staged with valid @reviewed-by
 */
describe("new test file with valid @reviewed-by", () => {
  test("exits 0 when new test file is staged with valid @reviewed-by", () => {
    const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
    try {
      initRepo(dir);
      writeFileSync(join(dir, "service.test.ts"), "// @reviewed-by (!HUMAN EDIT ONLY): Tom @ [1]");
      execSync("git add .", { cwd: dir });
      expect(runCheck(dir).status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  modified test file with stale version
 * @target      Validate that the check blocks a modified test file with an unchanged version number
 * @strategy    Integration — uses isolated temp git repo with initial commit
 * @cases
 *   - [FAIL] exits 1 when modified test file is staged with unchanged @reviewed-by version
 */
describe("modified test file with stale version", () => {
  test("exits 1 when modified test file is staged with unchanged @reviewed-by version", () => {
    const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
    try {
      initRepo(dir);
      writeFileSync(join(dir, "service.test.ts"), "// @reviewed-by (!HUMAN EDIT ONLY): Tom @ [1]");
      execSync("git add . && git commit -m init", { cwd: dir });
      writeFileSync(
        join(dir, "service.test.ts"),
        "// updated\n// @reviewed-by (!HUMAN EDIT ONLY): Tom @ [1]",
      );
      execSync("git add .", { cwd: dir });
      expect(runCheck(dir).status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  modified test file with incremented version
 * @target      Validate that the check passes a modified test file with an incremented version number
 * @strategy    Integration — uses isolated temp git repo with initial commit
 * @cases
 *   - [PASS] exits 0 when modified test file is staged with incremented @reviewed-by version
 */
describe("modified test file with incremented version", () => {
  test("exits 0 when modified test file is staged with incremented @reviewed-by version", () => {
    const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
    try {
      initRepo(dir);
      writeFileSync(join(dir, "service.test.ts"), "// @reviewed-by (!HUMAN EDIT ONLY): Tom @ [1]");
      execSync("git add . && git commit -m init", { cwd: dir });
      writeFileSync(
        join(dir, "service.test.ts"),
        "// updated\n// @reviewed-by (!HUMAN EDIT ONLY): Tom @ [2]",
      );
      execSync("git add .", { cwd: dir });
      expect(runCheck(dir).status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  renamed test file — counter not incremented
 * @target      Validate that a renamed test file with unchanged @reviewed-by version is blocked
 * @strategy    Integration — uses isolated temp git repo with initial commit and git mv
 * @cases
 *   - [FAIL] exits 1 when renamed test file is staged with unchanged @reviewed-by version
 */
describe("renamed test file — counter not incremented", () => {
  test("exits 1 when renamed test file is staged with unchanged @reviewed-by version", () => {
    const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
    // Files need enough content for git's rename detection to trigger (small files are ignored)
    const filler = "// filler\n".repeat(40);
    try {
      initRepo(dir);
      writeFileSync(
        join(dir, "old.test.ts"),
        filler + "// @reviewed-by (!HUMAN EDIT ONLY): Tom @ [3]",
      );
      execSync("git add . && git commit -m init", { cwd: dir });
      execSync("git mv old.test.ts new.test.ts", { cwd: dir });
      writeFileSync(
        join(dir, "new.test.ts"),
        filler + "// updated\n// @reviewed-by (!HUMAN EDIT ONLY): Tom @ [3]",
      );
      execSync("git add .", { cwd: dir });
      expect(runCheck(dir).status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  renamed test file — counter incremented
 * @target      Validate that a renamed test file with incremented @reviewed-by version passes
 * @strategy    Integration — uses isolated temp git repo with initial commit and git mv
 * @cases
 *   - [PASS] exits 0 when renamed test file is staged with incremented @reviewed-by version
 */
describe("renamed test file — counter incremented", () => {
  test("exits 0 when renamed test file is staged with incremented @reviewed-by version", () => {
    const dir = mkdtempSync(join(tmpdir(), "aisk-check-"));
    // Files need enough content for git's rename detection to trigger (small files are ignored)
    const filler = "// filler\n".repeat(40);
    try {
      initRepo(dir);
      writeFileSync(
        join(dir, "old.test.ts"),
        filler + "// @reviewed-by (!HUMAN EDIT ONLY): Tom @ [3]",
      );
      execSync("git add . && git commit -m init", { cwd: dir });
      execSync("git mv old.test.ts new.test.ts", { cwd: dir });
      writeFileSync(
        join(dir, "new.test.ts"),
        filler + "// updated\n// @reviewed-by (!HUMAN EDIT ONLY): Tom @ [4]",
      );
      execSync("git add .", { cwd: dir });
      expect(runCheck(dir).status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
