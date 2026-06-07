/**
 * @test-file   setup-claude
 * @description Verifies that ClaudeSetup correctly installs skills into an isolated Claude commands directory
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [2]
 */
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

import { scanSkills } from "../scripts/scan-skills";
import { ClaudeSetup } from "../scripts/setup-claude";

const repoRoot = process.cwd();

/**
 * @test-suite  ClaudeSetup installation
 * @target      Validate that skills are installed, stale commands removed, and config written correctly
 * @strategy    Integration — uses isolated temp directory, real skill scan, no network
 * @cases
 *   - [PASS] all Claude-targeted skills installed as .md files
 *   - [PASS] stale .md command removed from target directory
 *   - [PASS] non-.md files preserved in commands directory
 *   - [PASS] installed skill file has description frontmatter header
 *   - [PASS] double frontmatter block absent from installed skill
 *   - [PASS] set-claude-permission source targets field does not appear in installed file
 */
test("claude setup installs commands into an isolated home", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "aisk-claude-setup-"));

  try {
    const claudeHome = join(tempRoot, ".claude");
    const commandsDir = join(claudeHome, "commands", "aisk");

    mkdirSync(commandsDir, { recursive: true });
    writeFileSync(join(commandsDir, "stale.md"), "stale");
    writeFileSync(join(commandsDir, "keep.txt"), "not a command");

    new ClaudeSetup({ repoPath: repoRoot, claudeHome }).run();

    const entries = scanSkills(repoRoot).filter((e) => e.targets.claude);
    for (const entry of entries) {
      const file = `${entry.name}.md`;
      expect(existsSync(join(commandsDir, file)), file).toBe(true);
    }

    expect(existsSync(join(commandsDir, "stale.md"))).toBe(false);
    expect(existsSync(join(commandsDir, "keep.txt"))).toBe(true);

    const firstEntry = entries[0];
    expect(firstEntry).toBeTruthy();
    const installed = readFileSync(join(commandsDir, `${firstEntry.name}.md`), "utf-8");
    expect(installed).toMatch(/^---\ndescription: /);
    expect(installed).not.toMatch(/\n---\n---\n/);

    const permInstalled = readFileSync(join(commandsDir, "set-claude-permission.md"), "utf-8");
    expect(permInstalled).not.toMatch(/^targets:/m);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
