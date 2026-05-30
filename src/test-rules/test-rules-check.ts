// Pre-commit check: blocks commits where staged test files lack a human @reviewed-by sign-off.
import { execFileSync, execSync } from "child_process";

const REVIEWED_BY_RE = /@reviewed-by\s+.+@\s+\[(\d+)\]/;

class TestRulesCheck {
  // Reads staged test files and validates @reviewed-by; exits with code 1 if any fail.
  run(): void {
    const renames = new Map<string, string>();
    for (const line of execSync("git diff --cached --name-status").toString().split("\n")) {
      const m = line.match(/^R\d*\t(.+)\t(.+)/);
      if (m) renames.set(m[2], m[1]); // new name → old name
    }

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
        const oldName = renames.get(file) ?? file;
        prev = execFileSync("git", ["show", `HEAD:${oldName}`]).toString();
      } catch {
        // file is new (no previous version under any name)
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

if (require.main === module) {
  new TestRulesCheck().run();
}
