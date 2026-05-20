# close-task

验证 feature 或 refactor 已完成并提交，清理规划文档，提示可以 PR。

**约束**
- [写操作] 删除规划文档目录

**输入**（`$ARGUMENTS`，可选）
- 无参数 → 从当前 branch 名推断（feature/{name} 或 refactor/{name}）
- `{name}` → 手动指定

**步骤**
1. 从 branch 名或输入解析模式和名称
2. 检查 git status：工作树必须干净，否则终止并提示先提交
3. 检查 PROGRESS.md：当前阶段必须为 completed，否则列出未完成步骤并终止
4. 删除 docs/tasks/{name}/
5. 提交删除
6. 输出：✅ 清理完成，可以开 PR 了
