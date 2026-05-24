import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { CodexSetup, transformCodexSkill } from "../scripts/setup-codex";

interface CodexManifest {
  files: Array<{
    src: string;
    name: string;
    description: string;
    shortDescription: string;
  }>;
}

const repoRoot = process.cwd();

function readManifest(): CodexManifest {
  return JSON.parse(
    readFileSync(join(repoRoot, "codex", "setting.json"), "utf-8"),
  ) as CodexManifest;
}

test("codex setup installs skills into an isolated home", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "aisk-codex-setup-"));

  try {
    const aiSkillsHome = join(tempRoot, ".ai-skills");
    const codexHome = join(tempRoot, ".codex");
    const skillsDir = join(codexHome, "skills");

    mkdirSync(join(skillsDir, "aisk-stale"), { recursive: true });
    writeFileSync(join(skillsDir, "aisk-stale", "SKILL.md"), "stale");
    mkdirSync(join(skillsDir, "third-party"), { recursive: true });
    writeFileSync(join(skillsDir, "third-party", "SKILL.md"), "keep");

    new CodexSetup({ repoPath: repoRoot, aiSkillsHome, codexHome }).run();

    const config = JSON.parse(readFileSync(join(aiSkillsHome, "config.json"), "utf-8")) as {
      repo: string;
    };
    assert.equal(config.repo, repoRoot);

    const manifest = readManifest();
    for (const entry of manifest.files) {
      const skillPath = join(skillsDir, entry.name, "SKILL.md");
      assert.equal(existsSync(skillPath), true, entry.name);

      const skill = readFileSync(skillPath, "utf-8");
      assert.match(skill, /^---\nname: aisk-/);
      assert.match(skill, new RegExp(`description: ${JSON.stringify(entry.description)}`));
      assert.match(
        skill,
        new RegExp(`short-description: ${JSON.stringify(entry.shortDescription)}`),
      );
      assert.match(skill, new RegExp(`Source: skills/${entry.src}`));
      assert.doesNotMatch(skill, /\*\*Usage\*\*:\s*`\/aisk\//);
    }

    assert.equal(existsSync(join(skillsDir, "aisk-stale")), false);
    assert.equal(existsSync(join(skillsDir, "third-party", "SKILL.md")), true);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("codex transform removes Claude slash-command usage lines", () => {
  const output = transformCodexSkill(
    "# example\n\nExample skill.\n\n**Usage**: `/aisk/example <path>`\n\nRun `/aisk/check-arch` after changes.\n",
    {
      src: "example/SK-example.md",
      name: "aisk-example",
      dst: ".codex/skills/aisk-example/SKILL.md",
      description: "Use when testing.",
      shortDescription: "Test skill",
    },
  );

  assert.match(output, /^---\nname: aisk-example\n/);
  assert.doesNotMatch(output, /\*\*Usage\*\*:\s*`\/aisk\//);
  assert.match(output, /Run `aisk-check-arch` after changes\./);
});
