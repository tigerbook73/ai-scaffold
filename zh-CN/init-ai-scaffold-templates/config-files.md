# 配置文件模板

根据项目类型只生成匹配版本，不保留未使用的分支。若某项信息不足，使用 `[待补充]` 占位符。

## 单包 `CLAUDE.md`

```markdown
# <项目名称> 项目规范（Claude Code）

> 本文件为项目级补充规则，与全局 ~/.claude/CLAUDE.md 叠加生效。

## 当前开发阶段

**Phase -1（AI 工程脚手架）已完成 -> Phase 0（基础搭建）即将开始**

阶段体系：Phase -1 建立规范 -> Phase 0 搭建骨架 -> Phase 1+ 按特性迭代。

## 规范体系

所有规范的唯一权威来源：`docs/conventions/`

| 规范文件 | 覆盖内容 |
| -------- | -------- |
| `docs/conventions/architecture.md` | 技术选型、架构分层、禁止事项 |
| `docs/conventions/coding.md` | 编码规范、命名、注释、组件边界、提交规范 |
| `docs/conventions/testing.md` | 测试范围、工具、文件位置 |
| `docs/conventions/directory.md` | 目录结构、文件命名规则 |

实现任何功能前，先检查 `docs/conventions/` 中的相关规范。若发现冲突，必须先说明冲突点，等用户决定「调整实现」还是「更新规范」，不得擅自继续。

## 工作文档体系

`docs/features/` 和 `docs/refactors/` 用于为 AI 提供任务上下文，与 GitHub Issues / Linear / Jira 等项目管理工具并行使用，不互相替代。

特性开发：`docs/features/<feature-id>/`，完成后移至 `docs/features/-<feature-id>/`。
重构工作：`docs/refactors/<refactor-id>/`，完成后移至 `docs/refactors/-<refactor-id>/`。

## 可用 Claude Code Slash 命令

| 命令 | 用途 |
| ---- | ---- |
| `/check-conventions` | 审查近期改动是否符合规范 |
| `/update-convention` | 规范冲突时的引导更新流程 |
| `/adr` | 创建新的架构决策记录 |

## 提交规范

格式：`type(scope): description`
示例：`feat(auth): implement JWT refresh token`
```

不使用 Phase 体系时，将「当前开发阶段」节替换为：`**当前阶段**：<根据实际情况填写，或删除本节>`。

## Monorepo 根目录 `CLAUDE.md`

