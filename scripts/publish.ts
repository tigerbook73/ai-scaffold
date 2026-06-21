/**
 * Publishes this repository's units into the local aisk home.
 *
 * The publish step is intentionally filesystem-based: build.ts owns registry
 * generation, while this script copies unit assets, bundles runtime scripts,
 * and writes the repo locator consumed by agent-side installers.
 *
 * Before publishing, any previous install is cleaned via install.log so that
 * stale artifacts do not accumulate. Every persistent operation is recorded in
 * a fresh install.log so that clean can reverse them precisely.
 */
import {
  chmodSync,
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
import type { AiskConfig } from "./libs/aisk-config";
import { addPathToBashrc } from "./libs/bashrc";
import { InstallLog, INSTALL_LOG_FILENAME } from "./libs/install-log";
import { Clean } from "./clean";

interface PublishOptions {
  repoRoot?: string;
  aiskHome?: string;
  claudeSkillsDir?: string;
  bashrcPath?: string;
}

export class Publish {
  private readonly repoRoot: string;
  private readonly aiskHome: string;
  private readonly claudeSkillsDir: string;
  private readonly bashrcPath: string;

  constructor({ repoRoot, aiskHome, claudeSkillsDir, bashrcPath }: PublishOptions = {}) {
    this.repoRoot = repoRoot ?? resolve(__dirname, "..");
    this.aiskHome = aiskHome ?? join(homedir(), ".aisk");
    this.claudeSkillsDir = claudeSkillsDir ?? join(homedir(), ".claude", "skills");
    this.bashrcPath = bashrcPath ?? join(homedir(), ".bashrc");
  }

  /** Publish every unit plus global installer assets into the configured targets. */
  run(): void {
    const unitsDir = join(this.repoRoot, "units");
    if (!existsSync(unitsDir)) {
      console.error("Error: units/ directory not found");
      process.exit(1);
    }

    // Remove previous install before writing new artifacts.
    new Clean({
      repoRoot: this.repoRoot,
      aiskHome: this.aiskHome,
      claudeSkillsDir: this.claudeSkillsDir,
      bashrcPath: this.bashrcPath,
      quiet: true,
    }).run();

    console.log("Publishing to ~/.aisk/ ...\n");

    const log = InstallLog.create(InstallLog.logPath(this.aiskHome), this.repoRoot);

    for (const unitName of readdirSync(unitsDir)) {
      this.publishUnit(join(unitsDir, unitName), unitName, log);
    }

    this.publishUnitsOrder(unitsDir, log);
    this.publishGlobalScripts(log);
    this.publishGlobalCommands(log);
    this.writeConfig(log);
    this.publishBashrc(log);
    log.write();
    console.log(`  log: ~/.aisk/${INSTALL_LOG_FILENAME}`);

    console.log("\nPublish complete.");
  }

  /**
   * Publish one unit directory.
   *
   * Non-script assets are copied as templates. Script components are bundled
   * under their component names so installed hooks are stable across source
   * file renames that preserve unit.json metadata.
   */
  private publishUnit(unitSrcDir: string, unitName: string, log: InstallLog): void {
    const unitJsonPath = join(unitSrcDir, "unit.json");
    if (!existsSync(unitJsonPath)) return;
    const unitJson = JSON.parse(readFileSync(unitJsonPath, "utf8")) as UnitJson;

    const destDir = join(this.aiskHome, "units", unitName);
    if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
    mkdirSync(destDir, { recursive: true });
    log.add({ type: "dir", path: destDir });

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
  private publishUnitsOrder(unitsDir: string, log: InstallLog): void {
    const src = join(unitsDir, "units.json");
    if (!existsSync(src)) return;
    mkdirSync(this.aiskHome, { recursive: true });
    const dest = join(this.aiskHome, "units.json");
    cpSync(src, dest);
    log.add({ type: "file", path: dest });
  }

  /** Publish shared global scripts used by installed skills. */
  private publishGlobalScripts(log: InstallLog): void {
    const globalScriptsDir = join(this.repoRoot, "global", "scripts");
    if (!existsSync(globalScriptsDir)) return;

    const destDir = join(this.aiskHome, "global");
    if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
    mkdirSync(destDir, { recursive: true });
    log.add({ type: "dir", path: destDir });

    // Root .ts files are publish entrypoints. Subdirectories are source modules
    // and are only included when bundled through an entrypoint import.
    for (const file of readdirSync(globalScriptsDir)) {
      const ext = extname(file);
      if (ext === ".sh") {
        const dest = join(destDir, file);
        cpSync(join(globalScriptsDir, file), dest);
        chmodSync(dest, 0o755);
      } else if (ext === ".ts") {
        // Publish *-types.ts as source — interfaces have no runtime representation after compilation.
        if (file.endsWith("-types.ts")) {
          cpSync(join(globalScriptsDir, file), join(destDir, file));
        } else {
          this.bundle(join(globalScriptsDir, file), join(destDir, file.replace(/\.ts$/, ".cjs")));
        }
      }
    }
  }

  /** Publish global Claude skill commands that are not tied to a unit. */
  private publishGlobalCommands(log: InstallLog): void {
    const globalDir = join(this.repoRoot, "global");
    if (!existsSync(globalDir)) return;

    for (const entry of readdirSync(globalDir)) {
      if (entry === "scripts") continue;
      const skillSrc = join(globalDir, entry, "SKILL.md");
      if (!existsSync(skillSrc)) continue;
      const destDir = join(this.claudeSkillsDir, `aisk-${entry}`);
      mkdirSync(destDir, { recursive: true });
      cpSync(skillSrc, join(destDir, "SKILL.md"));
      log.add({ type: "dir", path: destDir });
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
        join(destDir, `${script.name}.cjs`),
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
  private writeConfig(log: InstallLog): void {
    mkdirSync(this.aiskHome, { recursive: true });
    const config: AiskConfig = {
      repoPath: this.repoRoot,
      publishedAt: new Date().toISOString(),
    };
    const configPath = join(this.aiskHome, "config.json");
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    log.add({ type: "file", path: configPath });
    console.log("  config: ~/.aisk/config.json");
  }

  /** Ensure the aisk global directory is on PATH for the current user's shell. */
  private publishBashrc(log: InstallLog): void {
    const added = addPathToBashrc(this.bashrcPath);
    if (added) {
      log.add({ type: "bashrc", path: this.bashrcPath });
      console.log("  config: PATH entry added to ~/.bashrc");
    }
  }
}

if (require.main === module) {
  new Publish().run();
}
