import { mkdirSync, writeFileSync, readdirSync, unlinkSync, readFileSync, existsSync } from "fs";
import { join, resolve, dirname, basename } from "path";
import { homedir } from "os";

interface FileEntry {
  src: string;
  dst: string;
  description?: string;
}

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

    const settingFile = join(this.repoPath, "claude", "setting.json");
    if (!existsSync(settingFile)) {
      console.error("Error: claude/setting.json not found. Run pnpm build first.");
      process.exit(1);
    }

    const { files } = JSON.parse(readFileSync(settingFile, "utf-8")) as { files: FileEntry[] };

    const installed = new Set<string>();
    for (const { src, dst, description } of files) {
      const srcPath = join(this.repoPath, "skills", src);
      const dstPath = resolveInstallPath(dst, this.globalCmdsDir);
      mkdirSync(dirname(dstPath), { recursive: true });
      const content = readFileSync(srcPath, "utf-8");
      const output =
        description && dst.endsWith(".md")
          ? `---\ndescription: ${JSON.stringify(description)}\n---\n${content}`
          : content;
      writeFileSync(dstPath, output);
      installed.add(basename(dst));
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

function resolveInstallPath(dst: string, globalCmdsDir: string): string {
  if (dst.startsWith(".claude/commands/aisk/")) return join(globalCmdsDir, basename(dst));
  return join(homedir(), dst);
}

if (require.main === module) {
  new ClaudeSetup().run();
}
