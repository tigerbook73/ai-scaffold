// Installs the AI test rules convention into the current project:
// writes .claude/rules/test-rules.md and appends a pre-commit hook entry via husky.
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { join } from "path";

const HOOK_MARKER = "# aisk:test-rules-check";

const HOOK_SNIPPET = `
${HOOK_MARKER}
node "$HOME/.sk-skills/out/test-rules/test-rules-check.js"
`;

/** Thrown when the target project has no .husky/ directory (exit code 2). */
export class HuskyNotFoundError extends Error {
  readonly exitCode = 2;
  constructor() {
    super("Husky is not set up in this project. Run /aisk/setup-precommit first.");
  }
}

export class SetupTestRules {
  constructor(private cwd = process.cwd()) {}

  run(): void {
    this.checkHusky();
    this.writeRules();
    this.updateHook();
  }

  // Throws HuskyNotFoundError so callers (tests or entry point) decide how to handle it.
  private checkHusky(): void {
    if (!existsSync(join(this.cwd, ".husky"))) {
      throw new HuskyNotFoundError();
    }
  }

  // Copies the rules template from this repo into the target project's .claude/rules/
  private writeRules(): void {
    const templatePath = join(
      __dirname,
      "..",
      "..",
      "skills",
      "setup-test-rules",
      "resource",
      "test-rules.md",
    );
    const content = readFileSync(templatePath, "utf-8");
    const rulesDir = join(this.cwd, ".claude", "rules");
    mkdirSync(rulesDir, { recursive: true });
    const rulesPath = join(rulesDir, "test-rules.md");
    writeFileSync(rulesPath, content);
    console.log(`  Wrote: ${rulesPath}`);
  }

  // Writes the test-rules-check call to .husky/pre-commit; replaces any existing entry.
  private updateHook(): void {
    const hookPath = join(this.cwd, ".husky", "pre-commit");

    let existing = existsSync(hookPath) ? readFileSync(hookPath, "utf-8") : "";
    // Remove any previous marker entry before re-appending the latest snippet.
    existing = existing.replace(/\n# aisk:test-rules-check\n[^\n]*\n?/g, "");

    writeFileSync(hookPath, existing + HOOK_SNIPPET);
    chmodSync(hookPath, 0o755);
    console.log(`  Updated: ${hookPath}`);
  }
}

if (require.main === module) {
  try {
    new SetupTestRules().run();
  } catch (e) {
    if (e instanceof HuskyNotFoundError) {
      console.error(e.message);
      process.exit(e.exitCode);
    }
    throw e;
  }
}
