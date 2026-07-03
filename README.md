# AI Skills

A local AI skill library for Claude Code, meant to be used from your own checkout via `bun link` — no separate publish step. Organize reusable AI capabilities as ai-units under `units/`.

## Setup (one-time per machine)

Requires [Bun](https://bun.sh) on PATH.

```bash
git clone .../ai-scaffold ~/code/ai-scaffold
cd ~/code/ai-scaffold && bun install && bun link

ai-skills register
```

- `bun link` registers this repo as the global `ai-skills` command (`~/.bun/bin/ai-skills`) — it runs `bin/cli.ts` directly out of the repo, so editing `units/` takes effect immediately, no rebuild/republish step.
- `ai-skills register` symlinks the global `/setup` command and every **global unit**'s skill into `~/.claude/skills`, available in every project on this machine right away. Re-run it after adding/renaming/removing a unit or skill, or after editing a global unit's content — there's no automatic change detection.

## global unit vs. local unit

Each unit is wholly one or the other:

- **global unit** — no `rules` component, no script with a lefthook `hook`, no `hasCustom` skill/resource. Managed once per machine via `ai-skills register`/`unregister`; has no per-project commands at all.
- **local unit** — needs a `rules` component, a hook script, or `hasCustom` content, all of which are inherently project-local. Managed per project via `ai-skills init`/`update`/`remove` (or the equivalent `/setup` commands). `init` auto-installs local-to-local dependencies; a dependency that's a global unit needs no action.

```
ai-skills register              # global units: symlink into ~/.claude/skills (idempotent)
ai-skills unregister            # global units: remove everything ever registered

ai-skills init <unit> [unit...] # local units: install into the current project
ai-skills init all              # install every not-yet-installed local unit
ai-skills update [unit|all]     # update installed local units (all if none specified)
ai-skills remove <unit|all>     # uninstall local units

ai-skills list [--scope global|local|all]  # show all units and their status (human-readable by default)
ai-skills show <unit>                       # show unit details and component status
```

Add `--json` to any command for structured output instead of the default human-readable text.

Or use the global `/setup` command in any Claude Code project — it only manages local units (`register`/`unregister` are CLI-only):

```
/setup list                # local units and install status in the current project
/setup init <unit|all>     # install a local unit (or several, space-separated, or "all")
/setup update <unit|all>   # update installed local units
/setup remove <unit|all>   # uninstall local units
/setup show <unit>         # show unit details and component status
```

`ai-skills init`/`update` bundle each local unit's scripts on the spot (via `bun build`) and copy the result into the target project's `.aisk/{unit}/scripts/`. Global unit scripts are never bundled — `bun` executes the symlinked `.ts` source directly.

> A real `npm install -g ai-skills` (installing a published package instead of this checkout) is scaffolded via `publishConfig` in `package.json` but not yet wired up to an actual npm publish — not part of the day-to-day workflow above.

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
4. Run `pnpm verify` then `git commit`
5. If the unit is global (no rules, no hook script, no hasCustom), run `ai-skills register` to make it available

Since `ai-skills`/`/setup` read straight from this checkout (via `bun link`), no publish step is needed — changes are visible immediately (global units still need a `register` re-run to refresh their symlinks after structural changes).

## Repository structure

```
bin/
  cli.ts            # ai-skills CLI entry point (bun-linked as the global `ai-skills` command)
units/              # ai-unit source files
  <unit>/
    unit.json       # unit metadata (auto-refreshed by pnpm build)
    skills/         # Claude Code skill commands
    rules/          # Claude Code rules (presence alone makes a unit "local")
    scripts/        # runtime scripts (bundled on demand at `ai-skills init/update` time for local units;
                     # symlinked as-is for global units, bun executes .ts directly)
    resources/      # markdown resources
global/
  setup/SKILL.md    # global /setup management command (symlinked into ~/.claude/skills/aisk-setup);
                     # manages local units only
  scripts/
    installer.ts    # target-project + machine-wide installer core (also the ai-skills CLI backend)
    libs/           # shared utilities (custom-blocks, lefthook, types)
scripts/
  build.ts          # scan units/, refresh unit.json and units/units.json
  build-dist.ts     # compile dist/cli.js for a future real npm publish (not part of normal usage)
tests/              # build, installer baseline tests
docs/
  OVERVIEW.md       # full design documentation
```
