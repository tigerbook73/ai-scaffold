# close-work

验证 feature 或 refactor 已完成并提交，清理规划文档，提示可以 PR。

**约束**
- [写操作] 删除规划文档目录；经用户确认后可调用 `refresh-arch` 更新 `architecture.md`

**输入**（`$ARGUMENTS`，可选）
- 无参数 → 从当前 branch 名推断（feature/{name} 或 refactor/{name}）
- `{name}` → 手动指定

**步骤**
1. 从 branch 名或输入解析模式和名称
2. 检查 git status：工作树必须干净，否则终止并提示先提交
3. 检查 PROGRESS.md：当前阶段必须为 completed，否则列出未完成步骤并终止
4. 询问用户：本次变更是否引入了新的架构决策或修改了已有决策？
   - 是 → 调用 `refresh-arch` 更新 `./architecture.md`，等待确认后继续
   - 否 → 跳过
5. 删除 docs/features/{name}/ 或 docs/refactors/{name}/
6. 提交删除
7. 输出：✅ 清理完成，可以开 PR 了
