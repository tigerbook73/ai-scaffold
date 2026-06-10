# AI 上下文

这是所有在此代码库中工作的 AI agent 的共享项目上下文。Claude Code 通过 `CLAUDE.md`（包含此文件的 `@AGENTS.md` 引用）读取本文件。

在重新生成或大幅更新 agent 入口文件时，请同步更新此文件以保持共享上下文的一致性。

## 项目目的

本代码库是一个本地 AI skill 库，以 ai-unit 形式组织在 `units/` 目录下，通过 `pnpm register` 发布到 `~/.aisk/`。目标项目通过全局 `setup` skill（`/setup add <unit>`）按需安装所需 unit。

## 常用命令

```bash
pnpm register    # build + 发布到 ~/.aisk/ + 安装全局 setup skill
pnpm build       # 扫描 units/，刷新 unit.json 和 units.json
pnpm clean       # 清理本仓库发布到全局位置的内容
pnpm lint:check  # ESLint 检查
pnpm lint:fix    # ESLint 自动修复
pnpm typecheck   # TypeScript 检查
pnpm test        # Vitest 测试
pnpm verify      # lint:check + typecheck + test + build
pnpm format      # Prettier 格式化
```

单独运行测试文件：

```bash
pnpm exec vitest run tests/<file>.test.ts
```

修改 unit 文件或脚本后，提交前请运行 `pnpm verify`。

## 当前架构

```text
Local skill repository (this repo)
    -> pnpm register
         -> pnpm build          刷新 units/*/unit.json 和 units/units.json
         -> scripts/publish.ts  发布到 ~/.aisk/，安装全局 setup skill

~/.aisk/
├── config.json                 记录本仓库路径和发布时间
├── install.log                 精确记录所有发布产物，用于 clean
├── units.json                  unit 拓扑顺序
├── units/{unit}/               已发布 unit（unit.json + 组件内容）
└── global/installer.js         目标项目安装器

~/.claude/skills/aisk-setup/
└── SKILL.md                    全局 setup 管理命令（/setup）

Target project（由 /setup 管理）
├── .aisk/installed.json        已安装 unit 状态
├── .aisk/{unit}/               资源与编译后的脚本
├── .claude/skills/aisk-{unit}-{skill}/SKILL.md
└── .claude/rules/aisk-{unit}/{rule}.md
```

## 关键文件

- `scripts/build.ts`：扫描 `units/`，刷新各 `unit.json` 和 `units/units.json`，维护拓扑顺序。
- `scripts/publish.ts`：发布 unit 到 `~/.aisk/`，编译脚本，安装全局 setup skill，写 `install.log`。
- `scripts/clean.ts`：读取 `install.log`，精确删除本仓库发布的全局产物。
- `global/setup/SKILL.md`：全局 setup 管理 skill，安装到 `~/.claude/skills/aisk-setup/`。
- `global/scripts/installer.ts`：目标项目安装器核心实现。
- `tests/`：build、publish、installer 基线验证测试。
