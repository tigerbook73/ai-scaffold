# AI Scaffold

类 npm 的 AI 工作流 skill 仓库，按需安装到项目。

## 快速开始

在任意项目中触发 bootstrap（使用 raw URL 或粘贴内容）：

```
请执行 https://raw.githubusercontent.com/tigerbook73/ai-scaffold/main/bootstrap.md
```

bootstrap 完成后，通过 `/aisk/skills` 命令管理 skills：

```
/aisk/skills list                    # 查看可用 skill
/aisk/skills install arch            # 安装架构决策工具集
/aisk/skills install task            # 安装任务规划工具集
/aisk/skills install setup-hooks     # 安装 git hooks
/aisk/skills install setup-permissions  # 配置 Claude 权限
```

## 可用 Skill

| Skill / Set         | 说明                                                                               |
| ------------------- | ---------------------------------------------------------------------------------- |
| `arch`              | 架构决策管理：`refresh-arch`（生成 architecture.md）、`check-arch`（检查代码对齐） |
| `task`              | 任务规划：`prepare-task`（启动 feature/refactor）、`close-task`（完成并清理）      |
| `setup-hooks`       | 为 Node.js 项目安装 commitlint（可选 lint-staged）                                 |
| `setup-permissions` | 生成/更新 `.claude/settings.json` 权限白名单                                       |

## 仓库结构

```
bootstrap.md          # 入口：初始化 skill 管理器
registry.json         # skill 注册表（由 build-registry.js 生成）
scripts/
  build-registry.js   # 自动扫描 skills/ 生成 registry.json
skills/               # 各 skill / skill-set 实现
  skills/             # /aisk/skills 命令（skill 管理器）
docs/                 # 设计文档
```

详细设计见 [docs/v2-design.md](./docs/v2-design.md)。
