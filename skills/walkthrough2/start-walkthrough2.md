# start-walkthrough2

Resume a walkthrough from the state file. `resume-walkthrough2` is an alias with identical behavior.

---

## Constraints

- An active (non-completed) state record must exist; if not found or already completed, prompt user to run `create-walkthrough2` first
- Context is session-scoped; re-run at the start of each new session to restore walkthrough state
- **Silent preparation**: read and validate state without narrating; output text only for warnings or the resume summary
- **State script**: read `~/.ai-skills/config.json` to get `{repo}`. Index operations go through:
  `{repo}/node_modules/.bin/tsx {repo}/skills/walkthrough2/resource/walkthrough2-state.ts <cmd> [--options]`
- **Group files**: read `g{N}.md` directly via the Read tool from `{cwd}/.ai-skills/walkthrough2/{stateKey}/g{N}.md`

## Steps

### Step 1 — Locate state

Read `~/.ai-skills/config.json` for `{repo}`.

Determine state key:
- `git branch --show-current` returns a branch name → sanitize (replace `/` with `-`) → `{stateKey}` → `state read --key {stateKey}`
- Returns empty (detached HEAD) → `git rev-parse HEAD` → `state find --hash <hash>` → extract `stateKey` from result → `state read --key {stateKey}`

If no state found (exit 1) → tell the user to run `create-walkthrough2` first, stop.

If state found and `index.status === "completed"` → warn:
> 该走读已完成（`{index.target}`）。如需重新走读，请运行 `create-walkthrough2`。
Stop.

### Step 2 — Validate checkout position

If `index.checkedOut = true`:
1. `git rev-parse HEAD` → `{currentHash}`
2. Compare with `index.targetHash`.
3. Mismatch → warn and stop:
   > 当前位置（`{currentHash}`）与走读目标（`{index.targetHash}`）不匹配。
   > 请先运行 `git checkout {index.targetRef}`，然后重新运行 `start-walkthrough2`。

### Step 3 — Resume summary

Output:
```
走读目标：{index.target}（基线：{index.baseline}）
进度：G{index.currentGroup} / {index.totalGroups}，已完成 {done count} 组
```

### Step 4 — Enter walkthrough loop

Read `{repo}/skills/walkthrough2/resource/walkthrough-loop.md`.
Follow its instructions starting from "展示当前组".
（walkthrough-loop 本身会读取并输出 g{currentGroup}.md，无需在此处重复读取）
