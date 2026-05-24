import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { readSkillManifest, validateSkillManifest } from "../scripts/skill-manifest";

const repoRoot = process.cwd();
const skillsDir = join(repoRoot, "skills");

function scanSkillSources(dir: string, base = ""): string[] {
  const result: string[] = [];

  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;

    if (statSync(full).isDirectory()) {
      result.push(...scanSkillSources(full, rel));
    } else if (entry.startsWith("SK-") && entry.endsWith(".md")) {
      result.push(rel);
    }
  }

  return result;
}

test("skill manifest is valid and covers all skill sources", () => {
  const manifest = readSkillManifest(repoRoot);
  const errors = validateSkillManifest(manifest);

  assert.deepEqual(errors, []);

  const sources = scanSkillSources(skillsDir);
  assert.deepEqual(Object.keys(manifest.skills).sort(), sources);

  for (const source of sources) {
    assert.equal(manifest.skills[source].targets.claude, true, `${source} must remain in Claude`);
  }
});

test("initial codex target scope is explicit", () => {
  const manifest = readSkillManifest(repoRoot);

  const codexSources = Object.entries(manifest.skills)
    .filter(([, entry]) => entry.targets.codex)
    .map(([source]) => source)
    .sort();

  assert.deepEqual(codexSources, [
    "arch/SK-check-arch.md",
    "arch/SK-refresh-arch.md",
    "init-project/SK-init-project.md",
    "setup-precommit/SK-setup-precommit.md",
    "smart-review/SK-smart-review.md",
    "task/SK-complete-task.md",
    "task/SK-create-task.md",
    "task/SK-resume-task.md",
    "task/SK-start-task.md",
    "task/SK-verify-step.md",
    "task/SK-verify-task.md",
    "walkthrough/SK-create-walkthrough.md",
    "walkthrough/SK-resume-walkthrough.md",
    "walkthrough/SK-start-walkthrough.md",
  ]);

  for (const source of codexSources) {
    assert.ok(manifest.skills[source].codex?.name.startsWith("aisk-"), source);
  }

  assert.equal(
    manifest.skills["set-claude-permission/SK-set-claude-permission.md"].targets.codex,
    false,
  );
  assert.equal(manifest.skills["create-skill/SK-create-skill.md"].targets.codex, false);
});
