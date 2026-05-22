# prepare-task

Create planning documents for a feature or refactor task and start cross-session work on a separate branch.

---

## Constraints
- [Write operation] Creates a branch and planning documents; does not modify existing files
- Must operate on a new branch; refuses to execute on the main trunk

## Input

`$ARGUMENTS`:
- `feature {name}` → feature three-document mode
- `refactor {name}` → refactor three-document mode (different REQUIREMENTS template)

## Steps

1. Create and switch to a `feature/{name}` or `refactor/{name}` branch
2. Create `docs/tasks/{name}/REQUIREMENTS.md` (frontmatter: `status: draft`; content follows the mode template)
3. Create `docs/tasks/{name}/PROGRESS.md` (current stage: `requirements-drafting`)
4. Commit the initial documents
5. Output the list of created files; prompt the user to fill in `REQUIREMENTS.md`

## REQUIREMENTS.md Templates

### Feature mode
- Problem description
- Use cases / acceptance criteria

### Refactor mode
- Refactor objective
- Scope and constraints
- Done criteria
