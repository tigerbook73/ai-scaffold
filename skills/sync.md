# Sync Skills

Sync all skills from the global skill repository to the current project's `.claude/commands/aisk/`.

**Usage**: `/aisk/sync` (no arguments)

---

## Steps

1. Check if `~/.ai-skills/config.json` exists:
   ```bash
   cat ~/.ai-skills/config.json
   ```
   If it does not exist, prompt the user to run `npm run register` in the ai-skills repository directory first, then stop.

2. Read the `repo` path from the config, get the current project directory, and run the sync script:
   ```bash
   npm --prefix {repo} run sync -- --target {cwd}
   ```
   Where `{repo}` is replaced with the actual path from the config, and `{cwd}` with the absolute path of the current working directory.

3. Print the sync results (output by sync.ts).

---

## Notes

- The sync scope is determined by `{repo}/claude/setting.json`, which includes all skill commands and resource files
- Command files are synced to `.claude/commands/aisk/`, resource files to `.ai-skills/*/resource/`
- Existing files are overwritten directly (latest version wins)
