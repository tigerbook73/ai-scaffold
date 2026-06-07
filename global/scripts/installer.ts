import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { homedir } from "os";

function registerPreCommitHook(projectDir: string, commandName: string, runCommand: string): void {
  const lefthookPath = join(projectDir, "lefthook.yml");
  const commandEntry = `    ${commandName}:\n      run: ${runCommand}`;

  if (!existsSync(lefthookPath)) {
    writeFileSync(lefthookPath, `pre-commit:\n  commands:\n${commandEntry}\n`);
    return;
  }

  let content = readFileSync(lefthookPath, "utf8");
  if (content.includes(`    ${commandName}:`)) return;

  const preCommitMatch = /^pre-commit:/m.exec(content);
  if (!preCommitMatch) {
    const suffix = content.endsWith("\n") ? "" : "\n";
    content += `${suffix}\npre-commit:\n  commands:\n${commandEntry}\n`;
    writeFileSync(lefthookPath, content);
    return;
  }

  const before = content.slice(0, preCommitMatch.index);
  const section = content.slice(preCommitMatch.index);
  const updated = /^  commands:/m.test(section)
    ? section.replace(/^(  commands:)/m, `$1\n${commandEntry}`)
    : section.replace(/^pre-commit:/m, `pre-commit:\n  commands:\n${commandEntry}`);
  writeFileSync(lefthookPath, before + updated);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface UnitJson {
  name: string;
  description?: string;
  dependencies: string[];
  components: {
    skills?: Array<{ name: string; file: string }>;
    rules?: Array<{ name: string; file: string; required?: boolean; condition?: string }>;
    scripts?: Array<{ name: string; file: string; hook: string; params?: string[] }>;
    resources?: Array<{ name: string; file: string }>;
  };
}

interface InstalledEntry {
  installedAt: string;
  components: {
    skills: string[];
    rules: string[];
    scripts: string[];
    resources: string[];
  };
}

interface InstalledJson {
  units: Record<string, InstalledEntry>;
}

interface SkillSpec {
  type: "skill";
  name: string;
  file: string;
}

interface RuleSpec {
  type: "rule";
  name: string;
  file: string;
  /** User-confirmed values for each AISF:CUSTOM block, keyed by the block's name attribute. */
  customValues: Record<string, string>;
}

interface ScriptSpec {
  type: "script";
  name: string;
  file: string;
  hook: string;
  /** lefthook template variables to append as CLI args, e.g. ["staged_files"] → {staged_files} */
  params?: string[];
}

interface ResourceSpec {
  type: "resource";
  name: string;
  file: string;
}

type ComponentSpec = SkillSpec | RuleSpec | ScriptSpec | ResourceSpec;

// ─── Installer ───────────────────────────────────────────────────────────────

export class Installer {
  readonly aisfHome: string;
  readonly cwd: string;

  constructor(cwd = process.cwd(), aisfHome = join(homedir(), ".aisf")) {
    this.cwd = cwd;
    this.aisfHome = aisfHome;
  }

  /**
   * Outputs JSON listing all available units with their install status.
   * Exits with an error if ~/.aisf/config.json does not exist.
   */
  listUnits(): void {
    const configPath = join(this.aisfHome, "config.json");
    if (!existsSync(configPath)) {
      console.error(
        "错误：本地仓库未找到（~/.aisf/config.json 不存在）。\n请在开发仓库运行 pnpm pub 后再试。",
      );
      process.exit(1);
    }

    const unitsDir = join(this.aisfHome, "units");
    if (!existsSync(unitsDir)) {
      process.stdout.write(JSON.stringify({ units: [] }, null, 2) + "\n");
      return;
    }

    const installed = this.readInstalled();
    const units = readdirSync(unitsDir)
      .map((dir) => {
        const unitJson = this.readUnitJson(dir);
        if (!unitJson) return null;
        return {
          name: dir,
          description: unitJson.description ?? "",
          installed: dir in installed.units,
        };
      })
      .filter((u): u is NonNullable<typeof u> => u !== null);

    process.stdout.write(JSON.stringify({ units }, null, 2) + "\n");
  }

  /**
   * Resolves all transitive unmet dependencies for the given unit names and outputs
   * the full install order (topologically sorted) plus which units were auto-added.
   */
  checkDeps(unitNames: string[]): void {
    const installed = this.readInstalled();
    const toInstall = new Set<string>(unitNames);
    const auto = new Set<string>();

    const resolve = (names: string[]) => {
      for (const name of names) {
        const unitJson = this.readUnitJson(name);
        if (!unitJson) {
          console.error(`Error: unit "${name}" not found in ~/.aisf/units/`);
          process.exit(1);
        }
        for (const dep of unitJson.dependencies) {
          if (!installed.units[dep] && !toInstall.has(dep)) {
            toInstall.add(dep);
            if (!unitNames.includes(dep)) auto.add(dep);
            resolve([dep]);
          }
        }
      }
    };

    resolve(unitNames);

    const order = this.topoSort([...toInstall]);
    process.stdout.write(JSON.stringify({ order, auto: [...auto] }, null, 2) + "\n");
  }

  private topoSort(unitNames: string[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);
      const unitJson = this.readUnitJson(name);
      if (unitJson) {
        for (const dep of unitJson.dependencies) {
          if (unitNames.includes(dep)) visit(dep);
        }
      }
      result.push(name);
    };

    for (const name of unitNames) visit(name);
    return result;
  }

  /**
   * Installs all components for a unit.
   * componentsJson is a JSON array of ComponentSpec objects produced by the setup skill.
   */
  install(unitName: string, componentsJson: string): void {
    let specs: ComponentSpec[];
    try {
      specs = JSON.parse(componentsJson) as ComponentSpec[];
    } catch {
      console.error("Error: --components must be valid JSON");
      process.exit(1);
    }

    const installedPaths: InstalledEntry["components"] = {
      skills: [],
      rules: [],
      scripts: [],
      resources: [],
    };

    for (const spec of specs) {
      switch (spec.type) {
        case "skill": {
          const dest = this.installSkill(unitName, spec);
          installedPaths.skills.push(dest);
          break;
        }
        case "rule": {
          const dest = this.installRule(unitName, spec);
          installedPaths.rules.push(dest);
          break;
        }
        case "script": {
          const dest = this.installScript(unitName, spec);
          installedPaths.scripts.push(dest);
          break;
        }
        case "resource": {
          const dests = this.installResources(unitName);
          installedPaths.resources.push(...dests);
          break;
        }
      }
    }

    this.updateInstalled(unitName, installedPaths);
    console.log(`Installed: ${unitName}`);
  }

  private installSkill(unitName: string, spec: SkillSpec): string {
    const src = join(this.aisfHome, "units", unitName, spec.file);
    const destDir = join(this.cwd, ".claude", "skills", `aisf:${unitName}:${spec.name}`);
    mkdirSync(destDir, { recursive: true });
    cpSync(src, join(destDir, "SKILL.md"));
    return join(".claude", "skills", `aisf:${unitName}:${spec.name}`, "SKILL.md");
  }

  private installRule(unitName: string, spec: RuleSpec): string {
    const templatePath = join(this.aisfHome, "units", unitName, spec.file);
    if (!existsSync(templatePath)) {
      console.error(`Error: rule template not found: ${templatePath}`);
      process.exit(1);
    }
    const template = readFileSync(templatePath, "utf8");
    const resolved = this.applyCustomValues(template, spec.customValues);
    const destDir = join(this.cwd, ".claude", "rules", unitName);
    mkdirSync(destDir, { recursive: true });
    const destFile = join(destDir, `${spec.name}.md`);
    writeFileSync(destFile, resolved);
    return join(".claude", "rules", unitName, `${spec.name}.md`);
  }

  /** Replaces each AISF:CUSTOM block's content with the matching value from customValues. */
  private applyCustomValues(template: string, customValues: Record<string, string>): string {
    // Matches both YAML (#) and Markdown (<!-- -->) boundary formats
    return template
      .replace(
        /(#\s*AISF:CUSTOM name="([^"]+)"[^\n]*\n)([\s\S]*?)(#\s*AISF:CUSTOM:END)/g,
        (_match, openTag: string, name: string, _defaultContent: string, closeTag: string) =>
          name in customValues ? `${openTag}${customValues[name]}\n${closeTag}` : _match,
      )
      .replace(
        /(<!--\s*AISF:CUSTOM name="([^"]+)"[^>]*-->\n)([\s\S]*?)(<!--\s*AISF:CUSTOM:END\s*-->)/g,
        (_match, openTag: string, name: string, _defaultContent: string, closeTag: string) =>
          name in customValues ? `${openTag}${customValues[name]}\n${closeTag}` : _match,
      );
  }

  private installScript(unitName: string, spec: ScriptSpec): string {
    const srcJs = join(this.aisfHome, "units", unitName, "scripts", `${spec.name}.js`);
    if (!existsSync(srcJs)) {
      console.error(`Error: compiled script not found: ${srcJs}`);
      process.exit(1);
    }
    const destDir = join(this.cwd, ".aisf", unitName, "scripts");
    mkdirSync(destDir, { recursive: true });
    const destFile = join(destDir, `${spec.name}.js`);
    cpSync(srcJs, destFile);
    const relPath = join(".aisf", unitName, "scripts", `${spec.name}.js`);
    const paramStr = (spec.params ?? []).map((p) => `{${p}}`).join(" ");
    const runCmd = paramStr ? `node ${relPath} ${paramStr}` : `node ${relPath}`;
    registerPreCommitHook(this.cwd, `aisf-${unitName}-${spec.name}`, runCmd);
    return relPath;
  }

  private installResources(unitName: string): string[] {
    const srcDir = join(this.aisfHome, "units", unitName, "resources");
    if (!existsSync(srcDir)) return [];
    const destDir = join(this.cwd, ".aisf", unitName, "resources");
    mkdirSync(destDir, { recursive: true });
    cpSync(srcDir, destDir, { recursive: true });
    return readdirSync(destDir).map((f) => join(".aisf", unitName, "resources", f));
  }

  readInstalled(): InstalledJson {
    const installedPath = join(this.cwd, ".aisf", "installed.json");
    if (!existsSync(installedPath)) return { units: {} };
    return JSON.parse(readFileSync(installedPath, "utf8")) as InstalledJson;
  }

  private updateInstalled(unitName: string, components: InstalledEntry["components"]): void {
    const installedPath = join(this.cwd, ".aisf", "installed.json");
    mkdirSync(join(this.cwd, ".aisf"), { recursive: true });
    const data = this.readInstalled();
    data.units[unitName] = { installedAt: new Date().toISOString(), components };
    writeFileSync(installedPath, JSON.stringify(data, null, 2) + "\n");
  }

  private readUnitJson(unitName: string): UnitJson | null {
    const unitJsonPath = join(this.aisfHome, "units", unitName, "unit.json");
    if (!existsSync(unitJsonPath)) return null;
    return JSON.parse(readFileSync(unitJsonPath, "utf8")) as UnitJson;
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function printHelp(): void {
  process.stdout.write(
    [
      "aisf installer",
      "",
      "USAGE:",
      "  installer [options]",
      "",
      "OPTIONS:",
      "  --list                 List all available units with their install status",
      "  --check-deps           Resolve transitive deps and output topological install order",
      "  --units <a,b,...>      Comma-separated unit names (used with --check-deps)",
      "  --install              Install a unit into the current project",
      "  --unit <name>          Unit name (used with --install)",
      "  --components <json>    JSON array of ComponentSpec objects (used with --install)",
      "  --help, -h             Show this help message",
      "",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): {
  mode: "list" | "check-deps" | "install" | "help";
  units?: string[];
  unit?: string;
  components?: string;
} {
  const result: ReturnType<typeof parseArgs> = { mode: "help" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--list") result.mode = "list";
    else if (arg === "--check-deps") result.mode = "check-deps";
    else if (arg === "--install") result.mode = "install";
    else if (arg === "--help" || arg === "-h") result.mode = "help";
    else if (arg === "--units" && argv[i + 1]) result.units = argv[++i].split(",").map((s) => s.trim());
    else if (arg === "--unit" && argv[i + 1]) result.unit = argv[++i];
    else if (arg === "--components" && argv[i + 1]) result.components = argv[++i];
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));

if (args.mode === "list") {
  new Installer().listUnits();
} else if (args.mode === "check-deps") {
  if (!args.units?.length) {
    console.error("Error: --units is required with --check-deps");
    process.exit(1);
  }
  new Installer().checkDeps(args.units);
} else if (args.mode === "install") {
  if (!args.unit || !args.components) {
    console.error("Error: --unit and --components are required with --install");
    process.exit(1);
  }
  new Installer().install(args.unit, args.components);
} else {
  printHelp();
}
