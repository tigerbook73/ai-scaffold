# prepare-task

创建 feature 或 refactor 的规划文档，在独立 branch 上启动跨会话工作。

**约束**
- [写操作] 创建 branch 和规划文档，不修改已有文件
- 必须在新 branch 上操作，拒绝在主干执行

**输入**（`$ARGUMENTS`）
- `feature {name}` → feature 三文档模式
- `refactor {name}` → refactor 三文档模式（REQUIREMENTS 模板不同）

**步骤（两种模式相同）**
1. 创建并切换到 feature/{name} 或 refactor/{name} branch
2. 创建 docs/tasks/{name}/REQUIREMENTS.md（frontmatter: status: draft，内容按模式填写）
3. 创建 docs/tasks/{name}/PROGRESS.md（当前阶段: requirements-drafting）
4. 若 .ai-rules/path-rules/task-planning.md 不存在，从模板创建并调用 sync-rules
5. 提交初始文档
6. 输出已创建文件列表，提示填写 REQUIREMENTS.md

**REQUIREMENTS.md 模板差异**

feature 模式：
- 问题描述
- 用例 / 验收标准

refactor 模式：
- 重构目标
- 范围与约束
- 完成标准
