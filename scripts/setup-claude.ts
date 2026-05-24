import { mkdirSync, writeFileSync, readdirSync, unlinkSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

import { scanSkills } from "./scan-skills";

interface ClaudeSetupOptions {
  repoPath?: string;
  aiSkillsHome?: string;
  claudeHome?: string;
}

function resolveHomePath(envName: string, fallbackPath: string): string {
  return process.env[envName] ? resolve(process.env[envName]) : fallbackPath;
}

export class ClaudeSetup {
  private repoPath: string;
  private configDir: string;
  private configFile: string;
  private globalCmdsDir: string;

  constructor(options: ClaudeSetupOptions = {}) {
    this.repoPath = resolve(
      options.repoPath ?? process.env.AISK_REPO_ROOT ?? join(__dirname, ".."),
    );

    const aiSkillsHome = resolveHomePath("AI_SKILLS_HOME", join(homedir(), ".ai-skills"));
    const claudeHome = resolveHomePath("CLAUDE_HOME", join(homedir(), ".claude"));

    this.configDir = resolve(options.aiSkillsHome ?? aiSkillsHome);
    this.configFile = join(this.configDir, "config.json");
    this.globalCmdsDir = join(resolve(options.claudeHome ?? claudeHome), "commands", "aisk");
  }

  run(): void {
    mkdirSync(this.configDir, { recursive: true });
    mkdirSync(this.globalCmdsDir, { recursive: true });
    writeFileSync(this.configFile, JSON.stringify({ repo: this.repoPath }, null, 2) + "\n");

    const entries = scanSkills(this.repoPath).filter((e) => e.targets.claude);

    const installed = new Set<string>();
    for (const entry of entries) {
      const srcPath = join(this.repoPath, "skills", entry.src);
      const dstName = `${entry.name}.md`;
      const dstPath = join(this.globalCmdsDir, dstName);
      const content = readFileSync(srcPath, "utf-8");
      const output = `---\ndescription: ${JSON.stringify(entry.description)}\n---\n${content}`;
      writeFileSync(dstPath, output);
      installed.add(dstName);
    }

    for (const f of readdirSync(this.globalCmdsDir)) {
      if (f.endsWith(".md") && !installed.has(f)) {
        unlinkSync(join(this.globalCmdsDir, f));
        console.log(`  Removed stale: ${join(this.globalCmdsDir, f)}`);
      }
    }

    console.log("Claude initialization complete:");
    console.log(`  Config: ${this.configFile}`);
    console.log(`  Repository: ${this.repoPath}`);
    console.log(`  Installed ${installed.size} global skill(s):`);
    for (const name of [...installed].sort()) {
      console.log(`    ${join(this.globalCmdsDir, name)}`);
    }
  }
}

if (require.main === module) {
  new ClaudeSetup().run();
}
