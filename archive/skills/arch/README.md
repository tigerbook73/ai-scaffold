# arch Skill 组

一对互补的 skill，用于维护和执行架构决策。

## Skills

**`refresh-arch`** — 扫描代码库，生成或更新 `.ai-skills/architecture.md`，记录容易被悄然违反的设计决策。支持按路径、commit hash、commit 数量或全项目（`ALL`）进行范围限定。始终先展示 diff，需用户确认后才写入。

**`check-arch`** — 读取 `.ai-skills/architecture.md`，检查指定范围内的代码变更是否违反已记录的决策。只读操作；输出偏差项时附带 file:line 指针，并将每个发现链接到相关决策。支持与 `refresh-arch` 相同的输入范围。

## 典型工作流

```
# 首次配置
/aisk/refresh-arch ALL

# 每次 commit 后（或按需）
/aisk/check-arch
```
