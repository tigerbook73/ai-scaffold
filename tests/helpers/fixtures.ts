/**
 * Fake aiskHome / globalSkillsDir builders shared by tests/installer.test.ts
 * (local unit lifecycle) and tests/register.test.ts (global unit registration).
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "aisk-installer-"));
}

/** Isolated `~/.claude/skills` stand-in under the same temp dir — never touches the real home dir. */
export function globalSkillsDirFor(tmpDir: string): string {
  return join(tmpDir, "global-skills");
}

/**
 * Creates a minimal fake aiskHome (package root) tree for testing: a global unit "poc"
 * (skill name equals unit name, so it collapses to aisk-poc under the naming rule; a plain
 * script with no hook so it stays global) depending on global unit "poc-dep".
 */
export function makeFakeAiskHome(tmpDir: string): string {
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

  return aiskHome;
}

/** Appends a unit name to the fake registry order (units.json), matching build.ts's real output. */
export function appendToOrder(aiskHome: string, name: string): void {
  const orderPath = join(aiskHome, "units", "units.json");
  const order = JSON.parse(readFileSync(orderPath, "utf8")) as string[];
  writeFileSync(orderPath, JSON.stringify([...order, name], null, 2) + "\n");
}

/**
 * Adds a local unit to the fake aiskHome. By default it's local via a hook script;
 * pass `hook: false` with `rules: true` or `hasCustomResource: true` to test the other
 * two local-classification triggers in isolation.
 */
export function addLocalUnit(
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
export function addGlobalUnitWithDifferentSkillName(
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

export function captureStdout(fn: () => void): string {
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
