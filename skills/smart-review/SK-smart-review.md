# smart-review

Iteratively review and fix a specified file, module, or directory.

---

## Constraints

- [Write operation] Writes to files within the specified target scope only; modifying files outside the scope requires explicit user authorization
- Exempt from the global Plan Gate — no need to enter Plan Mode before making changes

## Input

`$ARGUMENTS`: `<target-path> [natural language description]`

- Target path: a file, module, or directory
- Natural language description (optional): specify the review focus (e.g. "focus on type consistency", "security issues only")
- If no description is given, the model determines the review focus based on the target file type

If `$ARGUMENTS` is empty, prompt the user to specify a review target and stop.

## Steps

### Step 1 — Review

Scan the target, determine review dimensions based on the natural language description (or file type), and identify all issues.

- Files outside the target scope may be read for context, but must not be modified

### Step 2 — Classify and handle

- Clear answer (logic errors, type errors, formatting issues, obvious omissions, etc.) → fix immediately (within the target scope only)
- Requires a decision (multiple valid approaches, interface design impact, business trade-offs) → pause, ask interactively, wait for confirmation before continuing
- Uncertain (context-dependent, needs more information) → record, defer to the end
- Fix requires modifying files outside the target scope → ask the user for authorization, wait for confirmation before continuing

### Step 3 — Loop

After each round of fixes, re-review. Repeat Steps 1 and 2. Exit when either condition is met:

- New issues found in this round = 0
- Round 3 has been completed

### Step 4 — Wrap up

- Summarize all changes made: list the file, location, and content of each change
- List all remaining issues together, noting the reason for each (needs decision / insufficient information / out of scope)
