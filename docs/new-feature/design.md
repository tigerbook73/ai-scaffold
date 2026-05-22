# Task 管理系统 — 主设计文档

## 一、核心架构

### 分支策略

每个任务独占一个 Git 分支，分支名即任务标识符。

命名规范：
- Feature 类型：`feature/{task-name}`
- Refactoring 类型：`refactor/{task-name}`

`{task-name}` 使用 kebab-case，简洁描述任务内容，例如：`feature/product-search`、`refactor/auth-middleware`。

**约束**：
- create-task 只允许在主干分支（main / master）执行
- 一个分支对应唯一一个任务

---

### 目录结构

任务文档存放在目标项目（被操作的项目，非本 skill 仓库）的以下路径：

```
docs/tasks/
└── {task-name}/
    ├── REQUIREMENTS.md    ← 需求文档
    ├── DESIGN.md          ← 设计文档（含步骤划分）
    └── PROGRESS.md        ← 进展与验收记录
```

**路径约定**：
- `docs/tasks/` 为固定根目录，不可配置
- 任务目录名与分支名中的 `{task-name}` 部分完全一致
- 任务文档与代码变更在同一分支，PR 合并时一同处理（但合并前需删除文档）

---

### 文件职责

| 文件 | 作用 | 何时创建 | 何时销毁 |
|---|---|---|---|
| REQUIREMENTS.md | 记录需求、约束、验收标准 | create-task（仅标题） | close-task |
| DESIGN.md | 记录实现方案与步骤划分 | create-task（仅标题） | close-task |
| PROGRESS.md | 记录全阶段状态与验收结果 | create-task | close-task |

---

## 二、状态管理

### Memory 与 PROGRESS.md 的职责分工

| 维度 | Memory（task-states.md） | PROGRESS.md |
|---|---|---|
| 目的 | 告知 AI 当前处于任务模式，快速定位任务文件 | 完整记录任务全阶段的进展状态 |
| 内容 | 分支名、任务目录路径、一句话摘要、过期时间 | 各阶段状态、步骤详情、验收记录、历史日志 |
| 存放位置 | Claude 全局 memory 目录 | 任务分支内（`docs/tasks/{name}/`） |
| 更新时机 | start-task / pause-task / close-task | 用户通过子命令触发，或 AI 根据上下文自动更新 |
| 跨 session | 是 | 是（在 git 分支内持久） |

**原则**：PROGRESS.md 是状态的单一来源；memory 只是 AI 快速进入工作模式的入口索引。

---

### task-states.md（单一 memory 文件）

**文件路径**：`~/.claude/projects/{project-hash}/memory/task-states.md`

**MEMORY.md 索引条目**：
```
- [Task States](task-states.md) — 活跃任务状态索引；AI 加载时自动删除 expires_at 早于今日的记录并保存文件
```

**文件格式**：
```markdown
---
name: task-states
description: 活跃任务状态索引。AI 加载时：检查所有记录的 expires_at，删除已过期的条目并保存文件。
metadata:
  type: project
---

## branch: feature/product-search
- task_dir: docs/tasks/product-search/
- summary: 为商品列表添加搜索功能，涉及 API 和 UI 两层
- expires_at: 2026-05-29

## branch: refactor/auth-middleware
- task_dir: docs/tasks/auth-middleware/
- summary: 重构认证中间件，提取 token 验证逻辑
- expires_at: 2026-05-27
```

**过期机制**：
- `expires_at` 由 start-task 设置为执行当天 +7 天
- 每次执行 start-task 都会刷新对应记录的 `expires_at`
- AI 加载 task-states.md 时，发现过期记录则自动删除并保存（依赖 memory 目录已在写入权限列表中，参见安装说明）
- 过期仅代表记录过时，任务本身（分支和文档）不受影响，重新 start-task 即可恢复

---

## 三、Skill 详细设计

### create-task

**前提条件**：
- 工作区干净（`git status` 无任何变更）
- 当前在主干分支（main / master）

