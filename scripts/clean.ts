/**
 * Removes artifacts created by the local publish command.
 *
 * The repoPath guard prevents this repository from deleting another checkout's
 * ~/.aisk contents when multiple local skill repos have been registered.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

interface AisfConfig {
  repoPath: string;
  publishedAt: string;
}

interface CleanOptions {
  repoRoot?: string;
  aiskHome?: string;
  claudeSkillsDir?: string;
}

export class Clean {
  private readonly repoRoot: string;
  private readonly aiskHome: string;
  private readonly claudeSkillsDir: string;

  constructor({ repoRoot, aiskHome, claudeSkillsDir }: CleanOptions = {}) {
    this.repoRoot = repoRoot ?? resolve(__dirname, "..");
    this.aiskHome = aiskHome ?? join(homedir(), ".aisk");
    this.claudeSkillsDir = claudeSkillsDir ?? join(homedir(), ".claude", "skills");
  }

  /** Clean the local aisk home and global Claude skills that belong to this repo. */
  run(): void {
    const configPath = join(this.aiskHome, "config.json");
    if (!existsSync(configPath)) {
      console.log("Nothing to clean: ~/.aisk/config.json not found.");
      return;
    }

    const config = JSON.parse(readFileSync(configPath, "utf8")) as AisfConfig;
    if (config.repoPath !== this.repoRoot) {
      console.error("Error: config.json was published from a different repo.");
      console.error(`  Expected: ${this.repoRoot}`);
      console.error(`  Found:    ${config.repoPath}`);
      process.exit(1);
    }

    console.log("Cleaning ~/.aisk/ and ~/.claude/skills/aisk:* ...\n");

    mkdirSync(this.aiskHome, { recursive: true });
    for (const entry of readdirSync(this.aiskHome)) {
      rmSync(join(this.aiskHome, entry), { recursive: true, force: true });
      console.log(`  Removed: ~/.aisk/${entry}`);
    }

    if (existsSync(this.claudeSkillsDir)) {
      for (const entry of readdirSync(this.claudeSkillsDir)) {
        if (entry.startsWith("aisk:")) {
          rmSync(join(this.claudeSkillsDir, entry), { recursive: true, force: true });
          console.log(`  Removed: ~/.claude/skills/${entry}/`);
        }
      }
    }

    console.log("\nClean complete.");
  }
}

if (require.main === module) {
  new Clean().run();
}
