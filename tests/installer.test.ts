/**
 * @test-file   installer
 * @description Verifies the Installer class handles list, show, register/unregister (global
 *              units), init/update/remove (local units, with AISK:CUSTOM merge), refresh,
 *              global/local classification, global naming collapse, local-to-local dependency
 *              auto-install, and lefthook.yml idempotent updates.
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY): Shengtian Liao @ [3]
 */
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";

import { Installer } from "../global/scripts/installer";
import type { RegisterResult } from "../global/scripts/types/installer-types";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "aisk-installer-"));
}

/** Isolated `~/.claude/skills` stand-in under the same temp dir — never touches the real home dir. */
function globalSkillsDirFor(tmpDir: string): string {
  return join(tmpDir, "global-skills");
}

/** Builds an Installer wired to an isolated globalSkillsDir. json defaults true (structured assertions). */
function newInstaller(
  tmpDir: string,
  projectDir: string,
  aiskHome: string,
  json = true,
): Installer {
  return new Installer(projectDir, aiskHome, json, globalSkillsDirFor(tmpDir));
}

/**
 * Creates a minimal fake aiskHome (package root) tree for testing: a global unit "poc"
 * (skill name equals unit name, so it collapses to aisk-poc under the naming rule; a plain
 * script with no hook so it stays global) depending on global unit "poc-dep", plus
 * global/setup for the aisk-setup symlink target.
 */
function makeFakeAiskHome(tmpDir: string): string {
  const aiskHome = join(tmpDir, ".aisk");
  mkdirSync(aiskHome, { recursive: true });

  const unitDir = join(aiskHome, "units", "poc");
  mkdirSync(join(unitDir, "skills"), { recursive: true });
  mkdirSync(join(unitDir, "scripts"), { recursive: true });
  mkdirSync(join(unitDir, "resources"), { recursive: true });
  writeFileSync(join(unitDir, "skills", "poc.md"), "# poc\nPoC skill content");
  writeFileSync(join(unitDir, "scripts", "poc-hook.ts"), 'console.log("hook");');
  writeFileSync(join(unitDir, "resources", "readme.md"), "readme content");
  writeFileSync(
    join(unitDir, "unit.json"),
    JSON.stringify({
      name: "poc",
      description: "PoC unit",
      dependencies: ["poc-dep"],
      components: {
        skills: [{ name: "poc", file: "skills/poc.md" }],
        scripts: [{ name: "poc-hook", file: "scripts/poc-hook.ts" }],
        resources: [{ name: "readme", file: "resources/readme.md" }],
      },
    }),
  );

  const depDir = join(aiskHome, "units", "poc-dep");
  mkdirSync(depDir, { recursive: true });
  writeFileSync(
    join(depDir, "unit.json"),
    JSON.stringify({
      name: "poc-dep",
      description: "PoC dep unit",
      dependencies: [],
      components: {},
    }),
  );

  writeFileSync(
    join(aiskHome, "units", "units.json"),
    JSON.stringify(["poc-dep", "poc"], null, 2) + "\n",
  );

  mkdirSync(join(aiskHome, "global", "setup"), { recursive: true });
  writeFileSync(join(aiskHome, "global", "setup", "SKILL.md"), "# setup\nSetup skill content");

  return aiskHome;
}

/** Appends a unit name to the fake registry order (units.json), matching build.ts's real output. */
function appendToOrder(aiskHome: string, name: string): void {
  const orderPath = join(aiskHome, "units", "units.json");
  const order = JSON.parse(readFileSync(orderPath, "utf8")) as string[];
  writeFileSync(orderPath, JSON.stringify([...order, name], null, 2) + "\n");
}

/**
 * Adds a local unit to the fake aiskHome. By default it's local via a hook script;
 * pass `hook: false` with `rules: true` or `hasCustomResource: true` to test the other
 * two local-classification triggers in isolation.
 */
