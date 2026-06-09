/**
 * @test-file   precommit-lefthook
 * @description Verifies installer-owned lefthook.yml pre-commit command editing
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY): Shengtian Liao @ [1]
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { addPreCommitHook, removePreCommitHook, updatePreCommitHook } from "./precommit-lefthook";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "aisk-lefthook-"));
}

function readLefthook(dir: string): string {
  return readFileSync(join(dir, "lefthook.yml"), "utf8");
}

/**
 * @test-suite  addPreCommitHook
 * @target      addPreCommitHook()
 * @strategy    unit; isolated temp dirs with real lefthook.yml files
 * @cases
 *   - [PASS] creates lefthook.yml when absent
 *   - [PASS] inserts commands block into existing pre-commit section
 *   - [PASS] is idempotent for an existing command
 *   - [PASS] ignores commented-out pre-commit sections
 */
describe("addPreCommitHook", () => {
  test("creates lefthook.yml when absent", () => {
    const dir = makeTempDir();
    try {
      addPreCommitHook(dir, "aisk-poc-hook", "node .aisk/poc/scripts/poc-hook.js");

      expect(readLefthook(dir)).toBe(
        [
          "pre-commit:",
          "  commands:",
          "    aisk-poc-hook:",
          "      run: node .aisk/poc/scripts/poc-hook.js",
          "",
        ].join("\n"),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("inserts commands block into existing pre-commit section", () => {
    const dir = makeTempDir();
    try {
      writeFileSync(join(dir, "lefthook.yml"), "pre-commit:\n  parallel: true\ncommit-msg:\n");

      addPreCommitHook(dir, "aisk-poc-hook", "node hook.js");

      expect(readLefthook(dir)).toBe(
        "pre-commit:\n  commands:\n    aisk-poc-hook:\n      run: node hook.js\n  parallel: true\ncommit-msg:\n",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("is idempotent for an existing command", () => {
    const dir = makeTempDir();
    try {
      addPreCommitHook(dir, "aisk-poc-hook", "node hook.js");
      addPreCommitHook(dir, "aisk-poc-hook", "node hook.js");

      expect(readLefthook(dir).match(/aisk-poc-hook/g)).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("ignores commented-out pre-commit sections", () => {
    const dir = makeTempDir();
    try {
      writeFileSync(join(dir, "lefthook.yml"), "# pre-commit:\n#   commands:\ncommit-msg:\n");

      addPreCommitHook(dir, "aisk-poc-hook", "node hook.js");

      expect(readLefthook(dir)).toBe(
        "# pre-commit:\n#   commands:\ncommit-msg:\n\npre-commit:\n  commands:\n    aisk-poc-hook:\n      run: node hook.js\n",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  removePreCommitHook / updatePreCommitHook
 * @target      removePreCommitHook() / updatePreCommitHook()
 * @strategy    unit; scoped edits inside the pre-commit section
 * @cases
 *   - [PASS] removes only the target command
 *   - [PASS] updates only the target run command
 */
describe("removePreCommitHook / updatePreCommitHook", () => {
  test("removes only the target command", () => {
    const dir = makeTempDir();
    try {
      writeFileSync(
        join(dir, "lefthook.yml"),
        [
          "pre-commit:",
          "  commands:",
          "    keep:",
          "      run: node keep.js",
          "    remove-me:",
          "      run: node remove.js",
          "commit-msg:",
          "",
        ].join("\n"),
      );

      removePreCommitHook(dir, "remove-me");

      expect(readLefthook(dir)).toBe(
        [
          "pre-commit:",
          "  commands:",
          "    keep:",
          "      run: node keep.js",
          "commit-msg:",
          "",
        ].join("\n"),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("updates only the target run command", () => {
    const dir = makeTempDir();
    try {
      writeFileSync(
        join(dir, "lefthook.yml"),
        [
          "pre-commit:",
          "  commands:",
          "    keep:",
          "      run: node keep.js",
          "    update-me:",
          "      run: node old.js",
          "",
        ].join("\n"),
      );

      updatePreCommitHook(dir, "update-me", "node new.js");

      expect(readLefthook(dir)).toBe(
        [
          "pre-commit:",
          "  commands:",
          "    keep:",
          "      run: node keep.js",
          "    update-me:",
          "      run: node new.js",
          "",
        ].join("\n"),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
