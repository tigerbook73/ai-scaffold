# quick-ship

Review current workspace changes, infer intent, and if simple — create a private branch,
commit, open a PR, squash merge, return to the original branch, and pull.

---

## Constraints

- Creates a `<type>/<slug>` branch (type from Conventional Commits: feat/fix/docs/chore/refactor/style/test), commits all changes, opens and merges a PR via `gh`
- Only one confirmation prompt, before executing git operations (Step 4)
- Stops immediately on any error or merge conflict; does not resolve conflicts

## Steps

### Step 1 — Read changes

Run `git diff HEAD` and `git status` to capture all staged and unstaged changes.

### Step 2 — Infer intent

Summarize the changes in one sentence: what was changed and why, inferred from the diff,
file names, and recent commit history.

### Step 3 — Assess simplicity

Mark the change as **simple** if ALL of the following hold:

- No complex business logic introduced or modified
- No new algorithms, data transformations, or non-trivial control flows
- Either: no tests are needed (config, docs, style, minor wording), OR existing tests
  already cover the changed paths

If any condition fails, stop and explain which condition failed. Tell the user the changes
are too complex for `quick-ship` and need manual handling.

### Step 4 — Confirm and execute

Present to the user:

- **Intent**: the one-sentence summary from Step 2
- **Branch**: `<type>/<slug>` where `<type>` is the Conventional Commits type inferred from the change (feat/fix/docs/chore/refactor/style/test) and `<slug>` is a short kebab-case identifier from the intent
- **Commit**: proposed commit message in Conventional Commits format
- **Title**: the subject line of the commit message (verbatim, no rephrasing)
- **Actions**: create branch → commit → push → create PR → squash merge → checkout
  original branch → pull

Wait for confirmation. On approval, run in sequence:

1. Record the current branch name as `<original>`
2. `git checkout -b <type>/<slug>`
3. `git add -A && git commit -m "<message>"`
4. `git push -u origin <type>/<slug>`
5. `gh pr create --title "<commit-subject>" --body "<intent summary>" --base <original>`
6. `gh pr merge --squash` (wait for completion)
7. `git checkout <original>`
8. `git pull`

Stop immediately and report the error if any step fails.
