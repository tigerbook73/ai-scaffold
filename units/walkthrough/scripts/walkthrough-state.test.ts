/**
 * @test-file   walkthrough-state
 * @description Verifies all walkthrough-state subcommands: init, read, update, list, find, next, prev, goto, finish, delete
 * @ai-generated
 * @reviewed-by Shengtian Liao @ [2]
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";

const repoRoot = resolve(__dirname, "../../..");
const tsxBin = join(repoRoot, "node_modules", ".bin", "tsx");
const scriptPath = join(__dirname, "walkthrough-state.ts");

const BASE_INDEX = {
  stateKey: "test-branch",
  originalBranch: "main",
  target: "abc123",
  baseline: "main",
  targetRef: "abc123",
  targetHash: "deadbeef1234",
  checkedOut: false,
  intent: "test intent",
  created: "2024-01-01T00:00:00.000Z",
  totalGroups: 3,
  currentGroup: 1,
  status: "active" as const,
  groups: [
    { label: "Group 1", files: ["a.ts"], done: false },
    { label: "Group 2", files: ["b.ts"], done: false },
    { label: "Group 3", files: ["c.ts"], done: false },
  ],
};

function run(args: string[], cwd: string) {
  return spawnSync(tsxBin, [scriptPath, ...args], { cwd, encoding: "utf-8" });
}

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "aisk-wt-"));
}

/**
 * @test-suite  init
 * @target      Validate that init creates index.json with the provided data
 * @strategy    Integration — uses isolated temp directory, no mocks
 * @cases
 *   - [PASS] init creates index.json when called with valid key and index
 */
