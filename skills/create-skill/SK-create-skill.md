# create-skill

Promote a skill to the global repository so it can be distributed to any project via `/aisk/sync`.

**Usage**: `/aisk/create-skill <argument>`

---

## Input

- **File path** (path to an existing `.md` file) → promote that file directly as a global skill
- **Skill name** (e.g. `my-skill`) → generate skill content based on conversation context

---

## Constraints

- Writes to `{repo}/skills/{name}/{name}.md` (Mode 1 and Mode 2)
- May write a temp file to `/tmp/aisk-*/` during Mode 1 processing (deleted after copy if `--cleanup` is passed)
- Triggers `npm run build` which regenerates `{repo}/claude/setting.json`

## Steps

### Common prerequisite

1. Read `~/.ai-skills/config.json` to get the `{repo}` path.
   If it does not exist, prompt the user to run `npm run register` first, then stop.
   Then read `{repo}/skills/create-skill/resource/skill-format.md` for the format specification.
   If the spec file does not exist, skip format compliance.

### Mode 1: File path

2. Read the source file content.

3. Check and fix format compliance against the spec:
   - Assess complexity → choose Compact or Structured tier
   - Fix H1 (if missing or wrong format)
   - Normalize Arguments section and step heading levels
   - Check language: if content is not in English, suggest translating (non-blocking — user may override)
   - **If no changes needed**, skip steps 4–5 and run step 6 with the original source path (no temp file).

4. Show the fixed content to the user as a diff, wait for confirmation.

5. After confirmation, write the fixed content to a unique temp path:
   `/tmp/aisk-{8-char-random-hex}/{name}.md`

6. Run:

   ```bash
   npm --prefix {repo} run create-skill -- <path> --name {name} [--cleanup] [--force]
   ```

   - `<path>`: the temp file path if step 5 was executed; original source path if step 5 was skipped
   - Include `--cleanup` only when a temp file was created (step 5 was executed) — the script deletes it after copying
   - `--force` skips all confirmation prompts (source-in-repo and overwrite)

### Mode 2: Skill name

2. Confirm the name format (lowercase letters + hyphens, e.g. `my-skill`)

3. Assess complexity based on the conversation context → choose Compact or Structured tier from the spec

4. Generate the skill content in English following the chosen template

5. Write the content directly to `{repo}/skills/{name}/{name}.md` (create the `{name}/` directory first if it does not exist)

6. Run:
   ```bash
   npm --prefix {repo} run build
   ```

### Done

Output a confirmation message, prompting the user to:

- Run `git commit` in the ai-skills repository to persist the change
- Run `/aisk/sync` in the target project to distribute

---

## Notes

- This command modifies the global ai-skills repository and does not immediately affect the current project
- If you only need the skill temporarily in the current project, create the file directly in `.claude/commands/aisk/`
