# setup-test-review

Install the AI-assisted test review convention into the current Node.js project.

Writes `.claude/rules/test-review.md` (AI behavior rules, path-scoped to test files) and appends a
pre-commit hook entry that blocks commits where test files lack a human `@reviewed-by` sign-off.

**Constraints**

- [Write operation] Writes `.claude/rules/test-review.md` and updates `.git/hooks/pre-commit` in the current project
- Node.js projects only; requires `~/.ai-skills/config.json` to exist (run `pnpm register` in the ai-scaffold repo first)

**Steps**

1. Confirm `.git/` exists in the current directory. If not, stop with: "Not a git repository."
2. Confirm `~/.ai-skills/config.json` exists. If not, stop with: "Run `pnpm register` in the ai-scaffold repo first."
3. Read the `repo` field from `~/.ai-skills/config.json` to obtain `$AISK_ROOT`.
4. Run: `node --import tsx "$AISK_ROOT/scripts/setup-test-review.ts"`
5. Report what was written (the script prints each file path).
