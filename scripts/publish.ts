/**
 * Publishes this repository's units into the local aisk home.
 *
 * The publish step is intentionally filesystem-based: build.ts owns registry
 * generation, while this script copies unit assets, bundles runtime scripts,
 * and writes the repo locator consumed by agent-side installers.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import { join, extname, resolve } from "path";
import { homedir } from "os";
import { buildSync } from "esbuild";
import type { UnitJson } from "../global/scripts/types/installer-types";

interface AiskConfig {
  repoPath: string;
  publishedAt: string;
}

interface PublishOptions {
  repoRoot?: string;
  aiskHome?: string;
  claudeSkillsDir?: string;
}

export class Publish {
  private readonly repoRoot: string;
  private readonly aiskHome: string;
  private readonly claudeSkillsDir: string;

  constructor({ repoRoot, aiskHome, claudeSkillsDir }: PublishOptions = {}) {
    this.repoRoot = repoRoot ?? resolve(__dirname, "..");
    this.aiskHome = aiskHome ?? join(homedir(), ".aisk");
    this.claudeSkillsDir = claudeSkillsDir ?? join(homedir(), ".claude", "skills");
  }

  /** Publish every unit plus global installer assets into the configured targets. */
  run(): void {
    console.log("Publishing to ~/.aisk/ ...\n");

    const unitsDir = join(this.repoRoot, "units");
    if (!existsSync(unitsDir)) {
      console.error("Error: units/ directory not found");
      process.exit(1);
    }

    for (const unitName of readdirSync(unitsDir)) {
      this.publishUnit(join(unitsDir, unitName), unitName);
    }

    this.publishUnitsOrder(unitsDir);
    this.publishGlobalScripts();
    this.publishGlobalCommands();
    this.writeConfig();

    console.log("\nPublish complete.");
  }

  /**
   * Publish one unit directory.
   *
   * Non-script assets are copied as templates. Script components are bundled
   * under their component names so installed hooks are stable across source
   * file renames that preserve unit.json metadata.
   */
  private publishUnit(unitSrcDir: string, unitName: string): void {
    const unitJsonPath = join(unitSrcDir, "unit.json");
    if (!existsSync(unitJsonPath)) return;
    const unitJson = JSON.parse(readFileSync(unitJsonPath, "utf8")) as UnitJson;

    const destDir = join(this.aiskHome, "units", unitName);
    if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
    mkdirSync(destDir, { recursive: true });

    cpSync(unitJsonPath, join(destDir, "unit.json"));

    for (const subdir of ["skills", "rules", "resources"]) {
      const src = join(unitSrcDir, subdir);
      if (existsSync(src)) cpSync(src, join(destDir, subdir), { recursive: true });
    }

    const scriptsSrc = join(unitSrcDir, "scripts");
    if (existsSync(scriptsSrc)) {
      this.compileUnitScripts(unitJson, scriptsSrc, join(destDir, "scripts"));
    }

    console.log(`  unit: ${unitName}`);
  }

  /** Copies the pre-computed unit order from units/units.json to ~/.aisk/units.json. */
  private publishUnitsOrder(unitsDir: string): void {
    const src = join(unitsDir, "units.json");
    if (!existsSync(src)) return;
    mkdirSync(this.aiskHome, { recursive: true });
    cpSync(src, join(this.aiskHome, "units.json"));
  }

  /** Publish shared global scripts used by installed skills. */
  private publishGlobalScripts(): void {
    const globalScriptsDir = join(this.repoRoot, "global", "scripts");
    if (!existsSync(globalScriptsDir)) return;

    const destDir = join(this.aiskHome, "global");
    if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
    mkdirSync(destDir, { recursive: true });

    // Root .ts files are publish entrypoints. Subdirectories are source modules
    // and are only included when bundled through an entrypoint import.
    for (const file of readdirSync(globalScriptsDir)) {
      if (extname(file) !== ".ts") continue;
      // Publish *-types.ts as source — interfaces have no runtime representation after compilation.
      if (file.endsWith("-types.ts")) {
        cpSync(join(globalScriptsDir, file), join(destDir, file));
      } else {
        this.bundle(join(globalScriptsDir, file), join(destDir, file.replace(/\.ts$/, ".js")));
      }
    }
  }

  /** Publish global Claude skill commands that are not tied to a unit. */
  private publishGlobalCommands(): void {
    const globalDir = join(this.repoRoot, "global");
    if (!existsSync(globalDir)) return;

    for (const entry of readdirSync(globalDir)) {
      if (entry === "scripts") continue;
      const skillSrc = join(globalDir, entry, "SKILL.md");
      if (!existsSync(skillSrc)) continue;
      const destDir = join(this.claudeSkillsDir, `aisk-${entry}`);
      mkdirSync(destDir, { recursive: true });
      cpSync(skillSrc, join(destDir, "SKILL.md"));
      console.log(`  global: aisk-${entry}`);
    }
  }

  /** Bundle only scripts declared in unit.json components.scripts[]. */
  private compileUnitScripts(unitJson: UnitJson, srcDir: string, destDir: string): void {
    const scripts = unitJson.components.scripts ?? [];
    if (scripts.length === 0) return;

    mkdirSync(destDir, { recursive: true });
    for (const script of scripts) {
      this.bundle(
        join(srcDir, script.file.replace(/^scripts\//, "")),
        join(destDir, `${script.name}.js`),
      );
    }
  }

  /** Bundle a Node-targeted TypeScript entry point into a standalone CommonJS file. */
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

  /** Write the repo locator used to guard clean operations and agent discovery. */
  private writeConfig(): void {
    mkdirSync(this.aiskHome, { recursive: true });
    const config: AiskConfig = {
      repoPath: this.repoRoot,
      publishedAt: new Date().toISOString(),
    };
    writeFileSync(join(this.aiskHome, "config.json"), JSON.stringify(config, null, 2) + "\n");
    console.log("  config: ~/.aisk/config.json");
  }
}

if (require.main === module) {
  new Publish().run();
}
