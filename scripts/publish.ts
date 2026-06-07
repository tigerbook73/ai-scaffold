import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";
import { join, extname, resolve } from "path";
import { homedir } from "os";
import { buildSync } from "esbuild";

interface AisfConfig {
  repoPath: string;
  publishedAt: string;
}

interface PublishOptions {
  repoRoot?: string;
  aisfHome?: string;
  claudeSkillsDir?: string;
}

export class Publish {
  private readonly repoRoot: string;
  private readonly aisfHome: string;
  private readonly claudeSkillsDir: string;

  constructor({ repoRoot, aisfHome, claudeSkillsDir }: PublishOptions = {}) {
    this.repoRoot = repoRoot ?? resolve(__dirname, "..");
    this.aisfHome = aisfHome ?? join(homedir(), ".aisf");
    this.claudeSkillsDir = claudeSkillsDir ?? join(homedir(), ".claude", "skills");
  }

  run(): void {
    console.log("Publishing to ~/.aisf/ ...\n");

    const unitsDir = join(this.repoRoot, "ai-units");
    if (!existsSync(unitsDir)) {
      console.error("Error: ai-units/ directory not found");
      process.exit(1);
    }

    for (const unitName of readdirSync(unitsDir)) {
      this.publishUnit(join(unitsDir, unitName), unitName);
    }

    this.publishGlobalScripts();
    this.publishGlobalCommands();
    this.writeConfig();

    console.log("\nPublish complete.");
  }

  private publishUnit(unitSrcDir: string, unitName: string): void {
    const unitJsonPath = join(unitSrcDir, "unit.json");
    if (!existsSync(unitJsonPath)) return;

    const destDir = join(this.aisfHome, "units", unitName);
    if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
    mkdirSync(destDir, { recursive: true });

    cpSync(unitJsonPath, join(destDir, "unit.json"));

    for (const subdir of ["skills", "rules", "resources"]) {
      const src = join(unitSrcDir, subdir);
      if (existsSync(src)) cpSync(src, join(destDir, subdir), { recursive: true });
    }

    const scriptsSrc = join(unitSrcDir, "scripts");
    if (existsSync(scriptsSrc)) {
      this.compileScripts(scriptsSrc, join(destDir, "scripts"));
    }

    console.log(`  unit: ${unitName}`);
  }

  private publishGlobalScripts(): void {
    const globalScriptsDir = join(this.repoRoot, "global", "scripts");
    if (!existsSync(globalScriptsDir)) return;

    const destDir = join(this.aisfHome, "global");
    if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
    mkdirSync(destDir, { recursive: true });

    for (const file of readdirSync(globalScriptsDir)) {
      if (extname(file) !== ".ts") continue;
      this.bundle(join(globalScriptsDir, file), join(destDir, file.replace(/\.ts$/, ".js")));
    }
  }

  private publishGlobalCommands(): void {
    const globalDir = join(this.repoRoot, "global");
    if (!existsSync(globalDir)) return;

    for (const entry of readdirSync(globalDir)) {
      if (entry === "scripts") continue;
      const skillSrc = join(globalDir, entry, "SKILL.md");
      if (!existsSync(skillSrc)) continue;
      const destDir = join(this.claudeSkillsDir, `aisf:${entry}`);
      mkdirSync(destDir, { recursive: true });
      cpSync(skillSrc, join(destDir, "SKILL.md"));
      console.log(`  global: aisf:${entry}`);
    }
  }

  private compileScripts(srcDir: string, destDir: string): void {
    mkdirSync(destDir, { recursive: true });
    for (const file of readdirSync(srcDir).filter((f) => extname(f) === ".ts")) {
      this.bundle(join(srcDir, file), join(destDir, file.replace(/\.ts$/, ".js")));
    }
  }

  private bundle(entryPoint: string, outfile: string): void {
    buildSync({
      entryPoints: [entryPoint],
      outfile,
      bundle: true,
      platform: "node",
      format: "cjs",
      minify: false,
    });
  }

  private writeConfig(): void {
    mkdirSync(this.aisfHome, { recursive: true });
    const config: AisfConfig = {
      repoPath: this.repoRoot,
      publishedAt: new Date().toISOString(),
    };
    writeFileSync(join(this.aisfHome, "config.json"), JSON.stringify(config, null, 2) + "\n");
    console.log("  config: ~/.aisf/config.json");
  }
}

if (require.main === module) {
  new Publish().run();
}
