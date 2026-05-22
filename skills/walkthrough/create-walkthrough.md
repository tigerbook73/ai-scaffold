# create-walkthrough

Create a new walkthrough: confirm the target, generate groups, and begin the first group.

---

## Constraints

- Only one active walkthrough per git branch; if one exists, prompt to resume or overwrite
- If the target scope is clearly too large (e.g., entire project full content), prompt the user to narrow it down and stop
- **Silent preparation**: Complete all setup steps without narrating each action. Output text only when asking the user a question or presenting group content.
- **State script**: Read `~/.ai-skills/config.json` to get `{repo}`. All state operations go through the script — never access state storage directly:
  `{repo}/node_modules/.bin/tsx {repo}/skills/walkthrough/resource/walkthrough-state.ts <cmd> --branch <branch> [--state '<json>']`

## Input

`$ARGUMENTS`: `[<commit-range> | <file-or-dir>]` (optional)

- `<commit-range>` — e.g., `main..HEAD`; use this range as the walkthrough target
- `<file-or-dir>` — a path; prompt user to confirm the variation (see Step 2)
- _(omitted)_ — infer target from working tree state (see Step 2)

## Steps

1. Read `~/.ai-skills/config.json` to get `{repo}`. Run `state read --branch <branch>` to check for an existing active record.
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

4. **Save state**: Run `state write --branch <branch> --state '<json>'` with the full state object.
   See the `State` interface in `{repo}/skills/walkthrough/resource/types.ts` for the exact field names and types.

5. **Begin first group**: Proceed immediately to present G1 without waiting for user input.
   After presenting G1, output: **G1 完成？** and wait.

6. **Progress updates**: Each time the user confirms a group is done, run `state write --branch <branch> --state '<json>'`
   with updated `currentGroup` and `groups` before presenting the next group.

7. **Completion**: When the last group is confirmed done, run `state write --branch <branch> --state '<json>'` with `status: completed`.
   Then prompt: "走读完成，是否删除状态记录？"
   - Yes → run `state delete --branch <branch>`.
   - No → keep the record as-is.
