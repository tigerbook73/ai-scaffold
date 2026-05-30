// Installs the AI test rules convention into the current project:
// writes .claude/rules/test-rules.md and appends a pre-commit hook entry.
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { join } from "path";

const HOOK_MARKER = "# aisk:test-rules-check";

const HOOK_SNIPPET = `
${HOOK_MARKER}
node "$HOME/.sk-skills/out/test-rules/test-rules-check.js"
`;

export class SetupTestRules {
  constructor(private cwd = process.cwd()) {}

  run(): void {
    this.writeRules();
    this.updateHook();
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

  // Writes the test-rules-check call to .git/hooks/pre-commit; replaces any existing entry.
  private updateHook(): void {
    const hookPath = join(this.cwd, ".git", "hooks", "pre-commit");

    if (!existsSync(join(this.cwd, ".git"))) {
      console.error("Not a git repository.");
      process.exit(1);
    }

    let existing = existsSync(hookPath) ? readFileSync(hookPath, "utf-8") : "#!/bin/sh\n";
    // Remove any previous marker entry before re-appending the latest snippet.
    existing = existing.replace(/\n# aisk:test-rules-check\n[^\n]*\n?/g, "");

    writeFileSync(hookPath, existing + HOOK_SNIPPET);
    chmodSync(hookPath, 0o755);
    console.log(`  Updated: ${hookPath}`);
  }
}

if (require.main === module) {
  new SetupTestRules().run();
}
