import { readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

class Builder {
  private repoRoot: string;

  constructor() {
    this.repoRoot = resolve(process.env.AISK_REPO_ROOT ?? join(__dirname, ".."));
  }

  private generateSkillFormat(): void {
    const sourcePath = join(this.repoRoot, "docs", "SKILL-SOURCE-FORMAT.md");
    const targetPath = join(this.repoRoot, "skills", "create-skill", "resource", "skill-format.md");

    const content = readFileSync(sourcePath, "utf-8");
    const startMarker = "<!-- EXTRACT:skill-format:start -->";
    const endMarker = "<!-- EXTRACT:skill-format:end -->";
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
      console.warn(
        "Warning: EXTRACT markers not found in docs/SKILL-SOURCE-FORMAT.md — skill-format.md not updated",
      );
      return;
    }

    const formatContent = content.slice(startIdx + startMarker.length, endIdx).trim();
    const generated =
      `<!-- AUTO-GENERATED — Do not edit manually.\n` +
      `     Source: docs/SKILL-SOURCE-FORMAT.md\n` +
      `     To regenerate: pnpm build -->\n\n` +
      `# Skill Format Specification\n\n` +
      formatContent +
      "\n";

    writeFileSync(targetPath, generated);
    console.log("skills/create-skill/resource/skill-format.md regenerated");
    this.syncClaudeSkillRules(formatContent, startMarker, endMarker);
  }

  private syncClaudeSkillRules(
    formatContent: string,
    startMarker: string,
    endMarker: string,
  ): void {
    const rulesPath = join(this.repoRoot, ".claude", "rules", "skill-rules.md");
    const content = readFileSync(rulesPath, "utf-8");
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
      console.warn(
        "Warning: EXTRACT markers not found in .claude/rules/skill-rules.md — Claude skill rules not updated",
      );
      return;
    }

    const before = content.slice(0, startIdx + startMarker.length);
    const after = content.slice(endIdx);
    writeFileSync(rulesPath, `${before}\n\n${formatContent}\n\n${after}`);
    console.log(".claude/rules/skill-rules.md synchronized");
  }

  run(): void {
    this.generateSkillFormat();
  }
}

new Builder().run();
