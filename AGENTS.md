# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Common Commands

```bash
pnpm register                 # One-time Claude setup on a new machine
pnpm build                    # Scan skills/ and regenerate claude/setting.json
pnpm create-skill -- <file>   # Promote a skill file to the repository
pnpm lint:check               # ESLint check without modifying files
pnpm lint:fix                 # ESLint fix for scripts, resources, and tests
pnpm typecheck                # TypeScript check
pnpm test                     # Run node:test test suite
pnpm verify                   # Run lint:check, typecheck, test, and build
pnpm format                   # Prettier format all supported files
```

After modifying skill files or scripts, run `pnpm verify` before committing.
After adding or deleting files in `skills/`, run `pnpm build` to regenerate `claude/setting.json`.

## Architecture

This repository is a local AI skill library. The current production target is Claude Code:

```text
Local skill repository (this repo)
    -> pnpm register
~/.ai-skills/config.json
~/.claude/commands/aisk/
```

Codex support is being planned and implemented under `docs/codex-adapter/blueprint.md`. Until the Codex adapter exists, do not treat Claude slash commands such as `/aisk/init-project` as Codex commands.

## Key Files

- `claude/setting.json`: generated Claude install manifest.
- `scripts/build.ts`: scans `skills/` and regenerates `claude/setting.json`.
- `scripts/setup.ts`: installs Claude command files to `~/.claude/commands/aisk/`.
- `docs/codex-adapter/blueprint.md`: plan and phase gates for Claude + Codex support.
- `tests/`: baseline validation for generated manifests and future adapters.

## Generated Files

Do not manually edit generated manifest fields unless the relevant builder explicitly preserves that field. Prefer changing source files, metadata, or builder code, then regenerate.
