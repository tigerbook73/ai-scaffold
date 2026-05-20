# AI Skills

本地 AI 技能库，通过 `/aisk/sync` 将技能一键分发到任意项目。

## 初始化（新机器一次性）

```bash
git clone .../ai-skills ~/code/ai-skills
cd ~/code/ai-skills && npm install && npm run register
```

完成后：
- `~/.ai-skills/config.json` 记录本仓库路径
- `~/.claude/commands/aisk/` 中安装了全局元命令（`/aisk/sync`、`/aisk/create-skill`）

## 在项目中使用

在任意项目的 Claude Code 会话中运行：

```
/aisk/sync
```

将所有技能同步到当前项目的 `.claude/commands/aisk/`。

## 技能列表

| 技能 | 说明 |
|------|------|
| `refresh-arch` | 扫描代码库，生成或刷新 `.ai-skills/architecture.md` |
| `check-arch` | 检查代码变更是否符合架构决策 |
| `prepare-task` | 创建 feature/refactor 任务分支和规划文档 |
| `close-task` | 验证任务完成，清理规划文档 |

## 添加新技能

```
/aisk/create-skill path/to/my-skill.md
```

或由 Claude 根据描述生成：

```
/aisk/create-skill my-skill
```

添加后运行 `git commit` 持久化，再用 `/aisk/sync` 分发到项目。

## 仓库结构

```
skills/           # 技能源文件（命令 + 资源）
claude/
  setting.json    # 同步配置（npm run build 生成）
scripts/
  setup.ts        # 全局初始化（npm run register）
  sync.ts         # 同步实现（npm run sync）
  build.ts        # 生成 setting.json（npm run build）
  create-skill.ts # 添加技能（npm run create-skill）
docs/
  OVERVIEW.md     # 设计文档
```
