import { existsSync, readFileSync, readdirSync, rmSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

interface AisfConfig {
  repoPath: string;
  publishedAt: string;
}

class Clean {
  private readonly repoRoot: string;
  private readonly aisfHome: string;
  private readonly claudeSkillsDir: string;

  constructor() {
    this.repoRoot = resolve(__dirname, "..");
    this.aisfHome = join(homedir(), ".aisf");
    this.claudeSkillsDir = join(homedir(), ".claude", "skills");
  }

  run(): void {
    const configPath = join(this.aisfHome, "config.json");
    if (!existsSync(configPath)) {
      console.log("Nothing to clean: ~/.aisf/config.json not found.");
      return;
    }

    const config = JSON.parse(readFileSync(configPath, "utf8")) as AisfConfig;
    if (config.repoPath !== this.repoRoot) {
      console.error("Error: config.json was published from a different repo.");
      console.error(`  Expected: ${this.repoRoot}`);
      console.error(`  Found:    ${config.repoPath}`);
      process.exit(1);
    }

    console.log("Cleaning ~/.aisf/ and ~/.claude/skills/aisf:* ...\n");

    for (const subdir of ["units", "global"]) {
      const target = join(this.aisfHome, subdir);
      if (existsSync(target)) {
        rmSync(target, { recursive: true, force: true });
        console.log(`  Removed: ~/.aisf/${subdir}/`);
      }
    }
    rmSync(configPath, { force: true });
    console.log("  Removed: ~/.aisf/config.json");

    if (existsSync(this.claudeSkillsDir)) {
      for (const entry of readdirSync(this.claudeSkillsDir)) {
        if (entry.startsWith("aisf:")) {
          rmSync(join(this.claudeSkillsDir, entry), { recursive: true, force: true });
          console.log(`  Removed: ~/.claude/skills/${entry}/`);
        }
      }
    }

    console.log("\nClean complete.");
  }
}

new Clean().run();
