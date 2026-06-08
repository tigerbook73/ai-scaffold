import { execFileSync } from "child_process";

const REVIEWED_BY_RE = /@reviewed-by\s+.+@\s+\[(\d+)\]/;

class CheckTestReview {
  run(): void {
    const renames = new Map<string, string>();
    for (const line of execFileSync("git", ["diff", "--cached", "--name-status"])
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
        // new file or renamed with no prior history
      }

      if (prev === null) {
        if (!currentMatch) {
          failed.push(`  ${file}  (new file — @reviewed-by must be filled)`);
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
        "\nRequired format:  @reviewed-by Tom Zhang @ [N]  (N starts at 1, must be greater than before)",
      );
      console.error("Example:          @reviewed-by Tom Zhang @ [3]\n");
      process.exit(1);
    }
  }
}

new CheckTestReview().run();
