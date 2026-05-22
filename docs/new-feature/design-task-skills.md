# Task 管理系统 — Skill 与子命令设计

## 一、Skill 详细设计

### create-task

**前提条件**：

- 工作区干净（`git status` 无任何变更）
- 当前在主干分支（main / master）
- `docs/tasks/` 下不存在已有任务目录

**输入**：

- 任务类型：`feature` | `refactor`
- 任务名称：kebab-case 字符串

**执行步骤**：

1. 验证前提条件，不满足则终止并告知原因
2. 创建并切换到 `feature/{name}` 或 `refactor/{name}` 分支
3. 创建 `docs/tasks/{name}/` 目录
4. 创建 `.claude/CLAUDE.md`，写入任务工作模式指令（见下方模板）
5. 根据任务类型，创建 `requirements.md`（仅含模板标题，内容待填写，模板见 design-templates.md）
6. 创建 `design.md`（仅含标题占位符）
7. 创建 `task-state.md`，写入初始状态（见下方格式）
8. `git add` + `git commit`（`"chore: init task {name}"`）
9. **自动进入任务工作模式**（等同执行 start-task）
10. 输出任务已创建并已进入工作模式，提示用户开始规划需求

**.claude/CLAUDE.md 模板**：见 `design-task-template/CLAUDE.md`

---

**初始 task-state.md 内容**：见 `design-task-template/task-state.md`，初始值为：当前阶段 `requirements（进行中）`，需求阶段 `in_progress`，设计和实现阶段均为 `pending`，实现阶段无步骤条目。

---

### start-task / resume-task

两者完全等价，resume-task 是 start-task 的别名，语义上强调从中断处恢复。

**前提条件**：当前在任务分支（非主干）

**执行步骤**：

1. 读取当前分支名，提取 `{task-name}`
2. 在 `docs/tasks/` 下查找含 `task-state.md` 的目录：
   - 找不到：提示先执行 create-task，终止
   - 找到多个：报错，要求用户手动确认使用哪个目录
   - 找到唯一一个：继续
3. 读取 task-state.md 的文档索引，按需读取所有 requirements / design 类文档
4. 输出任务摘要：当前阶段、关键进展、待处理事项

---

### verify-task

对当前任务执行验收检查，独立于 complete-task。

**支持两种模式**：

- `verify-task auto`：执行所有 `auto` 类型的验收条件（运行测试命令等）
- `verify-task manual`：逐项列出 `manual` 类型的验收条件，要求用户确认
- `verify-task`（无参数）：先执行 auto，再执行 manual

**验收范围**：task-state.md 中所有非 `superseded` 的验收条件。

**执行后**：更新 task-state.md 中对应条件的完成状态。

---

### complete-task

**职责**：验证任务已完成，清理文档，提示创建 PR。**不执行验收测试**（验收由 verify-task 负责）。

**前提条件**：

- 工作区干净（所有变更已提交）
- 当前在任务分支

**执行步骤**：

**阶段一：完成度检查**

1. 从 task-state.md 文档索引中找到所有 design 类文档，读取步骤列表
2. 读取 task-state.md，核对每个步骤状态均为 done，且有对应 commit 记录
3. 检查 task-state.md 中所有 `auto` 类型验收条件均已勾选完成
4. 检查 task-state.md 中所有 `manual` 类型验收条件均已确认完成
5. 若有未完成项，列出清单并终止

**阶段二：清理**（每步均需用户显式确认后执行）

6. 展示待删除目录，请用户确认
7. 用户确认后：删除整个 `docs/tasks/{task-name}/` 目录（含所有文件及子目录），`git add` + `git commit`（`"chore: complete task {task-name}"`）
8. 提示用户创建 PR（不自动执行）

> 若 PR review 后需返工，可通过 `git checkout <删除前的 commit> -- docs/tasks/<任务目录>/` 从 git 历史找回文档。

---

## 二、验收机制设计

### design.md 中的步骤格式

见 `design-task-template/design.md`。验收类型：

- `auto`：可自动执行的命令（verify-task 直接运行）
- `manual`：需要人工验证（verify-task manual 时逐项确认）
- `superseded`：临时性验收，被后续步骤覆盖，verify-task / complete-task 时跳过

---

### task-state.md 全阶段格式

task-state.md 覆盖需求、设计、实现三个阶段。需求和设计阶段无严格步骤结构，子状态由 AI 根据上下文自动组织。完整格式见 `design-task-template/task-state.md`。

---

### 步骤级别 vs 任务整体验收

| 维度       | 步骤级别（verify-task）            | 任务整体（complete-task）                   |
| ---------- | ---------------------------------- | ------------------------------------------- |
| 触发时机   | 用户主动执行 verify-task           | complete-task 执行时（仅检查，不重跑）      |
| 自动化验收 | 执行 auto 条件，更新 task-state.md | 检查 task-state.md 中 auto 条件均已勾选     |
| 人工验收   | 逐项确认 manual 条件               | 检查 task-state.md 中 manual 条件均已确认   |
| 目的       | 完成验收并记录结果                 | 确认验收已完成，执行清理                    |

---

## 三、子命令映射

### 子命令的发现机制

子命令列表存放在任务目录的 `.claude/CLAUDE.md` 中。AI 访问任务目录下任意文件（如 task-state.md）时，.claude/CLAUDE.md 自动加载，子命令即进入上下文——无需用户记忆，无需额外配置，跨 session 天然有效。

### 指令映射表

| 自然语言示例           | 映射操作                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| 规划需求 / 写需求      | 根据任务类型模板填充需求文档，更新 task-state.md 需求阶段状态                               |
| 刷新需求 / 更新需求    | 重新审视并更新需求文档（拆分后读取所有 requirements 类文档）                                |
| 规划设计 / 写设计      | 基于需求文档生成设计文档（含步骤划分和验收条件），更新 task-state.md 设计阶段状态           |
| 开始实现 / 实现第 N 步 | 按设计文档 Step N 开始编写代码，更新 task-state.md 当前步骤                                 |
| 提交                   | 生成规范 commit message，更新 task-state.md 对应步骤状态为 done，记录 commit hash           |
| 执行验收 / 验收        | 触发 verify-task（auto + manual）                                                           |
| 根据上下文更新状态     | AI 根据当前对话内容和文件状态，自动判断并更新 task-state.md                                 |
| 更新状态为：{描述}     | 按用户指定的描述直接更新 task-state.md 对应阶段的状态和记录                                 |
| 当前状态 / 进展        | 读取 task-state.md，输出当前阶段、关键进展、待处理事项                                      |
| 查看无关变更           | 扫描 git log，识别与任务无关的提交并列出                                                    |

---

### 提交 commit message 规范

格式：`{type}({task-name}): {step-title} [step-N]`

示例：

```
feat(product-search): add search API endpoint [step-1]
feat(product-search): integrate search UI [step-2]
refactor(auth-middleware): extract token validation [step-1]
```

`[step-N]` 标记使 task-state.md 与 git 历史能够相互对应。
