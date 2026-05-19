# task 安装后操作

1. 从 `{AISK_REGISTRY}/skills/task/resource/task-planning.md` 下载路径规则模板，写入以下两处：
   - `.ai-skills/skills/task/resource/task-planning.md`（元数据备份）
   - `.ai-rules/path-rules/task-planning.md`（激活来源，不存在则创建目录）
2. 调用 sync-rules，将 `.ai-rules/path-rules/task-planning.md` 同步到 `.claude/rules/aisk-task-planning.md`
