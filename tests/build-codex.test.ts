import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { CodexBuilder } from "../scripts/build-codex";
import { readSkillManifest } from "../scripts/skill-manifest";

interface CodexManifest {
  version: string;
  files: CodexManifestEntry[];
}

interface CodexManifestEntry {
  src: string;
  name: string;
  dst: string;
  description: string;
  shortDescription: string;
  category: string;
}

const repoRoot = process.cwd();

function readCodexManifest(): CodexManifest {
  return JSON.parse(
    readFileSync(join(repoRoot, "codex", "setting.json"), "utf-8"),
  ) as CodexManifest;
}

test("codex manifest is valid and follows target metadata", () => {
  const manifest = readCodexManifest();
  const skillManifest = readSkillManifest(repoRoot);

  assert.equal(manifest.version, "1.0");
  assert.ok(Array.isArray(manifest.files));

  const expectedSources = Object.entries(skillManifest.skills)
    .filter(([, entry]) => entry.targets.codex)
    .map(([src]) => src)
    .sort();

  assert.deepEqual(manifest.files.map((entry) => entry.src).sort(), expectedSources);

  const names = new Set<string>();

  for (const entry of manifest.files) {
    assert.equal(existsSync(join(repoRoot, "skills", entry.src)), true, entry.src);
    assert.match(entry.name, /^aisk-[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(entry.dst, `.codex/skills/${entry.name}/SKILL.md`);
    assert.equal(entry.category, entry.src.split("/")[0]);
    assert.ok(entry.description.trim().length > 0, entry.src);
    assert.ok(entry.shortDescription.trim().length > 0, entry.src);
    assert.equal(names.has(entry.name), false, entry.name);
    names.add(entry.name);
  }

  assert.equal(
    manifest.files.some(
      (entry) => entry.src === "set-claude-permission/SK-set-claude-permission.md",
    ),
    false,
  );
  const taskSkills = [
    "task/SK-create-task.md",
    "task/SK-start-task.md",
    "task/SK-resume-task.md",
    "task/SK-verify-step.md",
    "task/SK-verify-task.md",
    "task/SK-complete-task.md",
  ];
  for (const src of taskSkills) {
    assert.equal(
      manifest.files.some((entry) => entry.src === src),
      true,
      `expected task skill in codex manifest: ${src}`,
    );
  }
});

test("codex builder output is stable and does not modify claude manifest", () => {
  const beforeClaude = readFileSync(join(repoRoot, "claude", "setting.json"), "utf-8");

  new CodexBuilder().run();

  const afterClaude = readFileSync(join(repoRoot, "claude", "setting.json"), "utf-8");
  assert.equal(afterClaude, beforeClaude);

  const firstOutput = readFileSync(join(repoRoot, "codex", "setting.json"), "utf-8");
  new CodexBuilder().run();
  const secondOutput = readFileSync(join(repoRoot, "codex", "setting.json"), "utf-8");
  assert.equal(secondOutput, firstOutput);
});
