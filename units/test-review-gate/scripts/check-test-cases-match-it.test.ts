/**
 * @test-file   check-test-cases-match-it
 * @description Verifies that explicit file checks compare @cases entries with it()/test() names only when @reviewed-by is declared
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [2]
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

const scriptPath = resolve("units/test-review-gate/scripts/check-test-cases-match-it.ts");
const tsxLoader = require.resolve("tsx");
const testSuiteTag = `@test-${"suite"}`;

function runCheck(cwd: string, files: string[] = []) {
  return spawnSync(process.execPath, ["--import", tsxLoader, scriptPath, ...files], {
    cwd,
  });
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
 * ${testSuiteTag}  service
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
 * ${testSuiteTag}  service
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
 * ${testSuiteTag}  service
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

/**
 * @test-suite  test.describe with consecutive test cases
 * @target      Validate that Playwright-style test.describe blocks are checked by indentation and test() names
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when test.describe contains matching consecutive test cases
 */
test("exits 0 when test.describe contains matching consecutive test cases", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-cases-"));
  try {
    writeFileSync(
      join(dir, "service.spec.ts"),
      `/**
 * @reviewed-by (!HUMAN EDIT ONLY): Tom @ [1]
 */

/**
 * ${testSuiteTag}  service
 * @cases
 *   - [PASS] shows dashboard when user signs in
 *   - [FAIL] shows validation error when password is empty
 */
test.describe("service", () => {
  test("shows dashboard when user signs in", async ({ page }) => {
    await page.goto("/");
  });
  test("shows validation error when password is empty", async ({ page }) => {
    await page.goto("/signin");
  });
});
`,
    );
    expect(runCheck(dir, ["service.spec.ts"]).status).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  brace characters in test names
 * @target      Validate that braces in names or bodies do not affect suite boundaries
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when case names contain brace characters
 */
test("exits 0 when case names contain brace characters", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-cases-"));
  try {
    writeFileSync(
      join(dir, "service.test.ts"),
      `/**
 * @reviewed-by (!HUMAN EDIT ONLY): Tom @ [1]
 */

/**
 * ${testSuiteTag}  service
 * @cases
 *   - [PASS] handles } in input
 *   - [PASS] handles { in input
 */
describe("service", () => {
  it("handles } in input", () => {
    const value = "}";
    expect(value).toBe("}");
  });
  it("handles { in input", () => {
    const value = "{";
    expect(value).toBe("{");
  });
});
`,
    );
    expect(runCheck(dir, ["service.test.ts"]).status).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  direct multi-line cases
 * @target      Validate that direct consecutive it() cases can have multi-line bodies
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when direct multi-line it cases match @cases
 */
test("exits 0 when direct multi-line it cases match @cases", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-cases-"));
  try {
    writeFileSync(
      join(dir, "service.test.ts"),
      `/**
 * @reviewed-by (!HUMAN EDIT ONLY): Tom @ [1]
 */

/**
 * ${testSuiteTag}  service
 * @cases
 *   - [PASS] returns ok when valid
 *   - [FAIL] rejects when invalid
 */
it("returns ok when valid", () => {
  expect(true).toBe(true);
});
it("rejects when invalid", () => {
  expect(false).toBe(false);
});
`,
    );
    expect(runCheck(dir, ["service.test.ts"]).status).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  mixed case functions
 * @target      Validate that a suite only records consecutive cases with the first case function
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [FAIL] exits 1 when describe mode mixes it and test cases for one test suite
 */
test("exits 1 when describe mode mixes it and test cases for one test suite", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-cases-"));
  try {
    writeFileSync(
      join(dir, "service.test.ts"),
      `/**
 * @reviewed-by (!HUMAN EDIT ONLY): Tom @ [1]
 */

/**
 * ${testSuiteTag}  service
 * @cases
 *   - [PASS] returns ok when valid
 *   - [PASS] returns nope when invalid
 */
describe("service", () => {
  it("returns ok when valid", () => {});
  test("returns nope when invalid", () => {});
});
`,
    );
    expect(runCheck(dir, ["service.test.ts"]).status).toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
