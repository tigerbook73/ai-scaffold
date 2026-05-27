# Design Step Format: Required Sections

This document defines the required sections for each step in a design document.
Design documents may be split across multiple files (listed in `task-state.md` Document Index);
these format constraints apply to every step regardless of which file it appears in.
All other step content (goals, architecture notes, key changes, rationale) is free-form.

---

## Step Type

**Step Type**: `intermediate` | `final`

- `intermediate` — code produced is transitional; a later step finalizes or replaces it.
  Full tests are not required; note in the step which later step finalizes the code.
- `final` — code produced is production-quality. Tests must be written in this step,
  or explicitly delegated to a named later step with a note here.

---

## Auto Verification

Commands run automatically to verify the step's output.

- `(auto)` `<command>` — executed directly; must exit 0
- `(superseded)` replaces any condition that is no longer valid

**Guidelines for `final` steps**: include at least one functional test command that exercises
the new behavior (e.g., a targeted test filter or a new test file) — not just the full existing
suite. Keep commands cheap and fast; high-cost checks belong in Manual Verification.

**Guidelines for `intermediate` steps**: auto conditions are optional; include only what is
meaningful for the transitional state.

---

## Manual Verification

Human-confirmed items for checks that cannot be automated cost-effectively.

- `(manual)` <description>
- `(manual) [automation-candidate]` <description> — marks items worth automating in the future

Use `[automation-candidate]` when the item is currently too costly to automate but could be
automated with reasonable effort later.
