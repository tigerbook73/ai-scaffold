# refresh-arch

Scan the codebase and generate or refresh `.ai-skills/architecture.md`, recording architecture decisions that should not be broken during code changes.

---

## Constraints

- [Write operation] Only writes to `.ai-skills/architecture.md`; no other files are modified
- Shows a diff before writing; writes only after user confirmation

## Input

`$ARGUMENTS` (optional):

- No argument → most recent commit (`git diff HEAD~1`)
- Path (e.g. `src/`) → current files under that directory
- Commit hash → changes in that commit (`git diff <hash>~1 <hash>`)
- Number (e.g. `3`) → changes across the last N commits (`git diff HEAD~N`)
- ALL → full project (intelligently ignores auto-generated code)

## Steps

1. Read the current `.ai-skills/architecture.md` (if it exists)

2. Scan the codebase and extract or refresh architecture decision entries according to the following criteria:

   Each entry must simultaneously satisfy:
   1. It is a violable choice — there is a clear "what not to do"
   2. There is no immediate signal when violated — tools do not report it, behavior appears normal;
      impact may only surface in other modules, be exposed with a delay,
      or silently accumulate as a quality hazard
   3. Understanding "why it was designed this way" requires reading multiple files

   Format for each entry:

   ```
   **[Decision title]**
   Counter-example: what not to do (one sentence)
   Rationale: why it was designed this way
   Consequence: what happens if violated
   ```

   Do not include:
   - Standard usage of the tech stack
   - Descriptive content without a clear counter-example ("the system uses X" is not a decision)

   When refreshing:
   - Do not duplicate decisions already covered by existing entries; when two entries cover the same decision from different angles, keep the existing one
   - New entries must clearly satisfy all three criteria above; when in doubt, do not add — err on the side of fewer
   - Remove existing entries that no longer meet the criteria or whose corresponding design has changed

3. Show the diff; wait for user confirmation

4. After user confirmation, write to `.ai-skills/architecture.md` (create the directory if it does not exist)

   If `.ai-skills/` was just created for the first time, remind the user to add `.ai-skills/` to `.gitignore`.
