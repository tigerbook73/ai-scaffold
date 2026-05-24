# Task Usage Guide

Practical guidance for common scenarios during task execution.

---

## 1. Core Principle

**`design.md` defines the steps; `task-state.md` records the execution.**

Both must stay in sync — never change code without updating the documents. Otherwise, the AI will read incorrect context when re-entering task work mode.

`git log` is a supplementary reference, not the source of truth. Step completion status is determined by `task-state.md`.

---

## 2. Step Status Management

### Multiple steps in progress simultaneously

Two steps being `in_progress` at the same time is allowed — for example, if step-2 has started and a gap in step-1 is discovered, it's valid to go back and fix it.

In this case, **explicitly tell the AI which step you are currently focused on**, e.g.:

> "Switch to step-1, fix the xxx issue"

The AI cannot infer focus automatically — the user must direct it.

### Rolling back a step

To roll a completed step back to `in_progress`:

1. Tell the AI the reason (e.g. "step-1 has a gap, need to go back and fix it")
2. AI updates `task-state.md`: step-1 status → `in_progress`; invalidated acceptance conditions marked `(superseded)` or cleared
3. After fixing, commit again; AI sets status back to `done`

---

## 3. Handling Design Flaws

### Case 1: Can be fixed going forward

A later step can compensate for the gap in an earlier step without breaking completed work.

Approach:

- Add the fix to the current or a later step's `design.md`
- Mark the invalidated acceptance conditions in step-1 as `(superseded)`
- Leave step-1 as `done`

This is the lowest-cost path — prefer it.

### Case 2: Must go back to the original step

The earlier step's implementation is semantically wrong and cannot be worked around by later steps.

Approach:

1. Update `design.md` — revise that step's description and acceptance conditions
2. Update `task-state.md` — roll step status back to `in_progress`; mark invalidated conditions as `(superseded)`
3. Implement the fix and commit (`{type}(step-N): fix xxx`)
4. Re-run verification; set status back to `done`
5. Assess whether subsequent steps are affected; update as needed

### Case 3: Architectural flaw affecting multiple steps

Approach:

1. Pause implementation; revise `design.md` as a whole first
2. Evaluate which completed steps need rework and which can be handled with `(superseded)`
3. Note the reason for the change in the Design Phase `notes` field of `task-state.md`
4. Resume implementation

---

## 4. Commit Convention

**Step commits**: `{type}(step-N): {step-title}`

- Use `feat` for feature branches, `refactor` for refactor branches
- A step may have multiple commits (intermediate results, rework fixes, etc.)

**Non-step commits**: standard conventional commits format, no step scope

```
feat(step-1): add search API endpoint
feat(step-1): fix missing validation      <- additional commit for step-1
feat(step-2): integrate search UI
docs: update task requirements
fix: resolve null pointer in parser
```

---

## 5. AI Limitations

The following situations cannot be detected automatically — the user must inform the AI explicitly:

- Step rollback (AI will not change `done` back to `in_progress` on its own)
- Which step is currently in focus (when multiple steps are `in_progress`)
- Scope of impact from a design change (user must judge which steps are affected)

In these situations, describe the scenario in natural language; the AI will update `task-state.md` and continue.
