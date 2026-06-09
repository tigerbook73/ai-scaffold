/**
 * Validates that documented @cases entries match it()/test() cases in selected files.
 *
 * Specifically, for each explicit .test/.spec file that contains @reviewed-by:
 * - find every @test-suite comment block;
 * - collect @cases entries written as "- [PASS|FAIL] <case name>";
 * - compare those case names with one of the supported code shapes:
 *   describe()/test.describe() followed by consecutive same-indent, same-function
 *   it()/test() calls, or direct consecutive same-indent, same-function it()/test()
 *   calls;
 * - fail when a documented @cases name has no matching it()/test(), or an it()/test()
 *   name has no matching @cases entry.
 *
 * This does not validate test implementation behavior, PASS/FAIL correctness, or
 * whether the describe() title matches @test-suite.
 *
 * Application: run from pre-commit with staged test file paths, or manually
 * with explicit files. It does not discover files by itself, and it ignores
 * files without an @reviewed-by field so untracked tests are not gated.
 */
import { readFileSync } from "fs";

const REVIEWED_BY_FIELD_RE = /@reviewed-by\b/;
const TEST_FILE_RE = /\.(test|spec)\./;

interface SuiteMismatch {
  suiteName: string;
  line: number;
  missingInCode: string[];
  missingInCases: string[];
}

interface FileReport {
  file: string;
  mismatches: SuiteMismatch[];
}

const State = {
  IDLE: "idle", // Outside any tracked suite, waiting for an @test-suite marker.
  IN_SUITE_COMMENT: "in-suite-comment", // Inside the @test-suite metadata block before @cases.
  COLLECTING_CASES: "collecting-cases", // Collecting documented @cases names until the comment ends.
  PENDING_STRUCTURE: "pending-structure", // After the comment, waiting for describe/test.describe/it/test.
  DESCRIBE_WAITING_CASE: "describe-waiting-case", // Inside a describe wrapper, waiting for the first deeper case.
  COLLECTING_CODE_CASES: "collecting-code-cases", // Collecting consecutive code cases locked to the first case's function name and indentation.
} as const;

type State = (typeof State)[keyof typeof State];

interface CodeCase {
  fn: "it" | "test";
  indent: number;
  name: string;
}

interface DescribeCall {
  indent: number;
}

class CheckTestCases {
  /** Run the checker for explicit test files only. */
  run(): void {
    const files = process.argv.slice(2).filter((f) => TEST_FILE_RE.test(f));

    if (files.length === 0) {
      process.exit(0);
    }

    const reports: FileReport[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(file, "utf-8");
        if (!REVIEWED_BY_FIELD_RE.test(content)) continue;
        const mismatches = this.checkFile(content);
        if (mismatches.length > 0) {
          reports.push({ file, mismatches });
        }
      } catch (e) {
        console.warn(`⚠️  Could not read ${file}: ${(e as Error).message}`);
      }
    }

    if (reports.length === 0) {
      console.log("✅  All @cases match it()/test() names.");
      process.exit(0);
    }

    console.error("\n❌  @cases / it()/test() mismatches found:\n");

    for (const { file, mismatches } of reports) {
      console.error(`  ${file}`);
      for (const { suiteName, line, missingInCode, missingInCases } of mismatches) {
        console.error(`    @test-suite "${suiteName}" (line ${line})`);
        for (const c of missingInCode) {
          console.error(`      [in @cases but no it()/test()]   ${c}`);
        }
        for (const it of missingInCases) {
          console.error(`      [has it()/test() but no @cases]  ${it}`);
        }
      }
    }

