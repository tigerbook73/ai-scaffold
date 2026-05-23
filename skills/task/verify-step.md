# verify-step

Run acceptance checks for a single step. Defaults to the current step.

Auto/manual/fast/full logic is identical to verify-task; the difference is scope — one step instead of all steps.

---

## Constraints

- Must be in task work mode (start-task executed in current session)
- Results are written back to the specified step's verification fields in `task-state.md`

## Input

`$ARGUMENTS`: `[step-N] [auto [--full] | manual]` (optional)

- `step-N` — target step (e.g. `step-2`); omit to use the current step from `task-state.md`
- `auto` — run auto-type conditions (default: fast mode)
- `auto --full` — run all auto-type conditions from scratch
- `manual` — present manual-type conditions for human confirmation
- _(all omitted)_ — use current step, prompt user to choose auto or manual

## Steps

### Resolve target step

If `step-N` is provided, use it. Otherwise read `当前步骤` from `task-state.md`.
If `当前步骤` is `—` (not in implementation phase), prompt the user to specify a step and stop.

### auto mode

**Fast mode** (default): First check `task-state.md` — if this step's `自动验收` is already
`通过`, skip all conditions and report pass immediately. Otherwise, if this session already ran
verify-step or verify-task for this step and has results in context, skip conditions that
previously passed and re-run only those that failed or were not yet run. If no prior session
context exists, fall back to full mode.

**Full mode** (`--full`): Run all `(auto)` conditions for the step regardless of prior results.

1. Read `(auto)` conditions for the target step from the design documents.
2. Execute each condition's command and record the result (pass / fail).
3. If all pass: update `自动验收: 通过` for the step in `task-state.md`.
   If any fail: update `自动验收: 未通过`, report which commands failed.

### manual mode

1. Read `(manual)` conditions for the target step from the design documents.
2. Present each condition to the user and ask for confirmation.
3. If the user confirms all pass: update `人工验收: 通过` for the step in `task-state.md`.
   If any are declined: update `人工验收: 未通过`, note which items failed.
