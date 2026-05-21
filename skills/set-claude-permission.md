# set-claude-permission

Organize the `.claude/settings.local.json` permission configuration for the current project.

---

## Input

`$ARGUMENTS`: Level 2 categories, space-separated. Valid values: `read` `write` `shell` `npm`
- If `$ARGUMENTS` is empty, complete Level 1 first, then list the options and prompt the user to choose before continuing

## Steps

### Step 1 — Read current state
1. Determine the project root (current directory or the nearest ancestor containing `.claude/`)
2. Read `.claude/settings.local.json` (if it does not exist, start from an empty `permissions.allow: []`)
3. If `$ARGUMENTS` includes `npm` or is empty: read the `scripts` field from `package.json` in the project root

### Step 2 — Level 1: Security baseline (applied automatically, no confirmation needed)
Add the following permissions if not already covered:
```
Bash(pwd), Bash(date), Bash(which *)
Bash(git status), Bash(git log *), Bash(git diff *)
```

### Step 3 — Level 2: Standard permissions
If `$ARGUMENTS` is empty, display the following options and wait for the user to choose:
```
read  — Read(<project_root>/**)         Read within the project (including sensitive files like .env*)
write — Write(<project_root>/**)        Write/create files within the project
shell — find/grep/cat/ls/wc            Path-restricted read-only shell tools
npm   — npm run / pnpm run             Safe scripts from package.json
```

Process each item per `$ARGUMENTS` or the user's selection:

**`read`**
Add `Read(<project_root>/**)` and note in the Step 6 preview: this rule covers sensitive files like `.env*`.

**`write`**
Add `Write(<project_root>/**)`.

**`shell`**
Add the following path-restricted commands (replace the placeholder with the actual `project_root`):
```
Bash(ls <project_root>/*), Bash(find <project_root> *)
Bash(grep * <project_root>/*), Bash(cat <project_root>/*)
Bash(wc <project_root>/*)
```
Note: `grep` format is `grep <pattern> <path>`; the permission prefix must cover the full command form.

**`npm`**
Safe name set: `lint` `build` `test` `typecheck` `type-check` `tsc` `format` `check` `validate`
- Match scripts whose names are in the safe set; add `Bash(npm run <name>)`
- If `pnpm-lock.yaml` exists in the project root, also add `Bash(pnpm run <name>)`
- List the actual command content of each matched script (e.g. `lint → eslint src/`) for confirmation in Step 6
- Scripts not in the safe set: skip, summarize in Step 6
- Note: matching is by name only, not by script content; the user is responsible for verifying that `package.json` is from a trusted source

### Step 4 — Consolidate existing rules
Analyze existing entries in the allow list:
- Identify functionally overlapping entries (e.g. multiple `Bash(git -C /path ...)` can be unified as `Bash(git *)`)
- If the merged result's permission scope ≤ the original entries combined → merge directly
- If merging would expand the scope (granting sub-commands not previously allowed) → **pause**, display:
  - Original entry list
  - Proposed merged result
  - Specific description of the expanded permissions
  - Ask the user whether to accept; wait for confirmation before continuing

### Step 5 — Sensitive path check
Scan existing rules for sensitive paths (`.env*`, `*.pem`, `*secret*`, `*credential*`, `*token*`, `*.key`):
- If found, list each one and ask the user whether to keep it; wait for confirmation

### Step 6 — Preview and confirm
Show the complete diff of `permissions.allow` changes in diff format (labeled `+added` / `-removed` / `kept`), and summarize:
- Matched npm safe scripts and their actual command content
- Skipped `package.json` scripts (not in the safe set)
- Rules that cover sensitive files (e.g. the `read` category)

Wait for user confirmation before proceeding to Step 7.

### Step 7 — Write
After user confirmation, write to `.claude/settings.local.json`, leaving all other fields in the file unchanged.
