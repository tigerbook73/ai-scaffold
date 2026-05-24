import assert from "node:assert/strict";
import test from "node:test";

import { scanSkills } from "../scripts/scan-skills";

const repoRoot = process.cwd();

test("set-claude-permission is claude-only", () => {
  const entries = scanSkills(repoRoot);
  const perm = entries.find((e) => e.name === "set-claude-permission");
  assert.ok(perm, "set-claude-permission not found");
  assert.equal(perm.targets.claude, true);
  assert.equal(perm.targets.codex, false);
});

test("all other skills are dual-target", () => {
  const entries = scanSkills(repoRoot);
  for (const entry of entries) {
    if (entry.name === "set-claude-permission") continue;
    assert.equal(entry.targets.claude, true, `${entry.src} must target claude`);
    assert.equal(entry.targets.codex, true, `${entry.src} must target codex`);
  }
});

test("codex names follow aisk- convention", () => {
  const entries = scanSkills(repoRoot).filter((e) => e.targets.codex);
  const names = new Set<string>();
  for (const entry of entries) {
    assert.match(entry.codex.name, /^aisk-[a-z0-9]+(?:-[a-z0-9]+)*$/, entry.src);
    assert.equal(names.has(entry.codex.name), false, `duplicate name: ${entry.codex.name}`);
    names.add(entry.codex.name);
    assert.ok(entry.codex.description.trim().length > 0, `${entry.src} missing codex description`);
    assert.ok(
      entry.codex.shortDescription.trim().length > 0,
      `${entry.src} missing shortDescription`,
    );
  }
});

test("codex scope excludes set-claude-permission", () => {
  const entries = scanSkills(repoRoot).filter((e) => e.targets.codex);
  assert.equal(
    entries.some((e) => e.name === "set-claude-permission"),
    false,
  );
});
