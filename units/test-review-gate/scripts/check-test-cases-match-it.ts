/**
 * Validates that documented @cases entries match it()/test() cases in selected files.
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

type State = "idle" | "in-suite-comment" | "collecting-cases" | "pending-describe" | "in-describe";

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
   * Compare every @test-suite comment block with the following describe() body or test call.
   *
   * The state machine keeps comment parsing and case-call parsing separate
   * so unrelated comments or code between suites do not leak case names.
   */
  private checkFile(content: string): SuiteMismatch[] {
    const lines = content.split("\n");
    const mismatches: SuiteMismatch[] = [];

    let state: State = "idle";
    let suiteName = "";
    let suiteCommentLine = 0;
    let pendingCases: string[] = [];
    let seenIts: string[] = [];
    let braceDepth = 0;
    let describeEntryDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const t = raw.trim();

      if (state === "pending-describe" || state === "in-describe") {
        // Brace depth is tracked only while waiting for or inside the target describe().
        for (const ch of raw) {
          if (ch === "{") braceDepth++;
          else if (ch === "}") braceDepth--;
        }
      }

      switch (state) {
        case "idle":
          if (t.includes("@test-suite")) {
            state = "in-suite-comment";
            suiteCommentLine = i + 1;
            suiteName = (t.match(/@test-suite\s+(.+)/) ?? [])[1]?.trim() ?? "(unnamed)";
            pendingCases = [];
            seenIts = [];
            braceDepth = 0;
          }
          break;

        case "in-suite-comment":
          if (t.includes("@cases")) {
            state = "collecting-cases";
          } else if (t === "*/") {
            state = "idle";
          }
          break;

        case "collecting-cases": {
          const m = t.match(/^\*\s+-\s+\[(?:PASS|FAIL)\]\s+(.+)$/);
          if (m) {
            pendingCases.push(m[1].trim());
          } else if (t === "*/") {
            state = "pending-describe";
          }
          break;
        }

        case "pending-describe":
          if (/^\s*describe\s*[\s.(]/.test(raw)) {
            describeEntryDepth = braceDepth;
            state = "in-describe";
          } else {
            const directCaseMatch = t.match(/^(?:it|test)\s*\(\s*['"`](.*?)['"`]/);
            if (directCaseMatch) {
              const mismatch = this.compareSuite(suiteName, suiteCommentLine, pendingCases, [
                directCaseMatch[1].trim(),
              ]);
              if (mismatch) mismatches.push(mismatch);
              state = "idle";
            } else if (
              t !== "" &&
              !t.startsWith("//") &&
              !t.startsWith("*") &&
              !t.startsWith("/*")
            ) {
              // A real code line before a case container means documented cases have no target.
              if (pendingCases.length > 0) {
                mismatches.push({
                  suiteName,
                  line: suiteCommentLine,
                  missingInCode: [...pendingCases],
                  missingInCases: [],
                });
              }
              state = "idle";
            }
          }
          break;

        case "in-describe": {
          const itMatch = t.match(/^(?:it|test)\s*\(\s*['"`](.*?)['"`]/);
          if (itMatch) {
            seenIts.push(itMatch[1].trim());
          }

          if (braceDepth < describeEntryDepth) {
            const mismatch = this.compareSuite(suiteName, suiteCommentLine, pendingCases, seenIts);
            if (mismatch) mismatches.push(mismatch);

            state = "idle";
          }
          break;
        }
      }
    }

    return mismatches;
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
