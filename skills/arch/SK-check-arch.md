# check-arch

检查指定范围内的代码变更与架构决策的一致性。

**约束**

- [只读] 仅读取指定范围内的代码，不修改任何文件
- 不自动更新规则；仅输出偏差项和建议方向
- 每条输出必须指向 `.ai-skills/architecture.md` 中的具体决策；不输出通用代码质量建议

**输入**（`$ARGUMENTS`，可选）

- 无参数 → 自动检测：若工作树有变更（staged/unstaged/untracked）→ 等同 `changes`；否则 → 等同 `commit 1`
- `help` → 列出所有可用模式，然后停止
- `ALL` → 完整项目文件树（智能忽略自动生成代码）
- `changes` → 所有工作树变更：`git diff`（未暂存）+ `git diff --cached`（已暂存）+ 未跟踪新文件（`git ls-files --others --exclude-standard`）
- `commit [N|hash]` → 该点到当前工作树之间发生变更的文件：
  - `commit` 或 `commit 1` → HEAD~1 到当前（`git diff HEAD~1`）
  - `commit N` → HEAD~N 到当前（`git diff HEAD~N`）
  - `commit <hash>` → `<hash>` 到当前（`git diff <hash>`）
- `<path>` → 该目录/文件下文件的当前内容

**步骤**

1. 读取 `.ai-skills/architecture.md`（若不存在，提示用户先运行 `refresh-arch`，然后停止）
2. 解析 `$ARGUMENTS` 并确定审查范围；获取对应文件或 diff 内容
3. 对 `.ai-skills/architecture.md` 中的每条决策，检查代码是否存在其反例描述的反模式；若存在则记录为偏差
4. 按以下输出格式输出结果

**输出格式**

```
Review scope: <scope description>

[architecture.md · Auth Pattern] src/app/admin/page.tsx:8 — queries DB directly, should go through the server/data/ layer
[architecture.md · Embedding Router] src/lib/ingest/pipeline.ts:42 — references bge.ts directly, should import from router.ts

No deviations: ✅ Code in review scope is consistent with architecture decisions

---
Scope: <scope description> | Violations: 2
Scope: changes (2 modified, 1 staged, 1 untracked) | No violations ✅
```
