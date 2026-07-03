# AI Skills 项目概览

## 是什么

AI Skills 是一个本地 ai-unit 库，仅供本人在本机使用。它把可复用的 AI 能力组织在 `units/` 中，通过 `bun link` 把本仓库注册为全局 `ai-skills` 命令——没有单独的发布步骤，`ai-skills` CLI 和全局 `/setup` skill 都直接读取本仓库的 `units/`，改完 skill/rule/resource 立刻对所有目标项目生效。

一个真正的 `npm publish`（安装已发布包而非本仓库 checkout）通过 `package.json` 的 `publishConfig` 占位，但尚未接入实际发布流程，不是日常工作流的一部分。

## global unit 与 local unit

每个 unit 按是否需要项目本地文件分成两类，**整体二选一**（不存在同一个 unit 内部分组件本地、部分组件全局的混合）：

| 触发条件（命中任意一条即为 local） | 说明                                        |
| ---------------------------------- | ------------------------------------------- |
| 声明了 `rules` 组件                | 规则文件必须落到目标项目的 `.claude/rules/` |
| script 声明了 `hook`               | 需要写入目标项目的 `lefthook.yml`           |
| skill/resource 带 `hasCustom`      | AISK:CUSTOM 定制内容本质是项目级的          |

都不满足 → **global unit**：不需要任何项目本地文件，通过 `ai-skills register` 一次性注册到 `~/.claude/skills`，对本机所有项目立即生效，**没有任何项目级命令**（没有 `init`/`update`/`remove`，也不出现在任何项目的 `.aisk/installed.json` 里）。

命中任意一条 → **local unit**：通过 `ai-skills init`/`update`/`remove`（或 `/setup` 里的同名命令）按项目显式安装。`init` 会自动展开 local-to-local 依赖（若依赖是 global unit 则不需要任何动作，因为它本来就全局可用），但 local unit 从不会作为某次 `register` 的副作用被安装。

当前实际划分：

| 类别   | Unit                                                                                   |
| ------ | -------------------------------------------------------------------------------------- |
| global | `commit`、`confirm-intent`、`quick-ship`、`smart-review`、`staged-plan`、`walkthrough` |
| local  | `playwright`、`test-review-gate`、`ui-coverage`、`ui-testability`                      |

## 当前架构

```text
Local skill repository（bun link 注册为全局 ai-skills 命令，无发布步骤）
├── bin/cli.ts                     # ai-skills CLI 入口，bun 直接运行源码
├── units/                         # ai-unit 源码
├── global/                        # 全局 setup skill 和 installer
└── scripts/                       # build / build-dist

  pnpm build
    -> 刷新 units/*/unit.json
    -> 刷新 units/units.json
    -> 运行 Prettier 格式化

  pnpm build:dist（为将来 npm publish 准备，日常不需要）
    -> 编译 bin/cli.ts → dist/cli.js（node 可执行，shebang 改写为 node）

~/.claude/skills/                        # 由 `ai-skills register`/`unregister` 管理，靠注册记录清理，不做命名前缀扫描
├── .aisk-registry.json                  # 本次 register 注册了哪些条目，unregister/下次 register 靠它清理
├── aisk-setup/ -> global/setup          # 全局 setup 管理 skill（/setup），只管理 local unit
├── aisk-{unit}/                         # skill 名与 unit 名相同时合并，如 aisk-staged-plan
│   └── SKILL.md -> units/{unit}/{skill.file}
└── aisk-{unit}-{skill}/                 # 不同时保留两段，如 aisk-walkthrough-create-walkthrough
    ├── SKILL.md -> units/{unit}/{skill.file}
    ├── resources/ -> units/{unit}/resources/    # unit 声明了 resources 时
    └── scripts/   -> units/{unit}/scripts/      # unit 声明了 scripts 时；bun 直接执行 .ts，无需 bundle

Target project（只有 local unit 才会出现在这里，由 /setup 或 ai-skills CLI 管理）
├── .aisk/installed.json           # 已安装 local unit 状态
├── .aisk/{unit}/scripts/{name}.js # init/update 时用 `bun build` 现场打包（含外部依赖）
├── .claude/skills/aisk-{unit}-{skill}/SKILL.md
└── .claude/rules/aisk-{unit}/{rule}.md
```

## ai-unit 结构

每个 unit 是 `units/{name}/` 下的独立目录，包含 `unit.json` 和可选组件目录。

```text
units/{unit}/
├── unit.json
├── skills/       # global unit: register 时 symlink；local unit: init/update 时安装到目标项目 .claude/skills/
├── rules/        # 存在即视为 local unit；安装到目标项目 .claude/rules/
├── scripts/      # global unit: register 时整体 symlink（bun 直接执行 .ts）；local unit: init/update 时 bun build 现场打包，安装到目标项目 .aisk/{unit}/scripts/
└── resources/    # global unit: register 时整体 symlink；local unit: init/update 时安装到目标项目 .aisk/{unit}/resources/
```

`unit.json` 由 `pnpm build` 根据文件系统刷新。手动维护字段会被保留：

