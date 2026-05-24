# complete-task

Verify task completion, clean up task documents, and prompt the user to create a PR.

Does not run acceptance tests — use verify-task for that.

---

## Constraints

- Must be in task work mode (start-task executed in current session)
- Working tree must be clean (no uncommitted changes, no untracked files)
- Must be on a task branch (not main/master)
- [Write operation] Phase 2 deletes `docs/tasks/{task-name}/` and creates a git commit — each action requires explicit user confirmation

## Steps

### Phase 1 — Completeness Check

1. Run `git status`. If the working tree is not clean (staged, modified, or untracked files),
   stop and prompt the user to commit or stash changes first.
2. Read `task-state.md` document index; load all design documents.
3. For each step listed in the design documents, verify in `task-state.md`:
   - Status is `done`
   - A commit hash is recorded (not `—`)
4. Verify that every step's `自动验收` field in `task-state.md` is `通过`.
5. Verify that every step's `人工验收` field in `task-state.md` is `通过`.
6. If any check fails, list all failing items and stop. Prompt the user to resolve them
   (e.g., run verify-task, complete the missing step, or commit pending changes).

### Phase 2 — Cleanup

Each action in this phase requires explicit user confirmation before proceeding.

7. Display the full path of the task directory to be deleted (`docs/tasks/{task-name}/`).
   Ask the user to confirm deletion.
8. Upon confirmation:
   - Delete the entire `docs/tasks/{task-name}/` directory (all files and subdirectories).
   - Stage with `git add -A docs/tasks/{task-name}/`.
   - Commit: `git commit -m "chore: complete task {task-name}"`.
9. Prompt the user to create a PR. Do not create it automatically.

> **Recovery**: If changes are needed after the PR is reviewed, restore the deleted documents
> with: `git checkout <commit-before-deletion> -- docs/tasks/{task-name}/`