**输入**：
- 任务类型：`feature` | `refactor`
- 任务名称：kebab-case 字符串

**执行步骤**：
1. 验证前提条件，不满足则终止并告知原因
2. 创建并切换到 `feature/{name}` 或 `refactor/{name}` 分支
3. 创建 `docs/tasks/{name}/` 目录
4. 根据任务类型，创建 `REQUIREMENTS.md`（仅含模板标题，内容待填写，模板见 design-templates.md）
5. 创建 `DESIGN.md`（仅含标题占位符）
6. 创建 `PROGRESS.md`，写入初始状态（见下方格式）
7. `git add` + `git commit`（"chore: init task {name}"）
8. **自动进入工作模式**：将本任务记录写入 task-states.md，加入 MEMORY.md 索引
9. 输出任务已创建并已进入工作模式，提示用户开始规划需求

**初始 PROGRESS.md 内容**：
```markdown
# Task Progress: {task-name}

## 元信息
- 类型: feature | refactoring
- 状态: in_progress

## 当前阶段
requirements（进行中）

## 需求阶段
- 状态: in_progress
- 记录: 任务刚创建，需求待规划

## 设计阶段
- 状态: pending

## 实现阶段
- 状态: pending

## 历史记录
- {date}: 任务创建
```

---

### start-task

**适用场景**：切换到任务分支后进入工作模式，或刷新 memory 中的任务上下文。

**前提条件**：当前在任务分支（非主干）

**执行步骤**：
1. 读取当前分支名，提取 `{task-name}`
2. 定位任务目录 `docs/tasks/{task-name}/`；若不存在则报错
3. 读取 PROGRESS.md，提取当前阶段和摘要信息
4. 在 task-states.md 中写入或更新本分支记录（刷新 expires_at 为今天 +7 天）
5. 输出任务摘要：当前阶段、关键进展、待处理事项

---

### pause-task

**执行步骤**：
1. 读取当前分支名
2. 从 task-states.md 中删除对应分支的记录
3. 若 task-states.md 为空则删除该文件，并从 MEMORY.md 移除索引条目
4. 输出确认信息

---

### verify-task（新增）

对当前任务执行验收检查，独立于 close-task。

**支持两种模式**：
- `verify-task auto`：执行所有 `auto` 类型的验收条件（运行测试命令等）
- `verify-task manual`：逐项列出 `manual` 类型的验收条件，要求用户确认
- `verify-task`（无参数）：先执行 auto，再执行 manual

**验收范围**：PROGRESS.md 中所有非 `superseded` 的验收条件。

**执行后**：更新 PROGRESS.md 中对应条件的完成状态。

---

### close-task

**职责**：验证任务已完成，清理文档，提示创建 PR。**不执行验收测试**（验收由 verify-task 负责）。

**前提条件**：
- 工作区干净（所有变更已提交）
- 当前在任务分支

**执行步骤**：

**阶段一：完成度检查**
1. 读取 DESIGN.md，提取所有步骤列表
2. 读取 PROGRESS.md，核对每个步骤状态均为 done，且有对应 commit 记录
3. 检查 PROGRESS.md 中所有 `manual` 类型验收条件均已确认完成
4. 若有未完成项，列出清单并终止

**阶段二：清理**

5. 删除 `docs/tasks/{task-name}/` 目录下所有文件
6. `git add` + `git commit`（`"chore: close task {task-name}"`）
7. 从 task-states.md 中删除本分支记录
8. 输出完成提示，建议用户创建 PR

---

## 四、验收机制设计

### DESIGN.md 中的步骤格式

```markdown
### Step 1: {步骤标题}

**目标**: 简述本步骤要达成什么。

**主要变更**:
- `path/to/file.ts`: 说明变更内容

**验收条件**:
- (auto) `npm test` 通过
- (manual) 在浏览器中验证 X 功能正常
- (superseded) 临时验证项（后续步骤完成后失效）
```