- `description`
- `name`
- `dependencies`
- `components.rules[].condition`
- `components.scripts[].hook`
- `components.scripts[].params`

`scripts/` 组件扫描只注册普通 `.ts` 脚本，忽略 `*.test.ts` 和 `*.spec.ts`。测试文件可以保留在 unit 的脚本目录中，但不会进入 `unit.json` 的 `components.scripts`。

`build.ts` 目前只为 rules 派生/保留 `hasCustom`/`hint`；skill/resource 的 `hasCustom` 需要手工在 `unit.json` 里维护（`pnpm build` 不会扫描 skill/resource 里的 AISK:CUSTOM 标记）。

## 当前 Units

| Unit               | 内容                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `commit`           | 提交前运行检查清单，确保代码质量和流程规范，再执行 git commit                                       |
| `confirm-intent`   | 执行前确认用户预期结果，等待明确最终确认                                                            |
| `playwright`       | Playwright E2E 测试规范：定位器优先级、作用域链式定位，shadcn/ui 补充                               |
| `quick-ship`       | 审查工作区变更，推断意图，创建私有分支、提交、开 PR、squash 合并、返回原分支                        |
| `smart-review`     | 对文件、模块或目录进行迭代式审查和修复                                                              |
| `staged-plan`      | 通过四层流程（需求 → 架构与关键决策 → 步骤地图 → 逐步实现）驱动功能开发，支持跨 session 的长期规划  |
| `test-review-gate` | 在测试文件上强制执行 @reviewed-by 注释和测试名称一致性约束，通过 pre-commit hook 和 Claude 规则实现 |
| `ui-coverage`      | UI 变更测试覆盖规范：判定需要测试的变更，选择测试类型                                               |
| `ui-testability`   | UI 可测试性规范：aria-label、data-testid、shadcn/ui 实现细节                                        |
| `walkthrough`      | 结构化代码走读的创建、恢复和导航                                                                    |

全局顺序由 `units/units.json` 维护，依赖总是排在被依赖方之前；global/local 分类不体现在这个顺序里，运行时由 installer 计算。

## 常用命令

| 命令              | 用途                                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| `bun link`        | 一次性：注册全局 `ai-skills` 命令，指向本仓库                           |
| `pnpm build`      | 扫描 `units/`，刷新 `unit.json` 和 `units.json`，并运行 Prettier 格式化 |
| `pnpm build:dist` | 编译 `dist/cli.js`，为将来真正 `npm publish` 准备，日常不需要           |
| `pnpm format`     | Prettier 格式化                                                         |
| `pnpm lint:check` | ESLint 检查                                                             |
| `pnpm lint:fix`   | ESLint 自动修复                                                         |
| `pnpm typecheck`  | TypeScript 检查                                                         |
| `pnpm test`       | 运行测试（`bun test`）                                                  |
| `pnpm verify`     | build + build:dist + typecheck + lint + format + test                   |

单独运行测试文件：

```bash
bun test tests/build.test.ts
bun test tests/installer.test.ts
```

## `scripts/build.ts`

`pnpm build` 执行该脚本。这是本仓库唯一还需要的"发布前"步骤——只在新增/删除/改名 unit 组件文件时才需要重新运行；改动已有文件内容不需要（`ai-skills`/`/setup` 直接读取本仓库源码，改完立刻生效）。

职责：

1. 扫描 `units/` 下每个含 `unit.json` 或组件目录的 unit
2. 自动发现 `skills/*.md`、`rules/*.md`、`scripts/*.ts`、`resources/*.md`
3. 忽略 `scripts/*.test.ts` 和 `scripts/*.spec.ts`
4. 从 rule 文件中的 `AISK:CUSTOM` 标记提取 `hasCustom` 和 `hint`
5. 保留人工维护的 name、description、dependencies、condition、hook、params
6. 重写各 unit 的 `unit.json`
7. 计算全局拓扑顺序并写入 `units/units.json`

## `scripts/build-dist.ts`（为将来 npm publish 准备，日常不需要）

`pnpm build:dist` 编译 `bin/cli.ts` → `dist/cli.js` 并把 shebang 从 `bun` 改写为 `node`，对应 `package.json` 里 `publishConfig.bin` 指向的产物。这条路径尚未接入真正的 `npm publish` 流程，仅作占位。

## Installer：register/unregister（global unit）与 init/update/remove（local unit）

`ai-skills` CLI（`bin/cli.ts`）和全局 `/setup` skill 共用同一套安装逻辑（`global/scripts/installer.ts`）。`/setup` 内部调用 `ai-skills <subcommand>` 子进程，直接转发其默认的人类可读输出（不解析 JSON）；`/setup` 只处理 local unit，global unit 的 `register`/`unregister` 是纯 CLI 概念。

默认输出是人类可读文本；加 `--json` 输出结构化 JSON（供脚本/测试使用）。

| 命令（CLI，全局，不区分项目） | 说明                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `ai-skills register`          | 注册所有 global unit 到 `~/.claude/skills`；内部先按注册记录清理上一次注册的内容，再重建 |
| `ai-skills unregister`        | 清空 `~/.claude/skills` 下所有已注册内容（整体清空，不支持按 unit 粒度）                 |

