/**
 * Removes artifacts recorded in ~/.aisk/install.log.
 *
 * Each entry in the log describes one persistent operation performed during
 * publish. Clean reverses those operations in order, then attempts to remove
 * empty parent directories left behind.
 *
 * All entries are validated against an AllowedPaths allowlist before any file
 * is touched. If any entry falls outside the allowed paths, the entire clean
 * is aborted to prevent unintended destructive actions.
 */
import { rmSync, rmdirSync } from "fs";
import { join, resolve, sep } from "path";
import { homedir } from "os";
import type { InstallEntry } from "./libs/install-log";
import { InstallLog, INSTALL_LOG_FILENAME } from "./libs/install-log";
import { removePathFromBashrc } from "./libs/bashrc";

/**
 * Allowlist of filesystem locations that Clean is permitted to touch.
 *
 * - dirs:  `dir` and `file` entries must be strictly inside one of these.
 * - files: exact paths for entries (bashrc) that live outside the dirs above.
 */
class AllowedPaths {
  readonly dirs: readonly string[];
  readonly files: readonly string[];

  constructor({ dirs, files }: { dirs: readonly string[]; files: readonly string[] }) {
    this.dirs = dirs;
    this.files = files;
  }
}

interface CleanOptions {
  repoRoot?: string;
  aiskHome?: string;
  /** Used only for path validation — not scanned. */
  claudeSkillsDir?: string;
  bashrcPath?: string;
  /** Suppress informational output. Used when called from within Publish. */
  quiet?: boolean;
}

export class Clean {
  private readonly repoRoot: string;
  private readonly aiskHome: string;
  private readonly bashrcPath: string;
  private readonly quiet: boolean;
  private readonly allowed: AllowedPaths;

  constructor({ repoRoot, aiskHome, claudeSkillsDir, bashrcPath, quiet }: CleanOptions = {}) {
    this.repoRoot = repoRoot ?? resolve(__dirname, "..");
    this.aiskHome = aiskHome ?? join(homedir(), ".aisk");
    this.bashrcPath = bashrcPath ?? join(homedir(), ".bashrc");
    this.quiet = quiet ?? false;
    this.allowed = new AllowedPaths({
      dirs: [
        resolve(this.aiskHome), // ~/.aisk
        resolve(claudeSkillsDir ?? join(homedir(), ".claude", "skills")), // ~/.claude/skills
      ],
      files: [
        resolve(this.bashrcPath), // ~/.bashrc
      ],
    });
  }

  /** Clean all artifacts recorded in install.log that belong to this repo. */
  run(): void {
    const log = InstallLog.load(InstallLog.logPath(this.aiskHome));

    if (!log) {
      if (!this.quiet) console.log(`Nothing to clean: ~/.aisk/${INSTALL_LOG_FILENAME} not found.`);
      return;
    }

    if (log.repoPath !== this.repoRoot) {
      console.error("Error: install.log was published from a different repo.");
      console.error(`  Expected: ${this.repoRoot}`);
      console.error(`  Found:    ${log.repoPath}`);
      process.exit(1);
    }

    const violations = log.entries.map((e) => this.validateEntry(e)).filter(Boolean) as string[];
    if (violations.length > 0) {
      console.error("Error: install.log contains unsafe entries — aborting clean:");
      for (const v of violations) console.error(`  ${v}`);
      process.exit(1);
    }

    if (!this.quiet) console.log("Cleaning previous install...\n");

    for (const entry of log.entries) {
      switch (entry.type) {
        case "dir":
          rmSync(entry.path, { recursive: true, force: true });
          if (!this.quiet) console.log(`  Removed: ${entry.path}`);
          break;
        case "file":
          rmSync(entry.path, { force: true });
          if (!this.quiet) console.log(`  Removed: ${entry.path}`);
          break;
        case "bashrc":
          if (removePathFromBashrc(entry.path) && !this.quiet) {
            console.log(`  Removed: PATH entry from ${entry.path}`);
          }
          break;
      }
    }

    // Remove empty parent directories left after entry cleanup.
    try {
      rmdirSync(join(this.aiskHome, "units"));
    } catch {
      /* non-empty or absent */
    }
    try {
      rmdirSync(this.aiskHome);
    } catch {
      /* non-empty or absent */
    }

    if (!this.quiet) console.log("\nClean complete.");
  }

  /**
   * Returns a human-readable violation string when the entry falls outside
   * the AllowedPaths allowlist, or null when the entry is safe.
   */
  private validateEntry(entry: InstallEntry): string | null {
    const r = resolve(entry.path);
    switch (entry.type) {
      case "dir":
      case "file":
        return this.allowed.dirs.some((d) => r.startsWith(d + sep))
          ? null
          : `[${entry.type}]    ${entry.path}`;
      case "bashrc":
        return this.allowed.files.includes(r) ? null : `[bashrc] ${entry.path}`;
    }
  }
}

if (require.main === module) {
  new Clean().run();
}
