/**
 * @test-file   register
 * @description Verifies bin/aisk-register.ts's register()/unregister() functions:
 *              global naming collapse, resources/scripts symlinking, skipping
 *              local units, registry record read/write, idempotency, and
 *              registry-driven cleanup of stale entries.
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { register, unregister } from "../bin/aisk-register";
import {
  addGlobalUnitWithDifferentSkillName,
  addLocalUnit,
  globalSkillsDirFor,
  makeFakeAiskHome,
  makeTempDir,
} from "./helpers/fixtures";

/**
 * @test-suite  register
 * @target      register()
 * @strategy    unit; fake aiskHome tree; isolated globalSkillsDir
 * @cases
 *   - [PASS] collapses aisk-{unit}-{skill} to aisk-{unit} when the skill name equals the unit name
 *   - [PASS] keeps aisk-{unit}-{skill} when the skill name differs from the unit name
 *   - [PASS] symlinks resources/ and scripts/ when the unit declares them
 *   - [PASS] skips local units entirely
 *   - [PASS] writes a registry record listing every registered entry
 *   - [PASS] is idempotent — a second run keeps the same symlinks
 *   - [PASS] cleanup is driven by the registry record: an unrecorded stale aisk-* dir survives
 *   - [PASS] cleanup removes entries that WERE in the previous registry record
 */
describe("register", () => {
  test("collapses aisk-{unit}-{skill} to aisk-{unit} when the skill name equals the unit name", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);

      register(aiskHome, globalSkillsDirFor(dir));

      const skillLink = join(globalSkillsDirFor(dir), "aisk-poc", "SKILL.md");
      expect(lstatSync(skillLink).isSymbolicLink()).toBe(true);
      expect(readlinkSync(skillLink)).toBe(join(aiskHome, "units", "poc", "skills", "poc.md"));
      expect(existsSync(join(globalSkillsDirFor(dir), "aisk-poc-poc"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("keeps aisk-{unit}-{skill} when the skill name differs from the unit name", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addGlobalUnitWithDifferentSkillName(aiskHome, "walkthrough", "create-walkthrough");

      register(aiskHome, globalSkillsDirFor(dir));

      const skillLink = join(
        globalSkillsDirFor(dir),
        "aisk-walkthrough-create-walkthrough",
        "SKILL.md",
      );
      expect(lstatSync(skillLink).isSymbolicLink()).toBe(true);
      expect(existsSync(join(globalSkillsDirFor(dir), "aisk-walkthrough"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("symlinks resources/ and scripts/ when the unit declares them", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);

      register(aiskHome, globalSkillsDirFor(dir));

      const skillDir = join(globalSkillsDirFor(dir), "aisk-poc");
      expect(readlinkSync(join(skillDir, "resources"))).toBe(
        join(aiskHome, "units", "poc", "resources"),
      );
      expect(readlinkSync(join(skillDir, "scripts"))).toBe(
        join(aiskHome, "units", "poc", "scripts"),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skips local units entirely", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });

      const result = register(aiskHome, globalSkillsDirFor(dir));

      expect(result.skippedLocal).toContain("loc");
      expect(existsSync(join(globalSkillsDirFor(dir), "aisk-loc"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("writes a registry record listing every registered entry", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);

      register(aiskHome, globalSkillsDirFor(dir));

      const registry = JSON.parse(
        readFileSync(join(globalSkillsDirFor(dir), ".aisk-registry.json"), "utf8"),
      ) as { entries: Array<{ unit: string; dir: string }> };
      expect(registry.entries.some((e) => e.unit === "poc")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("is idempotent — a second run keeps the same symlinks", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);

      register(aiskHome, globalSkillsDirFor(dir));
      register(aiskHome, globalSkillsDirFor(dir));

      const skillLink = join(globalSkillsDirFor(dir), "aisk-poc", "SKILL.md");
      expect(lstatSync(skillLink).isSymbolicLink()).toBe(true);
      expect(readlinkSync(skillLink)).toBe(join(aiskHome, "units", "poc", "skills", "poc.md"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("cleanup is driven by the registry record: an unrecorded stale aisk-* dir survives", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const staleDir = join(globalSkillsDirFor(dir), "aisk-never-registered");
      mkdirSync(staleDir, { recursive: true });
      writeFileSync(join(staleDir, "SKILL.md"), "not tracked by any registry record");

      register(aiskHome, globalSkillsDirFor(dir));

      expect(existsSync(staleDir), "unrecorded aisk-* dirs are not swept").toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("cleanup removes entries that WERE in the previous registry record", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);

      register(aiskHome, globalSkillsDirFor(dir));
      const oldSkillDir = join(globalSkillsDirFor(dir), "aisk-poc");
      expect(existsSync(oldSkillDir)).toBe(true);

      // Rename the unit's skill so the next register() no longer produces aisk-poc.
      writeFileSync(
        join(aiskHome, "units", "poc", "unit.json"),
        JSON.stringify({
          name: "poc",
          description: "PoC unit",
          dependencies: [],
          components: { skills: [{ name: "renamed", file: "skills/poc.md" }] },
        }),
      );

      const result = register(aiskHome, globalSkillsDirFor(dir));

      expect(existsSync(oldSkillDir), "previously-recorded dir is cleaned up").toBe(false);
      expect(result.unregisteredPrevious.some((e) => e.dir === oldSkillDir)).toBe(true);
      expect(existsSync(join(globalSkillsDirFor(dir), "aisk-poc-renamed"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  unregister
 * @target      unregister()
 * @strategy    unit; fake aiskHome tree
 * @cases
 *   - [PASS] removes every registered directory and deletes the registry file
 *   - [PASS] is a no-op when nothing was ever registered
 */
describe("unregister", () => {
  test("removes every registered directory and deletes the registry file", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);

      register(aiskHome, globalSkillsDirFor(dir));
      expect(existsSync(join(globalSkillsDirFor(dir), "aisk-poc"))).toBe(true);

      unregister(globalSkillsDirFor(dir));

      expect(existsSync(join(globalSkillsDirFor(dir), "aisk-poc"))).toBe(false);
      expect(existsSync(join(globalSkillsDirFor(dir), ".aisk-registry.json"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("is a no-op when nothing was ever registered", () => {
    const dir = makeTempDir();
    try {
      const result = unregister(globalSkillsDirFor(dir));

      expect(result.removed).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
