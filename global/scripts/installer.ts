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

// ─── Types ───────────────────────────────────────────────────────────────────

interface UnitJson {
  name: string;
  dependencies: string[];
  components: {
    skills?: Array<{ name: string; file: string }>;
    rules?: Array<{ name: string; file: string; required?: boolean }>;
    scripts?: Array<{ name: string; file: string; hook: string }>;
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
   * Outputs JSON listing unmet dependencies for the given unit names.
   * Reads installed.json from the target project to determine what is already installed.
   */
  checkDeps(unitNames: string[]): void {
    const installed = this.readInstalled();
    const unmet: string[] = [];

    for (const unitName of unitNames) {
      const unitJson = this.readUnitJson(unitName);
      if (!unitJson) {
        console.error(`Error: unit "${unitName}" not found in ~/.aisf/units/`);
        process.exit(1);
      }
      for (const dep of unitJson.dependencies) {
        if (!installed.units[dep] && !unmet.includes(dep)) {
          unmet.push(dep);
        }
      }
    }

    process.stdout.write(JSON.stringify({ unmet }, null, 2) + "\n");
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
    this.updateLefthook(`aisf-${unitName}-${spec.name}`, relPath);
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

  private updateLefthook(commandName: string, scriptRelPath: string): void {
    const lefthookPath = join(this.cwd, "lefthook.yml");
    const commandEntry = `    ${commandName}:\n      run: node ${scriptRelPath}`;

    if (!existsSync(lefthookPath)) {
      writeFileSync(lefthookPath, `pre-commit:\n  commands:\n${commandEntry}\n`);
      return;
    }

    let content = readFileSync(lefthookPath, "utf8");
    if (content.includes(`    ${commandName}:`)) return; // idempotent

    // /^pre-commit:/m only matches uncommented lines (not "# pre-commit:")
    const preCommitMatch = /^pre-commit:/m.exec(content);
    if (!preCommitMatch) {
      const suffix = content.endsWith("\n") ? "" : "\n";
      content += `${suffix}\npre-commit:\n  commands:\n${commandEntry}\n`;
      writeFileSync(lefthookPath, content);
      return;
    }

    // Scope commands: search to within the pre-commit section
    const preCommitIdx = preCommitMatch.index;
    const before = content.slice(0, preCommitIdx);
    const section = content.slice(preCommitIdx);

    let updated: string;
    if (/^  commands:/m.test(section)) {
      updated = section.replace(/^(  commands:)/m, `$1\n${commandEntry}`);
    } else {
      updated = section.replace(/^pre-commit:/m, `pre-commit:\n  commands:\n${commandEntry}`);
    }
    writeFileSync(lefthookPath, before + updated);
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
      "  --check-deps           Check unmet dependencies for the specified units",
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
  mode: "check-deps" | "install" | "help";
  units?: string[];
  unit?: string;
  components?: string;
} {
  const result: ReturnType<typeof parseArgs> = { mode: "help" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--check-deps") result.mode = "check-deps";
    else if (arg === "--install") result.mode = "install";
    else if ((arg === "--help" || arg === "-h")) result.mode = "help";
    else if (arg === "--units" && argv[i + 1]) result.units = argv[++i].split(",").map((s) => s.trim());
    else if (arg === "--unit" && argv[i + 1]) result.unit = argv[++i];
    else if (arg === "--components" && argv[i + 1]) result.components = argv[++i];
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));

if (args.mode === "check-deps") {
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
