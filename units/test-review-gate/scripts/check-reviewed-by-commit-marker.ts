/**
 * Validates human review markers for staged test changes during pre-commit.
 *
 * Application: install this script as a Git pre-commit hook. It compares staged
 * test file content against HEAD, ignores files without an @reviewed-by field,
 * and requires declared review markers to have a valid, incrementing counter.
 */
import { execFileSync } from "child_process";

const REVIEWED_BY_FIELD_RE = /@reviewed-by\b/;
const REVIEWED_BY_RE = /@reviewed-by\s+.+@\s+\[(\d+)\]/;

class CheckReviewedByCommitMarker {
  /** Check staged test/spec files and fail when a declared @reviewed-by marker is stale. */
  run(): void {
    const renames = new Map<string, string>();
    // Keep rename history so the previous marker is read from the old path when needed.
    for (const line of execFileSync("git", ["diff", "--cached", "--name-status", "-M"])
      .toString()
      .split("\n")) {
      const m = line.match(/^R\d*\t(.+)\t(.+)/);
      if (m) renames.set(m[2], m[1]);
    }

    const stagedFiles = execFileSync("git", ["diff", "--cached", "--name-only"])
      .toString()
      .split("\n")
      .filter((f) => f.trim() !== "" && /\.(test|spec)\./.test(f));

    if (stagedFiles.length === 0) return;

    const failed: string[] = [];

    for (const file of stagedFiles) {
      let current: string;
      try {
        // Read from the index, not disk, to match exactly what pre-commit will include.
        current = execFileSync("git", ["show", `:${file}`]).toString();
      } catch {
        continue;
      }

      if (!REVIEWED_BY_FIELD_RE.test(current)) continue;

      const currentMatch = current.match(REVIEWED_BY_RE);

      let prev: string | null = null;
      try {
        const oldName = renames.get(file) ?? file;
        // HEAD may not contain new files; those are handled as first-review cases below.
        prev = execFileSync("git", ["show", `HEAD:${oldName}`]).toString();
      } catch {
        // new file or renamed with no prior history
      }

      if (prev === null) {
        if (!currentMatch) {
          failed.push(`  ${file}  (new file declares @reviewed-by but has no valid marker)`);
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
      console.error("\n❌  The following test files have not been reviewed:");
      console.error(failed.join("\n"));
      console.error(
        "\nRequired format:  @reviewed-by (!HUMAN EDIT ONLY): Tom Zhang @ [N]  (N starts at 1, must be greater than before)",
      );
      console.error("Example:          @reviewed-by (!HUMAN EDIT ONLY): Tom Zhang @ [3]\n");
      process.exit(1);
    }
  }
}

new CheckReviewedByCommitMarker().run();
