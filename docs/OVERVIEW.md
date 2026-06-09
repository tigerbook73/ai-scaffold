# AI Skills 项目概览

## 是什么

AI Skills 是一个本地 ai-unit 库。它把可复用的 AI 能力组织在 `units/` 中，通过 `pnpm register` 发布到 `~/.aisk/`，再由目标项目中的 `setup` 管理命令按需安装、更新或卸载。

核心理念：能力在本仓库集中维护，发布后进入本机全局仓库，具体项目只安装自己需要的 unit。

## 当前架构

```text
Local skill repository
├── units/                         # ai-unit 源码
├── global/                        # 全局 setup skill 和 installer
└── scripts/                       # build / publish / clean

  pnpm build
    -> 刷新 units/*/unit.json
    -> 刷新 units/units.json

  pnpm register
    -> pnpm build
    -> 发布到 ~/.aisk/
    -> 安装全局 Claude Code setup skill

~/.aisk/
├── config.json                    # 记录本仓库路径和发布时间
├── units.json                     # unit 拓扑顺序
├── units/{unit}/                  # 已发布 unit
└── global/installer.js            # 目标项目安装器

~/.claude/skills/aisk-setup/
└── SKILL.md                       # 全局 setup 管理命令

Target project
├── .aisk/installed.json           # 已安装 unit 状态
├── .aisk/{unit}/                  # 资源与编译后的脚本
├── .claude/skills/aisk-{unit}-{skill}/SKILL.md
└── .claude/rules/aisk-{unit}/{rule}.md
```

## ai-unit 结构

每个 unit 是 `units/{name}/` 下的独立目录，包含 `unit.json` 和可选组件目录。

```text
units/{unit}/
├── unit.json
├── skills/       # 安装到目标项目 .claude/skills/
├── rules/        # 安装到目标项目 .claude/rules/
├── scripts/      # 发布时编译为 JS，安装到目标项目 .aisk/{unit}/scripts/
└── resources/    # 安装到目标项目 .aisk/{unit}/resources/
```

`unit.json` 由 `pnpm build` 根据文件系统刷新。手动维护字段会被保留：

- `description`
- `name`
- `dependencies`
- `components.rules[].condition`
- `components.scripts[].hook`
- `components.scripts[].params`

`scripts/` 组件扫描只注册普通 `.ts` 脚本，忽略 `*.test.ts` 和 `*.spec.ts`。测试文件可以保留在 unit 的脚本目录中，但不会进入 `unit.json` 的 `components.scripts`。

## 当前 Units

| Unit               | 内容                                     |
| ------------------ | ---------------------------------------- |
| `confirm-intent`   | 执行前确认用户预期结果的 Codex skill     |
| `quick-ship`       | 审查变更、创建分支、提交、PR、合并的流程 |
| `smart-review`     | 对文件、模块或目录进行迭代式审查和修复   |
| `dev-task`         | 结构化 dev-task 的创建、恢复、验证和完成 |
| `poc`              | 覆盖 skill/rule/script/resource 的 PoC   |
| `poc-dep`          | `poc` 的依赖 unit                        |
| `test-review-gate` | 测试审查规则、pre-commit hook 和 CI 工具 |
| `walkthrough`      | 结构化代码走读的创建、恢复和导航         |

全局顺序由 `units/units.json` 维护，依赖总是排在被依赖方之前。

## 常用命令

| 命令              | 用途                                            |
| ----------------- | ----------------------------------------------- |
| `pnpm build`      | 扫描 `units/`，刷新 `unit.json` 和 `units.json` |
| `pnpm register`   | 先 build，再发布到 `~/.aisk/`                   |
| `pnpm clean`      | 清理本仓库发布到全局位置的内容                  |
| `pnpm lint:check` | ESLint 检查                                     |
| `pnpm lint:fix`   | ESLint 自动修复                                 |
| `pnpm typecheck`  | TypeScript 检查                                 |
| `pnpm test`       | Vitest 测试                                     |
| `pnpm verify`     | lint:check + typecheck + test + build           |

单独运行测试文件：

```bash
node --import tsx --test --test-concurrency=1 --test-reporter=spec tests/<file>.test.ts
```

Vitest 测试可直接使用：

```bash
pnpm exec vitest run tests/build.test.ts
pnpm exec vitest run units/test-review-gate/scripts/check-reviewed-by-commit-marker.test.ts
```

## 发布流程

### `scripts/build.ts`

`pnpm build` 执行该脚本。

职责：

