# create-walkthrough

Create a new walkthrough: checkout the target version, analyze all changes in one pass, group the changes, present a global overview, then walk through group by group on demand.

**Usage**: `/aisk/create-walkthrough [<range>]`

---

## Constraints

- Only one active walkthrough per state key (derived from the current branch); if one exists, prompt to resume or overwrite
- Working tree must be clean before any checkout
- **Silent preparation**: complete all setup steps without narrating; output text only when asking questions or presenting content
- **State script**: read `~/.ai-skills/config.json` to get `{repo}`. Index operations go through:
  `{repo}/node_modules/.bin/tsx {repo}/skills/walkthrough/resource/walkthrough-state.ts <cmd> [--options]`
- **Group files**: write `g{N}.md` directly via the Write tool; read via the Read tool. Path: `{cwd}/.ai-skills/walkthrough/{stateKey}/g{N}.md`
- **Strategy**: grouping and presentation rules are in `{repo}/skills/walkthrough/resource/strategy.md`; read it during Step 5

## Input

`$ARGUMENTS`: `[<range>]` (optional — if provided, used as the walkthrough target range directly)

Collected via a guided selection chain in Step 2:

1. **Target**: if dirty → confirm-only (uncommitted changes including untracked); if clean → numbered options (latest commit or commit-to-current range)
2. **Intent**: numbered choice — `learning` (understand why) or `review` (assess risk)
3. **Reference materials**: numbered choice — skip or provide file paths / free text

## Steps

### Step 1 — Resolve state key

Read `~/.ai-skills/config.json` for `{repo}`.

Get the current branch: `git branch --show-current`.

- Branch name returned → sanitize (replace `/` with `-`) → `{stateKey}`
- Empty string (already in detached HEAD) → `git rev-parse HEAD` → `state find --hash <hash>`. If an active record is found, use its `stateKey`; otherwise generate a key from the short hash.

Check for existing state: `state read --key {stateKey}`.

- State found and `status === "active"` → ask: resume or overwrite?
  - Resume → stop (tell user to run `start-walkthrough`)
  - Overwrite → `state delete --key {stateKey}`, continue
- State found and `status === "completed"` → inform: "This walkthrough is already completed." Ask: start fresh?
  - Yes → `state delete --key {stateKey}`, continue
  - No → stop

### Step 2 — Collect input

#### Phase 1 — Walkthrough target

If `$ARGUMENTS` was provided, skip detection; use it as `{targetRef}` and confirm with the user before proceeding.

Otherwise, run `git status --porcelain` and `git ls-files --others --exclude-standard | wc -l` silently, then branch:

**Dirty working tree** (has uncommitted changes or untracked files):

No options — only one valid target. Present for confirmation:

```
Walkthrough target:
  Current working tree — uncommitted changes including untracked (N files)
  Confirm? (Y/n)
```

- User confirms → `{target}` = working tree, `{baseline}` = HEAD, `{targetRef}` = working tree, checkout not needed
- User declines → stop

**Clean working tree**:

Present numbered options (default = 1):

```
Walkthrough target:
  1. Latest commit (HEAD)  ← default
  2. From a specific commit to current version (enter starting commit)
```

- User picks 1 or presses Enter → `{target}` = HEAD, `{baseline}` = HEAD~1, `{targetRef}` = HEAD, checkout needed
- User picks 2 → ask: "Starting commit (e.g. abc1234 or HEAD~3):" → `{target}` = current worktree, `{baseline}` = given commit, `{targetRef}` = working tree, checkout not needed

#### Phase 2 — Walkthrough intent

Present options:

```
Walkthrough intent:
  1. learning — understand design rationale; group by concept/feature; actively cite reference materials
  2. review   — assess correctness and risk; group by impact/risk area; cite references on demand
```

Wait for the user to pick 1 or 2. Store as `{walkIntent}`.

#### Phase 3 — Reference materials (optional)

Present options:

```
Reference materials (optional):
  1. Skip
  2. Provide file paths or free-text description...
```

- User picks 1 → set `{references}` to empty
- User picks 2 → ask for input; if file paths are given, read their contents now; store as `{references}`

### Step 3 — Checkout (if needed)

Skip this step when target = current worktree.

1. Verify working tree is clean: `git status --porcelain`. If non-empty, stop and prompt user to commit or stash first.
2. Record `originalBranch` = current branch name (from `git branch --show-current`).
3. `git checkout {targetRef} && git rev-parse HEAD` → record the printed hash as `{targetHash}`.
4. If `{targetRef}` is a commit hash (not a branch name): warn the user:
   > Switched to `{targetRef}` (detached HEAD). Run `git checkout -` to return to the original branch when the walkthrough is done.

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

| Condition                   | Action                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| Files ≤ 20 and lines ≤ 1000 | Silent pass                                                                                       |
| Files > 20 or lines > 1000  | Report the numbers; suggest narrowing to a subdirectory or shorter range; ask whether to continue |

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

**Context documents**: read `{repo}/skills/walkthrough/resource/strategy.md` now, then follow its Analysis Strategy section to determine which context documents to read and in what order.

### Step 6 — Full analysis

Read `{repo}/skills/walkthrough/resource/strategy.md` if not already loaded.

Using the diff, context documents, `{walkIntent}`, and `{references}`, produce:

1. **Change intent**: 1–3 sentences describing what this change achieves and why.
2. **Groups**: apply grouping strategy based on `{walkIntent}`. Each group must include: label, list of files, optional `designStep` reference, and done=false.
   - `learning`: group by concept or feature module; order to build mental model progressively
   - `review`: group by risk or impact area; order from highest-risk to lowest

Do **not** generate prose for any group here. All group files (G1..GN) are generated on demand during navigation.

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
  "walkIntent": "learning|review",
  "references": "{references or empty string}",
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

**Group files** — do not pre-write any group files. All group files (G1..GN) are generated on demand during navigation.

### Step 8 — Present global overview

Output:

```
Change intent: {intent}

{N} groups:
  G1 {label} — {one-line description} ({files})
  G2 {label} — {one-line description}
  ...
```

**STOP here.** Do NOT output G1 content in this response. Wait for the user to reply.

If the user confirms the grouping (any affirmative response), proceed to Step 9.
If the user requests adjustments (merge, split, rename groups):

1. Apply the adjustment.
2. Update `index.json` via `state update --key {stateKey} --index '<json>'`.
3. Delete any already-generated `g{N}.md` files whose group was changed (using Bash `rm`), so they are regenerated on first visit with the updated grouping.
4. Re-output the updated overview, then STOP and wait again.

### Step 9 — Enter walkthrough loop

Read `{repo}/skills/walkthrough/resource/walkthrough-loop.md`.
Follow its instructions starting from "Display current group".
(walkthrough-loop generates and outputs g1.md on demand — no need to repeat it here)
