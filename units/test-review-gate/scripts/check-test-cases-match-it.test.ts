/**
 * @test-file   check-test-cases-match-it
 * @description Verifies that explicit file checks compare @cases entries with supported describe/test.describe suites only when @reviewed-by is declared
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [4]
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const scriptPath = resolve("units/test-review-gate/scripts/check-test-cases-match-it.ts");
const testSuiteTag = `@test-${"suite"}`;

function runCheck(cwd: string, files: string[] = []) {
  return spawnSync("bun", [scriptPath, ...files], { cwd });
}

/**
 * @test-suite  no explicit files
 * @target      Validate that the check does not discover test files by itself
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when no file arguments are passed
 */
describe("no explicit files", () => {
  test("exits 0 when no file arguments are passed", () => {
    const dir = mkdtempSync(join(tmpdir(), "aisk-cases-"));
    try {
      writeFileSync(join(dir, "service.test.ts"), "not valid test metadata");
      expect(runCheck(dir).status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  file without reviewed-by
 * @target      Validate that files without @reviewed-by are ignored even if @cases mismatch
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when a mismatched test file has no @reviewed-by field
 */
describe("file without reviewed-by", () => {
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
});

/**
 * @test-suite  matching cases and it names
 * @target      Validate that matching @cases and it() names pass when @reviewed-by is declared
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when @cases entries match it names
 */
describe("matching cases and it names", () => {
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
});

/**
 * @test-suite  nested supported suite
 * @target      Validate that supported suites can be nested inside an outer describe
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when a matching suite is nested inside an outer describe
 */
describe("nested supported suite", () => {
  test("exits 0 when a matching suite is nested inside an outer describe", () => {
    const dir = mkdtempSync(join(tmpdir(), "aisk-cases-"));
    try {
      writeFileSync(
        join(dir, "service.test.ts"),
        `/**
 * @reviewed-by (!HUMAN EDIT ONLY): Tom @ [1]
 */

describe("outer", () => {
  /**
   * ${testSuiteTag}  service
   * @cases
   *   - [PASS] returns ok when valid
   */
  describe("service", () => {
    it("returns ok when valid", () => {});
  });
});
`,
      );
      expect(runCheck(dir, ["service.test.ts"]).status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  mismatched cases and it names
 * @target      Validate that mismatched @cases and it() names fail when @reviewed-by is declared
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [FAIL] exits 1 when @cases entries do not match it names
 */
describe("mismatched cases and it names", () => {
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
});

/**
 * @test-suite  test.describe with consecutive test cases
 * @target      Validate that Playwright-style test.describe blocks are checked by indentation and test() names
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when test.describe contains matching consecutive test cases
 */
describe("test.describe with consecutive test cases", () => {
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
});

/**
 * @test-suite  brace characters in test names
 * @target      Validate that braces in names or bodies do not affect suite boundaries
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when case names contain brace characters
 */
describe("brace characters in test names", () => {
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
});

/**
 * @test-suite  quote characters in test names
 * @target      Validate that quote characters inside test names do not terminate parsing early
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when double-quoted test names contain single quotes
 */
describe("quote characters in test names", () => {
  test("exits 0 when double-quoted test names contain single quotes", () => {
    const dir = mkdtempSync(join(tmpdir(), "aisk-cases-"));
    try {
      writeFileSync(
        join(dir, "service.test.ts"),
        `/**
 * @reviewed-by (!HUMAN EDIT ONLY): Tom @ [1]
 */

/**
 * ${testSuiteTag}  Out of Stock
 * @target      Validate stock messaging
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] shows 'Out of stock' when the matched variant is unavailable
 *   - [PASS] does not show 'Out of stock' when the matched variant is available
 */
describe("Out of Stock", () => {
  it("shows 'Out of stock' when the matched variant is unavailable", () => {
    expect(true).toBe(true);
  });

  it("does not show 'Out of stock' when the matched variant is available", () => {
    expect(false).toBe(false);
  });
});
`,
      );
      expect(runCheck(dir, ["service.test.ts"]).status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  multi-line fixture parameters
 * @target      Validate that multi-line test callback parameters do not end suite parsing early
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when a test callback parameter list spans multiple lines
 */
describe("multi-line fixture parameters", () => {
  test("exits 0 when a test callback parameter list spans multiple lines", () => {
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
 *   - [PASS] expands menu when user is signed in
 *   - [PASS] closes menu when Escape is pressed
 */
describe("service", () => {
  it("expands menu when user is signed in", async ({
    page,
    context,
    baseURL,
  }) => {
    expect(page).toBeTruthy();
    expect(context).toBeTruthy();
    expect(baseURL).toBeTruthy();
  });

  it("closes menu when Escape is pressed", async ({ page }) => {
    expect(page).toBeTruthy();
  });
});
`,
      );
      expect(runCheck(dir, ["service.test.ts"]).status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  direct cases ignored
 * @target      Validate that direct consecutive it() cases are ignored because they are not a supported suite structure
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when direct it cases do not match @cases
 */
describe("direct cases ignored", () => {
  test("exits 0 when direct it cases do not match @cases", () => {
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
it("returns nope when invalid", () => {
  expect(true).toBe(true);
});
it("accepts invalid input", () => {
  expect(false).toBe(false);
});
`,
      );
      expect(runCheck(dir, ["service.test.ts"]).status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  generated cases ignored
 * @target      Validate that generated or dynamic tests are ignored instead of being compared with @cases
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [PASS] exits 0 when a suite uses generated or dynamic test cases
 */
describe("generated cases ignored", () => {
  test("exits 0 when a suite uses generated or dynamic test cases", () => {
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
  const cases = ["valid", "invalid"];

  for (const name of cases) {
    it(\`returns dynamic result when \${name}\`, () => {});
  }
});

/**
 * ${testSuiteTag}  browser
 * @cases
 *   - [PASS] shows dashboard when user signs in
 */
test.describe("browser", () => {
  test.each(["empty", "invalid"])("shows error when password is %s", async () => {});
});
`,
      );
      expect(runCheck(dir, ["service.test.ts"]).status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  mixed case functions
 * @target      Validate that a suite only records consecutive cases with the first case function
 * @strategy    Integration - uses isolated temp directory
 * @cases
 *   - [FAIL] exits 1 when describe mode mixes it and test cases for one test suite
 */
describe("mixed case functions", () => {
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
});
