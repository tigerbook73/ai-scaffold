# Task 使用指南

面向开发者的实操建议，说明任务推进过程中的常见场景和处理方式。

---

## 一、基本原则

**design.md 是步骤的定义，task-state.md 是执行的记录。**

两者必须保持同步——不能只改代码不改文档，否则下次进入任务工作模式时 AI 读到的是错误的上下文。

git log 是辅助线索，不是状态真相。步骤是否完成，以 task-state.md 为准。

---

## 二、步骤状态管理

### 多步骤同时进行

两个步骤同时处于 `in_progress` 是允许的，例如 step-2 开始后发现 step-1 有遗漏，退回去补。

此时需要**明确告知 AI 当前聚焦哪个步骤**，例如：

> "切换到 step-1，修改 xxx 问题"

AI 无法自动判断焦点，需要人主动指示。

### 步骤退回

将已完成的步骤退回 `in_progress`：

1. 告知 AI 原因（"step-1 有遗漏，需要返回修改"）
2. AI 更新 task-state.md：step-1 状态 → `in_progress`，原验收条件视情况清除或标 `(superseded)`
3. 修复后重新提交，AI 将状态改回 `done`

---

## 三、发现设计缺陷

### 情况一：可以向前修复

后续步骤能补救前面步骤的遗漏，且不破坏已完成的内容。

处理方式：
- 在当前步骤或后续步骤的 design.md 中加入修复内容
- 将 step-1 中已失效的验收条件标为 `(superseded)`
- step-1 保持 `done` 不动

这是代价最低的路径，优先考虑。

### 情况二：必须回到原步骤修复

前面步骤的实现在语义上就是错的，后续步骤无法绕过。

处理方式：
1. 更新 design.md — 修改对应步骤的描述和验收条件
2. 更新 task-state.md — 步骤状态退回 `in_progress`，失效的验收条件标 `(superseded)`
3. 实现修复，重新提交（`feat(step-N): fix xxx`）
4. 重跑验收，状态改回 `done`
5. 评估后续步骤是否受影响，按需更新

### 情况三：架构级缺陷，影响多个步骤

处理方式：
1. 暂停实现，先将 design.md 整体修订完
2. 逐一评估哪些已完成的步骤需要返工，哪些可以 `(superseded)` 处理
3. 在 task-state.md 设计阶段的"记录"字段注明变更原因
4. 重新推进实现

---

## 四、Commit 规范

**Step 提交**：`{type}(step-N): {step-title}`

- feature 分支用 `feat`，refactor 分支用 `refactor`
- 一个步骤可以有多次提交（中间结果、返工修复均可）

**非 Step 提交**：标准 conventional commits 格式，不带 step scope

```
feat(step-1): add search API endpoint
feat(step-1): fix missing validation      ← step-1 的补充提交
feat(step-2): integrate search UI
docs: update task requirements
fix: resolve null pointer in parser
```

---

## 五、AI 的局限

以下情况 AI 无法自动识别，需要人主动告知：

- 步骤退回（AI 不会主动将 `done` 改回 `in_progress`）
- 当前聚焦哪个步骤（多步骤同时 in_progress 时）
- 设计变更的影响范围（需要人判断哪些步骤受牵连）

遇到这些情况，直接用自然语言描述给 AI，AI 会更新 task-state.md 并继续推进。
