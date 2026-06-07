/**
 * @test-file   buildx
 * @description Verifies augmentUnit scans component files for AISF:CUSTOM and writes hasCustom to unit.json.
 * @ai-generated
 * @reviewed-by
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, test } from "vitest";

import { augmentUnit } from "../scripts/buildx";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "aisk-buildx-"));
}

/**
 * @test-suite  augmentUnit
 * @target      augmentUnit()
 * @strategy    unit; isolated temp dirs
 * @cases
 *   - [PASS] sets hasCustom true on component whose file contains AISF:CUSTOM
 *   - [PASS] removes hasCustom when file no longer contains AISF:CUSTOM
 *   - [PASS] returns false and leaves unit.json unchanged when no AISF:CUSTOM found
 *   - [PASS] sets hasCustom on skill and resource components, not only rules
 *   - [PASS] returns false when unit.json does not exist
 */
test("augmentUnit sets hasCustom true on rule whose file contains AISF:CUSTOM", () => {
  const dir = makeTempDir();
  try {
    mkdirSync(join(dir, "rules"), { recursive: true });
    writeFileSync(
      join(dir, "rules", "my-rule.md"),
      '# AISF:CUSTOM name="paths" hint="..."\npaths: []\n# AISF:CUSTOM:END',
    );
    writeFileSync(
      join(dir, "unit.json"),
      JSON.stringify({ components: { rules: [{ name: "my-rule", file: "rules/my-rule.md" }] } }),
    );

    const changed = augmentUnit(dir);
    expect(changed).toBe(true);

    const unit = JSON.parse(readFileSync(join(dir, "unit.json"), "utf8")) as {
      components: { rules: Array<{ hasCustom?: boolean }> };
    };
    expect(unit.components.rules[0].hasCustom).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("augmentUnit removes hasCustom when file no longer contains AISF:CUSTOM", () => {
  const dir = makeTempDir();
  try {
    mkdirSync(join(dir, "rules"), { recursive: true });
    writeFileSync(join(dir, "rules", "my-rule.md"), "plain rule content without custom blocks");
    writeFileSync(
      join(dir, "unit.json"),
      JSON.stringify({ components: { rules: [{ name: "my-rule", file: "rules/my-rule.md", hasCustom: true }] } }),
    );

    const changed = augmentUnit(dir);
    expect(changed).toBe(true);

    const unit = JSON.parse(readFileSync(join(dir, "unit.json"), "utf8")) as {
      components: { rules: Array<{ hasCustom?: boolean }> };
    };
    expect(unit.components.rules[0].hasCustom).toBeUndefined();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("augmentUnit returns false and leaves unit.json unchanged when no AISF:CUSTOM found", () => {
  const dir = makeTempDir();
  try {
    mkdirSync(join(dir, "rules"), { recursive: true });
    writeFileSync(join(dir, "rules", "my-rule.md"), "plain rule");
    const original = JSON.stringify({ components: { rules: [{ name: "my-rule", file: "rules/my-rule.md" }] } });
    writeFileSync(join(dir, "unit.json"), original);

    const changed = augmentUnit(dir);
    expect(changed).toBe(false);
    expect(readFileSync(join(dir, "unit.json"), "utf8")).toBe(original);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("augmentUnit sets hasCustom on skill and resource components", () => {
  const dir = makeTempDir();
  try {
    mkdirSync(join(dir, "skills"), { recursive: true });
    mkdirSync(join(dir, "resources"), { recursive: true });
    writeFileSync(join(dir, "skills", "my-skill.md"), "<!-- AISF:CUSTOM name=\"content\" -->\ndefault\n<!-- AISF:CUSTOM:END -->");
    writeFileSync(join(dir, "resources", "config.md"), "plain resource");
    writeFileSync(
      join(dir, "unit.json"),
      JSON.stringify({
        components: {
          skills: [{ name: "my-skill", file: "skills/my-skill.md" }],
          resources: [{ name: "config", file: "resources/config.md" }],
        },
      }),
    );

    augmentUnit(dir);

    const unit = JSON.parse(readFileSync(join(dir, "unit.json"), "utf8")) as {
      components: {
        skills: Array<{ hasCustom?: boolean }>;
        resources: Array<{ hasCustom?: boolean }>;
      };
    };
    expect(unit.components.skills[0].hasCustom).toBe(true);
    expect(unit.components.resources[0].hasCustom).toBeUndefined();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("augmentUnit returns false when unit.json does not exist", () => {
  const dir = makeTempDir();
  try {
    const changed = augmentUnit(dir);
    expect(changed).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
