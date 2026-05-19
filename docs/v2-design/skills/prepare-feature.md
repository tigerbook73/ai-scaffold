# plan-feature

创建 feature 或 refactor 的规划文档，在独立 branch 上启动跨会话工作。

**约束**
- [写操作] 创建 branch 和规划文档，不修改已有文件
- 必须在新 branch 上操作，拒绝在主干执行

**输入**（`$ARGUMENTS`）
- `{name}` → feature 三文档模式
- `--refactor {name}` → refactor 两文档模式

**步骤（feature 模式）**
1. 创建并切换到 feature/{name} branch
2. 创建 docs/features/{name}/REQUIREMENTS.md（frontmatter: status: draft）
3. 创建 docs/features/{name}/PROGRESS.md（当前阶段: requirements-drafting）
4. 若 .ai-rules/path-rules/feature-3doc.md 不存在，从模板创建并调用 sync-rules
5. 提交初始文档
6. 输出已创建文件列表，提示填写 REQUIREMENTS.md

**步骤（refactor 模式）**
1. 创建并切换到 refactor/{name} branch
2. 创建 docs/refactors/{name}/DESIGN.md
3. 创建 docs/refactors/{name}/PROGRESS.md（当前阶段: design-drafting）
4. 提交初始文档
5. 输出已创建文件列表，提示填写 DESIGN.md
