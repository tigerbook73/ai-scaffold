// Pre-commit check: blocks commits where staged test files lack a human @reviewed-by sign-off.
import { execFileSync, execSync } from "child_process";

const REVIEWED_BY_RE = /@reviewed-by\s+.+@\s+\[(\d+)\]/;

class TestReviewCheck {
  // Reads staged test files and validates @reviewed-by; exits with code 1 if any fail.
  run(): void {
    const changedFiles = execSync("git diff --cached --name-only")
      .toString()
      .split("\n")
      .filter((f) => /\.(test|spec)\./.test(f) && f.trim());

    if (changedFiles.length === 0) return;

    const failed: string[] = [];

    for (const file of changedFiles) {
      let current: string;
      try {
        current = execFileSync("git", ["show", `:${file}`]).toString();
      } catch {
        continue;
      }

      const currentMatch = current.match(REVIEWED_BY_RE);

      let prev: string | null = null;
      try {
        prev = execFileSync("git", ["show", `HEAD:${file}`]).toString();
      } catch {
        // file is new
      }

      if (prev === null) {
        if (!currentMatch) {
          failed.push(`  ${file}  (new file — @reviewed-by must have content)`);
        }
      } else {
        const prevMatch = prev.match(REVIEWED_BY_RE);
        const prevN = prevMatch ? parseInt(prevMatch[1]) : 0;
        const currentN = currentMatch ? parseInt(currentMatch[1]) : null;

        if (currentN === null || currentN <= prevN) {
          failed.push(`  ${file}  (previous: [${prevN}], current: ${currentN ?? "empty"})`);
        }
      }
    }

    if (failed.length > 0) {
      console.error("\n❌ The following test files have not been reviewed:");
      console.error(failed.join("\n"));
      console.error(
        "\nRequired format: @reviewed-by Tom Zhang @ [N]  (N must be greater than before)",
      );
      console.error("Example: @reviewed-by Tom Zhang @ [3]\n");
      process.exit(1);
    }
  }
}

new TestReviewCheck().run();
