/**
 * @test-file   setup-codex
 * @description Verifies that CodexSetup correctly installs skills and transforms content for the Codex format
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [2]
 */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { scanSkills } from "../scripts/scan-skills";
import { CodexSetup, transformCodexSkill } from "../scripts/setup-codex";

const repoRoot = process.cwd();

/**
 * @test-suite  CodexSetup installation
 * @target      Validate that skills are installed with correct Codex SKILL.md format and stale entries removed
 * @strategy    Integration — uses isolated temp directory, real skill scan, no network
 * @cases
 *   - [PASS] all Codex-targeted skills installed with SKILL.md
 *   - [PASS] installed SKILL.md has aisk- prefixed name in frontmatter
 *   - [PASS] installed SKILL.md has description and short-description fields
 *   - [PASS] installed SKILL.md references source path
 *   - [PASS] slash-command usage lines absent from installed SKILL.md
 *   - [PASS] stale aisk- skill directory removed
 *   - [PASS] third-party skill directory preserved
 */
test("codex setup installs skills into an isolated home", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "aisk-codex-setup-"));

  try {
    const codexHome = join(tempRoot, ".codex");
    const skillsDir = join(codexHome, "skills");

    mkdirSync(join(skillsDir, "aisk-stale"), { recursive: true });
    writeFileSync(join(skillsDir, "aisk-stale", "SKILL.md"), "stale");
    mkdirSync(join(skillsDir, "third-party"), { recursive: true });
    writeFileSync(join(skillsDir, "third-party", "SKILL.md"), "keep");

    new CodexSetup({ repoPath: repoRoot, codexHome }).run();

    const entries = scanSkills(repoRoot).filter((e) => e.targets.codex);
    for (const entry of entries) {
      const skillPath = join(skillsDir, entry.codex.name, "SKILL.md");
      assert.equal(existsSync(skillPath), true, entry.codex.name);

      const skill = readFileSync(skillPath, "utf-8");
      assert.match(skill, /^---\nname: aisk-/);
      assert.match(skill, new RegExp(`description: ${JSON.stringify(entry.codex.description)}`));
      assert.match(
        skill,
        new RegExp(`short-description: ${JSON.stringify(entry.codex.shortDescription)}`),
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

/**
 * @test-suite  transformCodexSkill output
 * @target      Validate that Claude slash-command references are correctly replaced in transformed output
 * @strategy    Unit — pure function, no file system access
 * @cases
 *   - [PASS] output contains aisk- prefixed name frontmatter
 *   - [PASS] **Usage**: /aisk/ line removed from output
 *   - [PASS] inline /aisk/ references replaced with aisk- format
 */
test("codex transform removes Claude slash-command usage lines", () => {
  const output = transformCodexSkill(
    "# example\n\nExample skill.\n\n**Usage**: `/aisk/example <path>`\n\nRun `/aisk/check-arch` after changes.\n",
    {
      src: "example/SK-example.md",
      name: "example",
      category: "example",
      targets: { claude: true, codex: true },
      description: "Example skill.",
      codex: {
        name: "aisk-example",
        description: "Use when testing.",
        shortDescription: "Test skill",
      },
    },
  );

  assert.match(output, /^---\nname: aisk-example\n/);
  assert.doesNotMatch(output, /\*\*Usage\*\*:\s*`\/aisk\//);
  assert.match(output, /Run `aisk-check-arch` after changes\./);
});
