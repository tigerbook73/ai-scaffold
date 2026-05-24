import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, basename, resolve } from "path";

interface FileEntry {
  src: string;
  dst: string;
  description: string;
  category: string;
}

class Builder {
  private repoRoot: string;
  private skillsDir: string;
  private settingFile: string;

  constructor() {
    this.repoRoot = resolve(process.env.AISK_REPO_ROOT ?? join(__dirname, ".."));
    this.skillsDir = join(this.repoRoot, "skills");
    this.settingFile = join(this.repoRoot, "claude", "setting.json");
  }

  private getDescription(filePath: string): string {
    const lines = readFileSync(filePath, "utf-8").split("\n");
    let pastH1 = false;
    for (const line of lines) {
      if (!pastH1) {
        if (/^#\s+/.test(line)) pastH1 = true;
        continue;
      }
      const trimmed = line.trim();
      if (trimmed) return trimmed;
    }
    return basename(filePath, ".md");
  }

  private inferCategory(relPath: string): string {
    return relPath.split("/")[0];
  }

  private inferDst(relPath: string): string {
    if (relPath.split("/").includes("resource")) {
      return `.ai-skills/${relPath}`;
    }
    const name = basename(relPath);
    const cleanName = name.startsWith("SK-") ? name.slice(3) : name;
    return `.claude/commands/aisk/${cleanName}`;
  }

  private generateSkillFormat(): void {
    const sourcePath = join(this.repoRoot, "docs", "SKILL-SOURCE-FORMAT.md");
    const targetPath = join(this.skillsDir, "create-skill", "resource", "skill-format.md");

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

  private scan(dir: string, base = ""): string[] {
    const result: string[] = [];
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      const rel = base ? `${base}/${entry}` : entry;
      if (statSync(full).isDirectory()) {
        result.push(...this.scan(full, rel));
      } else if (entry.endsWith(".md") && entry !== "README.md") {
        result.push(rel);
      }
    }
    return result;
  }

  run(): void {
    const srcs = this.scan(this.skillsDir);

    const files: FileEntry[] = srcs
      .filter((src) => !src.split("/").includes("resource"))
      .map((src) => ({
        src,
        dst: this.inferDst(src),
        description: this.getDescription(join(this.skillsDir, src)),
        category: this.inferCategory(src),
      }));

    writeFileSync(this.settingFile, JSON.stringify({ version: "1.0", files }, null, 2) + "\n");
    console.log(`claude/setting.json updated: ${files.length} files`);
    this.generateSkillFormat();
  }
}

new Builder().run();
