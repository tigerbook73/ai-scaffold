import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join, basename, resolve, dirname } from "path";
import { homedir } from "os";
import { execSync } from "child_process";
import { createInterface } from "readline";
import { cac } from "cac";

interface Options {
  name?: string;
  description?: string;
  cleanup?: boolean;
  force?: boolean;
}

interface ManifestEntry {
  targets: { claude: boolean; codex: boolean };
  codex?: { name: string; description: string; shortDescription: string };
}

interface Manifest {
  version: string;
  skills: Record<string, ManifestEntry>;
}

function inferCodexDescription(content: string): string {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("# ")) {
      for (let j = i + 1; j < lines.length; j++) {
        const line = lines[j].trim();
        if (line && !line.startsWith("**Usage**") && line !== "---") {
          const stripped = line.replace(/\.$/, "");
          return `Use when the user wants to ${stripped.charAt(0).toLowerCase()}${stripped.slice(1)}.`;
        }
      }
      break;
    }
  }
  return "";
}

function inferShortDescription(skillName: string): string {
  const [first, ...rest] = skillName.split("-");
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
}

function updateManifest(repo: string, skillKey: string, content: string): void {
  const manifestPath = join(repo, "skills", "manifest.json");
  const manifest: Manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  if (manifest.skills[skillKey]) return;

  const skillName = skillKey.split("/")[1].replace(/^SK-/, "").replace(/\.md$/, "");
  manifest.skills[skillKey] = {
    targets: { claude: true, codex: true },
    codex: {
      name: `aisk-${skillName}`,
      description: inferCodexDescription(content),
      shortDescription: inferShortDescription(skillName),
    },
  };

  const sorted: Record<string, ManifestEntry> = {};
  for (const key of Object.keys(manifest.skills).sort()) {
    sorted[key] = manifest.skills[key];
  }
  manifest.skills = sorted;

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`skills/manifest.json updated: added ${skillKey}`);
}

class SkillCreator {
  private async confirm(question: string): Promise<boolean> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((res) => rl.question(question, res));
    rl.close();
    return answer.toLowerCase() === "y";
  }

  run(): void {
    const cli = cac("create-skill");

    cli
      .command("[file]", "Promote a skill file to the global repository")
      .option("--name <name>", "Skill name (target filename without .md)")
      .option("--description <desc>", "Manifest description override")
      .option("--cleanup", "Delete the source file after copying (use when source is a temp file)")
      .option("--force", "Skip all confirmation prompts (source-in-repo and overwrite)")
      .action(async (file: string | undefined, options: Options) => {
        try {
          if (!file) {
            cli.outputHelp();
            process.exit(0);
          }

          const aiSkillsHome = process.env.AI_SKILLS_HOME
            ? resolve(process.env.AI_SKILLS_HOME)
            : join(homedir(), ".ai-skills");
          const configFile = join(aiSkillsHome, "config.json");
          if (!existsSync(configFile)) {
            console.error("Error: ~/.ai-skills/config.json not found. Run pnpm register first.");
            process.exit(1);
          }

          const { repo } = JSON.parse(readFileSync(configFile, "utf-8")) as { repo: string };
          const srcPath = resolve(file);

          if (!existsSync(srcPath)) {
            console.error(`Error: Source file not found: ${srcPath}`);
            process.exit(1);
          }

          const srcInRepo = srcPath.startsWith(join(repo, "skills"));
          const rawName = options.name ?? basename(srcPath, ".md");
          const name = rawName.startsWith("SK-") ? rawName.slice(3) : rawName;
          const dstPath = join(repo, "skills", name, `SK-${name}.md`);

          if (srcInRepo && !options.force) {
            const ok = await this.confirm(
              `Source file is already in the repository. Update ${name}? (y/N) `,
            );
            if (!ok) {
              console.log("Cancelled");
              process.exit(0);
            }
          }

          if (existsSync(dstPath) && !options.force) {
            const ok = await this.confirm(`Skill SK-${name}.md already exists. Overwrite? (y/N) `);
            if (!ok) {
              console.log("Cancelled");
              process.exit(0);
            }
          }

          mkdirSync(dirname(dstPath), { recursive: true });
          copyFileSync(srcPath, dstPath);
          if (options.cleanup) unlinkSync(srcPath);
          console.log(`Skill written to: ${dstPath}`);

          const content = readFileSync(dstPath, "utf-8");
          updateManifest(repo, `${name}/SK-${name}.md`, content);

          execSync("pnpm build", { cwd: repo, stdio: "inherit" });
          execSync("pnpm build:codex", { cwd: repo, stdio: "inherit" });

          if (options.description) {
            const settingFile = join(repo, "claude", "setting.json");
            const setting = JSON.parse(readFileSync(settingFile, "utf-8"));
            const entry = setting.files.find(
              (f: { src: string }) => f.src === `${name}/SK-${name}.md`,
            );
            if (entry) {
              entry.description = options.description;
              writeFileSync(settingFile, JSON.stringify(setting, null, 2) + "\n");
            }
          }

          console.log(
            "\nRun git commit to persist, then:\n" +
              "  pnpm register        — apply to Claude Code\n" +
              "  pnpm register:codex  — apply to Codex",
          );
        } catch (err) {
          console.error((err as Error).message);
          process.exit(1);
        }
      });

    cli.help();
    cli.parse();
  }
}

new SkillCreator().run();
