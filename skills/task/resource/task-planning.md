---
priority: high
paths: ["docs/tasks/**"]
last_updated: YYYY-MM-DD
---

# Task Workflow

## Branch Constraints
- All changes must be on a feature/refactor branch (naming: `feature/{name}` or `refactor/{name}`)
- `docs/tasks/{name}/` must be cleaned up before merging (done by `close-task`)

## Document Creation Order
- `prepare-task` only creates `REQUIREMENTS.md` and `PROGRESS.md`
- `DESIGN.md` is generated after an explicit user instruction

## Required Headings

### REQUIREMENTS.md (feature mode)
- `status` (frontmatter: `draft | confirmed`)
- Problem description
- Use cases / acceptance criteria

### REQUIREMENTS.md (refactor mode)
- `status` (frontmatter: `draft | confirmed`)
- Refactor objective
- Scope and constraints
- Done criteria

### DESIGN.md
- Solution overview
- Implementation steps (numbered, each with a done criterion)
- Outstanding decisions

### PROGRESS.md
- Current stage (`requirements-drafting | design-drafting | implementing | completed`)
- Step status (checklist corresponding to the DESIGN implementation steps)
- Deviation log

## Implementation Rules
- DESIGN implementation steps can be executed one by one by number
- After each step is complete and confirmed by the user, automatically update the PROGRESS checklist and commit (code + status together)
- If an issue is found after implementation: only update the PROGRESS deviation log
- Major changes (affecting acceptance criteria): update REQUIREMENTS / DESIGN and reset the relevant step statuses

## Status Query
Read `PROGRESS.md` for the current stage, then confirm the most recent commit via `git log`
