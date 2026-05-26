# start-walkthrough

Resume a walkthrough from the state file.

---

## Constraints

- An active (non-completed) state record must exist; if not found or already completed, prompt user to run `create-walkthrough` first
- Context is session-scoped; re-run at the start of each new session to restore walkthrough state
- **Silent preparation**: read and validate state without narrating; output text only for warnings or the resume summary
- **State script**: read `~/.ai-skills/config.json` to get `{repo}`. Index operations go through:
  `{repo}/node_modules/.bin/tsx {repo}/skills/walkthrough/resource/walkthrough-state.ts <cmd> [--options]`
- **Group files**: read `g{N}.md` directly via the Read tool from `{cwd}/.ai-skills/walkthrough/{stateKey}/g{N}.md`

## Steps

### Step 1 — Locate state

Read `~/.ai-skills/config.json` for `{repo}`.

Determine state key:

- `git branch --show-current` returns a branch name → sanitize (replace `/` with `-`) → `{stateKey}` → `state read --key {stateKey}`
- Returns empty (detached HEAD) → `git rev-parse HEAD` → `state find --hash <hash>` → extract `stateKey` from result → `state read --key {stateKey}`

If no state found (exit 1) → tell the user to run `create-walkthrough` first, stop.

If state found and `index.status === "completed"` → warn:

> This walkthrough is already completed (`{index.target}`). Run `create-walkthrough` to start a new one.
> Stop.

### Step 2 — Validate checkout position

If `index.checkedOut = true`:

1. `git rev-parse HEAD` → `{currentHash}`
2. Compare with `index.targetHash`.
3. Mismatch → warn and stop:
   > Current position (`{currentHash}`) does not match the walkthrough target (`{index.targetHash}`).
   > Run `git checkout {index.targetRef}` first, then re-run `start-walkthrough`.

### Step 3 — Resume summary

Output:

```
Walkthrough target: {index.target} (baseline: {index.baseline})
Progress: G{index.currentGroup} / {index.totalGroups}, {done count} group(s) done
```

### Step 4 — Enter walkthrough loop

Read `{repo}/skills/walkthrough/resource/walkthrough-loop.md`.
Follow its instructions starting from "Display current group".
(walkthrough-loop reads and outputs g{currentGroup}.md itself — no need to repeat it here)
