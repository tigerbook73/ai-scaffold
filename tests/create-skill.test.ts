/**
 * @test-file   create-skill
 * @description Verifies that create-skill correctly handles missing args and invalid inputs
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [1]
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";

const repoRoot = resolve(__dirname, "..");
const tsxBin = join(repoRoot, "node_modules", ".bin", "tsx");
const scriptPath = join(repoRoot, "src", "create-skill", "create-skill.ts");

function run(args: string[]) {
  return spawnSync(tsxBin, [scriptPath, ...args], { encoding: "utf-8" });
}

/**
 * @test-suite  no file argument
 * @target      Validate that the script shows help and exits 0 when no file is provided
 * @strategy    Integration — subprocess invocation, no mocks
 * @cases
 *   - [PASS] exits 0 and prints usage information when called without arguments
 */
test("exits 0 and prints usage when called without arguments", () => {
  const result = run([]);
  expect(result.status).toBe(0);
  expect(result.stdout).toMatch(/Usage/i);
});

/**
 * @test-suite  file not found
 * @target      Validate that the script exits 1 with an error when the source file does not exist
 * @strategy    Integration — subprocess invocation, no mocks
 * @cases
 *   - [FAIL] exits 1 and reports source file not found when a non-existent path is passed
 */
test("exits 1 with source file not found error when file does not exist", () => {
  const result = run(["/tmp/definitely-does-not-exist-aisk.md"]);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/Source file not found/);
});

/**
 * @test-suite  copy with --force
 * @target      Validate that the script copies a skill file and exits 0 when --force is used with a valid source
 * @strategy    Integration — creates a temp skill file, targets this repo's skills/ directory
 * @cases
 *   - [PASS] exits 0 and writes file to skills/ when --force is used with a valid source file
 */
test("exits 0 and writes skill file when --force is used with a valid source", () => {
  const dir = mkdtempSync(join(tmpdir(), "aisk-cs-"));
  const srcFile = join(dir, "SK-test-create-skill-fixture.md");
  writeFileSync(
    srcFile,
    "# test-create-skill-fixture\n\nA fixture skill for testing.\n\n**Steps**\n\n1. Nothing.\n",
  );
  const dstSkillDir = join(repoRoot, "skills", "test-create-skill-fixture");
  try {
    const result = run([srcFile, "--force"]);
    expect(result.status, `stderr: ${result.stderr}`).toBe(0);
    expect(result.stdout).toMatch(/Skill written to/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(dstSkillDir, { recursive: true, force: true });
  }
});
