/**
 * @test-file   setup
 * @description Verifies that installSymlink correctly creates or replaces ~/.sk-skills
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [1]
 */
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { expect, test } from "vitest";

import { installSymlink } from "../scripts/setup";

const repoRoot = resolve(__dirname, "..");

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "aisk-setup-symlink-"));
}

/**
 * @test-suite  installSymlink — link does not exist
 * @target      Validate that a symlink pointing to the repo is created when the path is absent
 * @strategy    Integration — uses isolated temp directory, no mocks
 * @cases
 *   - [PASS] creates a symlink pointing to the repo root when link path does not exist
 */
test("creates symlink pointing to repo when link path does not exist", () => {
  const dir = makeTempDir();
  const linkPath = join(dir, ".sk-skills");
  try {
    installSymlink(linkPath);
    expect(lstatSync(linkPath).isSymbolicLink(), "must be a symlink").toBe(true);
    expect(realpathSync(linkPath)).toBe(repoRoot);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  installSymlink — link already exists as symlink
 * @target      Validate that an existing symlink is replaced with one pointing to the repo
 * @strategy    Integration — uses isolated temp directory, no mocks
 * @cases
 *   - [PASS] replaces existing symlink with one pointing to the repo root
 */
test("replaces existing symlink when link path already points elsewhere", () => {
  const dir = makeTempDir();
  const linkPath = join(dir, ".sk-skills");
  const otherTarget = join(dir, "other");
  mkdirSync(otherTarget);
  symlinkSync(otherTarget, linkPath);
  try {
    installSymlink(linkPath);
    expect(lstatSync(linkPath).isSymbolicLink(), "must be a symlink").toBe(true);
    expect(realpathSync(linkPath)).toBe(repoRoot);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * @test-suite  installSymlink — link exists as real directory (old version upgrade)
 * @target      Validate that a real directory is removed and replaced with a symlink
 * @strategy    Integration — uses isolated temp directory, no mocks
 * @cases
 *   - [PASS] removes real directory and creates symlink when link path is an existing directory
 */
test("replaces real directory with symlink when link path is an existing directory", () => {
  const dir = makeTempDir();
  const linkPath = join(dir, ".sk-skills");
  mkdirSync(linkPath);
  writeFileSync(join(linkPath, "old-file.txt"), "old content");
  try {
    installSymlink(linkPath);
    expect(lstatSync(linkPath).isSymbolicLink(), "must be a symlink").toBe(true);
    expect(realpathSync(linkPath)).toBe(repoRoot);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
