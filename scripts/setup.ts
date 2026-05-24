import {
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
  readFileSync,
  existsSync,
} from "fs";
import { join, resolve, dirname, basename } from "path";
import { homedir } from "os";

interface FileEntry {
  src: string;
  dst: string;
}

class Setup {
  private repoPath: string;
  private configDir: string;
  private configFile: string;
  private globalCmdsDir: string;

  constructor() {
    this.repoPath = resolve(__dirname, "..");
    this.configDir = join(homedir(), ".ai-skills");
    this.configFile = join(this.configDir, "config.json");
    this.globalCmdsDir = join(homedir(), ".claude", "commands", "aisk");
  }

  run(): void {
    mkdirSync(this.configDir, { recursive: true });
    mkdirSync(this.globalCmdsDir, { recursive: true });
    writeFileSync(this.configFile, JSON.stringify({ repo: this.repoPath }, null, 2) + "\n");

    const settingFile = join(this.repoPath, "claude", "setting.json");
    if (!existsSync(settingFile)) {
      console.error("Error: claude/setting.json not found. Run npm run build first.");
      process.exit(1);
    }

    const { files } = JSON.parse(readFileSync(settingFile, "utf-8")) as { files: FileEntry[] };

    const installed = new Set<string>();
    for (const { src, dst } of files) {
      const srcPath = join(this.repoPath, "skills", src);
      const dstPath = join(homedir(), dst);
      mkdirSync(dirname(dstPath), { recursive: true });
      copyFileSync(srcPath, dstPath);
      installed.add(basename(dst));
    }

    // remove stale global commands no longer in setting.json
    for (const f of readdirSync(this.globalCmdsDir)) {
      if (f.endsWith(".md") && !installed.has(f)) {
        unlinkSync(join(this.globalCmdsDir, f));
        console.log(`  Removed stale: ~/.claude/commands/aisk/${f}`);
      }
    }

    console.log("Initialization complete:");
    console.log(`  Config: ${this.configFile}`);
    console.log(`  Repository: ${this.repoPath}`);
    console.log(`  Installed ${installed.size} global skill(s):`);
    for (const name of [...installed].sort()) {
      console.log(`    ~/.claude/commands/aisk/${name}`);
    }
  }
}

new Setup().run();
