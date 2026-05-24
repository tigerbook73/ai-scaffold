# refresh-arch

Scan the codebase and generate or refresh `.ai-skills/architecture.md`, recording architecture decisions that should not be broken during code changes.

---

## Constraints

- [Write operation] Only writes to `.ai-skills/architecture.md`; no other files are modified
- Shows a diff before writing; writes only after user confirmation

## Input

`$ARGUMENTS` (optional):

- No argument → auto-detect: if working tree has changes (staged/unstaged/untracked) → same as `changes`; otherwise → same as `commit 1`
- `help` → list all available modes, then stop
- `ALL` → full project file tree (intelligently ignores auto-generated code)
- `changes` → all working tree changes: `git diff` (unstaged) + `git diff --cached` (staged) + untracked new files (`git ls-files --others --exclude-standard`)
- `commit [N|hash]` → files changed between that point and current worktree:
  - `commit` or `commit 1` → HEAD~1 to current (`git diff HEAD~1`)
  - `commit N` → HEAD~N to current (`git diff HEAD~N`)
  - `commit <hash>` → `<hash>` to current (`git diff <hash>`)
- `<path>` → current content of files under that directory/file

## Steps

1. Read the current `.ai-skills/architecture.md` (if it exists)

2. Parse `$ARGUMENTS` and determine the review scope; retrieve the corresponding files or diff content

3. Scan the retrieved content and extract or refresh architecture decision entries according to the following criteria:

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

4. Show the diff; wait for user confirmation

5. After user confirmation, write to `.ai-skills/architecture.md` (create the directory if it does not exist)

   If `.ai-skills/` was just created for the first time, remind the user to add `.ai-skills/` to `.gitignore`.

   Output a one-line scope summary, for example:

   ```
   Scope: changes (2 modified, 1 staged, 1 untracked) | Entries added: 2, updated: 1, removed: 0
   Scope: commit HEAD~1 (abc1234), 3 files | Entries added: 0, updated: 1, removed: 0
   Scope: ALL, 12 files | Entries added: 4, updated: 0, removed: 0
   ```
