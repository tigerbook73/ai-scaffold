# sync-rules

将 `.ai-rules/path-rules/` 同步到 `.claude/rules/`。

**约束**
- [写操作] 只写 `.claude/rules/aisc-*.md`，不修改 `.ai-rules/` 任何文件
- 只处理有 `paths` frontmatter 的文件，无 `paths` 的跳过并警告
- 目标文件统一加 `aisc-` 前缀，避免与用户手写规则冲突

**步骤**
1. 读取 `.ai-rules/path-rules/` 下所有 `.md` 文件
2. 跳过无 `paths` 字段的文件，输出警告
3. 对每个文件：去掉源 frontmatter，重新写入含 `paths:` 的 frontmatter，
   写入 `.claude/rules/aisc-{原文件名}`
4. 删除 `.claude/rules/` 中存在但 `.ai-rules/path-rules/` 已不存在的 `aisc-*` 文件
5. 输出同步结果摘要

**输出格式**
  同步完成：
  ✅ 写入 .claude/rules/aisc-feature-3doc.md（paths: docs/features/**）
  ⚠️ 跳过 example.md — 缺少 paths 字段
  🗑 删除 .claude/rules/aisc-old-rule.md — 源文件已移除
