import { readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

class Builder {
  private repoRoot: string;

  constructor() {
    this.repoRoot = resolve(process.env.AISK_REPO_ROOT ?? join(__dirname, ".."));
  }

  private syncClaudeSkillRules(): void {
    const sourcePath = join(this.repoRoot, "skills", "skill-format.md");
    const rulesPath = join(this.repoRoot, ".claude", "rules", "skill-rules.md");

    const startMarker = "<!-- EXTRACT:skill-format:start -->";
    const endMarker = "<!-- EXTRACT:skill-format:end -->";

    const sourceContent = readFileSync(sourcePath, "utf-8");
    const startIdx = sourceContent.indexOf(startMarker);
    const endIdx = sourceContent.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
      console.warn(
        "Warning: EXTRACT markers not found in skills/skill-format.md — skill-rules.md not updated",
      );
      return;
    }

    const formatContent = sourceContent.slice(startIdx + startMarker.length, endIdx).trim();

    const rulesContent = readFileSync(rulesPath, "utf-8");
    const rStartIdx = rulesContent.indexOf(startMarker);
    const rEndIdx = rulesContent.indexOf(endMarker);

    if (rStartIdx === -1 || rEndIdx === -1) {
      console.warn(
        "Warning: EXTRACT markers not found in .claude/rules/skill-rules.md — not updated",
      );
      return;
    }

    const before = rulesContent.slice(0, rStartIdx + startMarker.length);
    const after = rulesContent.slice(rEndIdx);
    writeFileSync(rulesPath, `${before}\n\n${formatContent}\n\n${after}`);
    console.log(".claude/rules/skill-rules.md synchronized from skills/skill-format.md");
  }

  run(): void {
    this.syncClaudeSkillRules();
  }
}

new Builder().run();
