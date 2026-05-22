# create-walkthrough

Create a new walkthrough: confirm the target, generate groups, and begin the first group.

---

## Constraints

- Only one active walkthrough per git branch; if one exists, prompt to resume or overwrite
- If the target scope is clearly too large (e.g., entire project full content), prompt the user to narrow it down and stop

## Input

`$ARGUMENTS`: `[<commit-range> | <file-or-dir>]` (optional)

- `<commit-range>` — e.g., `main..HEAD`; use this range as the walkthrough target
- `<file-or-dir>` — a path; prompt user to confirm the variation (see Step 2)
- _(omitted)_ — infer target from working tree state (see Step 2)

## Steps

1. Check `.ai-skills/data/walkthrough.md` for an existing active record on the current branch.
   If found, prompt: resume existing or overwrite? Stop if resume chosen.

2. **Confirm the walkthrough target**:

   - **No argument**: Check `git status`.
     - Uncommitted changes exist → suggest: "走读未提交变更"
     - Working tree clean → suggest: "走读最近一次提交（HEAD）"
     - Present suggestion to user; allow free-text override.
   - **File or directory argument**: Check `git status` for that path.
     - Has changes → suggest two options: (a) changes in that path, (b) full content of that path
     - No changes → suggest: full content of that path
     - Present options; user confirms or provides custom description.
   - **Commit range argument**: Use as-is; confirm with user before proceeding.

3. **Generate groups**: Analyze the confirmed target.
   - If `docs/tasks/` contains design documents (`design.md` or `design-*.md`):
     map code changes to design steps and create one group per step.
   - Otherwise: group by module or functional boundary; briefly explain the grouping logic.
   - If a single group would be too large (estimated output > 300 lines), split it further.
   - Present the group list to the user as an overview, then proceed immediately to Step 4.

4. **Save state**: Write the walkthrough record to `.ai-skills/data/walkthrough.md` (current branch section).
   If `.ai-skills/data/` is not yet in `.gitignore`, append it.

5. **Begin first group**: Proceed immediately to present G1 without waiting for user input.
   After presenting G1, output: **G1 完成 — 继续 G2？** and wait.