验收类型：
- `auto`：可自动执行的命令（verify-task 直接运行）
- `manual`：需要人工验证（verify-task manual 时逐项确认）
- `superseded`：临时性验收，被后续步骤覆盖，verify-task / close-task 时跳过

---

### PROGRESS.md 全阶段格式

PROGRESS.md 覆盖需求、设计、实现三个阶段。需求和设计阶段无严格步骤结构，子状态由 AI 根据上下文自动组织。

```markdown
# Task Progress: {task-name}

## 元信息
- 类型: feature | refactoring
- 状态: in_progress | completed

## 当前阶段
{阶段名}（{进行中 | 已完成}）

## 需求阶段
- 状态: done | in_progress | pending
- 记录:
  - [由 AI 根据对话上下文自动组织，如 "需求初稿完成" / "待确认非功能需求" 等]

## 设计阶段
- 状态: done | in_progress | pending
- 记录:
  - [由 AI 根据对话上下文自动组织，如 "整体架构确认" / "待完成 Step 3 设计" 等]

## 实现阶段
- 状态: done | in_progress | pending

### Step 1: {步骤标题}
- 状态: done | in_progress | pending
- Commit: {hash} | —
- 验收:
  - [x] (auto) `npm test` 通过
  - [x] (manual) 浏览器验证 X 功能正常

### Step 2: {步骤标题}
- 状态: pending
- Commit: —
- 验收:
  - [ ] (auto) `npm test` 通过
  - [ ] (manual) 功能验证

## 历史记录
- {date}: 任务创建
- {date}: 需求阶段完成
- {date}: Step 1 完成（{commit-hash}）
```

---

### 步骤级别 vs 任务整体验收

| 维度 | 步骤级别（verify-task） | 任务整体（close-task） |
|---|---|---|
| 触发时机 | 用户主动执行 verify-task | close-task 执行时（仅检查，不重跑） |
| 自动化验收 | 执行 auto 条件，更新 PROGRESS.md | 检查 PROGRESS.md 中 auto 条件均已勾选 |
| 人工验收 | 逐项确认 manual 条件 | 检查 PROGRESS.md 中 manual 条件均已确认 |
| 目的 | 完成验收并记录结果 | 确认验收已完成，执行清理 |

---

## 五、子命令映射

在工作模式下（create-task 后或 start-task 后），AI 根据 memory 和 PROGRESS.md 上下文理解并响应自然语言指令。

### 指令映射表

| 自然语言示例 | 映射操作 |
|---|---|
| 规划需求 / 写需求 | 根据任务类型模板填充 REQUIREMENTS.md，更新 PROGRESS.md 需求阶段状态 |
| 刷新需求 / 更新需求 | 重新审视并更新 REQUIREMENTS.md |
| 规划设计 / 写设计 | 基于 REQUIREMENTS.md 生成 DESIGN.md（含步骤划分和验收条件），更新 PROGRESS.md 设计阶段状态 |
| 开始实现 / 实现第 N 步 | 按 DESIGN.md Step N 开始编写代码，更新 PROGRESS.md 当前步骤 |
| 提交 | 生成规范 commit message，更新 PROGRESS.md 对应步骤状态为 done，记录 commit hash |
| 根据上下文更新状态 | AI 根据当前对话内容和文件状态，自动判断并更新 PROGRESS.md |
| 更新状态为：{描述} | 按用户指定的描述直接更新 PROGRESS.md 对应阶段的状态和记录 |
| 当前状态 / 进展 | 读取 PROGRESS.md，输出当前阶段、关键进展、待处理事项 |
| 查看无关变更 | 扫描 git log，识别与任务无关的提交并列出 |

---

### 提交 commit message 规范

格式：`{type}({task-name}): {step-title} [step-N]`

示例：
```
feat(product-search): add search API endpoint [step-1]
feat(product-search): integrate search UI [step-2]
refactor(auth-middleware): extract token validation [step-1]
```

`[step-N]` 标记使 PROGRESS.md 与 git 历史能够相互对应。
