# resume-walkthrough2

Alias for `start-walkthrough2` — resume a walkthrough from the state file.

---

## Constraints

- An active state record must exist; if not found, prompt user to run `create-walkthrough2` first
- Context is session-scoped; re-run at the start of each new session to restore walkthrough state
- **Silent preparation**: read and validate state without narrating; output text only for warnings or the resume summary
- **State script**: read `~/.ai-skills/config.json` to get `{repo}`. Index operations go through:
  `{repo}/node_modules/.bin/tsx {repo}/skills/walkthrough2/resource/walkthrough2-state.ts <cmd> [--options]`
- **Group files**: read `g{N}.md` directly via the Read tool from `{cwd}/.ai-skills/walkthrough2/{stateKey}/g{N}.md`

## Steps

Read `~/.claude/commands/aisk/start-walkthrough2.md` and follow its Steps section.
