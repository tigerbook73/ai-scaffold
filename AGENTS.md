# AI 上下文

这是所有在此代码库中工作的 AI agent 的共享项目上下文。Claude Code 通过 `CLAUDE.md`（包含此文件的 `@AGENTS.md` 引用）读取本文件。

在重新生成或大幅更新 agent 入口文件时，请同步更新此文件以保持共享上下文的一致性。

## 项目目的

本代码库是一个本地 AI skill 库，以 ai-unit 形式组织在 `units/` 目录下。仅供本人在本机使用：通过 `bun link` 把本仓库注册为全局的 `aisk-setup`/`aisk-register` 命令，不存在单独的发布步骤——两者都直接读取本仓库的 `units/`，改完 skill/rule/resource 立刻生效。unit 分两种：无需项目本地文件的 global unit（`aisk-register` 注册一次后所有项目自动可用），和需要项目本地文件的 local unit（`aisk-setup init` 按项目显式安装）。

## 常用命令

```bash
bun link         # 一次性：注册全局 aisk-setup / aisk-register 命令，指向本仓库
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

unit 按是否需要项目本地文件分成两类，**整体二选一**（不做同一 unit 内部分组件本地、部分组件全局的混合）：

- **global unit**：无 `rules` 组件、无声明 lefthook `hook` 的 script、无 `hasCustom` 的 skill/resource。通过 `aisk-register`（`bin/aisk-register.ts`）一次性以 symlink 形式装进 `~/.claude/skills`，对本机所有项目立即生效，**没有任何项目级命令，也不由 `aisk-setup` 管理**。
- **local unit**：命中上述三个触发条件之一。通过 `aisk-setup init`/`update`/`remove` 按项目显式安装；`init` 会自动展开 local-to-local 依赖（依赖若是 global unit 则不需要任何动作）。

```text
本仓库（bun link 注册为全局 aisk-setup / aisk-register 命令，无发布步骤）
├── bin/aisk-setup.ts               local unit CLI 入口（bun 直接运行源码）
├── bin/aisk-register.ts            global unit 注册入口（bun 直接运行源码）
├── units/{unit}/                   unit 源码（unit.json + 组件内容）
└── units/units.json                unit 拓扑顺序（pnpm build 生成，含 global 和 local）

~/.claude/skills/                        由 `aisk-register`（register/unregister 子命令）管理（symlink，幂等，靠注册记录文件清理）
├── .aisk-registry.json                  注册记录，register 靠它清理上一次的内容，不做命名前缀扫描
├── aisk-{unit}/                         skill 名与 unit 名相同时合并（如 aisk-staged-plan）
│   └── SKILL.md -> units/{unit}/{skill.file}
└── aisk-{unit}-{skill}/                 skill 名与 unit 名不同时保留两段（如 aisk-walkthrough-create-walkthrough）
    ├── SKILL.md -> units/{unit}/{skill.file}
    ├── resources/ -> units/{unit}/resources/   （unit 声明了 resources 时）
    └── scripts/   -> units/{unit}/scripts/     （unit 声明了 scripts 时；bun 直接执行 .ts，无需 bundle）

Target project（只有 local unit 才会出现在这里，由 aisk-setup 管理）
├── .aisk/installed.json            已安装 local unit 状态
├── .aisk/{unit}/{...}              resource / 打包后的 script
├── .claude/skills/aisk-{unit}-{skill}/SKILL.md
└── .claude/rules/aisk-{unit}/{rule}.md
```

## 关键文件

- `scripts/build.ts`：扫描 `units/`，刷新各 `unit.json` 和 `units/units.json`，维护拓扑顺序（global/local 分类在运行时由 installer/register 计算，不体现在 unit.json 里）。
- `scripts/build-dist.ts`：编译 `dist/aisk-setup.js` + `dist/aisk-register.js`，为将来真正 `npm publish` 准备（`package.json` 的 `publishConfig` 占位），日常工作流不涉及。
- `bin/aisk-setup.ts`：`aisk-setup` CLI 入口，`aiskHome` 固定为本仓库自身（`bun link` 后 `__dirname` 解析到真实仓库路径）；只管理 local unit，不含 register/unregister。
- `bin/aisk-register.ts`：`aisk-register` 命令实现，导出 `register()`/`unregister()`（`register`/`unregister` 子命令调用）；不依赖 `cwd`，只需要 `aiskHome` 和 `globalSkillsDir`。
- `global/installer.ts`：local unit 安装逻辑（`aisk-setup` 的后端），含 `init()`/`update()`/`remove()`/`list()`/`show()`；`isLocalUnit()`/`globalDirName()`/`readRegistry()` 等分类与注册读取共享逻辑在 `global/libs/global-units.ts`，供 installer.ts 和 aisk-register.ts 共用。
- `tests/`：build、installer、register 基线验证测试；`tests/helpers/fixtures.ts` 是两者共用的 fake aiskHome 构造工具。

## 首次使用 / 更新全局 unit

`bun link` 之后，运行一次 `aisk-register` 建立 `~/.claude/skills` 下的 symlink 和注册记录；global unit 内容改了要**手动**重新执行 `aisk-register`（无自动检测），新增/删除 unit 或 skill 也需要重新执行一次以创建/清理对应目录。想完全清空本机已注册的内容，运行 `aisk-register unregister`（整体清空，不支持按 unit 粒度）。
