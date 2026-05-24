import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { homedir } from "os";

interface CodexManifest {
  files: CodexManifestEntry[];
}

interface CodexManifestEntry {
  src: string;
  name: string;
  dst: string;
  description: string;
  shortDescription: string;
}

interface CodexSetupOptions {
  repoPath?: string;
  aiSkillsHome?: string;
  codexHome?: string;
}

function resolveHomePath(envName: string, fallbackPath: string): string {
  return process.env[envName] ? resolve(process.env[envName]) : fallbackPath;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

export function transformCodexSkill(source: string, entry: CodexManifestEntry): string {
  const body = source
    .split("\n")
    .filter((line) => !/^\*\*Usage\*\*:\s*`\/aisk\//.test(line.trim()))
    .map((line) => line.replace(/\/aisk\/([a-z0-9-]+)/g, "aisk-$1"))
    .join("\n")
    .trim();

  return (
    `---\n` +
    `name: ${entry.name}\n` +
    `description: ${yamlString(entry.description)}\n` +
    `metadata:\n` +
    `  short-description: ${yamlString(entry.shortDescription)}\n` +
    `---\n\n` +
    `<!-- AUTO-GENERATED - Do not edit manually.\n` +
    `     Source: skills/${entry.src}\n` +
    `     To regenerate: pnpm register:codex -->\n\n` +
    `${body}\n\n` +
    `## Codex Notes\n\n` +
    `- This skill is installed from the local ai-skills repository.\n` +
    `- Read bundled resources from the repository path recorded in \`~/.ai-skills/config.json\` when needed.\n`
  );
}

export class CodexSetup {
  private repoPath: string;
  private configDir: string;
  private configFile: string;
  private skillsDir: string;

  constructor(options: CodexSetupOptions = {}) {
    this.repoPath = resolve(
      options.repoPath ?? process.env.AISK_REPO_ROOT ?? join(__dirname, ".."),
    );

    const aiSkillsHome = resolveHomePath("AI_SKILLS_HOME", join(homedir(), ".ai-skills"));
    const codexHome = resolveHomePath("CODEX_HOME", join(homedir(), ".codex"));

    this.configDir = resolve(options.aiSkillsHome ?? aiSkillsHome);
    this.configFile = join(this.configDir, "config.json");
    this.skillsDir = join(resolve(options.codexHome ?? codexHome), "skills");
  }

  run(): void {
    mkdirSync(this.configDir, { recursive: true });
    mkdirSync(this.skillsDir, { recursive: true });
    writeFileSync(this.configFile, JSON.stringify({ repo: this.repoPath }, null, 2) + "\n");

    const settingFile = join(this.repoPath, "codex", "setting.json");
    if (!existsSync(settingFile)) {
      console.error("Error: codex/setting.json not found. Run pnpm build:codex first.");
      process.exit(1);
    }

    const { files } = JSON.parse(readFileSync(settingFile, "utf-8")) as CodexManifest;

    const installed = new Set<string>();
    for (const entry of files) {
      const srcPath = join(this.repoPath, "skills", entry.src);
      const dstPath = join(this.skillsDir, entry.name, "SKILL.md");
      mkdirSync(dirname(dstPath), { recursive: true });
      const content = readFileSync(srcPath, "utf-8");
      writeFileSync(dstPath, transformCodexSkill(content, entry));
      installed.add(entry.name);
    }

    for (const dirent of readdirSync(this.skillsDir, { withFileTypes: true })) {
      if (dirent.isDirectory() && dirent.name.startsWith("aisk-") && !installed.has(dirent.name)) {
        rmSync(join(this.skillsDir, dirent.name), { recursive: true, force: true });
        console.log(`  Removed stale: ${join(this.skillsDir, dirent.name)}`);
      }
    }

    console.log("Codex initialization complete:");
    console.log(`  Config: ${this.configFile}`);
    console.log(`  Repository: ${this.repoPath}`);
    console.log(`  Installed ${installed.size} Codex skill(s):`);
    for (const name of [...installed].sort()) {
      console.log(`    ${join(this.skillsDir, name, "SKILL.md")}`);
    }
  }
}

if (require.main === module) {
  new CodexSetup().run();
}
