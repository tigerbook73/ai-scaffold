/**
 * @test-file   setup-claude
 * @description Verifies that ClaudeSetup correctly installs skills into an isolated Claude commands directory
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [2]
 */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

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
      assert.equal(existsSync(join(commandsDir, file)), true, file);
    }

    assert.equal(existsSync(join(commandsDir, "stale.md")), false);
    assert.equal(existsSync(join(commandsDir, "keep.txt")), true);

    const firstEntry = entries[0];
    assert.ok(firstEntry);
    const installed = readFileSync(join(commandsDir, `${firstEntry.name}.md`), "utf-8");
    assert.match(installed, /^---\ndescription: /);
    // closing --- of frontmatter must not be immediately followed by another opening ---
    assert.doesNotMatch(installed, /\n---\n---\n/, "no double frontmatter block");

    // set-claude-permission has source frontmatter — verify it doesn't leak through
    const permInstalled = readFileSync(join(commandsDir, "set-claude-permission.md"), "utf-8");
    assert.doesNotMatch(permInstalled, /^targets:/m);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