```markdown
# <项目名称> 项目规范（Claude Code）— 根目录

> 本文件为 Monorepo 根目录规范，定义跨包的共享规则。
> Claude Code 会自动递归加载父目录的 CLAUDE.md，因此在各包目录下工作时，根目录规范与包级规范自动叠加生效。

## 当前开发阶段

**Phase -1（AI 工程脚手架）已完成 -> Phase 0（基础搭建）即将开始**

## Monorepo 结构

| 包路径 | 类型 | 说明 |
| ------ | ---- | ---- |
| `apps/web` | 前端 | [简要说明] |
| `apps/api` | 后端 | [简要说明] |
| `packages/shared` | 共享库 | [简要说明] |

> 生成时必须替换为实际包列表；未知信息使用 `[待补充]`，不得保留不适用的示例包。

## 规范分层

- 共享规范：`docs/conventions/`
- 包专属规范：`<包路径>/docs/conventions/`
- 冲突时：包专属规范优先于共享规范

## 跨包依赖规则

- `packages/shared` 不得依赖任何 `apps/*`
- `apps/web` 不得直接依赖 `apps/api`（通过 API 层通信）
- 新增跨包依赖前必须在 `docs/conventions/architecture.md` 中记录

## 工作文档体系

特性开发：`docs/features/<feature-id>/`（REQUIREMENTS / DESIGN / PROGRESS）
重构工作：`docs/refactors/<refactor-id>/`（MOTIVATION / DESIGN / PROGRESS）
完成后在目录名前加 `-` 前缀。

## 可用 Claude Code Slash 命令

| 命令 | 用途 |
| ---- | ---- |
| `/check-conventions` | 审查近期改动是否符合规范 |
| `/update-convention` | 规范冲突时的引导更新流程 |
| `/adr` | 创建新的架构决策记录 |

## 提交规范

格式：`type(pkg/scope): description`
示例：`feat(web/auth): implement login page`
```

## Monorepo 包级 `CLAUDE.md`

```markdown
# <包名> 规范（Claude Code）

> 本文件为 `<包路径>` 的包级规范，与根目录 CLAUDE.md 的共享规范自动叠加生效。
> 本文件规则优先于共享规范；共享规范未覆盖的内容仍然适用。

## 包概述

**类型**：前端 / 后端 / 共享库
**主要职责**：[简要说明]
**技术栈**：[框架、UI 库、主要依赖]

## 包专属规范

实现功能前，先读根目录共享规范，再读以下包专属规范（后者优先）：

| 规范文件 | 覆盖内容 |
| -------- | -------- |
| `<包路径>/docs/conventions/architecture.md` | 包内架构、禁止事项 |
| `<包路径>/docs/conventions/coding.md` | 包专属编码规范 |
| `<包路径>/docs/conventions/testing.md` | 包专属测试规范 |
| `<包路径>/docs/conventions/directory.md` | 包内目录结构 |

若发现实现方案与规范冲突，必须先说明冲突点，等用户决定「调整实现」还是「更新规范」，不得擅自继续。
```

生成时根据实际创建的文件，删除未生成的规范文件行。

## `AGENTS.md`

仅当用户选择支持 Codex / ChatGPT 时生成。

```markdown
# <项目名称> 项目规范（Codex / ChatGPT）

## 开始前必读

实现任何功能前，按顺序读取相关规范文件：

1. `docs/conventions/architecture.md`
2. `docs/conventions/coding.md`
3. `docs/conventions/directory.md`
4. `docs/conventions/testing.md`
5. `docs/conventions/ai-workflow.md`

Monorepo 项目还必须确认当前工作的包，并读取 `<包路径>/docs/conventions/` 下的包专属规范。

## 规范冲突处理规则

若实现方案与规范文件存在冲突：

1. 明确描述冲突点（引用规范文件名和章节）
2. 提出两种方案：「调整实现以符合规范」或「更新规范以反映新决策」
3. 等待用户决定，不得擅自继续

## 工作文档体系

继续开发已有特性时，读取 `REQUIREMENTS.md`、`DESIGN.md`、`PROGRESS.md`；完成阶段性工作后更新 `PROGRESS.md`。

继续已有重构时，读取 `MOTIVATION.md`、`DESIGN.md`、`PROGRESS.md`；完成阶段性工作后更新 `PROGRESS.md`。

## 文档一致性检查

- [ ] 代码改动是否需要更新对应的规范文件？
- [ ] 新增依赖是否需要记录在 `architecture.md`？
- [ ] 是否产生了新的架构决策，需要创建 ADR？
- [ ] `PROGRESS.md` 是否反映最新进度？
- [ ] Monorepo 项目：是否违反了跨包依赖规则？

## 常用工作流

Codex / ChatGPT 不读取 `.claude/commands/`。需要执行类似 Claude Code slash command 的流程时，按以下规则处理：

### 检查规范符合性

当用户要求检查改动、检查当前 diff、或提到类似 `/check-conventions` 的任务时：

1. 确认审查范围：最近 git diff，或用户指定的文件 / 目录
2. 读取相关规范：单包读取 `docs/conventions/`；Monorepo 读取根目录共享规范和当前包专属规范
3. 检查命名、TypeScript 规则、目录结构、测试覆盖、注释规则、架构约束、新依赖记录、跨包依赖规则
4. 输出报告，分为「符合规范」「需要关注」「违反规范」，违反项必须引用规范文件和章节

### 更新项目规范

当实现与规范不一致，或用户要求更新规范时：

1. 判断冲突类型：实现不符合规范、规范已过时、或出现新场景
2. 如果应调整实现，指出具体不符合位置并给出修改方向
3. 如果应更新规范，先说明拟修改的规范文件和内容；影响单个包则更新包专属规范，影响多个包则更新根目录共享规范
4. 重大变更需要询问是否创建 ADR

### 创建 ADR

当用户要求创建 ADR，或出现影响多个模块、难以逆转、涉及外部依赖选型的决策时：

1. 收集决策描述、影响范围、背景、备选方案、最终选择、后果和权衡
2. 读取 `docs/adr/` 中最大编号，新文件编号加一
3. 全局决策写入 `docs/adr/<四位编号>-<kebab-case-标题>.md`；包级决策写入 `docs/adr/<四位编号>-<包名>-<kebab-case-标题>.md`
4. 更新 `docs/adr/README.md` 中的决策索引

## 提交规范

单包格式：`type(scope): description`
Monorepo 格式：`type(pkg/scope): description`
```

## `.github/copilot-instructions.md`

仅当用户选择支持 Copilot 时生成。

```markdown
# <项目名称> Copilot 补全规范

> 本文件仅用于 IDE 自动补全辅助，不作为完整开发规范使用。

## TypeScript

- 始终开启 strict 模式
- 禁止使用 `any`，用 `unknown` 替代
- 函数必须声明返回类型

## 命名约定

- React 组件：PascalCase
- 文件名：kebab-case
- 变量 / 函数：camelCase
- 常量：UPPER_SNAKE_CASE

## 注释规则

- 默认不写注释
- 只在需要解释「为什么」时写，不解释「是什么」
```

## `.cursorrules`

仅当用户选择支持 Cursor 时生成。

```text
Please refer to CLAUDE.md and docs/conventions/ for all project rules and coding standards.
```
