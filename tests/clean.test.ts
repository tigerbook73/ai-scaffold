/**
 * @test-file   clean
 * @description Verifies Clean removes globally published AISK artifacts for supported agents
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY): Shengtian Liao @ [1]
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { Clean } from "../scripts/clean";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "aisk-clean-"));
}

function writeConfig(dir: string, repoPath = dir): void {
  mkdirSync(join(dir, ".aisk"), { recursive: true });
  writeFileSync(
    join(dir, ".aisk", "config.json"),
    JSON.stringify({ repoPath, publishedAt: "2026-06-08T00:00:00.000Z" }, null, 2),
  );
}

function makeClean(dir: string): Clean {
  return new Clean({
    repoRoot: dir,
    aiskHome: join(dir, ".aisk"),
    claudeSkillsDir: join(dir, ".claude", "skills"),
  });
}

/**
 * @test-suite  Clean.run()
 * @target      Clean.run()
 * @strategy    integration; isolated temp dirs
 * @cases
 *   - [PASS] removes published AISK artifacts for Claude only
 *   - [PASS] does nothing when config.json is absent
 *   - [PASS] exits before removing files when config belongs to another repo
 */
describe("Clean.run()", () => {
  test("removes published AISK artifacts for Claude only", () => {
    const dir = makeTempDir();
    try {
      writeConfig(dir);
      mkdirSync(join(dir, ".aisk", "units", "poc"), { recursive: true });
      mkdirSync(join(dir, ".aisk", "global"), { recursive: true });
      writeFileSync(join(dir, ".aisk", "units.json"), "[]");
      writeFileSync(join(dir, ".aisk", "stale.txt"), "stale");
      mkdirSync(join(dir, ".claude", "skills", "aisk-setup"), { recursive: true });
      mkdirSync(join(dir, ".claude", "skills", "other-skill"), { recursive: true });

      makeClean(dir).run();

      expect(existsSync(join(dir, ".aisk", "units"))).toBe(false);
      expect(existsSync(join(dir, ".aisk", "global"))).toBe(false);
      expect(existsSync(join(dir, ".aisk", "units.json"))).toBe(false);
      expect(existsSync(join(dir, ".aisk", "stale.txt"))).toBe(false);
      expect(existsSync(join(dir, ".aisk", "config.json"))).toBe(false);
      expect(readdirSync(join(dir, ".aisk"))).toEqual([]);
      expect(existsSync(join(dir, ".claude", "skills", "aisk-setup"))).toBe(false);
      expect(existsSync(join(dir, ".claude", "skills", "other-skill"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("does nothing when config.json is absent", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, ".claude", "skills", "aisk-setup"), { recursive: true });

      makeClean(dir).run();

      expect(existsSync(join(dir, ".claude", "skills", "aisk-setup"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("exits before removing files when config belongs to another repo", () => {
    const dir = makeTempDir();
    const originalExit = process.exit;
    try {
      writeConfig(dir, join(dir, "other-repo"));
      mkdirSync(join(dir, ".claude", "skills", "aisk-setup"), { recursive: true });

      process.exit = ((code?: string | number | null | undefined): never => {
        throw new Error(`process.exit: ${code}`);
      }) as typeof process.exit;

      expect(() => makeClean(dir).run()).toThrow("process.exit: 1");
      expect(readFileSync(join(dir, ".aisk", "config.json"), "utf8")).toContain("other-repo");
      expect(existsSync(join(dir, ".claude", "skills", "aisk-setup"))).toBe(true);
    } finally {
      process.exit = originalExit;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
