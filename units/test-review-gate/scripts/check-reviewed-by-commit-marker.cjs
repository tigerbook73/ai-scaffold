"use strict";

// units/test-review-gate/scripts/check-reviewed-by-commit-marker.ts
var import_child_process = require("child_process");
var REVIEWED_BY_FIELD_RE = /@reviewed-by\b/;
var REVIEWED_BY_RE = /@reviewed-by\s+.+@\s+\[(\d+)\]/;
var CheckReviewedByCommitMarker = class {
  /** Check staged test/spec files and fail when a declared @reviewed-by marker is stale. */
  run() {
    const renames = /* @__PURE__ */ new Map();
    for (const line of (0, import_child_process.execFileSync)("git", ["diff", "--cached", "--name-status", "-M"]).toString().split("\n")) {
      const m = line.match(/^R\d*\t(.+)\t(.+)/);
      if (m) renames.set(m[2], m[1]);
    }
    const stagedFiles = (0, import_child_process.execFileSync)("git", ["diff", "--cached", "--name-only"]).toString().split("\n").filter((f) => f.trim() !== "" && /\.(test|spec)\./.test(f));
    if (stagedFiles.length === 0) return;
    const failed = [];
    for (const file of stagedFiles) {
      let current;
      try {
        current = (0, import_child_process.execFileSync)("git", ["show", `:${file}`]).toString();
      } catch {
        continue;
      }
      if (!REVIEWED_BY_FIELD_RE.test(current)) continue;
      const currentMatch = current.match(REVIEWED_BY_RE);
      let prev = null;
      try {
        const oldName = renames.get(file) ?? file;
        prev = (0, import_child_process.execFileSync)("git", ["show", `HEAD:${oldName}`]).toString();
      } catch {
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
      console.error("\n\u274C  The following test files have not been reviewed:");
      console.error(failed.join("\n"));
      console.error(
        "\nRequired format:  @reviewed-by (!HUMAN EDIT ONLY): Tom Zhang @ [N]  (N starts at 1, must be greater than before)"
      );
      console.error("Example:          @reviewed-by (!HUMAN EDIT ONLY): Tom Zhang @ [3]\n");
      process.exit(1);
    }
  }
};
new CheckReviewedByCommitMarker().run();
