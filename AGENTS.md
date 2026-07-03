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

默认安装模型是"全局可用，项目内仅保存本地定制/状态"：`ai-skills sync-global` 把所有启用 unit 的 skill 以 symlink 形式安装到 `~/.claude/skills`，对所有本机项目立即生效。项目级 `/setup add/update/remove` 不再复制普通 skill/script/resource；只有声明 `hasCustom` 或 `localCopy: true` 的组件才写入项目 `.aisk`/`.claude`。任何声明了 `rules` 组件的 unit 暂时整体屏蔽（`list` 默认不展示，`add` 显式安装报错，`add all` 静默跳过），因为 rules 的本地/全局拆分方案还未落地。

```text
本仓库（bun link 注册为全局 ai-skills 命令，无发布步骤）
├── bin/cli.ts                      ai-skills CLI 入口（bun 直接运行源码）
├── units/{unit}/                   unit 源码（unit.json + 组件内容）
└── units/units.json                unit 拓扑顺序（pnpm build 生成，含 disabled unit）

~/.claude/skills/                   由 `ai-skills sync-global` 管理（symlink，可重复执行，幂等）
├── aisk-setup/ -> global/setup
└── aisk-{unit}-{skill}/
    ├── SKILL.md -> units/{unit}/{skill.file}
    ├── resources/ -> units/{unit}/resources/   （unit 声明了 resources 时）
    └── scripts/   -> units/{unit}/scripts/     （unit 声明了 scripts 时；bun 直接执行 .ts，无需 bundle）

Target project（由 /setup 或 ai-skills CLI 管理，仅本地定制/状态）
├── .aisk/installed.json                已安装 unit 状态（仅记录本地组件 + hook 注册）
├── .aisk/{unit}/{...}                  hasCustom / localCopy 组件的本地拷贝
├── .claude/skills/aisk-{unit}-{skill}/ 仅 hasCustom / localCopy 的 skill 才会出现在这里
└── .claude/rules/aisk-{unit}/{rule}.md （rules unit 暂时禁用，当前不会生成）
```

## 关键文件

- `scripts/build.ts`：扫描 `units/`，刷新各 `unit.json` 和 `units/units.json`，维护拓扑顺序（含 disabled unit，enabled 过滤在运行时由 installer 计算）。
- `scripts/build-dist.ts`：编译 `dist/cli.js`，为将来真正 `npm publish` 准备（`package.json` 的 `publishConfig` 占位），日常工作流不涉及。
- `bin/cli.ts`：`ai-skills` CLI 入口，`aiskHome` 固定为本仓库自身（`bun link` 后 `__dirname` 解析到真实仓库路径）。
- `global/setup/SKILL.md`：全局 setup 管理 skill，通过 `ai-skills sync-global` symlink 到 `~/.claude/skills/aisk-setup/`。
- `global/scripts/installer.ts`：安装逻辑核心实现（`ai-skills` CLI 和 `/setup` 共用），含 `syncGlobal()`、enabled-unit 过滤、本地/全局组件拆分。
- `tests/`：build、installer 基线验证测试。

## 首次使用 / 更新全局 skill

`bun link` 之后，运行一次 `ai-skills sync-global` 建立/刷新 `~/.claude/skills` 下的 symlink；改完 unit 内容无需重新执行（symlink 直接指向仓库源码），但新增/删除 unit 或 skill 后需要重新执行一次以创建/清理对应目录。
