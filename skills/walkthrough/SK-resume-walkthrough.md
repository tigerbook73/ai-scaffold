# resume-walkthrough

Alias for `start-walkthrough` — resume a walkthrough from the state file.

**Constraints**

- An active (non-completed) state record must exist; if not found or already completed, prompt user to run `create-walkthrough` first
- Context is session-scoped; re-run at the start of each new session to restore walkthrough state
- **Silent preparation**: read and validate state without narrating; output text only for warnings or the resume summary
- **State script**: read `~/.ai-skills/config.json` to get `{repo}`. Index operations go through:
  `{repo}/node_modules/.bin/tsx {repo}/skills/walkthrough/resource/walkthrough-state.ts <cmd> [--options]`
- **Group files**: read `g{N}.md` directly via the Read tool from `{cwd}/.ai-skills/walkthrough/{stateKey}/g{N}.md`

**Steps**

Follow the same steps as `start-walkthrough`.
