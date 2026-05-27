# verify-task

Run acceptance checks for the current task against the Task Acceptance conditions in the design document.

---

## Constraints

- Must be in task work mode (start-task executed in current session)
- [Write operation] Updates the Task Acceptance fields in `task-state.md`

## Input

`$ARGUMENTS`: `[auto [--full] | manual]` (optional)

- `auto` — run auto-type conditions (default: fast mode)
- `auto --full` — run all auto-type conditions from scratch
- `manual` — present manual-type conditions for human confirmation
- _(omitted)_ — prompt the user to choose auto or manual

## Condition Types

Conditions are declared in the **Task Acceptance** section of the design document
(the last design file listed in the `task-state.md` Document Index):

- `(auto)` — a shell command; executed directly
- `(manual)` — a human-verification item; presented to user for confirmation
- `(superseded)` — always skipped

## Steps

### no argument

Prompt the user to choose: auto or manual. Then proceed with the chosen mode.

### auto mode

**Fast mode** (default): If `task-state.md` `task-auto-check` is already `passed`, skip all
conditions and report pass immediately. Otherwise run only conditions that failed or were not yet
run in this session. If no prior session context exists, fall back to full mode.

**Full mode** (`--full`): Run all `(auto)` conditions regardless of prior results.

1. Read `(auto)` conditions from the **Task Acceptance** section of the design document.
2. Execute each condition's command and record the result (pass / fail).
3. If all pass: update `task-auto-check: passed` in `task-state.md`.
   If any fail: update `task-auto-check: failed`, report which commands failed.

### manual mode

1. Read `(manual)` conditions from the **Task Acceptance** section of the design document.
2. Present each condition to the user and ask for confirmation.
3. If the user confirms all pass: update `task-manual-check: passed` in `task-state.md`.
   If any are declined: update `task-manual-check: failed`, note which items failed.
