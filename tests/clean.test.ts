/**
 * @test-file   clean
 * @description Verifies Clean reads install.log and removes only recorded artifacts: unit dirs, global dir, claude skill dirs, files, and AISK block from .bashrc; stale files outside the log are preserved; entries outside allowed dirs/files abort the entire clean
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY): Shengtian Liao @ [2]
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { Clean } from "../scripts/clean";
import { InstallLog, type InstallEntry, INSTALL_LOG_FILENAME } from "../scripts/libs/install-log";
import { AISK_BLOCK_START, AISK_BLOCK_END, AISK_PATH_LINE } from "../scripts/libs/bashrc";

const AISK_BLOCK = `${AISK_BLOCK_START}\n${AISK_PATH_LINE}\n${AISK_BLOCK_END}`;

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "aisk-clean-"));
}

function writeInstallLog(dir: string, entries: InstallEntry[], repoPath = dir): void {
  mkdirSync(join(dir, ".aisk"), { recursive: true });
  const log = InstallLog.create(join(dir, ".aisk", INSTALL_LOG_FILENAME), repoPath);
  for (const entry of entries) log.add(entry);
  log.write(); // also appends install.log itself as the last entry
}

function makeClean(dir: string): Clean {
  return new Clean({
    repoRoot: dir,
    aiskHome: join(dir, ".aisk"),
    claudeSkillsDir: join(dir, ".claude", "skills"),
    bashrcPath: join(dir, ".bashrc"),
  });
}

/**
 * @test-suite  Clean.run()
 * @target      Clean.run()
 * @strategy    integration; isolated temp dirs
 * @cases
 *   - [PASS] removes only log-recorded artifacts, preserving stale files outside the log
 *   - [PASS] does nothing when install.log is absent
 *   - [PASS] exits before removing files when install.log belongs to another repo
 *   - [PASS] removes only the AISK block, preserving surrounding .bashrc content
 *   - [PASS] collapses excess blank lines left after block removal
 *   - [PASS] skips .bashrc cleanup when AISK block is absent
 *   - [PASS] skips .bashrc cleanup when .bashrc does not exist
 *   - [PASS] removes install.log itself after processing all entries
 */
