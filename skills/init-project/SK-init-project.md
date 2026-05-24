# init-project

Configure a new project to work with globally installed aisk skills.

**Usage**: `/aisk/init-project` (no arguments)

---

## Constraints

- Writes to `.gitignore`, `.claude/settings.local.json`, and creates `.ai-skills/` in the current project root

## Steps

### Step 1 — Read config

Read `~/.ai-skills/config.json` to get the `{repo}` path.
If the file does not exist, prompt the user to run `pnpm register` first, then stop.

### Step 2 — Update .gitignore

Check whether `.ai-skills` or `.ai-skills/` already appears in `.gitignore`.

- If already present: skip this step
- If not present:
  - Show the line to be added: `.ai-skills/`
  - Wait for user confirmation before writing
  - Append `.ai-skills/` to `.gitignore` (create the file if it does not exist)

### Step 3 — Create .ai-skills/ directory

If `.ai-skills/` does not exist in the project root, create it automatically (no confirmation needed).

### Step 4 — Update settings.local.json

Read `.claude/settings.local.json`. If it does not exist, create it with `{"permissions": {"allow": []}}`.

In `permissions.allow`, append the following entries if not already present (including coverage by a broader existing permission):

- `Read(~/.ai-skills/*)` — allow reading global config and resource files
- `Bash(pnpm --dir {repo} run *)` — allow all pnpm scripts scoped to the aisk repo (replace `{repo}` with the actual path from Step 1); skip if an existing permission already covers this (e.g. `Bash(pnpm *)`)

Use `settings.local.json` because these entries contain machine-specific absolute paths and should not be committed.

### Step 5 — Output summary

Output a summary of what was configured, then suggest the following optional next steps for first-time setup:

---

## Notes

- This skill is idempotent: running it again on an already-configured project is safe
- `architecture.md` is generated per-project under `.ai-skills/` by `/aisk/refresh-arch`; that directory should not be committed, hence the `.gitignore` entry
