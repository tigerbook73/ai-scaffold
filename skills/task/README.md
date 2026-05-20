# task 技能组设计

`task` 技能组包含两个技能：`prepare-task`（启动跨会话任务）和 `close-task`（完成并清理）。

---

## 核心设计思路

AI 编码会话是无状态的——每次对话结束，上下文消失。对于跨越多个会话的 feature 或重构任务，需要一种方法在会话之间传递状态。

`task` 技能组的解法：**用文件作为状态载体**，用 git 分支作为任务隔离边界。

- `docs/tasks/{name}/` 目录 = 任务的全局状态
- `feature/{name}` 或 `refactor/{name}` 分支 = 任务的代码边界
- `PROGRESS.md` = AI 在新会话中恢复上下文的入口

---

## prepare-task 设计

### 为什么必须在新分支上

分支约束不只是 git 卫生习惯，它有两个实际作用：
1. **隔离**：任务文档（`docs/tasks/`）和代码变更在同一分支，合并时一起处理
2. **标识**：`close-task` 从分支名自动推断任务名，无需用户重复输入

在主干上操作会破坏这两点，因此拒绝执行。

### 为什么只创建两个文件（不含 DESIGN.md）

`prepare-task` 只创建 `REQUIREMENTS.md`（需求）和 `PROGRESS.md`（进度）。

DESIGN.md 不在初始化时创建，原因：需求未经确认就生成设计，容易产生无效工作。设计阶段在需求 `status: confirmed` 后，由用户显式触发。

### feature 和 refactor 的 REQUIREMENTS.md 为什么不同

两者的"完成标准"性质不同：
- `feature`：以用户行为描述验收标准（用例 + 期望结果）
- `refactor`：以代码状态描述完成标准（范围 + 约束 + 可观测结果）

用同一模板会导致其中一种写不对，用不同模板可以给正确的结构引导。

---

## close-task 设计

### 为什么需要验证条件

`close-task` 执行前有两个强制检查：工作树干净 + `PROGRESS.md` 阶段为 `completed`。

这两个条件不是形式要求，而是防止误操作：
- 工作树不干净意味着有未提交变更，此时删除任务文档可能导致文档和代码状态脱节
- 阶段未到 `completed` 意味着任务实际未完成，删除文档会丢失进度记录

### 为什么 close-task 不触发 refresh-arch

分离职责：任务结束不等于架构决策需要更新。是否刷新 `architecture.md` 由开发者判断，`close-task` 只负责清理任务文档。强制触发 `refresh-arch` 会引入不必要的耦合。

---

## docs/tasks/ 目录的生命周期

```
prepare-task        → 创建 docs/tasks/{name}/
[开发过程]          → REQUIREMENTS → DESIGN → PROGRESS 逐步填充
close-task          → 验证 + 删除 docs/tasks/{name}/
合并到主干          → 分支删除
```

任务文档的生命周期严格限定在任务分支内，不随代码合并到主干。