describe("Clean.run()", () => {
  test("removes only log-recorded artifacts, preserving stale files outside the log", () => {
    const dir = makeTempDir();
    try {
      // Create dirs/files that represent a published install
      mkdirSync(join(dir, ".aisk", "units", "poc"), { recursive: true });
      mkdirSync(join(dir, ".aisk", "global"), { recursive: true });
      writeFileSync(join(dir, ".aisk", "units.json"), "[]");
      writeFileSync(join(dir, ".aisk", "config.json"), "{}");
      writeFileSync(join(dir, ".aisk", "stale.txt"), "stale"); // NOT in log
      mkdirSync(join(dir, ".claude", "skills", "aisk-setup"), { recursive: true });
      mkdirSync(join(dir, ".claude", "skills", "other-skill"), { recursive: true }); // NOT in log
      writeFileSync(join(dir, ".bashrc"), `# header\n\n${AISK_BLOCK}\n`);

      writeInstallLog(dir, [
        { type: "dir", path: join(dir, ".aisk", "units", "poc") },
        { type: "file", path: join(dir, ".aisk", "units.json") },
        { type: "dir", path: join(dir, ".aisk", "global") },
        { type: "dir", path: join(dir, ".claude", "skills", "aisk-setup") },
        { type: "file", path: join(dir, ".aisk", "config.json") },
        { type: "bashrc", path: join(dir, ".bashrc") },
      ]);

      makeClean(dir).run();

      // Recorded artifacts removed
      expect(existsSync(join(dir, ".aisk", "units", "poc"))).toBe(false);
      expect(existsSync(join(dir, ".aisk", "units"))).toBe(false); // empty dir pruned
      expect(existsSync(join(dir, ".aisk", "global"))).toBe(false);
      expect(existsSync(join(dir, ".aisk", "units.json"))).toBe(false);
      expect(existsSync(join(dir, ".aisk", "config.json"))).toBe(false);
      expect(existsSync(join(dir, ".aisk", INSTALL_LOG_FILENAME))).toBe(false);
      expect(existsSync(join(dir, ".claude", "skills", "aisk-setup"))).toBe(false);
      // Stale files outside the log preserved
      expect(existsSync(join(dir, ".aisk", "stale.txt"))).toBe(true);
      expect(existsSync(join(dir, ".claude", "skills", "other-skill"))).toBe(true);
      expect(readFileSync(join(dir, ".bashrc"), "utf8")).not.toContain(AISK_BLOCK_START);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("does nothing when install.log is absent", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, ".claude", "skills", "aisk-setup"), { recursive: true });

      makeClean(dir).run();

      expect(existsSync(join(dir, ".claude", "skills", "aisk-setup"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("exits before removing files when install.log belongs to another repo", () => {
    const dir = makeTempDir();
    const originalExit = process.exit;
    try {
      mkdirSync(join(dir, ".claude", "skills", "aisk-setup"), { recursive: true });
      writeInstallLog(dir, [], join(dir, "other-repo"));

      process.exit = ((code?: string | number | null | undefined): never => {
        throw new Error(`process.exit: ${code}`);
      }) as typeof process.exit;

      expect(() => makeClean(dir).run()).toThrow("process.exit: 1");
      expect(existsSync(join(dir, ".aisk", INSTALL_LOG_FILENAME))).toBe(true);
      expect(existsSync(join(dir, ".claude", "skills", "aisk-setup"))).toBe(true);
    } finally {
      process.exit = originalExit;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("removes only the AISK block, preserving surrounding .bashrc content", () => {
    const dir = makeTempDir();
    try {
      writeFileSync(join(dir, ".bashrc"), `# header\n\n${AISK_BLOCK}\n\nexport FOO=bar\n`);
      writeInstallLog(dir, [{ type: "bashrc", path: join(dir, ".bashrc") }]);

      makeClean(dir).run();

      const result = readFileSync(join(dir, ".bashrc"), "utf8");
      expect(result).not.toContain(AISK_BLOCK_START);
      expect(result).toContain("# header");
      expect(result).toContain("export FOO=bar");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("collapses excess blank lines left after block removal", () => {
    const dir = makeTempDir();
    try {
      // Two blank lines above and below the block → would leave 4 consecutive newlines
      writeFileSync(join(dir, ".bashrc"), `# before\n\n\n${AISK_BLOCK}\n\n\n# after\n`);
      writeInstallLog(dir, [{ type: "bashrc", path: join(dir, ".bashrc") }]);

      makeClean(dir).run();

      const result = readFileSync(join(dir, ".bashrc"), "utf8");
      expect(result).not.toContain(AISK_BLOCK_START);
      expect(result).not.toMatch(/\n{3,}/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skips .bashrc cleanup when AISK block is absent", () => {
    const dir = makeTempDir();
    try {
      const original = "# no aisk block here\n";
      writeFileSync(join(dir, ".bashrc"), original);
      writeInstallLog(dir, [{ type: "bashrc", path: join(dir, ".bashrc") }]);

      makeClean(dir).run();

      expect(readFileSync(join(dir, ".bashrc"), "utf8")).toBe(original);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skips .bashrc cleanup when .bashrc does not exist", () => {
    const dir = makeTempDir();
    try {
      writeInstallLog(dir, [{ type: "bashrc", path: join(dir, ".bashrc") }]);

      expect(() => makeClean(dir).run()).not.toThrow();
      expect(existsSync(join(dir, ".bashrc"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("removes install.log itself after processing all entries", () => {
    const dir = makeTempDir();
    try {
      writeInstallLog(dir, []);

      makeClean(dir).run();

      expect(existsSync(join(dir, ".aisk", INSTALL_LOG_FILENAME))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  Clean path validation
 * @target      Clean.run() → validateEntry(): rejects entries outside AllowedPaths before any deletion
 * @strategy    integration; isolated temp dirs
 * @cases
 *   - [PASS] aborts without deleting when a dir entry is outside all allowed base dirs
 *   - [PASS] aborts without deleting when a file entry is outside all allowed base dirs
 *   - [PASS] aborts without deleting when a bashrc entry does not match configured bashrcPath
 *   - [PASS] accepts a dir entry under claudeSkillsDir regardless of basename prefix
 */
describe("Clean path validation", () => {
  test("aborts without deleting when a dir entry is outside all allowed base dirs", () => {
    const dir = makeTempDir();
    const originalExit = process.exit;
    try {
      mkdirSync(join(dir, ".aisk", "units", "poc"), { recursive: true });
      writeInstallLog(dir, [
        { type: "dir", path: join(dir, ".aisk", "units", "poc") },
        { type: "dir", path: join(dir, "outside-safe-dir") }, // not under any allowed dir
      ]);

      process.exit = ((code?: string | number | null | undefined): never => {
        throw new Error(`process.exit: ${code}`);
      }) as typeof process.exit;

      expect(() => makeClean(dir).run()).toThrow("process.exit: 1");
      // Nothing deleted — validation aborts before any removal
      expect(existsSync(join(dir, ".aisk", "units", "poc"))).toBe(true);
    } finally {
      process.exit = originalExit;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("aborts without deleting when a file entry is outside all allowed base dirs", () => {
    const dir = makeTempDir();
    const originalExit = process.exit;
    try {
      writeFileSync(join(dir, "important.txt"), "keep me");
      writeInstallLog(dir, [
        { type: "file", path: join(dir, "important.txt") }, // not under any allowed dir
      ]);

      process.exit = ((code?: string | number | null | undefined): never => {
        throw new Error(`process.exit: ${code}`);
      }) as typeof process.exit;

      expect(() => makeClean(dir).run()).toThrow("process.exit: 1");
      expect(existsSync(join(dir, "important.txt"))).toBe(true);
    } finally {
      process.exit = originalExit;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("aborts without deleting when a bashrc entry does not match configured bashrcPath", () => {
    const dir = makeTempDir();
    const originalExit = process.exit;
    try {
      writeFileSync(join(dir, ".zshrc"), "# zsh config");
      writeInstallLog(dir, [
        { type: "bashrc", path: join(dir, ".zshrc") }, // not the configured bashrcPath
      ]);

      process.exit = ((code?: string | number | null | undefined): never => {
        throw new Error(`process.exit: ${code}`);
      }) as typeof process.exit;

      expect(() => makeClean(dir).run()).toThrow("process.exit: 1");
      expect(existsSync(join(dir, ".zshrc"))).toBe(true);
    } finally {
      process.exit = originalExit;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts a dir entry under claudeSkillsDir regardless of basename prefix", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, ".claude", "skills", "aisk-my-skill"), { recursive: true });
      mkdirSync(join(dir, ".claude", "skills", "other-plugin"), { recursive: true });
      writeInstallLog(dir, [
        { type: "dir", path: join(dir, ".claude", "skills", "aisk-my-skill") },
        { type: "dir", path: join(dir, ".claude", "skills", "other-plugin") },
      ]);

      expect(() => makeClean(dir).run()).not.toThrow();
      expect(existsSync(join(dir, ".claude", "skills", "aisk-my-skill"))).toBe(false);
      expect(existsSync(join(dir, ".claude", "skills", "other-plugin"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
