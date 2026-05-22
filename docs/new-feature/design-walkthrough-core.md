# 走读（Walkthrough）功能 — 主设计文档

## 一、核心概念

**Walkthrough（走读）**：一次完整的代码讲解事务，包含走读目标、分组列表和讲解进度。每个 git 分支同时只有一个活跃 walkthrough。

**走读目标**：本次走读的代码范围，支持三种形式：
- 未提交变更（working tree diff）
- Commit range（如 `main..HEAD`）
- 指定文件或目录（变更内容或全量内容）

**分组（Group）**：将走读目标拆分为若干讲解单元，按顺序逐组讲解。分组在创建时一次性生成，不中途调整。

**状态文件**：记录走读进度，保存在本地，不提交入 git，跨 session 恢复时读取。

---

## 二、状态文件

### 路径与 gitignore

状态文件路径：`{project-root}/.ai-skills/data/walkthrough.md`

`.ai-skills/data/` 是所有 skill 动态数据文件的统一存储目录。
`create-walkthrough` 执行时，若 `.ai-skills/data/` 未在 `.gitignore` 中，自动追加。

### 结构

单文件多分支：每个分支的走读记录作为独立章节，关闭时删除对应记录，其他分支的过期记录无需主动清理。

格式见 `design-walkthrough-template/walkthrough-state.md`。

---

## 三、分组策略

| 情况 | 分组依据 |
| ---- | -------- |
| 当前分支 `docs/tasks/` 下存在设计文档（`design.md` 或 `design-*.md`） | 按设计步骤分组，AI 将代码变更映射到对应步骤 |
| 无设计文档 | AI 按模块、功能边界等自动分组，并说明分组逻辑 |

单组内容过大（潜在输出超过约 300 行）时进一步拆分。两种情况下走读流程完全一致。

---

## 四、恢复机制

| 场景 | 恢复方式 |
| ---- | -------- |
| session 内 | 用自然语言（"继续"、"下一组"、"到哪了"），AI 从当前 session 上下文接续，无需读状态文件 |
| 跨 session | 执行 `start-walkthrough`，从状态文件读取进度，校验有效性后从中断处继续 |

**跨 session 校验**：

- 分组来自设计文档：检查文档是否有变更；有变更则提示分组可能过时，由用户决定是否重建
- 分组由 AI 自动生成：检查走读目标（如 commit range）是否仍然有效；无效则提示，询问是否重建

---

## 五、Skill 总览

| Skill | 简介 | 定义文件 |
| ----- | ---- | -------- |
| `create-walkthrough` | 指定走读目标，生成分组，开始第一组讲解 | `design-walkthrough-skills/create-walkthrough.md` |
| `start-walkthrough` | 从状态文件恢复走读，从中断处继续 | `design-walkthrough-skills/start-walkthrough.md` |
| `resume-walkthrough` | start-walkthrough 的别名 | 同 start-walkthrough |

---

## 六、完成与关闭

所有分组讲解完毕后：

1. AI 输出走读摘要（目标、分组列表、各组关键要点）
2. 等待用户确认（如"OK"、"好的"）
3. 确认后删除 `.walkthrough.md` 中当前分支的记录，事务关闭

其他分支的过期记录无需主动清理。
