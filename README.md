# AI Skills

A local AI skill library for Claude Code (and OpenAI's Codex CLI), meant to be used from your own checkout via `bun link` — no separate publish step. Organize reusable AI capabilities as ai-units under `units/`.

## Setup (one-time per machine)

Requires [Bun](https://bun.sh) on PATH.

```bash
git clone .../ai-scaffold ~/code/ai-scaffold
cd ~/code/ai-scaffold && bun install && bun link

aisk-register
```

- `bun link` registers this repo's two bins as global commands (`~/.bun/bin/aisk-setup`, `~/.bun/bin/aisk-register`) — they run `bin/aisk-setup.ts`/`bin/aisk-register.ts` directly out of the repo, so editing `units/` takes effect immediately, no rebuild/republish step.
- `aisk-register` symlinks every **global unit**'s skill into each supported agent's global skills directory — `~/.claude/skills` for Claude Code and `~/.agents/skills` for Codex CLI — available in every project on this machine right away. Bare `aisk-register register`/`unregister` targets both (`all`); pass `claude` or `codex` to target just one. Re-run it after adding/renaming/removing a unit or skill, or after editing a global unit's content — there's no automatic change detection.

## global unit vs. local unit

Each unit is wholly one or the other:

- **global unit** — no `rules` component, no script with a lefthook `hook`, no `hasCustom` skill/resource. Managed once per machine via the `aisk-register` command (`register`/`unregister` subcommands); has no per-project commands at all, and isn't managed by `aisk-setup`.
- **local unit** — needs a `rules` component, a hook script, or `hasCustom` content, all of which are inherently project-local. Managed per project via the `aisk-setup` command (`init`/`update`/`remove` subcommands). `init` auto-installs local-to-local dependencies; a dependency that's a global unit needs no action.

Note: `rules` has no Codex CLI equivalent, so local units stay Claude-only for now.

```
aisk-register register           # global units: symlink into ~/.claude/skills AND ~/.agents/skills (idempotent)
aisk-register register claude    # only ~/.claude/skills
aisk-register register codex     # only ~/.agents/skills
aisk-register unregister         # global units: remove everything ever registered (both targets by default)

aisk-setup init <unit> [unit...] # local units: install into the current project
aisk-setup init all              # install every not-yet-installed local unit
aisk-setup update [unit|all]     # update installed local units (all if none specified)
aisk-setup remove <unit|all>     # uninstall local units

aisk-setup list [--scope global|local|all]  # show all units and their status (human-readable by default)
aisk-setup show <unit>                       # show unit details and component status
```

Add `--json` to any `aisk-setup` command for structured output instead of the default human-readable text (`aisk-register` always prints human-readable text).

`aisk-setup init`/`update` bundle each local unit's scripts on the spot (via `bun build`) and copy the result into the target project's `.aisk/{unit}/scripts/`. Global unit scripts are never bundled — `bun` executes the symlinked `.ts` source directly.

> A real `npm install -g ai-skills` (installing a published package instead of this checkout, exposing the same `aisk-setup`/`aisk-register` bins) is scaffolded via `publishConfig` in `package.json` but not yet wired up to an actual npm publish — not part of the day-to-day workflow above.

## Available units

| Unit               | Scope  | Description                                                                                         |
| ------------------ | ------ | --------------------------------------------------------------------------------------------------- |
| `commit`           | global | 提交前运行检查清单，确保代码质量和流程规范，再执行 git commit                                       |
| `confirm-intent`   | global | 执行前确认用户预期结果，等待明确最终确认                                                            |
| `playwright`       | local  | Playwright E2E 测试规范：定位器优先级、作用域链式定位，以及 shadcn/ui 补充                          |
| `quick-ship`       | global | 审查工作区变更，推断意图，创建私有分支、提交、开 PR、squash 合并、返回原分支                        |
| `smart-review`     | global | 对指定文件、模块或目录进行迭代式审查和修复                                                          |
| `staged-plan`      | global | 通过四层流程（需求 → 架构与关键决策 → 步骤地图 → 逐步实现）驱动功能开发，支持跨 session 的长期规划  |
| `test-review-gate` | local  | 在测试文件上强制执行 @reviewed-by 注释和测试名称一致性约束，通过 pre-commit hook 和 Claude 规则实现 |
| `ui-coverage`      | local  | UI 变更测试覆盖规范：判定哪些变更需要测试、选择测试类型（E2E / 组件测试）                           |
| `ui-testability`   | local  | UI 可测试性规范：aria-label、data-testid 命名、动态列表、可复用组件透传                             |
| `walkthrough`      | global | 创建和恢复结构化代码走读，按变更分组生成可导航的讲解状态                                            |

## Adding a new unit

1. Create `units/<name>/unit.json` with `name` and `description` fields
2. Add skill files to `units/<name>/skills/`, rules to `rules/`, scripts to `scripts/`
3. Run `pnpm build` to refresh `unit.json`/`units/units.json` (structural changes like new/renamed files need this; content edits to existing files don't)
4. If it has a skill component, give the skill file's frontmatter a `name`/`description` (see `.claude/rules/ai-scaffold/skill-gate.md`) — Codex CLI requires it for implicit trigger matching, Claude Code ignores it
5. Run `pnpm verify` then `git commit`
6. If the unit is global (no rules, no hook script, no hasCustom), run `aisk-register` to make it available to both Claude Code and Codex CLI

Since `aisk-setup`/`aisk-register` read straight from this checkout (via `bun link`), no publish step is needed — changes are visible immediately (global units still need an `aisk-register` re-run to refresh their symlinks after structural changes).

## Repository structure

```
bin/
  aisk-setup.ts     # local unit CLI entry point (bun-linked as the global `aisk-setup` command)
  aisk-register.ts  # global unit register/unregister entry point (bun-linked as `aisk-register`; targets Claude Code + Codex CLI)
units/              # ai-unit source files
  <unit>/
    unit.json       # unit metadata (auto-refreshed by pnpm build)
    skills/         # Claude Code skill commands
    rules/          # Claude Code rules (presence alone makes a unit "local")
    scripts/        # runtime scripts (bundled on demand at `aisk-setup init/update` time for local units;
                     # symlinked as-is for global units, bun executes .ts directly)
    resources/      # markdown resources
global/
  installer.ts      # local unit installer core (the aisk-setup CLI backend)
  libs/             # shared utilities (custom-blocks, lefthook, global-units, types)
scripts/
  build.ts          # scan units/, refresh unit.json and units/units.json
  build-dist.ts     # compile dist/aisk-setup.js + dist/aisk-register.js for a future real npm publish
tests/              # build, installer, register baseline tests
  helpers/          # fixtures shared by installer.test.ts and register.test.ts
docs/
  OVERVIEW.md       # full design documentation
```
