# close-task

Verify that the feature or refactor is complete and committed, clean up the planning documents, and prompt that a PR can be opened.

---

## Constraints
- [Write operation] Deletes the planning document directory

## Input

`$ARGUMENTS` (optional):
- No argument → inferred from the current branch name (`feature/{name}` or `refactor/{name}`)
- `{name}` → manually specified

## Steps

1. Parse the mode and name from the branch name or input
2. Check `git status`: working tree must be clean; otherwise stop and prompt the user to commit first
3. Check `PROGRESS.md`: current stage must be `completed`; otherwise list the incomplete steps and stop
4. Delete `docs/tasks/{name}/`
5. Commit the deletion
6. Output: ✅ Cleanup complete. Ready to open a PR.
