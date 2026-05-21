# init-project

Configure a new project to work with globally installed aisk skills.

**Usage**: `/aisk/init-project` (no arguments)

---

## Steps

1. Read `~/.ai-skills/config.json` to get the `{repo}` path.
   If it does not exist, prompt the user to run `npm run register` first, then stop.

2. Add `.ai-skills/` to `.gitignore`:
   - Show the line to be added
   - Wait for user confirmation before writing
   - Append `.ai-skills/` to `.gitignore` (create the file if it does not exist)

3. Read `.claude/settings.local.json` (create with `{}` if it does not exist).
   In `permissions.allow`, append the following entries if not already present:
   - `Read(~/.ai-skills/*)` — allow reading global config and resource files
   - `Bash(npm --prefix {repo} run *)` — allow all npm scripts scoped to the aisk repo (replace `{repo}` with the actual path from config.json)

   Use `settings.local.json` because these entries contain machine-specific absolute paths and should not be committed.

4. Output a summary of what was configured, then suggest the following optional next steps for first-time setup:

   > **Recommended next steps** (optional, run in a new conversation):
   >
   > Generate a project guide for Claude:
   > ```
   > /init
   > ```
   > Generate the architecture decision document:
   > ```
   > /aisk/refresh-arch ALL
   > ```

---

## Notes

- This skill is idempotent: running it again on an already-configured project is safe
- `architecture.md` is generated per-project under `.ai-skills/` by `/aisk/refresh-arch`; that directory should not be committed, hence the `.gitignore` entry
