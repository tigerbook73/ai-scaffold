# check-arch

检查指定范围内的代码变更与架构决策的对齐情况。

**约束**
- [只读] 只读取指定范围内的代码，不修改任何文件
- 不自动更新规则，只输出偏差和建议方向
- 每条输出必须指向 `architecture.md` 中的具体决策，不输出泛化的代码质量建议

**输入**（`$ARGUMENTS`，不传则默认最近一次提交）
- 无参数 → 最近一次提交（`git diff HEAD~1`）
- 路径（如 `src/`） → 该目录下的当前文件
- commit hash → 该提交的变更（`git diff <hash>~1 <hash>`）
- 数字（如 `3`） → 最近 N 次提交的变更（`git diff HEAD~N`）

**步骤**
1. 读取 `./architecture.md`（不存在则提示先运行 `refresh-arch`，终止）
2. 解析输入，确定审核范围
3. 获取范围内的文件或 diff 内容
4. 对比 `architecture.md` 中的决策，识别偏差
5. 输出结果

**输出格式**
```
审核范围：最近 1 次提交（abc1234）

[architecture.md · Auth Pattern] src/app/admin/page.tsx:8 — 直接查询 DB，应通过 server/data/ 层
[architecture.md · Embedding Router] src/lib/ingest/pipeline.ts:42 — 直接引用 bge.ts，应从 router.ts 引入

无偏差：✅ 审核范围内代码与架构决策一致
```
