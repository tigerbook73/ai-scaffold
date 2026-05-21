# create-skill

Promote a skill to the global repository so it can be distributed to any project via `/aisk/sync`.

**Usage**: `/aisk/create-skill <argument>`

---

## Input Modes

`$ARGUMENTS` can take two forms:

1. **File path** (path to an existing `.md` file) → promote that file directly as a global skill
2. **Skill name** (plain name, e.g. `my-skill`) → Claude generates the skill content based on the current conversation context

---

## Steps

### Common prerequisite

1. Read the format specification:
   ```bash
   cat .ai-skills/create-skill/resource/skill-format.md
   ```
   If it does not exist, skip format compliance (spec not yet synced to this project).

2. Read the global config to get the repo path:
   ```bash
   cat ~/.ai-skills/config.json
   ```
   If it does not exist, prompt the user to run `npm run register` first, then stop.

### Mode 1: File path

3. Read the source file content.

4. Check and fix format compliance against the spec (skip to step 8 if no changes needed):
   - Assess complexity → choose Compact or Structured tier
   - Fix H1 (if missing or wrong format)
   - Normalize Arguments section and step heading levels
   - Check language: if content is not in English, suggest translating (non-blocking — user may override)

5. Show the fixed content to the user as a diff, wait for confirmation.

6. After confirmation, write the fixed content to a temp file: `/tmp/{name}.md`

7. Run:
   ```bash
   npm --prefix {repo} run create-skill -- /tmp/{name}.md --name {name} [--force]
   ```
   Pass `--force` when:
   - The source file is already inside the repository (e.g. testing an existing skill), **or**
   - Skipping the overwrite confirmation for a skill name that already exists

8. Delete the temp file.

### Mode 2: Skill name

3. Confirm the name format (lowercase letters + hyphens, e.g. `my-skill`)

4. Assess complexity based on the conversation context → choose Compact or Structured tier from the spec

5. Generate the skill content in English following the chosen template

6. Write the content directly to `{repo}/skills/{name}/{name}.md` (create the `{name}/` directory first if it does not exist)

7. Run:
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