    console.error(
      "\nFix: keep @cases entries and it()/test() names in sync, or remove @cases if this suite is untracked.\n",
    );
    process.exit(1);
  }

  /**
   * Compare every @test-suite comment block with the following supported test code shape.
   *
   * The state machine keeps comment parsing and case-call parsing separate
   * so unrelated comments or code between suites do not leak case names. Code shape
   * detection is intentionally indentation-based instead of brace-based, so braces
   * inside strings, comments, or test names do not affect suite boundaries.
   */
  private checkFile(content: string): SuiteMismatch[] {
    const lines = content.split("\n");
    const mismatches: SuiteMismatch[] = [];

    let state: State = State.IDLE;
    let suiteName = "";
    let suiteCommentLine = 0;
    let pendingCases: string[] = [];
    let seenIts: string[] = [];
    let suiteIndent = 0;
    let caseIndent = 0;
    let caseFn: "it" | "test" | null = null;

    const finishSuite = () => {
      const mismatch = this.compareSuite(suiteName, suiteCommentLine, pendingCases, seenIts);
      if (mismatch) mismatches.push(mismatch);
      state = State.IDLE;
      suiteName = "";
      suiteCommentLine = 0;
      pendingCases = [];
      seenIts = [];
      suiteIndent = 0;
      caseIndent = 0;
      caseFn = null;
    };

    for (let i = 0; i < lines.length; ) {
      const raw = lines[i];
      const t = raw.trim();
      let advance = true;

      if (state !== State.IDLE && state !== State.IN_SUITE_COMMENT && t.includes("@test-suite")) {
        finishSuite();
        advance = false;
        continue;
      }

      switch (state) {
        // No active suite: only @test-suite can start a tracked block.
        case State.IDLE:
          if (t.includes("@test-suite")) {
            state = State.IN_SUITE_COMMENT;
            suiteCommentLine = i + 1;
            suiteName = (t.match(/@test-suite\s+(.+)/) ?? [])[1]?.trim() ?? "(unnamed)";
            pendingCases = [];
            seenIts = [];
            caseFn = null;
          }
          break;

        // Read suite metadata until @cases starts, or abandon suites with no @cases.
        case State.IN_SUITE_COMMENT:
          if (t.includes("@cases")) {
            state = State.COLLECTING_CASES;
          } else if (t === "*/") {
            state = State.IDLE;
          }
          break;

        // Collect "- [PASS|FAIL] name" rows. Other comment lines are metadata noise.
        case State.COLLECTING_CASES: {
          const m = t.match(/^\*\s+-\s+\[(?:PASS|FAIL)\]\s+(.+)$/);
          if (m) {
            pendingCases.push(m[1].trim());
          } else if (t === "*/") {
            state = State.PENDING_STRUCTURE;
          }
          break;
        }

        // The first real structure after @test-suite chooses describe mode or direct mode.
        case State.PENDING_STRUCTURE: {
          if (this.isSkippableLine(t)) break;

          const describeCall = this.parseDescribeCall(raw);
          if (describeCall) {
            suiteIndent = describeCall.indent;
            state = State.DESCRIBE_WAITING_CASE;
            break;
          }

          const codeCase = this.parseCodeCase(raw);
          if (codeCase) {
            caseIndent = codeCase.indent;
            caseFn = codeCase.fn;
            seenIts.push(codeCase.name);
            state = State.COLLECTING_CODE_CASES;
            break;
          }

          finishSuite();
          break;
        }

        // In describe mode, ignore wrapper/body noise until the first deeper it()/test().
        case State.DESCRIBE_WAITING_CASE: {
          if (this.isSkippableLine(t)) break;

          const codeCase = this.parseCodeCase(raw);
          if (codeCase && codeCase.indent > suiteIndent) {
            caseIndent = codeCase.indent;
            caseFn = codeCase.fn;
            seenIts.push(codeCase.name);
            state = State.COLLECTING_CODE_CASES;
            break;
          }

          if (this.indentOf(raw) <= suiteIndent) {
            finishSuite();
            advance = false;
          }
          break;
        }

        // Once the first case is seen, only same-indent, same-function cases belong here.
        case State.COLLECTING_CODE_CASES: {
          if (this.isSkippableLine(t)) break;

          const codeCase = this.parseCodeCase(raw);
          if (codeCase) {
            if (codeCase.indent === caseIndent && codeCase.fn === caseFn) {
              seenIts.push(codeCase.name);
              break;
            }

            if (codeCase.indent <= caseIndent) {
              finishSuite();
              advance = false;
            }
            break;
          }

          const describeCall = this.parseDescribeCall(raw);
          if (describeCall && describeCall.indent <= caseIndent) {
            finishSuite();
            advance = false;
            break;
          }

          if (this.indentOf(raw) <= caseIndent) {
            finishSuite();
            advance = false;
          }
          break;
        }
      }

      if (advance) i++;
    }

    if (
      state === State.PENDING_STRUCTURE ||
      state === State.DESCRIBE_WAITING_CASE ||
      state === State.COLLECTING_CODE_CASES
    ) {
      finishSuite();
    }

    return mismatches;
  }

  private indentOf(line: string): number {
    return line.match(/^\s*/)?.[0].length ?? 0;
  }

  private isSkippableLine(trimmed: string): boolean {
    return (
      trimmed === "" ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      trimmed === "*/" ||
      /^[});\],]+;?$/.test(trimmed)
    );
  }

  private parseDescribeCall(line: string): DescribeCall | null {
    if (!/^\s*(?:describe|test\.describe)\s*\(/.test(line)) return null;
    return { indent: this.indentOf(line) };
  }

  private parseCodeCase(line: string): CodeCase | null {
    const m = line.match(/^(\s*)(it|test)\s*\(\s*['"`](.*?)['"`]/);
    if (!m) return null;
    return { fn: m[2] as "it" | "test", indent: m[1].length, name: m[3].trim() };
  }

  /** Return a mismatch report when documented cases and code cases diverge. */
  private compareSuite(
    suiteName: string,
    line: number,
    pendingCases: string[],
    seenIts: string[],
  ): SuiteMismatch | null {
    const casesSet = new Set(pendingCases);
    const itsSet = new Set(seenIts);
    const missingInCode = pendingCases.filter((c) => !itsSet.has(c));
    const missingInCases = seenIts.filter((it) => !casesSet.has(it));

    return missingInCode.length > 0 || missingInCases.length > 0
      ? { suiteName, line, missingInCode, missingInCases }
      : null;
  }
}

new CheckTestCases().run();
