#!/usr/bin/env tsx
/**
 * check-test-cases.ts
 *
 * CI lint tool — validates that every @cases entry in a @test-suite comment
 * has a matching it(), and every it() inside that describe block is listed
 * in @cases.
 *
 * Usage:
 *   tsx scripts/check-test-cases.ts              # scan all test files
 *   tsx scripts/check-test-cases.ts a.test.ts    # check specific files
 *
 * Exit code 1 if any mismatch is found.
 *
 * Limitation: brace counting is text-based (not AST), so { } inside strings
 * or template literals may cause false positives in unusual code patterns.
 * This is acceptable for a lint tool — real-world test files rarely hit this.
 */

import { readFileSync } from "fs";
import { execFileSync } from "child_process";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuiteMismatch {
  suiteName: string;
  line: number;
  /** Listed in @cases but no matching it() */
  missingInCode: string[];
  /** Has an it() but not listed in @cases */
  missingInCases: string[];
}

interface FileReport {
  file: string;
  mismatches: SuiteMismatch[];
}

// ─── Parser ───────────────────────────────────────────────────────────────────

type State =
  | "idle"
  | "in-suite-comment" // inside /** ... @test-suite ... */
  | "collecting-cases" // past @cases line, gathering entries
  | "pending-describe" // comment closed, waiting for describe(
  | "in-describe"; // inside the describe block

function checkFile(filePath: string): SuiteMismatch[] {
  const lines = readFileSync(filePath, "utf-8").split("\n");
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

    // Track brace depth only while actively looking for / inside a describe.
    // Braces in idle code (imports, top-level consts) are intentionally ignored
    // since all describes should be at the same nesting level within a file.
    if (state === "pending-describe" || state === "in-describe") {
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
          // Comment closed without @cases — not a tracked suite
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
          // braceDepth already updated at top of loop for this line
          describeEntryDepth = braceDepth;
          state = "in-describe";
        }
        // Blank lines and comments are fine to skip.
        // If we hit a non-trivial non-describe line, give up on this suite
        // and report all @cases as unmatched.
        else if (t !== "" && !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*")) {
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
        break;

      case "in-describe": {
        // Collect direct it() names (also catches nested ones — acceptable trade-off)
        const itMatch = t.match(/^it\s*\(\s*['"`](.*?)['"`]/);
        if (itMatch) {
          seenIts.push(itMatch[1].trim());
        }

        // Describe block closed when depth returns below entry depth
        if (braceDepth < describeEntryDepth) {
          const casesSet = new Set(pendingCases);
          const itsSet = new Set(seenIts);
          const missingInCode = pendingCases.filter((c) => !itsSet.has(c));
          const missingInCases = seenIts.filter((it) => !casesSet.has(it));

          if (missingInCode.length > 0 || missingInCases.length > 0) {
            mismatches.push({
              suiteName,
              line: suiteCommentLine,
              missingInCode,
              missingInCases,
            });
          }

          state = "idle";
        }
        break;
      }
    }
  }

  return mismatches;
}

// ─── File discovery ───────────────────────────────────────────────────────────

function findTestFiles(): string[] {
  const extensions = ["test.ts", "spec.ts", "test.js", "spec.js"];
  const results: string[] = [];
  for (const ext of extensions) {
    try {
      const found = execFileSync("find", [
        ".",
        "-not",
        "-path",
        "*/node_modules/*",
        "-name",
        `*.${ext}`,
      ])
        .toString()
        .split("\n")
        .filter(Boolean);
      results.push(...found);
    } catch {
      // extension not found — fine
    }
  }
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const inputFiles = process.argv.slice(2);
  const files = inputFiles.length > 0 ? inputFiles : findTestFiles();

  if (files.length === 0) {
    console.log("No test files found.");
    process.exit(0);
  }

  const reports: FileReport[] = [];

  for (const file of files) {
    try {
      const mismatches = checkFile(file);
      if (mismatches.length > 0) {
        reports.push({ file, mismatches });
      }
    } catch (e) {
      console.warn(`⚠️  Could not read ${file}: ${(e as Error).message}`);
    }
  }

  if (reports.length === 0) {
    console.log("✅  All @cases match it() names.");
    process.exit(0);
  }

  console.error("\n❌  @cases / it() mismatches found:\n");

  for (const { file, mismatches } of reports) {
    console.error(`  ${file}`);
    for (const { suiteName, line, missingInCode, missingInCases } of mismatches) {
      console.error(`    @test-suite "${suiteName}" (line ${line})`);
      for (const c of missingInCode) {
        console.error(`      [in @cases but no it()]   ${c}`);
      }
      for (const it of missingInCases) {
        console.error(`      [has it() but no @cases]  ${it}`);
      }
    }
  }

  console.error(
    "\nFix: keep @cases entries and it() names in sync, or remove @cases if this suite is untracked.\n",
  );
  process.exit(1);
}

main();