| 命令（CLI / `/setup`，项目级，只针对 local unit） | 说明                                                          |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `ai-skills init <units\|all>` / `/setup init`     | 安装 local unit；已安装转 update；local-to-local 依赖自动安装 |
| `ai-skills remove <units\|all>` / `/setup remove` | 卸载 local unit                                               |
| `ai-skills update [units\|all]` / `/setup update` | 更新已安装的 local unit                                       |
| `ai-skills refresh` / `/setup refresh`            | 扫描定制状态并清理失效 hook                                   |

| 命令（只读，双 scope）                                                                | 说明                       |
| ------------------------------------------------------------------------------------- | -------------------------- |
| `ai-skills list [--scope global\|local\|all]` / `/setup list`（固定 `--scope=local`） | 列出 unit 及状态           |
| `ai-skills show <unit>` / `/setup show <unit>`                                        | 展示 unit 详情与各组件状态 |

安装路径（local unit）：

| 组件      | 目标路径                                             |
| --------- | ---------------------------------------------------- |
| skill     | `.claude/skills/aisk-{unit}-{skill}/SKILL.md`        |
| rule      | `.claude/rules/aisk-{unit}/{rule}.md`                |
| script    | `.aisk/{unit}/scripts/{script}.js`                   |
| resource  | `.aisk/{unit}/resources/{resource}.md`               |
| 状态文件  | `.aisk/installed.json`                               |
| hook 配置 | `lefthook.yml` 中的 `aisk-{unit}-{script}` precommit |

安装路径（global unit，`~/.claude/skills` 下）：

| 组件     | 目标路径                                                                                |
| -------- | --------------------------------------------------------------------------------------- |
| skill    | `aisk-{unit}/SKILL.md`（skill 名 = unit 名）或 `aisk-{unit}-{skill}/SKILL.md`（不同名） |
| resource | 同一目录下的 `resources/` symlink                                                       |
| script   | 同一目录下的 `scripts/` symlink（bun 直接执行 `.ts`，不打包）                           |
| 注册记录 | `~/.claude/skills/.aisk-registry.json`                                                  |

安装器会维护 `.aisk/.gitignore` 和 `.claude/.gitignore`，避免安装产物默认进入目标项目版本控制。

## 组件定制

rule、skill、resource 可以通过 `AISK:CUSTOM` 标记声明需要项目定制的内容。`pnpm build` 会在 `unit.json` 中为 rule 标记 `hasCustom`（skill/resource 需手工维护），安装器会在目标项目中扫描这些块并写入 `customStatus`。带 `hasCustom` 的 skill/resource 会让整个 unit 变成 local unit。

典型格式：

```md
# AISK:CUSTOM name="paths" hint="扫描项目并填写适用的路径模式"

# AISK:CUSTOM:END
```

状态：

| 状态   | 含义                   |
| ------ | ---------------------- |
| `todo` | 已安装但仍需定制       |
| `done` | 已安装且定制内容已完成 |

更新 unit 时，安装器会尽量保留已完成的定制块内容。

## 项目内 Gate 规则

本仓库自身使用 `.claude/rules/ai-scaffold/` 下的 gate 规则约束 unit 开发：

| 文件             | 约束范围               |
| ---------------- | ---------------------- |
| `skill-gate.md`  | `units/*/skills/*.md`  |
| `script-gate.md` | `units/*/scripts/*.ts` |
| `rule-gate.md`   | `units/*/rules/*.md`   |

这些规则只约束本仓库开发，不随 unit 安装到目标项目。

## 关键文件

| 文件或目录                                  | 说明                                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `units/`                                    | ai-unit 源码                                                                      |
| `units/units.json`                          | 全局 unit 拓扑顺序                                                                |
| `bin/cli.ts`                                | `ai-skills` CLI 入口（`bun link` 后全局可用）                                     |
| `global/setup/SKILL.md`                     | 全局 setup 管理 skill（只管理 local unit）                                        |
| `global/scripts/installer.ts`               | 安装逻辑核心实现（CLI 和 `/setup` 共用），含 `register()`/`unregister()`/`init()` |
| `global/scripts/libs/precommit-lefthook.ts` | lefthook 更新工具                                                                 |
| `global/scripts/types/installer-types.ts`   | unit 和 installer 输出类型定义                                                    |
| `global/scripts/libs/custom-blocks.ts`      | AISK:CUSTOM 块解析工具                                                            |
| `scripts/build.ts`                          | unit 扫描与注册表刷新                                                             |
| `scripts/build-dist.ts`                     | dist/cli.js 编译（为将来 npm publish 准备）                                       |
| `tests/`                                    | build、installer 基线测试                                                         |

## 开发检查清单

修改 unit、installer 或 gate 规则后，提交前运行：

```bash
pnpm verify
```

`pnpm verify` 依次执行：`build` → `build:dist` → `typecheck` → `lint` → `format` → `test`（`build:dist` 只是为了让尚未启用的 npm publish 路径保持可编译，不影响日常使用）。

如果只修改构建扫描逻辑，可先跑聚焦测试：

```bash
bun test tests/build.test.ts
pnpm build
```