function addLocalUnit(
  aiskHome: string,
  opts: {
    name: string;
    dependencies?: string[];
    hook?: boolean;
    rules?: boolean;
    hasCustomResource?: boolean;
  },
): string {
  const { name, dependencies = [], hook = true, rules = false, hasCustomResource = false } = opts;
  const unitDir = join(aiskHome, "units", name);
  mkdirSync(join(unitDir, "skills"), { recursive: true });
  mkdirSync(join(unitDir, "scripts"), { recursive: true });
  mkdirSync(join(unitDir, "resources"), { recursive: true });
  writeFileSync(join(unitDir, "skills", `${name}.md`), `# ${name}\n${name} skill content`);
  writeFileSync(join(unitDir, "scripts", `${name}-script.ts`), 'console.log("script");');
  writeFileSync(
    join(unitDir, "resources", "readme.md"),
    hasCustomResource
      ? '# AISK:CUSTOM name="paths" status="todo" hint="fill in"\n# AISK:CUSTOM:END\n'
      : "readme content",
  );

  const scriptEntry: Record<string, unknown> = {
    name: `${name}-script`,
    file: `scripts/${name}-script.ts`,
  };
  if (hook) scriptEntry.hook = "pre-commit";

  const resourceEntry: Record<string, unknown> = { name: "readme", file: "resources/readme.md" };
  if (hasCustomResource) resourceEntry.hasCustom = true;

  const components: Record<string, unknown> = {
    skills: [{ name, file: `skills/${name}.md` }],
    scripts: [scriptEntry],
    resources: [resourceEntry],
  };
  if (rules) {
    mkdirSync(join(unitDir, "rules"), { recursive: true });
    writeFileSync(join(unitDir, "rules", `${name}-rule.md`), "rule body");
    components.rules = [{ name: `${name}-rule`, file: `rules/${name}-rule.md` }];
  }

  writeFileSync(
    join(unitDir, "unit.json"),
    JSON.stringify({ name, description: `${name} unit`, dependencies, components }),
  );

  appendToOrder(aiskHome, name);
  return name;
}

/** Adds a minimal global unit with a skill name that differs from the unit name (no naming collapse). */
function addGlobalUnitWithDifferentSkillName(
  aiskHome: string,
  unitName: string,
  skillName: string,
): void {
  const unitDir = join(aiskHome, "units", unitName);
  mkdirSync(join(unitDir, "skills"), { recursive: true });
  writeFileSync(join(unitDir, "skills", `${skillName}.md`), `# ${skillName}\n${skillName} content`);
  writeFileSync(
    join(unitDir, "unit.json"),
    JSON.stringify({
      name: unitName,
      description: `${unitName} unit`,
      dependencies: [],
      components: { skills: [{ name: skillName, file: `skills/${skillName}.md` }] },
    }),
  );
  appendToOrder(aiskHome, unitName);
}

function captureStdout(fn: () => void): string {
  const output: string[] = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk: string | Uint8Array) => {
    if (typeof chunk === "string") output.push(chunk);
    return true;
  };
  try {
    fn();
  } finally {
    process.stdout.write = orig;
  }
  return output.join("");
}

/**
 * @test-suite  list
 * @target      Installer.list()
 * @strategy    unit; fake aiskHome tree
 * @cases
 *   - [PASS] lists global and local units together by default, tagged with scope
 *   - [PASS] --scope filters to only global or only local
 *   - [PASS] global unit installed reflects the registry record, not the project
 *   - [PASS] local unit installed reflects .aisk/installed.json, hasTodo when customStatus=todo
 */
