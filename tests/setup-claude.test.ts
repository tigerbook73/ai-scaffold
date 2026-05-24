import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { ClaudeSetup } from "../scripts/setup-claude";

interface ClaudeManifest {
  files: Array<{
    dst: string;
    description?: string;
  }>;
}

const repoRoot = process.cwd();

function readManifest(): ClaudeManifest {
  return JSON.parse(
    readFileSync(join(repoRoot, "claude", "setting.json"), "utf-8"),
  ) as ClaudeManifest;
}

function basenameFromDst(dst: string): string {
  const parts = dst.split("/");
  return parts[parts.length - 1];
}

test("claude setup installs commands into an isolated home", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "aisk-claude-setup-"));

  try {
    const aiSkillsHome = join(tempRoot, ".ai-skills");
    const claudeHome = join(tempRoot, ".claude");
    const commandsDir = join(claudeHome, "commands", "aisk");

    mkdirSync(commandsDir, { recursive: true });
    writeFileSync(join(commandsDir, "stale.md"), "stale");
    writeFileSync(join(commandsDir, "keep.txt"), "not a command");

    new ClaudeSetup({ repoPath: repoRoot, aiSkillsHome, claudeHome }).run();

    const config = JSON.parse(readFileSync(join(aiSkillsHome, "config.json"), "utf-8")) as {
      repo: string;
    };
    assert.equal(config.repo, repoRoot);

    const manifest = readManifest();
    const expectedFiles = manifest.files.map((entry) => basenameFromDst(entry.dst));

    for (const file of expectedFiles) {
      assert.equal(existsSync(join(commandsDir, file)), true, file);
    }

    assert.equal(existsSync(join(commandsDir, "stale.md")), false);
    assert.equal(existsSync(join(commandsDir, "keep.txt")), true);

    const firstEntry = manifest.files.find((entry) => entry.description);
    assert.ok(firstEntry);
    const installed = readFileSync(join(commandsDir, basenameFromDst(firstEntry.dst)), "utf-8");
    assert.match(installed, /^---\ndescription: /);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
