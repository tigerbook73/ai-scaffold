import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

export function stripFrontmatter(content: string): string {
  if (!content.startsWith("---\n")) return content;
  const end = content.indexOf("\n---\n", 4);
  return end === -1 ? content : content.slice(end + 5);
}

export interface SkillEntry {
  src: string;
  name: string;
  category: string;
  targets: { claude: boolean; codex: boolean };
  description: string;
  codex: {
    name: string;
    description: string;
    shortDescription: string;
  };
}

function parseFrontmatter(content: string): { targets?: string[] } {
  if (!content.startsWith("---\n")) return {};
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) return {};
  const yaml = content.slice(4, end);
  const match = yaml.match(/^targets:\s*\[([^\]]+)\]/m);
  if (!match) return {};
  return { targets: match[1].split(",").map((s) => s.trim()) };
}

function getDescription(content: string): string {
  const lines = content.split("\n");
  let pastH1 = false;
  for (const line of lines) {
    if (!pastH1) {
      if (/^#\s+/.test(line)) pastH1 = true;
      continue;
    }
    const trimmed = line.trim();
    if (trimmed && trimmed !== "---") return trimmed;
  }
  return "";
}

function inferCodexDescription(content: string): string {
  const desc = getDescription(content);
  if (!desc) return "";
  const stripped = desc.replace(/\.$/, "");
  return `Use when the user wants to ${stripped.charAt(0).toLowerCase()}${stripped.slice(1)}.`;
}

function inferShortDescription(skillName: string): string {
  const [first, ...rest] = skillName.split("-");
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
}

export function scanSkills(repoRoot: string): SkillEntry[] {
  const skillsDir = join(repoRoot, "skills");
  const entries: SkillEntry[] = [];

  for (const dir of readdirSync(skillsDir).sort()) {
    const dirPath = join(skillsDir, dir);
    if (!statSync(dirPath).isDirectory()) continue;

    for (const file of readdirSync(dirPath).sort()) {
      if (!file.startsWith("SK-") || !file.endsWith(".md")) continue;

      const src = `${dir}/${file}`;
      const name = file.slice(3, -3);
      const content = readFileSync(join(dirPath, file), "utf-8");
      const fm = parseFrontmatter(content);

      const allTargets = fm.targets ?? ["claude", "codex"];
      const targets = {
        claude: allTargets.includes("claude"),
        codex: allTargets.includes("codex"),
      };

      entries.push({
        src,
        name,
        category: dir,
        targets,
        description: getDescription(content),
        codex: {
          name: `aisk-${name}`,
          description: inferCodexDescription(content),
          shortDescription: inferShortDescription(name),
        },
      });
    }
  }

  return entries;
}
