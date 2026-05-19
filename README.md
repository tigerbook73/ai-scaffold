# AI Scaffold

类 npm 的 AI 工作流 skill 仓库，按需安装到项目。

## 快速开始

在任意项目中触发 bootstrap（使用 raw URL 或粘贴内容）：

```
请执行 https://raw.githubusercontent.com/{owner}/{repo}/main/bootstrap.md
```

bootstrap 完成后，通过 `/skill` 命令管理 skill：

```
/skill list                    # 查看可用 skill
/skill install arch            # 安装架构决策工具集
/skill install task            # 安装任务规划工具集
/skill install setup-hooks     # 安装 git hooks
/skill install setup-permissions  # 配置 Claude 权限
```

## 可用 Skill

| Skill / Set | 说明 |
| --- | --- |
| `arch` | 架构决策管理：`refresh-arch`（生成 architecture.md）、`check-arch`（检查代码对齐） |
| `task` | 任务规划：`prepare-task`（启动 feature/refactor）、`close-task`（完成并清理） |
| `setup-hooks` | 为 Node.js 项目安装 commitlint（可选 lint-staged）|
| `setup-permissions` | 生成/更新 `.claude/settings.json` 权限白名单 |

## 仓库结构

```
bootstrap.md          # 入口：初始化 skill 管理器
skill.md              # /skill 命令实现
registry.json         # skill 注册表（由 build-registry.js 生成）
scripts/
  build-registry.js   # 自动扫描 skills/ 生成 registry.json
comm/                 # 公共资源（install/uninstall 默认指令）
skills/               # 各 skill / skill-set 实现
docs/                 # 设计文档
```

详细设计见 [docs/v2-design.md](./docs/v2-design.md)。
