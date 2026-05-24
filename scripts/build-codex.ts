import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";

import { readSkillManifest, validateSkillManifest } from "./skill-manifest";

interface CodexManifest {
  version: string;
  files: CodexManifestEntry[];
}

interface CodexManifestEntry {
  src: string;
  name: string;
  dst: string;
  description: string;
  shortDescription: string;
  category: string;
}

export class CodexBuilder {
  private repoRoot: string;
  private settingFile: string;

  constructor() {
    this.repoRoot = resolve(process.env.AISK_REPO_ROOT ?? join(__dirname, ".."));
    this.settingFile = join(this.repoRoot, "codex", "setting.json");
  }

  private inferCategory(src: string): string {
    return src.split("/")[0];
  }

  run(): void {
    const manifest = readSkillManifest(this.repoRoot);
    const errors = validateSkillManifest(manifest);

    if (errors.length > 0) {
      for (const error of errors) console.error(error);
      process.exit(1);
    }

    const files: CodexManifestEntry[] = Object.entries(manifest.skills)
      .filter(([, entry]) => entry.targets.codex)
      .map(([src, entry]) => {
        if (!entry.codex) {
          throw new Error(`${src}: codex metadata is required`);
        }

        const srcPath = join(this.repoRoot, "skills", src);
        if (!existsSync(srcPath)) {
          throw new Error(`${src}: source file does not exist`);
        }

        return {
          src,
          name: entry.codex.name,
          dst: `.codex/skills/${entry.codex.name}/SKILL.md`,
          description: entry.codex.description,
          shortDescription: entry.codex.shortDescription,
          category: this.inferCategory(src),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const output: CodexManifest = { version: "1.0", files };

    mkdirSync(dirname(this.settingFile), { recursive: true });
    writeFileSync(this.settingFile, JSON.stringify(output, null, 2) + "\n");
    console.log(`codex/setting.json updated: ${files.length} files`);
  }
}

if (require.main === module) {
  new CodexBuilder().run();
}