describe("list", () => {
  test("lists global and local units together by default, tagged with scope", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const result = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).list()),
      ) as { units: Array<{ name: string; scope: string }> };

      expect(result.units.find((u) => u.name === "poc")?.scope).toBe("global");
      expect(result.units.find((u) => u.name === "poc-dep")?.scope).toBe("global");
      expect(result.units.find((u) => u.name === "loc")?.scope).toBe("local");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("--scope filters to only global or only local", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      const globalOnly = JSON.parse(captureStdout(() => installer.list("global"))) as {
        units: Array<{ name: string }>;
      };
      expect(globalOnly.units.some((u) => u.name === "loc")).toBe(false);
      expect(globalOnly.units.some((u) => u.name === "poc")).toBe(true);

      const localOnly = JSON.parse(captureStdout(() => installer.list("local"))) as {
        units: Array<{ name: string }>;
      };
      expect(localOnly.units.some((u) => u.name === "poc")).toBe(false);
      expect(localOnly.units.some((u) => u.name === "loc")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("global unit installed reflects the registry record, not the project", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      const before = JSON.parse(captureStdout(() => installer.list("global"))) as {
        units: Array<{ name: string; installed: boolean }>;
      };
      expect(before.units.find((u) => u.name === "poc")?.installed).toBe(false);

      installer.register();

      const after = JSON.parse(captureStdout(() => installer.list("global"))) as {
        units: Array<{ name: string; installed: boolean }>;
      };
      expect(after.units.find((u) => u.name === "poc")?.installed).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("local unit installed reflects .aisk/installed.json, hasTodo when customStatus=todo", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", hasCustomResource: true, hook: false });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      installer.init(["loc"]);

      const result = JSON.parse(captureStdout(() => installer.list("local"))) as {
        units: Array<{ name: string; installed: boolean; hasTodo?: boolean }>;
      };
      const loc = result.units.find((u) => u.name === "loc");
      expect(loc?.installed).toBe(true);
      expect(loc?.hasTodo).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  show
 * @target      Installer.show()
 * @strategy    unit; fake aiskHome tree
 * @cases
 *   - [PASS] global unit: scope "global", installed from registry, component installed from disk symlink
 *   - [PASS] local unit: scope "local", installed from .aisk/installed.json, component customStatus
 */
describe("show", () => {
  test("global unit: scope global, installed from registry, component installed from disk symlink", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      const before = JSON.parse(captureStdout(() => installer.show("poc"))) as {
        scope: string;
        installed: boolean;
        components: Array<{ name: string; installed: boolean }>;
      };
      expect(before.scope).toBe("global");
      expect(before.installed).toBe(false);
      expect(before.components.find((c) => c.name === "poc")?.installed).toBe(false);

      installer.register();

      const after = JSON.parse(captureStdout(() => installer.show("poc"))) as {
        installed: boolean;
        components: Array<{ name: string; installed: boolean }>;
      };
      expect(after.installed).toBe(true);
      expect(after.components.find((c) => c.name === "poc")?.installed).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("local unit: scope local, installed from .aisk/installed.json, component customStatus", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", hasCustomResource: true, hook: false });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      installer.init(["loc"]);

      const result = JSON.parse(captureStdout(() => installer.show("loc"))) as {
        scope: string;
        installed: boolean;
        components: Array<{ name: string; customStatus?: string }>;
      };
      expect(result.scope).toBe("local");
      expect(result.installed).toBe(true);
      expect(result.components.find((c) => c.name === "readme")?.customStatus).toBe("todo");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  register
 * @target      Installer.register()
 * @strategy    unit; fake aiskHome tree; isolated globalSkillsDir
 * @cases
 *   - [PASS] creates the aisk-setup symlink pointing at aiskHome/global/setup
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
  test("creates the aisk-setup symlink pointing at aiskHome/global/setup", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).register();

      const setupLink = join(globalSkillsDirFor(dir), "aisk-setup");
      expect(lstatSync(setupLink).isSymbolicLink()).toBe(true);
      expect(readlinkSync(setupLink)).toBe(join(aiskHome, "global", "setup"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("collapses aisk-{unit}-{skill} to aisk-{unit} when the skill name equals the unit name", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).register();

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
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).register();

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
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).register();

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
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const result = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).register()),
      ) as RegisterResult;

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
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).register();

      const registry = JSON.parse(
        readFileSync(join(globalSkillsDirFor(dir), ".aisk-registry.json"), "utf8"),
      ) as { entries: Array<{ unit: string; dir: string }> };
      expect(registry.entries.some((e) => e.unit === "setup")).toBe(true);
      expect(registry.entries.some((e) => e.unit === "poc")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("is idempotent — a second run keeps the same symlinks", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      installer.register();
      installer.register();

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
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const staleDir = join(globalSkillsDirFor(dir), "aisk-never-registered");
      mkdirSync(staleDir, { recursive: true });
      writeFileSync(join(staleDir, "SKILL.md"), "not tracked by any registry record");

      newInstaller(dir, projectDir, aiskHome).register();

      expect(existsSync(staleDir), "unrecorded aisk-* dirs are not swept").toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("cleanup removes entries that WERE in the previous registry record", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      installer.register();
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

      const result = JSON.parse(captureStdout(() => installer.register())) as RegisterResult;

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
 * @target      Installer.unregister()
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
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      installer.register();
      expect(existsSync(join(globalSkillsDirFor(dir), "aisk-poc"))).toBe(true);

      installer.unregister();

      expect(existsSync(join(globalSkillsDirFor(dir), "aisk-poc"))).toBe(false);
      expect(existsSync(join(globalSkillsDirFor(dir), "aisk-setup"))).toBe(false);
      expect(existsSync(join(globalSkillsDirFor(dir), ".aisk-registry.json"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("is a no-op when nothing was ever registered", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const result = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).unregister()),
      ) as { removed: unknown[] };

      expect(result.removed).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  init (local unit)
 * @target      Installer.init()
 * @strategy    unit; fake aiskHome tree
 * @cases
 *   - [PASS] installs every component of a local unit unconditionally
 *   - [PASS] fails to init a global unit by name
 *   - [PASS] re-init on an already-installed unit converts to update
 *   - [PASS] init all installs every not-yet-installed local unit, no global units
 *   - [PASS] auto-installs a local-to-local dependency (autoDep)
 *   - [PASS] a dependency on a global unit needs no action (no failure, nothing auto-installed)
 */
describe("init (local unit)", () => {
  test("installs every component of a local unit unconditionally", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).init(["loc"]);

      expect(existsSync(join(projectDir, ".claude", "skills", "aisk-loc-loc", "SKILL.md"))).toBe(
        true,
      );
      expect(existsSync(join(projectDir, ".aisk", "loc", "resources", "readme.md"))).toBe(true);
      expect(existsSync(join(projectDir, ".aisk", "loc", "scripts", "loc-script.js"))).toBe(true);
      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      expect(lefthook).toContain("aisk-loc-loc-script:");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails to init a global unit by name", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).init(["poc"])),
      ) as { added: unknown[]; failed: Array<{ name: string; reason: string }> };

      expect(out.added).toHaveLength(0);
      expect(out.failed[0]?.name).toBe("poc");
      expect(out.failed[0]?.reason).toContain("register");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("re-init on an already-installed unit converts to update", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      installer.init(["loc"]);
      const out = JSON.parse(captureStdout(() => installer.init(["loc"]))) as {
        added: unknown[];
        updated: Array<{ name: string }>;
        failed: unknown[];
      };

      expect(out.added).toHaveLength(0);
      expect(out.failed).toHaveLength(0);
      expect(out.updated.some((u) => u.name === "loc")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("init all installs every not-yet-installed local unit, no global units", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc-a" });
      addLocalUnit(aiskHome, { name: "loc-b" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).init(["all"])),
      ) as { added: Array<{ name: string }> };

      expect(out.added.some((u) => u.name === "loc-a")).toBe(true);
      expect(out.added.some((u) => u.name === "loc-b")).toBe(true);
      expect(out.added.some((u) => u.name === "poc")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("auto-installs a local-to-local dependency (autoDep)", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc-dep" });
      addLocalUnit(aiskHome, { name: "loc-main", dependencies: ["loc-dep"] });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).init(["loc-main"])),
      ) as { added: Array<{ name: string; autoDep?: boolean }>; failed: unknown[] };

      expect(out.failed).toHaveLength(0);
      const dep = out.added.find((u) => u.name === "loc-dep");
      expect(dep).toBeTruthy();
      expect(dep?.autoDep).toBe(true);
      expect(out.added.some((u) => u.name === "loc-main" && !u.autoDep)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a dependency on a global unit needs no action", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc-with-global-dep", dependencies: ["poc"] });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).init(["loc-with-global-dep"])),
      ) as { added: Array<{ name: string }>; failed: unknown[] };

      expect(out.failed).toHaveLength(0);
      expect(out.added.some((u) => u.name === "loc-with-global-dep")).toBe(true);
      expect(out.added.some((u) => u.name === "poc")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  init (script/hook)
 * @target      Installer.init() — local unit scripts are always bundled, hook optional
 * @strategy    unit; local unit with and without a hook script
 * @cases
 *   - [PASS] bundles the script and registers the hook when declared
 *   - [PASS] bundles the script but registers no hook when not declared
 *   - [PASS] hook registration is idempotent (no duplicate entries on re-init)
 *   - [PASS] appends hook entry to existing lefthook.yml
 */
describe("init (script/hook)", () => {
  test("bundles the script and registers the hook when declared", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", hook: true });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).init(["loc"]);

      const scriptFile = join(projectDir, ".aisk", "loc", "scripts", "loc-script.js");
      expect(readFileSync(scriptFile, "utf8")).toContain("script");
      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      expect(lefthook).toContain("aisk-loc-loc-script:");
      expect(lefthook).toContain("bun .aisk/loc/scripts/loc-script.js");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("bundles the script but registers no hook when not declared", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", hook: false, rules: true });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).init(["loc"]);

      expect(existsSync(join(projectDir, ".aisk", "loc", "scripts", "loc-script.js"))).toBe(true);
      expect(existsSync(join(projectDir, "lefthook.yml"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("hook registration is idempotent (no duplicate entries on re-init)", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);

      installer.init(["loc"]);
      installer.init(["loc"]);

      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      const occurrences = lefthook.split("aisk-loc-loc-script:").length - 1;
      expect(occurrences).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("appends hook entry to existing lefthook.yml", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      writeFileSync(
        join(projectDir, "lefthook.yml"),
        "pre-commit:\n  commands:\n    existing-hook:\n      run: echo ok\n",
      );

      newInstaller(dir, projectDir, aiskHome).init(["loc"]);

      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      expect(lefthook).toContain("existing-hook:");
      expect(lefthook).toContain("aisk-loc-loc-script:");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  init → update (orphan removal)
 * @target      Installer.init() when unit already installed → updateUnitComponents()
 * @strategy    unit; simulate unit.json version change removing a resource
 * @cases
 *   - [PASS] removes orphaned resource file when unit.json no longer declares it
 */
describe("init → update (orphan removal)", () => {
  test("removes orphaned resource file when unit.json no longer declares it", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const unitJsonPath = join(aiskHome, "units", "loc", "unit.json");
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const installer = newInstaller(dir, projectDir, aiskHome);
      installer.init(["loc"]);
      const resourceFile = join(projectDir, ".aisk", "loc", "resources", "readme.md");
      expect(existsSync(resourceFile)).toBe(true);

      // v2: resource removed from unit.json
      writeFileSync(
        unitJsonPath,
        JSON.stringify({
          name: "loc",
          description: "loc unit",
          dependencies: [],
          components: {
            skills: [{ name: "loc", file: "skills/loc.md" }],
            scripts: [{ name: "loc-script", file: "scripts/loc-script.ts", hook: "pre-commit" }],
          },
        }),
      );

      installer.init(["loc"]);
      expect(existsSync(resourceFile), "orphaned resource file must be removed").toBe(false);
      expect(existsSync(join(projectDir, ".claude", "skills", "aisk-loc-loc", "SKILL.md"))).toBe(
        true,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  update (AISK:CUSTOM merge)
 * @target      Installer.update()
 * @strategy    unit; installed local resource has done block; new template has same block
 * @cases
 *   - [PASS] merges done block from old file into new template
 *   - [PASS] keeps new template content for todo blocks
 */
describe("update (AISK:CUSTOM merge)", () => {
  test("merges done block from old file into new template", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", hook: false, hasCustomResource: true });

      writeFileSync(
        join(aiskHome, "units", "loc", "resources", "readme.md"),
        [
          '# AISK:CUSTOM name="pattern" status="todo" hint="new hint"',
          'testMatch: ["**/*.new.ts"]',
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);
      installer.init(["loc"]);

      const resourceFile = join(projectDir, ".aisk", "loc", "resources", "readme.md");
      writeFileSync(
        resourceFile,
        [
          '# AISK:CUSTOM name="pattern" status="done" hint="old hint"',
          'testMatch: ["**/*.spec.ts"]',
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );
      const installedPath = join(projectDir, ".aisk", "installed.json");
      const installed = JSON.parse(readFileSync(installedPath, "utf8")) as {
        units: Record<string, { components: { resources: Array<{ customStatus: string }> } }>;
      };
      installed.units["loc"]!.components.resources[0]!.customStatus = "done";
      writeFileSync(installedPath, JSON.stringify(installed, null, 2) + "\n");

      installer.update(["loc"]);

      const content = readFileSync(resourceFile, "utf8");
      expect(content).toContain('status="done"');
      expect(content).toContain('hint="new hint"');
      expect(content).toContain('["**/*.spec.ts"]');
      expect(content).not.toContain('["**/*.new.ts"]');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("keeps new template content for todo blocks", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", hook: false, hasCustomResource: true });
      writeFileSync(
        join(aiskHome, "units", "loc", "resources", "readme.md"),
        [
          '# AISK:CUSTOM name="pattern" status="todo" hint="hint"',
          'testMatch: ["**/*.updated.ts"]',
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      const installer = newInstaller(dir, projectDir, aiskHome);
      installer.init(["loc"]);

      const resourceFile = join(projectDir, ".aisk", "loc", "resources", "readme.md");
      writeFileSync(
        resourceFile,
        [
          '# AISK:CUSTOM name="pattern" status="todo" hint="hint"',
          'testMatch: ["**/*.old.ts"]',
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );

      installer.update(["loc"]);

      const content = readFileSync(resourceFile, "utf8");
      expect(content).toContain('["**/*.updated.ts"]');
      expect(content).not.toContain('["**/*.old.ts"]');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  update
 * @target      Installer.update()
 * @strategy    unit; fake aiskHome tree
 * @cases
 *   - [PASS] fails per-unit when unit is not installed
 *   - [PASS] skips optional component that is not on disk
 */
describe("update", () => {
  test("fails per-unit when unit is not installed", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).update(["loc"])),
      ) as { updated: unknown[]; failed: Array<{ name: string; reason: string }> };

      expect(out.updated).toHaveLength(0);
      expect(out.failed[0]?.name).toBe("loc");
      expect(out.failed[0]?.reason).toContain("未安装");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skips optional component that is not on disk", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", rules: true });
      writeFileSync(
        join(aiskHome, "units", "loc", "unit.json"),
        JSON.stringify({
          name: "loc",
          description: "loc unit",
          dependencies: [],
          components: {
            skills: [{ name: "loc", file: "skills/loc.md" }],
            rules: [{ name: "loc-rule", file: "rules/loc-rule.md", condition: "has next" }],
          },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      const skillDir = join(projectDir, ".claude", "skills", "aisk-loc-loc");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "# loc");
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            loc: {
              installedAt: "2026-01-01",
              components: {
                skills: [{ name: "loc", path: ".claude/skills/aisk-loc-loc/SKILL.md" }],
                rules: [],
                scripts: [],
                resources: [],
              },
            },
          },
        }),
      );

      newInstaller(dir, projectDir, aiskHome).update(["loc"]);

      expect(existsSync(join(projectDir, ".claude", "rules", "aisk-loc", "loc-rule.md"))).toBe(
        false,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  remove
 * @target      Installer.remove()
 * @strategy    unit; fake aiskHome tree; pre-populated installed.json and files
 * @cases
 *   - [PASS] removes skill file and empty parent directory
 *   - [PASS] removes script file and corresponding lefthook entry
 *   - [PASS] fails per-unit when unit is not installed
 *   - [PASS] all removes all installed units
 */
describe("remove", () => {
  test("removes skill file and empty parent directory", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      const skillDir = join(projectDir, ".claude", "skills", "aisk-loc-loc");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "# loc");
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            loc: {
              installedAt: "2026-01-01",
              components: {
                skills: [{ name: "loc", path: ".claude/skills/aisk-loc-loc/SKILL.md" }],
                rules: [],
                scripts: [],
                resources: [],
              },
            },
          },
        }),
      );

      newInstaller(dir, projectDir, aiskHome).remove(["loc"]);

      expect(existsSync(join(skillDir, "SKILL.md")), "skill file must be removed").toBe(false);
      expect(existsSync(skillDir), "empty parent dir must be removed").toBe(false);
      const data = JSON.parse(
        readFileSync(join(projectDir, ".aisk", "installed.json"), "utf8"),
      ) as { units: Record<string, unknown> };
      expect("loc" in data.units, "unit must be removed from installed.json").toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("removes script file and corresponding lefthook entry", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      const scriptDir = join(projectDir, ".aisk", "loc", "scripts");
      mkdirSync(scriptDir, { recursive: true });
      writeFileSync(join(scriptDir, "loc-script.js"), "// hook");
      writeFileSync(
        join(projectDir, "lefthook.yml"),
        "pre-commit:\n  commands:\n    aisk-loc-loc-script:\n      run: bun .aisk/loc/scripts/loc-script.js\n",
      );
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            loc: {
              installedAt: "2026-01-01",
              components: {
                skills: [],
                rules: [],
                scripts: [{ name: "loc-script", path: ".aisk/loc/scripts/loc-script.js" }],
                resources: [],
              },
            },
          },
        }),
      );

      newInstaller(dir, projectDir, aiskHome).remove(["loc"]);

      expect(existsSync(join(scriptDir, "loc-script.js")), "script file must be removed").toBe(
        false,
      );
      const lefthook = readFileSync(join(projectDir, "lefthook.yml"), "utf8");
      expect(lefthook, "lefthook entry must be removed").not.toContain("aisk-loc-loc-script:");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails per-unit when unit is not installed", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).remove(["loc"])),
      ) as { removed: unknown[]; failed: Array<{ name: string; reason: string }> };

      expect(out.removed).toHaveLength(0);
      expect(out.failed[0]?.name).toBe("loc");
      expect(out.failed[0]?.reason).toContain("未安装");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("all removes all installed units", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      const skillDir = join(projectDir, ".claude", "skills", "aisk-loc-loc");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "# loc");
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            loc: {
              installedAt: "2026-01-01",
              components: {
                skills: [{ name: "loc", path: ".claude/skills/aisk-loc-loc/SKILL.md" }],
                rules: [],
                scripts: [],
                resources: [],
              },
            },
          },
        }),
      );

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).remove(["all"])),
      ) as { removed: Array<{ name: string }>; failed: unknown[] };

      expect(out.removed.some((u) => u.name === "loc")).toBe(true);
      expect(out.failed).toHaveLength(0);
      expect(existsSync(join(skillDir, "SKILL.md"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  refresh
 * @target      Installer.refresh()
 * @strategy    unit; installed local files with AISK:CUSTOM blocks
 * @cases
 *   - [PASS] updates customStatus to done when AISK:CUSTOM block is done
 *   - [PASS] outputs todo list in non-silent mode
 *   - [PASS] produces no output in silent mode
 */
describe("refresh", () => {
  test("updates customStatus to done when AISK:CUSTOM block is done", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      const resourceDir = join(projectDir, ".aisk", "loc", "resources");
      mkdirSync(resourceDir, { recursive: true });
      writeFileSync(
        join(resourceDir, "readme.md"),
        [
          '# AISK:CUSTOM name="pattern" status="done" hint="hint"',
          'testMatch: ["**/*.spec.ts"]',
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            loc: {
              installedAt: "2026-01-01",
              components: {
                skills: [],
                rules: [],
                scripts: [],
                resources: [
                  {
                    name: "readme",
                    path: ".aisk/loc/resources/readme.md",
                    customStatus: "todo",
                  },
                ],
              },
            },
          },
        }),
      );

      newInstaller(dir, projectDir, aiskHome).refresh(true);

      const installed = JSON.parse(
        readFileSync(join(projectDir, ".aisk", "installed.json"), "utf8"),
      ) as {
        units: Record<string, { components: { resources: Array<{ customStatus: string }> } }>;
      };
      expect(installed.units["loc"]?.components.resources[0]?.customStatus).toBe("done");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("outputs todo list in non-silent mode", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      const resourceDir = join(projectDir, ".aisk", "loc", "resources");
      mkdirSync(resourceDir, { recursive: true });
      writeFileSync(
        join(resourceDir, "readme.md"),
        [
          '# AISK:CUSTOM name="pattern" status="todo" hint="hint"',
          "content",
          "# AISK:CUSTOM:END",
        ].join("\n"),
      );
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(
        join(projectDir, ".aisk", "installed.json"),
        JSON.stringify({
          units: {
            loc: {
              installedAt: "2026-01-01",
              components: {
                skills: [],
                rules: [],
                scripts: [],
                resources: [
                  {
                    name: "readme",
                    path: ".aisk/loc/resources/readme.md",
                    customStatus: "todo",
                  },
                ],
              },
            },
          },
        }),
      );

      const out = JSON.parse(
        captureStdout(() => newInstaller(dir, projectDir, aiskHome).refresh(false)),
      ) as { todo: Array<{ unit: string; files: string[] }> };

      expect(out.todo.length).toBeGreaterThan(0);
      expect(out.todo[0]?.unit).toBe("loc");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("produces no output in silent mode", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(join(projectDir, ".aisk"), { recursive: true });
      writeFileSync(join(projectDir, ".aisk", "installed.json"), JSON.stringify({ units: {} }));

      const out = captureStdout(() => newInstaller(dir, projectDir, aiskHome).refresh(true));
      expect(out).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  init (.gitignore)
 * @target      Installer.init() — .gitignore file management
 * @strategy    unit; isolated project dirs
 * @cases
 *   - [PASS] creates .gitignore files in .aisk/ and .claude/ on install
 *   - [PASS] does not overwrite existing .gitignore files
 */
describe("init (.gitignore)", () => {
  test("creates .gitignore files in .aisk/ and .claude/ on install", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      newInstaller(dir, projectDir, aiskHome).init(["loc"]);

      expect(readFileSync(join(projectDir, ".aisk", ".gitignore"), "utf8")).toBe("*\n");
      expect(readFileSync(join(projectDir, ".claude", ".gitignore"), "utf8")).toBe(
        "skills/aisk-*/\nrules/aisk-*/\n",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("does not overwrite existing .gitignore files", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(join(projectDir, ".claude"), { recursive: true });
      writeFileSync(join(projectDir, ".claude", ".gitignore"), "custom-content\n");

      newInstaller(dir, projectDir, aiskHome).init(["loc"]);

      expect(readFileSync(join(projectDir, ".claude", ".gitignore"), "utf8")).toBe(
        "custom-content\n",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  init (installed record)
 * @target      Installer.init() — installed.json record writing
 * @strategy    unit; local unit with a required skill and an optional rule
 * @cases
 *   - [PASS] writes installed.json with every component tracked (no local/global split within the unit)
 */
describe("init (installed record)", () => {
  test("writes installed.json with every component tracked", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc", rules: true });
      writeFileSync(
        join(aiskHome, "units", "loc", "unit.json"),
        JSON.stringify({
          name: "loc",
          description: "loc unit",
          dependencies: [],
          components: {
            skills: [{ name: "loc", file: "skills/loc.md" }],
            rules: [{ name: "loc-rule", file: "rules/loc-rule.md", condition: "has next" }],
          },
        }),
      );

      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const installer = newInstaller(dir, projectDir, aiskHome);
      installer.init(["loc"]);

      const installed = installer.readInstalled();
      expect("loc" in installed.units).toBe(true);
      expect(installed.units["loc"]?.installedAt).toBeTruthy();
      expect(installed.units["loc"]?.components.skills.length).toBe(1);
      expect(installed.units["loc"]?.components.rules.length).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * @test-suite  human-readable output (default)
 * @target      Installer output formatting when json=false (the default)
 * @strategy    unit; construct with json=false explicitly
 * @cases
 *   - [PASS] list prints Chinese section headers for global/local units
 *   - [PASS] init failure prints the Chinese reason text
 */
describe("human-readable output (default)", () => {
  test("list prints Chinese section headers for global/local units", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      addLocalUnit(aiskHome, { name: "loc" });
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = captureStdout(() => newInstaller(dir, projectDir, aiskHome, false).list());

      expect(out).toContain("全局 unit");
      expect(out).toContain("本地 unit");
      expect(() => JSON.parse(out)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("init failure prints the Chinese reason text", () => {
    const dir = makeTempDir();
    try {
      const aiskHome = makeFakeAiskHome(dir);
      const projectDir = join(dir, "project");
      mkdirSync(projectDir);

      const out = captureStdout(() => newInstaller(dir, projectDir, aiskHome, false).init(["poc"]));

      expect(out).toContain("失败");
      expect(out).toContain("register");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
