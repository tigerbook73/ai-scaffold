// Installs the AI test review convention into the current project:
// writes .claude/rules/test-review.md and appends a pre-commit hook entry.
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { join } from "path";

const HOOK_MARKER = "# aisk:test-review-check";

const HOOK_SNIPPET = `
${HOOK_MARKER}
AISK_ROOT=$(node -e "process.stdout.write(require(require('os').homedir()+'/.ai-skills/config.json').repo)")
node --import tsx "$AISK_ROOT/scripts/test-review-check.ts"
`;

class SetupTestReview {
  run(): void {
    this.writeRules();
    this.updateHook();
  }

  // Copies the rules template from this repo into the target project's .claude/rules/
  private writeRules(): void {
    const templatePath = join(
      __dirname,
      "..",
      "skills",
      "setup-test-review",
      "resource",
      "test-review.md",
    );
    const content = readFileSync(templatePath, "utf-8");
    const rulesDir = join(process.cwd(), ".claude", "rules");
    mkdirSync(rulesDir, { recursive: true });
    const rulesPath = join(rulesDir, "test-review.md");
    writeFileSync(rulesPath, content);
    console.log(`  Wrote: ${rulesPath}`);
  }

  // Appends the test-review-check call to .git/hooks/pre-commit; creates the hook if absent.
  private updateHook(): void {
    const hookPath = join(process.cwd(), ".git", "hooks", "pre-commit");

    if (!existsSync(join(process.cwd(), ".git"))) {
      console.error("Not a git repository.");
      process.exit(1);
    }

    let existing = "";
    if (existsSync(hookPath)) {
      existing = readFileSync(hookPath, "utf-8");
      if (existing.includes(HOOK_MARKER)) {
        console.log(`  Hook already installed: ${hookPath}`);
        return;
      }
    } else {
      existing = "#!/bin/sh\n";
    }

    writeFileSync(hookPath, existing + HOOK_SNIPPET);
    chmodSync(hookPath, 0o755);
    console.log(`  Updated: ${hookPath}`);
  }
}

new SetupTestReview().run();
