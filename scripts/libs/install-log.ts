import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";

export type InstallEntry =
  | { type: "dir"; path: string }
  | { type: "file"; path: string }
  | { type: "bashrc"; path: string };

interface InstallLogData {
  repoPath: string;
  publishedAt: string;
  entries: InstallEntry[];
}

export const INSTALL_LOG_FILENAME = "install.log";

export class InstallLog {
  readonly repoPath: string;
  readonly publishedAt: string;
  private _entries: InstallEntry[];
  private readonly logPath: string;

  private constructor(
    logPath: string,
    repoPath: string,
    publishedAt: string,
    entries: InstallEntry[],
  ) {
    this.logPath = logPath;
    this.repoPath = repoPath;
    this.publishedAt = publishedAt;
    this._entries = entries;
  }

  /** Create a fresh empty log for a new publish session. */
  static create(logPath: string, repoPath: string): InstallLog {
    return new InstallLog(logPath, repoPath, new Date().toISOString(), []);
  }

  /** Load an existing log from disk. Returns null if the file does not exist. */
  static load(logPath: string): InstallLog | null {
    if (!existsSync(logPath)) return null;
    const data = JSON.parse(readFileSync(logPath, "utf8")) as InstallLogData;
    return new InstallLog(logPath, data.repoPath, data.publishedAt, data.entries);
  }

  /** Append a persistent operation entry. */
  add(entry: InstallEntry): void {
    this._entries.push(entry);
  }

  /** All recorded entries (read-only). */
  get entries(): ReadonlyArray<InstallEntry> {
    return this._entries;
  }

  /**
   * Write the log to disk.
   *
   * The log file itself is automatically appended as the final entry so that
   * clean can remove it through normal entry processing.
   */
  write(): void {
    mkdirSync(dirname(this.logPath), { recursive: true });
    const data: InstallLogData = {
      repoPath: this.repoPath,
      publishedAt: this.publishedAt,
      entries: [...this._entries, { type: "file", path: this.logPath }],
    };
    writeFileSync(this.logPath, JSON.stringify(data, null, 2) + "\n");
  }

  /** Delete the log file from disk. */
  remove(): void {
    rmSync(this.logPath, { force: true });
  }

  /** Absolute path to the log file. */
  get path(): string {
    return this.logPath;
  }

  /** Convenience factory: join aiskHome with the standard filename. */
  static logPath(aiskHome: string): string {
    return join(aiskHome, INSTALL_LOG_FILENAME);
  }
}
