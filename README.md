# AI Skills

A local AI skill library for Claude Code. Organize reusable AI capabilities as ai-units and publish them globally with a single command.

## Setup (one-time per machine)

```bash
git clone .../ai-scaffold ~/code/ai-scaffold
cd ~/code/ai-scaffold && pnpm install && pnpm register
```

After this:

- `~/.aisk/` holds the published units and installer
- `~/.claude/skills/aisk-setup/SKILL.md` provides the global `/setup` command

## Using skills in a project

In any project's Claude Code session, use the global setup command:

```
/setup list               # show all available units and install status
/setup add <unit>         # install a unit (or several, space-separated)
/setup add all            # install all units
/setup update <unit|all>  # update installed units
/setup remove <unit|all>  # uninstall units
/setup show <unit>        # show unit details and component status
```

## Available units

| Unit               | Description                                                                         |
| ------------------ | ----------------------------------------------------------------------------------- |
| `confirm-intent`   | 执行前确认用户预期结果，等待明确最终确认                                            |
| `dev-task`         | 管理结构化 dev-task：创建文档，通过 path rule 识别上下文命令                        |
| `playwright`       | Playwright E2E 测试规范：定位器优先级、作用域链式定位，以及 shadcn/ui 补充          |
| `quick-ship`       | 审查工作区变更，创建分支、提交、开 PR、squash 合并、返回原分支                      |
| `smart-review`     | 对指定文件、模块或目录进行迭代式审查和修复                                          |
| `test-review-gate` | 强制执行 @reviewed-by 注释和测试名称一致性约束，通过 pre-commit hook 和 Claude 规则 |
| `ui-coverage`      | UI 变更测试覆盖规范：判定哪些变更需要测试、选择测试类型（E2E / 组件测试）           |
| `ui-testability`   | UI 可测试性规范：aria-label、data-testid 命名、动态列表、可复用组件透传             |
| `walkthrough`      | 创建和恢复结构化代码走读，按变更分组生成可导航的讲解状态                            |

## Adding a new unit

1. Create `units/<name>/unit.json` with `name` and `description` fields
2. Add skill files to `units/<name>/skills/`, rules to `rules/`, scripts to `scripts/`
3. Run `pnpm verify` then `git commit`
4. Run `pnpm register` to publish globally

## Repository structure

```
units/              # ai-unit source files
  <unit>/
    unit.json       # unit metadata (auto-refreshed by pnpm build)
    skills/         # Claude Code skill commands
    rules/          # Claude Code rules
    scripts/        # runtime scripts (compiled to JS on publish)
    resources/      # markdown resources
global/
  setup/SKILL.md    # global /setup management command
  scripts/
    installer.ts    # target-project installer core
scripts/
  build.ts          # scan units/, refresh unit.json and units.json
  publish.ts        # publish to ~/.aisk/, install global setup skill
  clean.ts          # remove global artifacts recorded in install.log
tests/              # build, publish, installer baseline tests
docs/
  OVERVIEW.md       # full design documentation
```
