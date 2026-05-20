# AI Skills

本地 AI 技能库，通过 `/sync` 将技能分发到任意项目。

## 初始化（一次性）

克隆本仓库到本地，然后运行：

```bash
node scripts/setup.js
```

完成后：
- `~/.ai-skills/config.json` 记录本仓库路径
- `~/.claude/commands/` 中安装了全局元命令（`/sync`、`/create-skill`）

## 在项目中使用

在任意项目的 Claude Code 会话中运行：

```
/sync
```

将所有技能同步到当前项目的 `.claude/commands/`。

## 技能列表

| 技能 | 说明 |
|------|------|
| `refresh-arch` | 扫描代码库，生成或刷新 `./architecture.md` |
| `check-arch` | 检查代码变更是否符合架构决策 |
| `prepare-task` | 创建 feature/refactor 任务分支和规划文档 |
| `close-task` | 验证任务完成，清理规划文档 |

## 添加新技能

将本地技能文件添加到全局仓库：

```
/create-skill path/to/my-skill.md
```

或由 Claude 根据描述生成：

```
/create-skill my-skill
```

添加后运行 `git commit` 持久化，再用 `/sync` 分发到项目。

## 仓库结构

```
claude/
  commands/       # 技能命令（同步到项目 .claude/commands/）
  file-tree.json  # 文件索引（sync.js 读取）
resources/        # 不同步的资源文件（模板等）
scripts/
  setup.js        # 全局初始化
  sync.js         # 同步实现
docs/             # 设计文档
```
