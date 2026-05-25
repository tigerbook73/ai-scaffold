# create-skill

Capture a skill intent, refine it into a spec, and add it to the global repository.

**Usage**: `/aisk/create-skill [$ARGUMENTS]`

---

## Constraints

- Writes to `{repo}/skills/{name}/SK-{name}.md`
- Triggers `pnpm build` which syncs `.claude/rules/skill-rules.md`

## Input

- No argument → prompt the user to describe the skill they want
- Any argument → treat the entire argument as the raw skill intent

## Steps

### Step 1 — Collect intent

Read `~/.ai-skills/config.json` to get `{repo}`. If missing, tell the user to run `pnpm register` first and stop.

Read `{repo}/skills/skill-format.md` for the format spec.

If an argument was provided, use it as the raw intent. Otherwise ask the user:

> What should this skill do? Describe the goal, trigger, and expected behavior.

### Step 2 — Organize and confirm intent

Restate the intent in structured form:

- **Goal**: what the skill achieves
- **Trigger**: when and how it is used
- **Core behavior**: key steps at a high level
- **Constraints**: write scope, side effects, limits
- **Out of scope**: what this skill explicitly does not do

Ask the user to confirm or correct before proceeding.

### Step 3 — Generate skill draft

Based on the confirmed intent:

1. Choose Compact or Structured tier from the format spec
2. Infer a kebab-case skill name
3. Generate the full skill MD content in English following the chosen template

Show the generated content to the user and wait for confirmation. If the user requests changes, apply them and re-show before proceeding.

### Step 4 — Write to repository

After the user confirms the content:

1. Write the file to `{repo}/skills/{name}/SK-{name}.md` (create the `{name}/` directory if it does not exist)
2. If the skill is Claude Code only (not Codex), prepend:
   ```
   ---
   targets: [claude]
   ---
   ```
   Otherwise no action needed — skills default to both targets.
3. Run:
   ```bash
   pnpm --dir {repo} build
   ```

Output a confirmation and prompt the user to:

- Run `git commit` in the ai-skills repository to persist the change
- Run `pnpm register` to apply globally (Claude Code + Codex)

---

## Notes

- All generated skill content must be in English
- Default target is both Claude Code and Codex; ask the user only if the skill uses Claude-specific behaviors that Codex cannot support
