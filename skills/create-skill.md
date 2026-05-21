# Create Global Skill

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

1. Read the global config to get the repo path:
   ```bash
   cat ~/.ai-skills/config.json
   ```
   If it does not exist, prompt the user to run `npm run register` first, then stop.

### Mode 1: File path

2. Run:
   ```bash
   npm --prefix {repo} run create-skill -- {file} [--name {name}] [--force]
   ```
   Where `{file}` is an absolute path (relative paths are resolved from the current working directory).

### Mode 2: Skill name

2. Confirm the name format (lowercase letters + hyphens, e.g. `my-skill`)
3. Generate the skill content based on the conversation context, following the format of existing skills in the repository
4. Write the content directly to `{repo}/skills/{name}.md`
5. Run:
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
