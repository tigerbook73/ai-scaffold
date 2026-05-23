# create-walkthrough2

Create a new walkthrough: checkout the target version, analyze all changes in one pass, pre-generate group content, then present group by group.

**Usage**: `/aisk/create-walkthrough2 [<range>]`

---

## Constraints

- Only one active walkthrough per state key (derived from the current branch); if one exists, prompt to resume or overwrite
- Working tree must be clean before any checkout
- **Silent preparation**: complete all setup steps without narrating; output text only when asking questions or presenting content
- **State script**: read `~/.ai-skills/config.json` to get `{repo}`. Index operations go through:
  `{repo}/node_modules/.bin/tsx {repo}/skills/walkthrough2/resource/walkthrough2-state.ts <cmd> [--options]`
- **Group files**: write `g{N}.md` directly via the Write tool; read via the Read tool. Path: `{cwd}/.ai-skills/walkthrough2/{stateKey}/g{N}.md`
- **Strategy**: grouping and presentation rules are in `{repo}/skills/walkthrough2/resource/strategy.md`; read it during Step 6

## Input

`$ARGUMENTS`: `[<range>]` (optional)

| Form | Target | Baseline | Checkout needed |
|------|--------|----------|-----------------|
| _(omitted)_ | inferred (see Step 2) | HEAD or HEAD~1 | only if clean tree |
| `C1` | C1 | C1~1 | yes |
| `C1..` | current worktree | C1 | no |
| `C1..C5` | C5 | C1 | yes (if not already at C5) |

## Steps

### Step 1 — Resolve state key

Read `~/.ai-skills/config.json` for `{repo}`.

Get the current branch: `git branch --show-current`.
- Branch name returned → sanitize (replace `/` with `-`) → `{stateKey}`
- Empty string (already in detached HEAD) → `git rev-parse HEAD` → `state find --hash <hash>`. If an active record is found, use its `stateKey`; otherwise generate a key from the short hash.

Check for existing state: `state read --key {stateKey}`.
- State found and `status === "active"` → ask: resume or overwrite?
  - Resume → stop (tell user to run `start-walkthrough2`)
  - Overwrite → `state delete --key {stateKey}`, continue
- State found and `status === "completed"` → inform: "该走读已完成。" Ask: start fresh?
  - Yes → `state delete --key {stateKey}`, continue
  - No → stop

### Step 2 — Confirm target and baseline

**No argument**:
Run `git status --porcelain`.
- Output non-empty → suggest: "走读所有未提交变更（target=当前工作树，baseline=HEAD）"
- Empty (clean) → suggest: "走读最近一次提交（target=HEAD，baseline=HEAD~1）"
Present suggestion; wait for confirmation. Allow free-text override.

**Single ref `C1`** (no `..`):
Confirm: "走读 C1 引入的变更（baseline=C1~1）？" then wait.

**`C1..`**:
Confirm: "走读从 C1 到当前工作树的所有变更？" then wait.

**`C1..C5`**:
Confirm: "走读从 C1 到 C5 的累积变更？" then wait.

### Step 3 — Checkout (if needed)

Skip this step when target = current worktree.

1. Verify working tree is clean: `git status --porcelain`. If non-empty, stop and prompt user to commit or stash first.
2. Record `originalBranch` = current branch name (from `git branch --show-current`).
3. `git checkout {targetRef} && git rev-parse HEAD` → record the printed hash as `{targetHash}`.
4. If `{targetRef}` is a commit hash (not a branch name): warn the user:
   > 已切换到 `{targetRef}`（detached HEAD）。走读结束后运行 `git checkout -` 返回原分支。

When no checkout is performed: `git rev-parse HEAD` → `{targetHash}`; set `checkedOut = false`, `originalBranch` = current branch.

### Step 4 — Volume check

```bash
git diff {baseline} --stat
```

When target = current worktree (no checkout performed in Step 3), also count untracked files:
```bash
git ls-files --others --exclude-standard | wc -l
```
Add this count to the tracked-file total when applying thresholds below.

| Condition | Action |
|-----------|--------|
| Files ≤ 20 and lines ≤ 1000 | Silent pass |
| Files > 20 or lines > 1000 | Report the numbers; suggest narrowing to a subdirectory or shorter range; ask whether to continue |

### Step 5 — Full read

**Diff** (one pass — do not re-read files per group later):
```bash
git diff {baseline} -U15
```

When target = current worktree (no checkout performed in Step 3), also read:
```bash
git ls-files --others --exclude-standard    # untracked files; read each via Read tool
```

When additionally `baseline = HEAD`, also run:
```bash
git diff -U15                               # unstaged changes (staged vs unstaged breakdown)
```

**Context documents**: read `{repo}/skills/walkthrough2/resource/strategy.md` now, then follow its Analysis Strategy section to determine which context documents to read and in what order.

### Step 6 — Full analysis

Read `{repo}/skills/walkthrough2/resource/strategy.md` if not already loaded.

Using the diff and context documents, produce:

1. **Change intent**: 1–3 sentences describing what this change achieves and why.
2. **Groups**: apply the Grouping Strategy from `strategy.md`. Each group must include: label, list of files, optional `designStep` reference, and done=false.
3. **Pre-generated content** for each group: write the complete walkthrough prose for all groups now, following the Presentation Format from `strategy.md`. This is the content that will go into each `g{N}.md`.

### Step 7 — Write state

**index.json** — run `state init --key {stateKey} --index '<json>'`:
```json
{
  "stateKey": "{stateKey}",
  "originalBranch": "{originalBranch}",
  "target": "{human-readable target description}",
  "baseline": "{baseline}",
  "targetRef": "{targetRef}",
  "targetHash": "{targetHash}",
  "checkedOut": true/false,
  "intent": "{1-3 sentence summary}",
  "created": "{YYYY-MM-DD}",
  "totalGroups": N,
  "currentGroup": 1,
  "status": "active",
  "groups": [
    { "label": "...", "files": [...], "done": false },
    ...
  ]
}
```

**Group files** — write each group's pre-generated content via Write tool:
- `{cwd}/.ai-skills/walkthrough2/{stateKey}/g1.md`
- `{cwd}/.ai-skills/walkthrough2/{stateKey}/g2.md`
- ... (one file per group)

### Step 8 — Present global overview

Output:
```
变更意图：{intent}

共 {N} 组：
  G1 {label} — {one-line description}（{files}）
  G2 {label} — {one-line description}
  ...
```

**STOP here.** Do NOT output G1 content in this response. Wait for the user to reply.

If the user confirms the grouping (any affirmative response), proceed to Step 9.
If the user requests adjustments (merge, split, rename groups):
1. Apply the adjustment.
2. Regenerate the affected `g{N}.md` files via Write tool.
3. Update `index.json` via `state update --key {stateKey} --index '<json>'`.
4. Re-output the updated overview, then STOP and wait again.

### Step 9 — Enter walkthrough loop

Read `{repo}/skills/walkthrough2/resource/walkthrough-loop.md`.
Follow its instructions starting from "展示当前组".
（walkthrough-loop 本身会读取并输出 g1.md，无需在此处重复读取）
