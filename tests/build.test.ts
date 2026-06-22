/**
 * @test-file   build
 * @description Verifies refreshUnit syncs unit.json from the filesystem while preserving manual fields, checkDependencies validates unit references, and resources/ subdirectories are scanned recursively.
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY): Shengtian Liao @ [2]
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";

import { checkDependencies, refreshUnit } from "../scripts/build";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "aisk-build-"));
}

function writeUnit(dir: string, data: object): void {
  writeFileSync(join(dir, "unit.json"), JSON.stringify(data, null, 2) + "\n");
}

function readUnit(dir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dir, "unit.json"), "utf8")) as Record<string, unknown>;
}

/**
 * @test-suite  refreshUnit — component discovery
 * @target      refreshUnit()
 * @strategy    unit; isolated temp dirs
 * @cases
 *   - [PASS] adds skill entry when file appears in skills/
 *   - [PASS] removes rule entry when file no longer exists in rules/
 */
describe("refreshUnit — component discovery", () => {
  test("adds skill entry when file appears in skills/", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "skills"));
      writeFileSync(join(dir, "skills", "my-skill.md"), "# my-skill");
      writeUnit(dir, { name: "x", description: "d", dependencies: [], components: {} });

      refreshUnit(dir);

      const unit = readUnit(dir);
      expect((unit.components as { skills: unknown[] }).skills).toEqual([
        { name: "my-skill", file: "skills/my-skill.md" },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("removes rule entry when file no longer exists in rules/", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "rules"));
      // no files written — directory is empty
      writeUnit(dir, {
        name: "x",
        description: "d",
        dependencies: [],
        components: { rules: [{ name: "old-rule", file: "rules/old-rule.md" }] },
      });

      refreshUnit(dir);

      const unit = readUnit(dir);
      expect((unit.components as { rules?: unknown[] }).rules).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  refreshUnit — resource subdirectory scanning
 * @target      refreshUnit(): resources/ recursive scan
 * @strategy    unit; isolated temp dirs
 * @cases
 *   - [PASS] discovers resources in subdirectories with path-prefixed names
 *   - [PASS] sorts flat and nested resources together in deterministic order
 */
describe("refreshUnit — resource subdirectory scanning", () => {
  test("discovers resources in subdirectories with path-prefixed names", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "resources", "assets"), { recursive: true });
      writeFileSync(join(dir, "resources", "assets", "progress-template.md"), "template content");
      writeUnit(dir, { name: "x", description: "d", dependencies: [], components: {} });

      refreshUnit(dir);

      const unit = readUnit(dir);
      expect((unit.components as { resources: unknown[] }).resources).toEqual([
        { name: "assets/progress-template", file: "resources/assets/progress-template.md" },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("sorts flat and nested resources together in deterministic order", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "resources", "assets"), { recursive: true });
      writeFileSync(join(dir, "resources", "readme.md"), "readme");
      writeFileSync(join(dir, "resources", "assets", "brief-template.md"), "brief");
      writeFileSync(join(dir, "resources", "assets", "progress-template.md"), "progress");
      writeUnit(dir, { name: "x", description: "d", dependencies: [], components: {} });

      refreshUnit(dir);

      const unit = readUnit(dir);
      expect((unit.components as { resources: unknown[] }).resources).toEqual([
        { name: "assets/brief-template", file: "resources/assets/brief-template.md" },
        { name: "assets/progress-template", file: "resources/assets/progress-template.md" },
        { name: "readme", file: "resources/readme.md" },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  refreshUnit — unit-level defaults
 * @target      refreshUnit()
 * @strategy    unit; isolated temp dirs
 * @cases
 *   - [PASS] derives name from directory name when creating unit.json
 *   - [PASS] defaults dependencies to empty array when absent from existing unit.json
 *   - [PASS] omits hook when no existing entry for the script
 *   - [PASS] ignores test, spec, and nested files when discovering scripts
 */
describe("refreshUnit — unit-level defaults", () => {
  test("derives name from directory name when creating unit.json", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "skills"));
      writeFileSync(join(dir, "skills", "my-skill.md"), "# my-skill");

      refreshUnit(dir);

      const unit = readUnit(dir);
      expect(unit.name).toBe(basename(dir));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("defaults dependencies to empty array when absent from existing unit.json", () => {
    const dir = makeTempDir();
    try {
      writeUnit(dir, { name: "x", description: "d", components: {} });

      refreshUnit(dir);

      const unit = readUnit(dir);
      expect(unit.dependencies).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("omits hook when no existing entry for the script", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "scripts"));
      writeFileSync(join(dir, "scripts", "new-hook.ts"), "// new script");
      writeUnit(dir, { name: "x", description: "d", dependencies: [], components: {} });

      refreshUnit(dir);

      const unit = readUnit(dir);
      const script = (unit.components as { scripts: Array<Record<string, unknown>> }).scripts[0];
      expect(script.hook).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("ignores test, spec, and nested files when discovering scripts", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "scripts"));
      mkdirSync(join(dir, "scripts", "types"));
      writeFileSync(join(dir, "scripts", "check-test-review.ts"), "// hook script");
      writeFileSync(join(dir, "scripts", "check-test-review.test.ts"), "// test script");
      writeFileSync(join(dir, "scripts", "check-test-review.spec.ts"), "// spec script");
      writeFileSync(join(dir, "scripts", "types", "types.ts"), "// nested type helper");
      writeUnit(dir, {
        name: "x",
        description: "d",
        dependencies: [],
        components: {
          scripts: [
            { name: "check-test-review", file: "scripts/check-test-review.ts", hook: "pre-commit" },
            { name: "check-test-review.test", file: "scripts/check-test-review.test.ts" },
            { name: "check-test-review.spec", file: "scripts/check-test-review.spec.ts" },
            { name: "types", file: "scripts/types/types.ts" },
          ],
        },
      });

      refreshUnit(dir);

      const unit = readUnit(dir);
      expect((unit.components as { scripts: unknown[] }).scripts).toEqual([
        {
          name: "check-test-review",
          file: "scripts/check-test-review.ts",
          hook: "pre-commit",
        },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  refreshUnit — manual field preservation
 * @target      refreshUnit()
 * @strategy    unit; isolated temp dirs
 * @cases
 *   - [PASS] preserves condition on rule when file still exists
 *   - [PASS] preserves hook and params on script from existing unit.json
 *   - [PASS] preserves description and dependencies from existing unit.json
 *   - [PASS] uses TODO as description when existing unit.json has none
 */
describe("refreshUnit — manual field preservation", () => {
  test("preserves condition on rule when file still exists", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "rules"));
      writeFileSync(join(dir, "rules", "my-rule.md"), "plain rule");
      writeUnit(dir, {
        name: "x",
        description: "d",
        dependencies: [],
        components: {
          rules: [{ name: "my-rule", file: "rules/my-rule.md", condition: "only when X" }],
        },
      });

      refreshUnit(dir);

      const unit = readUnit(dir);
      const rule = (unit.components as { rules: Array<{ condition?: string }> }).rules[0];
      expect(rule.condition).toBe("only when X");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("preserves hook and params on script from existing unit.json", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "scripts"));
      writeFileSync(join(dir, "scripts", "my-hook.ts"), "// hook script");
      writeUnit(dir, {
        name: "x",
        description: "d",
        dependencies: [],
        components: {
          scripts: [
            {
              name: "my-hook",
              file: "scripts/my-hook.ts",
              hook: "pre-commit",
              params: ["staged_files"],
            },
          ],
        },
      });

      refreshUnit(dir);

      const unit = readUnit(dir);
      const script = (unit.components as { scripts: Array<{ hook: string; params: string[] }> })
        .scripts[0];
      expect(script.hook).toBe("pre-commit");
      expect(script.params).toEqual(["staged_files"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("preserves description and dependencies from existing unit.json", () => {
    const dir = makeTempDir();
    try {
      writeUnit(dir, {
        name: "x",
        description: "my description",
        dependencies: ["dep-unit"],
        components: {},
      });

      refreshUnit(dir);

      const unit = readUnit(dir);
      expect(unit.description).toBe("my description");
      expect(unit.dependencies).toEqual(["dep-unit"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("uses TODO as description when existing unit.json has none", () => {
    const dir = makeTempDir();
    try {
      writeUnit(dir, { name: "x", components: {} });

      refreshUnit(dir);

      const unit = readUnit(dir);
      expect(unit.description).toBe("TODO");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  refreshUnit — AISK:CUSTOM extraction
 * @target      refreshUnit()
 * @strategy    unit; isolated temp dirs
 * @cases
 *   - [PASS] sets hasCustom true when rule file contains AISK:CUSTOM
 *   - [PASS] removes hasCustom when rule file no longer contains AISK:CUSTOM
 *   - [PASS] extracts hint from AISK:CUSTOM block in rule file
 */
describe("refreshUnit — AISK:CUSTOM extraction", () => {
  test("sets hasCustom true when rule file contains AISK:CUSTOM", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "rules"));
      writeFileSync(
        join(dir, "rules", "my-rule.md"),
        '# AISK:CUSTOM name="paths" hint="scan tests"\npaths: []\n# AISK:CUSTOM:END',
      );
      writeUnit(dir, {
        name: "x",
        description: "d",
        dependencies: [],
        components: { rules: [{ name: "my-rule", file: "rules/my-rule.md" }] },
      });

      refreshUnit(dir);

      const unit = readUnit(dir);
      const rule = (unit.components as { rules: Array<{ hasCustom?: boolean }> }).rules[0];
      expect(rule.hasCustom).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("removes hasCustom when rule file no longer contains AISK:CUSTOM", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "rules"));
      writeFileSync(join(dir, "rules", "my-rule.md"), "plain rule content");
      writeUnit(dir, {
        name: "x",
        description: "d",
        dependencies: [],
        components: { rules: [{ name: "my-rule", file: "rules/my-rule.md", hasCustom: true }] },
      });

      refreshUnit(dir);

      const unit = readUnit(dir);
      const rule = (unit.components as { rules: Array<{ hasCustom?: boolean }> }).rules[0];
      expect(rule.hasCustom).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("extracts hint from AISK:CUSTOM block in rule file", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "rules"));
      writeFileSync(
        join(dir, "rules", "my-rule.md"),
        '# AISK:CUSTOM name="paths" hint="scan test files for patterns"\npaths: []\n# AISK:CUSTOM:END',
      );
      writeUnit(dir, {
        name: "x",
        description: "d",
        dependencies: [],
        components: { rules: [{ name: "my-rule", file: "rules/my-rule.md" }] },
      });

      refreshUnit(dir);

      const unit = readUnit(dir);
      const rule = (unit.components as { rules: Array<{ hint?: string }> }).rules[0];
      expect(rule.hint).toBe("scan test files for patterns");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  refreshUnit — deprecated field removal
 * @target      refreshUnit()
 * @strategy    unit; isolated temp dirs
 * @cases
 *   - [PASS] removes scope, provides, and required fields on refresh
 */
describe("refreshUnit — deprecated field removal", () => {
  test("removes scope, provides, and required fields on refresh", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "rules"));
      writeFileSync(join(dir, "rules", "my-rule.md"), "plain rule");
      writeUnit(dir, {
        name: "x",
        description: "d",
        scope: "validation",
        provides: ["something"],
        dependencies: [],
        components: {
          rules: [{ name: "my-rule", file: "rules/my-rule.md", required: true }],
        },
      });

      refreshUnit(dir);

      const unit = readUnit(dir);
      expect(unit.scope).toBeUndefined();
      expect(unit.provides).toBeUndefined();
      const rule = (unit.components as { rules: Array<Record<string, unknown>> }).rules[0];
      expect(rule.required).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  refreshUnit — no-op conditions
 * @target      refreshUnit()
 * @strategy    unit; isolated temp dirs
 * @cases
 *   - [PASS] creates unit.json from scratch when it does not exist but component files are present
 *   - [PASS] returns false when unit.json does not exist and no component files are present
 *   - [PASS] returns false when unit.json is already up to date
 */
describe("refreshUnit — no-op conditions", () => {
  test("creates unit.json from scratch when it does not exist but component files are present", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "skills"));
      writeFileSync(join(dir, "skills", "my-skill.md"), "# my-skill");

      const changed = refreshUnit(dir);
      expect(changed).toBe(true);

      const unit = readUnit(dir);
      expect(unit.description).toBe("TODO");
      expect(unit.dependencies).toEqual([]);
      expect((unit.components as { skills: unknown[] }).skills).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("returns false when unit.json does not exist and no component files are present", () => {
    const dir = makeTempDir();
    try {
      expect(refreshUnit(dir)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("returns false when unit.json is already up to date", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "skills"));
      writeFileSync(join(dir, "skills", "my-skill.md"), "# my-skill");
      writeUnit(dir, { name: "x", description: "d", dependencies: [], components: {} });

      refreshUnit(dir); // first run updates
      const changed = refreshUnit(dir); // second run should be no-op
      expect(changed).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  checkDependencies
 * @target      checkDependencies()
 * @strategy    unit; isolated temp dirs
 * @cases
 *   - [PASS] returns true when all dependencies exist as unit directories
 *   - [PASS] returns true when dependencies list is empty
 *   - [PASS] returns false when a dependency references a non-existent unit
 *   - [PASS] returns false when multiple units have missing dependencies
 *   - [PASS] skips units without unit.json
 */
describe("checkDependencies", () => {
  test("returns true when all dependencies exist as unit directories", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "unit-a"));
      mkdirSync(join(dir, "unit-b"));
      writeFileSync(join(dir, "unit-a", "unit.json"), JSON.stringify({ dependencies: ["unit-b"] }));
      writeFileSync(join(dir, "unit-b", "unit.json"), JSON.stringify({ dependencies: [] }));

      expect(checkDependencies(dir)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("returns true when dependencies list is empty", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "unit-a"));
      writeFileSync(join(dir, "unit-a", "unit.json"), JSON.stringify({ dependencies: [] }));

      expect(checkDependencies(dir)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("returns false when a dependency references a non-existent unit", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "unit-a"));
      writeFileSync(
        join(dir, "unit-a", "unit.json"),
        JSON.stringify({ dependencies: ["missing-unit"] }),
      );

      expect(checkDependencies(dir)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("returns false when multiple units have missing dependencies", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "unit-a"));
      mkdirSync(join(dir, "unit-b"));
      writeFileSync(
        join(dir, "unit-a", "unit.json"),
        JSON.stringify({ dependencies: ["ghost-1"] }),
      );
      writeFileSync(
        join(dir, "unit-b", "unit.json"),
        JSON.stringify({ dependencies: ["ghost-2"] }),
      );

      expect(checkDependencies(dir)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skips units without unit.json", () => {
    const dir = makeTempDir();
    try {
      mkdirSync(join(dir, "unit-a")); // no unit.json
      mkdirSync(join(dir, "unit-b"));
      writeFileSync(join(dir, "unit-b", "unit.json"), JSON.stringify({ dependencies: [] }));

      expect(checkDependencies(dir)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
