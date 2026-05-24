import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

interface ClaudeManifest {
  version: string;
  files: ClaudeManifestEntry[];
}

interface ClaudeManifestEntry {
  src: string;
  dst: string;
  description: string;
  category: string;
}

const repoRoot = process.cwd();
const manifestPath = join(repoRoot, "claude", "setting.json");

function readManifest(): ClaudeManifest {
  return JSON.parse(readFileSync(manifestPath, "utf-8")) as ClaudeManifest;
}

test("claude manifest is valid and points to existing skill sources", () => {
  assert.equal(existsSync(manifestPath), true);

  const manifest = readManifest();

  assert.equal(manifest.version, "1.0");
  assert.ok(Array.isArray(manifest.files));
  assert.ok(manifest.files.length > 0);

  const destinations = new Set<string>();

  for (const entry of manifest.files) {
    assert.match(entry.src, /\.md$/);
    assert.doesNotMatch(entry.src, /(^|\/)README\.md$/);
    assert.doesNotMatch(entry.src, /(^|\/)resource\//);
    assert.equal(existsSync(join(repoRoot, "skills", entry.src)), true, entry.src);

    assert.match(entry.dst, /^\.claude\/commands\/aisk\/.+\.md$/);
    assert.equal(destinations.has(entry.dst), false, entry.dst);
    destinations.add(entry.dst);

    assert.ok(entry.description.trim().length > 0, entry.src);
    assert.ok(entry.category.trim().length > 0, entry.src);
    assert.equal(entry.category, entry.src.split("/")[0]);
  }
});