1. 扫描 `units/` 下每个含 `unit.json` 或组件目录的 unit
2. 自动发现 `skills/*.md`、`rules/*.md`、`scripts/*.ts`、`resources/*.md`
3. 忽略 `scripts/*.test.ts` 和 `scripts/*.spec.ts`
4. 从 rule 文件中的 `AISK:CUSTOM` 标记提取 `hasCustom` 和 `hint`
5. 保留人工维护的 name、description、dependencies、condition、hook、params
6. 重写各 unit 的 `unit.json`
7. 计算全局拓扑顺序并写入 `units/units.json`

### `scripts/publish.ts`

`pnpm register` 在 build 后执行该脚本。

职责：

1. 将 `units/{unit}/unit.json` 和组件内容发布到 `~/.aisk/units/{public-name}/`
2. 将 unit 脚本编译为 CommonJS JS 文件
3. 将 `units/units.json` 复制到 `~/.aisk/units.json`
4. 将 `global/scripts/*.ts` 编译或复制到 `~/.aisk/global/`
5. 将 `global/setup/SKILL.md` 安装到 `~/.claude/skills/aisk-setup/SKILL.md`
6. 写入 `~/.aisk/config.json`

### `scripts/clean.ts`

`pnpm clean` 执行该脚本。

职责：

1. 校验 `~/.aisk/config.json` 是否由当前仓库发布
2. 删除 `~/.aisk/` 下的所有内容，但保留 `~/.aisk/` 目录
3. 删除 `~/.claude/skills/` 下由本仓库发布的 `aisk-*` 全局管理 skill

## 目标项目安装器

全局 `setup` skill 通过 `~/.aisk/global/installer.js` 管理目标项目中的 unit。

| 命令                         | 说明                               |
| ---------------------------- | ---------------------------------- |
| `/setup list`                | 列出所有 unit 及安装状态           |
| `/setup add <units\|all>`    | 添加 unit，已安装则转为 update     |
| `/setup remove <units\|all>` | 卸载 unit                          |
| `/setup update <units\|all>` | 更新已安装 unit                    |
| `/setup refresh`             | 扫描定制状态并清理失效 hook        |
| `/setup show <unit>`         | 展示 unit 详情与组件状态           |
| `/setup resolve <units>`     | 输出目标安装状态对应的完整变更计划 |

安装路径：

| 组件      | 目标路径                                             |
| --------- | ---------------------------------------------------- |
| skill     | `.claude/skills/aisk-{unit}-{skill}/SKILL.md`        |
| rule      | `.claude/rules/aisk-{unit}/{rule}.md`                |
| script    | `.aisk/{unit}/scripts/{script}.js`                   |
| resource  | `.aisk/{unit}/resources/{resource}.md`               |
| 状态文件  | `.aisk/installed.json`                               |
| hook 配置 | `lefthook.yml` 中的 `aisk-{unit}-{script}` precommit |

安装器会维护 `.aisk/.gitignore` 和 `.claude/.gitignore`，避免安装产物默认进入目标项目版本控制。

## 组件定制

rule、skill、resource 可以通过 `AISK:CUSTOM` 标记声明需要项目定制的内容。`pnpm build` 会在 `unit.json` 中标记 `hasCustom`，安装器会在目标项目中扫描这些块并写入 `customStatus`。

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

| 文件或目录                             | 说明                                   |
| -------------------------------------- | -------------------------------------- |
| `units/`                               | ai-unit 源码                           |
| `units/units.json`                     | 全局 unit 拓扑顺序                     |
| `global/setup/SKILL.md`                | 全局 setup 管理 skill                  |
| `global/scripts/installer.ts`          | 目标项目安装器核心实现                 |
| `global/scripts/precommit-lefthook.ts` | lefthook 更新工具                      |
| `global/scripts/installer-types.ts`    | unit 和 installer 输出类型定义         |
| `scripts/build.ts`                     | unit 扫描与注册表刷新                  |
| `scripts/publish.ts`                   | 发布到 `~/.aisk/` 和 Claude 全局 skill |
| `scripts/clean.ts`                     | 清理全局发布产物                       |
| `tests/`                               | build、publish、installer 基线测试     |
| `docs/dev-tasks/project-structure/`    | ai-unit 架构迁移 dev-task 记录         |

## 开发检查清单

修改 unit、installer、发布脚本或 gate 规则后，提交前运行：

```bash
pnpm verify
```

如果只修改构建扫描逻辑，可先跑聚焦测试：

```bash
pnpm exec vitest run tests/build.test.ts
pnpm build
```
