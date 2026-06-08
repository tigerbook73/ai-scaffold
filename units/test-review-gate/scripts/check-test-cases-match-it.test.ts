/**
 * @test-file   check-test-cases-match-it
 * @description Verifies that explicit file checks compare @cases entries with it()/test() names only when @reviewed-by is declared
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [1]
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

const repoRoot = resolve(__dirname, "../../..");
const tsxBin = join(repoRoot, "node_modules", ".bin", "tsx");
const scriptPath = join(__dirname, "check-test-cases-match-it.ts");

function runCheck(cwd: string, files: string[] = []) {
  return spawnSync(tsxBin, [scriptPath, ...files], { cwd });
}

/**
 * @test-suite  no explicit files
 * @target      Validate that the check does not discover test files by itself
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when no file arguments are passed
 */
test("exits 0 when no file arguments are passed", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-cases-"));
  try {
    writeFileSync(join(dir, "service.test.ts"), "not valid test metadata");
    expect(runCheck(dir).status).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  file without reviewed-by
 * @target      Validate that files without @reviewed-by are ignored even if @cases mismatch
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when a mismatched test file has no @reviewed-by field
 */
test("exits 0 when a mismatched test file has no @reviewed-by field", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-cases-"));
  try {
    writeFileSync(
      join(dir, "service.test.ts"),
      `/**
 * @test-suite  service
 * @cases
 *   - [PASS] returns ok when valid
 */
describe("service", () => {
  it("returns nope when invalid", () => {});
});
`,
    );
    expect(runCheck(dir, ["service.test.ts"]).status).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  matching cases and it names
 * @target      Validate that matching @cases and it() names pass when @reviewed-by is declared
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when @cases entries match it names
 */
test("exits 0 when @cases entries match it names", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-cases-"));
  try {
    writeFileSync(
      join(dir, "service.test.ts"),
      `/**
 * @reviewed-by (!HUMAN EDIT ONLY): Tom @ [1]
 */

/**
 * @test-suite  service
 * @cases
 *   - [PASS] returns ok when valid
 */
describe("service", () => {
  it("returns ok when valid", () => {});
});
`,
    );
    expect(runCheck(dir, ["service.test.ts"]).status).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  mismatched cases and it names
 * @target      Validate that mismatched @cases and it() names fail when @reviewed-by is declared
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [FAIL] exits 1 when @cases entries do not match it names
 */
test("exits 1 when @cases entries do not match it names", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-cases-"));
  try {
    writeFileSync(
      join(dir, "service.test.ts"),
      `/**
 * @reviewed-by (!HUMAN EDIT ONLY): Tom @ [1]
 */

/**
 * @test-suite  service
 * @cases
 *   - [PASS] returns ok when valid
 */
describe("service", () => {
  it("returns nope when invalid", () => {});
});
`,
    );
    expect(runCheck(dir, ["service.test.ts"]).status).toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
