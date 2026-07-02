# AI 上下文

这是所有在此代码库中工作的 AI agent 的共享项目上下文。Claude Code 通过 `CLAUDE.md`（包含此文件的 `@AGENTS.md` 引用）读取本文件。

在重新生成或大幅更新 agent 入口文件时，请同步更新此文件以保持共享上下文的一致性。

## 项目目的

本代码库是一个本地 AI skill 库，以 ai-unit 形式组织在 `units/` 目录下。仅供本人在本机使用：通过 `bun link` 把本仓库注册为全局 `ai-skills` 命令，不存在单独的发布步骤——`ai-skills`/`/setup` 都直接读取本仓库的 `units/`，改完 skill/rule/resource 立刻生效。目标项目通过全局 `setup` skill（`/setup add <unit>`）或 `ai-skills` CLI 按需安装所需 unit。

## 常用命令

```bash
bun link         # 一次性：注册全局 ai-skills 命令，指向本仓库
pnpm build       # 扫描 units/，刷新 unit.json 和 units/units.json（新增/改名/删除文件后需要）
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
本仓库（bun link 注册为全局 ai-skills 命令，无发布步骤）
├── bin/cli.ts                      ai-skills CLI 入口（bun 直接运行源码）
├── units/{unit}/                   unit 源码（unit.json + 组件内容）
└── units/units.json                unit 拓扑顺序（pnpm build 生成）

~/.claude/skills/aisk-setup/ -> global/setup（symlink，一次性手动建立）
└── SKILL.md                        全局 setup 管理命令（/setup），内部调用 `ai-skills` CLI

Target project（由 /setup 或 ai-skills CLI 管理）
├── .aisk/installed.json            已安装 unit 状态
├── .aisk/{unit}/scripts/{name}.js  脚本在 add/update 时现场用 `bun build` 打包（处理外部依赖/相对 import）
├── .claude/skills/aisk-{unit}-{skill}/SKILL.md
└── .claude/rules/aisk-{unit}/{rule}.md
```

## 关键文件

- `scripts/build.ts`：扫描 `units/`，刷新各 `unit.json` 和 `units/units.json`，维护拓扑顺序。
- `scripts/build-dist.ts`：编译 `dist/cli.js`，为将来真正 `npm publish` 准备（`package.json` 的 `publishConfig` 占位），日常工作流不涉及。
- `bin/cli.ts`：`ai-skills` CLI 入口，`aiskHome` 固定为本仓库自身（`bun link` 后 `__dirname` 解析到真实仓库路径）。
- `global/setup/SKILL.md`：全局 setup 管理 skill，通过 symlink 安装到 `~/.claude/skills/aisk-setup/`。
- `global/scripts/installer.ts`：安装逻辑核心实现（`ai-skills` CLI 和 `/setup` 共用）。
- `tests/`：build、installer 基线验证测试。
