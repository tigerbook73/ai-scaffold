import { mkdirSync, writeFileSync, readdirSync, unlinkSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

import { scanSkills, stripFrontmatter } from "./scan-skills";

interface ClaudeSetupOptions {
  repoPath?: string;
  claudeHome?: string;
}

function resolveHomePath(envName: string, fallbackPath: string): string {
  return process.env[envName] ? resolve(process.env[envName]) : fallbackPath;
}

export class ClaudeSetup {
  private repoPath: string;
  private globalCmdsDir: string;

  constructor(options: ClaudeSetupOptions = {}) {
    this.repoPath = resolve(
      options.repoPath ?? process.env.AISK_REPO_ROOT ?? join(__dirname, ".."),
    );

    const claudeHome = resolveHomePath("CLAUDE_HOME", join(homedir(), ".claude"));
    this.globalCmdsDir = join(resolve(options.claudeHome ?? claudeHome), "commands", "aisk");
  }

  run(): void {
    mkdirSync(this.globalCmdsDir, { recursive: true });

    const entries = scanSkills(this.repoPath).filter((e) => e.targets.claude);

    const installed = new Set<string>();
    for (const entry of entries) {
      const srcPath = join(this.repoPath, "skills", entry.src);
      const dstName = `${entry.name}.md`;
      const dstPath = join(this.globalCmdsDir, dstName);
      const content = stripFrontmatter(readFileSync(srcPath, "utf-8"));
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
