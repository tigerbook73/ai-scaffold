# setup-test-rules

Install the AI-assisted test rules convention into the current Node.js project.

Writes `.claude/rules/test-rules.md` (AI behavior rules, path-scoped to test files) and appends a
pre-commit hook entry that blocks commits where test files lack a human `@reviewed-by` sign-off.

**Constraints**

- [Write operation] Always overwrites `.claude/rules/test-rules.md`; always replaces the hook entry in `.git/hooks/pre-commit` even if already present
- Node.js projects only; requires `~/.sk-skills/out/test-rules/setup-test-rules.js` to exist (run `pnpm register` first)

**Steps**

1. Confirm `.git/` exists in the current directory. If not, stop with: "Not a git repository."
2. Confirm `~/.sk-skills/out/test-rules/setup-test-rules.js` exists. If not, stop with: "Run `pnpm register` first."
3. Run: `node ~/.sk-skills/out/test-rules/setup-test-rules.js`
4. Report what was written (the script prints each file path).
