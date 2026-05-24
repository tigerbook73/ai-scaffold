# verify-task

Run acceptance checks across all steps of the current task.

---

## Constraints

- Must be in task work mode (start-task executed in current session)
- [Write operation] Updates each step's verification fields in `task-state.md`

## Input

`$ARGUMENTS`: `[auto [--full] | manual]` (optional)

- `auto` — run auto-type conditions for all steps (default: fast mode)
- `auto --full` — run all auto-type conditions from scratch, ignoring prior session results
- `manual` — present manual-type conditions for all steps for human confirmation
- _(omitted)_ — prompt the user to choose auto or manual

## Condition Types

Conditions are declared per step in design documents (as listed in the `task-state.md` Document Index):

- `(auto)` — a shell command; executed directly
- `(manual)` — a human-verification item; presented to user for confirmation
- `(superseded)` — always skipped

## Steps

### no argument

Prompt the user to choose: auto or manual. Then proceed with the chosen mode.

### auto mode

Iterates over every step in the implementation phase.

**Fast mode** (default): Skip steps whose `auto-check` is already `passed`.
For remaining steps, run only conditions that failed or were not yet run in this session.
If no prior session context exists, fall back to full mode automatically.

**Full mode** (`--full`): Run all `(auto)` conditions for all steps regardless of prior results.

For each step being verified:

1. Read `(auto)` conditions from the **Auto Verification** section of each step in the design documents.
2. Execute each condition's command and record the result (pass / fail).
3. If all pass: update that step's `auto-check: passed` in `task-state.md`.
   If any fail: update `auto-check: failed`, report which commands failed.

### manual mode

Iterates over every step in the implementation phase.

1. Read `(manual)` conditions from the **Manual Verification** section of each step in the design documents.
2. Present each condition to the user and ask for confirmation.
3. If the user confirms all pass: update that step's `manual-check: passed` in `task-state.md`.
   If any are declined: update `manual-check: failed`, note which items failed.