describe("init", () => {
  test("init creates index.json when called with valid key and index", () => {
    const dir = makeTempDir();
    try {
      const result = run(
        ["init", "--key", "test-branch", "--index", JSON.stringify(BASE_INDEX)],
        dir,
      );
      expect(result.status).toBe(0);
      expect(
        existsSync(join(dir, ".aisk", "walkthrough", "state", "test-branch", "index.json")),
      ).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  read
 * @target      Validate that read prints index.json content to stdout
 * @strategy    Integration — uses isolated temp directory, no mocks
 * @cases
 *   - [PASS] read prints index JSON to stdout when state exists
 *   - [FAIL] read exits 1 when state key does not exist
 */
describe("read", () => {
  test("read prints index JSON to stdout when state exists", () => {
    const dir = makeTempDir();
    try {
      run(["init", "--key", "k", "--index", JSON.stringify(BASE_INDEX)], dir);
      const result = run(["read", "--key", "k"], dir);
      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout) as typeof BASE_INDEX;
      expect(parsed.stateKey).toBe(BASE_INDEX.stateKey);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("read exits 1 when state key does not exist", () => {
    const dir = makeTempDir();
    try {
      const result = run(["read", "--key", "no-such-key"], dir);
      expect(result.status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  update
 * @target      Validate that update overwrites index.json with new content
 * @strategy    Integration — uses isolated temp directory, no mocks
 * @cases
 *   - [PASS] update overwrites index.json when state exists
 */
describe("update", () => {
  test("update overwrites index.json when state exists", () => {
    const dir = makeTempDir();
    try {
      run(["init", "--key", "k", "--index", JSON.stringify(BASE_INDEX)], dir);
      const updated = { ...BASE_INDEX, intent: "updated intent" };
      run(["update", "--key", "k", "--index", JSON.stringify(updated)], dir);
      const result = run(["read", "--key", "k"], dir);
      const parsed = JSON.parse(result.stdout) as typeof BASE_INDEX;
      expect(parsed.intent).toBe("updated intent");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  list
 * @target      Validate that list returns empty array when no states exist and summary when states exist
 * @strategy    Integration — uses isolated temp directory, no mocks
 * @cases
 *   - [PASS] list returns empty array when no states exist
 *   - [PASS] list returns summary entry when a state exists
 */
describe("list", () => {
  test("list returns empty array when no states exist", () => {
    const dir = makeTempDir();
    try {
      const result = run(["list"], dir);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("list returns summary entry when a state exists", () => {
    const dir = makeTempDir();
    try {
      run(["init", "--key", "k", "--index", JSON.stringify(BASE_INDEX)], dir);
      const result = run(["list"], dir);
      const entries = JSON.parse(result.stdout) as { key: string; status: string }[];
      expect(entries.length).toBe(1);
      expect(entries[0].key).toBe("k");
      expect(entries[0].status).toBe("active");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  find
 * @target      Validate that find locates an active state by targetHash
 * @strategy    Integration — uses isolated temp directory, no mocks
 * @cases
 *   - [PASS] find returns active state when hash matches
 *   - [FAIL] find exits 1 when no active state matches the hash
 */
describe("find", () => {
  test("find returns active state when hash matches", () => {
    const dir = makeTempDir();
    try {
      run(["init", "--key", "k", "--index", JSON.stringify(BASE_INDEX)], dir);
      const result = run(["find", "--hash", BASE_INDEX.targetHash], dir);
      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout) as typeof BASE_INDEX;
      expect(parsed.targetHash).toBe(BASE_INDEX.targetHash);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("find exits 1 when no active state matches the hash", () => {
    const dir = makeTempDir();
    try {
      const result = run(["find", "--hash", "nonexistent"], dir);
      expect(result.status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  next
 * @target      Validate that next increments currentGroup and marks the current group done
 * @strategy    Integration — uses isolated temp directory, no mocks
 * @cases
 *   - [PASS] next increments currentGroup and marks current group done when not at last group
 *   - [FAIL] next exits 1 when already at the last group
 */
describe("next", () => {
  test("next increments currentGroup and marks current group done when not at last group", () => {
    const dir = makeTempDir();
    try {
      run(["init", "--key", "k", "--index", JSON.stringify(BASE_INDEX)], dir);
      const result = run(["next", "--key", "k"], dir);
      expect(result.status).toBe(0);
      const state = JSON.parse(run(["read", "--key", "k"], dir).stdout) as typeof BASE_INDEX;
      expect(state.currentGroup).toBe(2);
      expect(state.groups[0].done).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("next exits 1 when already at the last group", () => {
    const dir = makeTempDir();
    try {
      const atLast = { ...BASE_INDEX, currentGroup: 3 };
      run(["init", "--key", "k", "--index", JSON.stringify(atLast)], dir);
      const result = run(["next", "--key", "k"], dir);
      expect(result.status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  prev
 * @target      Validate that prev decrements currentGroup and resets the target group to not-done
 * @strategy    Integration — uses isolated temp directory, no mocks
 * @cases
 *   - [PASS] prev decrements currentGroup and resets group done when not at first group
 *   - [FAIL] prev exits 1 when already at the first group
 */
describe("prev", () => {
  test("prev decrements currentGroup and resets group done when not at first group", () => {
    const dir = makeTempDir();
    try {
      const atSecond = {
        ...BASE_INDEX,
        currentGroup: 2,
        groups: [
          { label: "Group 1", files: ["a.ts"], done: true },
          { label: "Group 2", files: ["b.ts"], done: false },
          { label: "Group 3", files: ["c.ts"], done: false },
        ],
      };
      run(["init", "--key", "k", "--index", JSON.stringify(atSecond)], dir);
      const result = run(["prev", "--key", "k"], dir);
      expect(result.status).toBe(0);
      const state = JSON.parse(run(["read", "--key", "k"], dir).stdout) as typeof BASE_INDEX;
      expect(state.currentGroup).toBe(1);
      expect(state.groups[0].done).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("prev exits 1 when already at the first group", () => {
    const dir = makeTempDir();
    try {
      run(["init", "--key", "k", "--index", JSON.stringify(BASE_INDEX)], dir);
      const result = run(["prev", "--key", "k"], dir);
      expect(result.status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  goto
 * @target      Validate that goto jumps to the specified group and resets its done flag
 * @strategy    Integration — uses isolated temp directory, no mocks
 * @cases
 *   - [PASS] goto sets currentGroup to N and resets that group done to false
 *   - [FAIL] goto exits 1 when target group number is out of range
 */
describe("goto", () => {
  test("goto sets currentGroup to N and resets that group done to false", () => {
    const dir = makeTempDir();
    try {
      const allDone = {
        ...BASE_INDEX,
        groups: [
          { label: "Group 1", files: ["a.ts"], done: true },
          { label: "Group 2", files: ["b.ts"], done: true },
          { label: "Group 3", files: ["c.ts"], done: true },
        ],
      };
      run(["init", "--key", "k", "--index", JSON.stringify(allDone)], dir);
      const result = run(["goto", "--key", "k", "--n", "3"], dir);
      expect(result.status).toBe(0);
      const state = JSON.parse(run(["read", "--key", "k"], dir).stdout) as typeof BASE_INDEX;
      expect(state.currentGroup).toBe(3);
      expect(state.groups[2].done).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("goto exits 1 when target group number is out of range", () => {
    const dir = makeTempDir();
    try {
      run(["init", "--key", "k", "--index", JSON.stringify(BASE_INDEX)], dir);
      const result = run(["goto", "--key", "k", "--n", "99"], dir);
      expect(result.status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  finish
 * @target      Validate that finish sets status to completed without deleting state
 * @strategy    Integration — uses isolated temp directory, no mocks
 * @cases
 *   - [PASS] finish sets status to completed and preserves state directory
 */
describe("finish", () => {
  test("finish sets status to completed and preserves state directory", () => {
    const dir = makeTempDir();
    try {
      run(["init", "--key", "k", "--index", JSON.stringify(BASE_INDEX)], dir);
      const result = run(["finish", "--key", "k"], dir);
      expect(result.status).toBe(0);
      const state = JSON.parse(run(["read", "--key", "k"], dir).stdout) as typeof BASE_INDEX;
      expect(state.status).toBe("completed");
      expect(existsSync(join(dir, ".aisk", "walkthrough", "state", "k"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  delete
 * @target      Validate that delete removes the state directory
 * @strategy    Integration — uses isolated temp directory, no mocks
 * @cases
 *   - [PASS] delete removes state directory when key exists
 *   - [FAIL] delete exits 1 when key does not exist
 */
describe("delete", () => {
  test("delete removes state directory when key exists", () => {
    const dir = makeTempDir();
    try {
      run(["init", "--key", "k", "--index", JSON.stringify(BASE_INDEX)], dir);
      const result = run(["delete", "--key", "k"], dir);
      expect(result.status).toBe(0);
      expect(existsSync(join(dir, ".aisk", "walkthrough", "state", "k"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("delete exits 1 when key does not exist", () => {
    const dir = makeTempDir();
    try {
      const result = run(["delete", "--key", "no-such-key"], dir);
      expect(result.status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
