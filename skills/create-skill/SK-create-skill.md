# create-skill

Promote a skill to the global repository so it can be applied globally with `pnpm register`.

**Usage**: `/aisk/create-skill <argument>`

---

## Input

- **File path** (path to an existing `.md` file) → promote that file directly as a global skill
- **Skill name** (e.g. `my-skill`) → generate skill content based on conversation context

---

## Constraints

- Writes to `{repo}/skills/{name}/SK-{name}.md` (Mode 1 and Mode 2)
- May write a temp file to `/tmp/aisk-*/` during Mode 1 processing (deleted after copy if `--cleanup` is passed)
- Triggers `pnpm build` which syncs `.claude/rules/skill-rules.md`

## Steps

### Common prerequisite

1. Read `~/.ai-skills/config.json` to get the `{repo}` path.
   If it does not exist, prompt the user to run `pnpm register` first, then stop.
   Then read `{repo}/skills/skill-format.md` for the format specification.
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
   pnpm --dir {repo} create-skill -- <path> --name {name} [--cleanup] [--force]
   ```

   - `<path>`: the temp file path if step 5 was executed; original source path if step 5 was skipped
   - Include `--cleanup` only when a temp file was created (step 5 was executed) — the script deletes it after copying
   - `--force` skips all confirmation prompts (source-in-repo and overwrite)

### Mode 2: Skill name

2. Confirm the name format (lowercase letters + hyphens, e.g. `my-skill`)

3. Assess complexity based on the conversation context → choose Compact or Structured tier from the spec

4. Generate the skill content in English following the chosen template

5. Write the content directly to `{repo}/skills/{name}/SK-{name}.md` (create the `{name}/` directory first if it does not exist)

6. If the skill should be Claude Code only (not Codex), prepend frontmatter to the file:

   ```
   ---
   targets: [claude]
   ---
   ```

   Otherwise no action is needed — skills default to both targets.

7. Run:
   ```bash
   pnpm --dir {repo} build
   ```

### Done

Output a confirmation message, prompting the user to:

- Run `git commit` in the ai-skills repository to persist the change
- Run `pnpm register` to apply globally (Claude Code + Codex)

---

## Notes

- This command modifies the global ai-skills repository and does not immediately affect the current project
- New skills default to both Claude Code and Codex targets; add `---\ntargets: [claude]\n---` frontmatter to restrict a skill to Claude Code only
