# AI Scaffold V2 设计方案

> 开发流程操作手册见 [v2-workflows.md](./v2-workflows.md)。
> Skill 仓库详细规范见 [refactor.md](./refactor.md)。

---

## 一、设计理念

AI 编码时的规则遵守来自上下文，而非系统级强制。

**两类文档，两种加载策略：**

| 文档 | 内容 | 维护者 | 加载方式 |
| --- | --- | --- | --- |
| `CLAUDE.md` | 项目知识（技术栈、目录结构、常用命令、典型模式）| `/init` 和更新指令自动维护 | 始终加载 |
| `architecture.md` | 架构决策（违反后无即时信号、需跨文件理解原因的设计约束）| `refresh-arch` 生成，AI 维护 | 按需显式加载 |

**Skill 交付模型（类 npm）：**

所有功能以 skill 为单位，从远程 GitHub 仓库按需安装到本地项目。skill-set 是相关 skill 的集合，统一安装和删除。详见 [refactor.md](./refactor.md)。

---

## 二、核心文件：architecture.md

记录代码库中已经做出的架构决策，供 `check-arch` 和 `close-feature` 按需加载。

**每条记录必须同时满足：**

1. 是一个可以被违反的选择——有明确的"不该做什么"
2. 违反后没有即时信号——工具不报告，行为看似正常；影响可能在其他模块才显现、延迟暴露，或作为质量隐患悄悄积累
3. 需要阅读多个文件才能理解"为什么这样设计"

**不收录：**
- 技术栈的标准用法
- 没有明确反例的描述性内容（"系统使用 X"不算决策）

**每条格式：**

```markdown
**[决策标题]**
反例：不该做什么（一句话）
Rationale：为什么这样设计
Consequence：违反后会发生什么
```

**刷新原则（`refresh-arch` 执行时）：**
- 已有条目覆盖的决策不重复；视角不同但覆盖相同决策时，以已有条目为准
- 新条目必须明确通过以上三条；存疑时不加，宁少勿滥
- 已有条目若不再满足标准或对应设计已变更，删除

---

## 三、Skill 列表

通过 Bootstrap 安装到 `.claude/commands/`，提交到 git 后团队共享。

**Skill 管理器（顶层）：**

| 命令 | 说明 |
| --- | --- |
| `/skill list` | 列出远程仓库所有可用 skill 和 skill-set |
| `/skill installed` | 列出本地已安装的 skill |
| `/skill install <name>` | 安装 skill 或 skill-set；已安装时提示确认后重装 |
| `/skill remove <name>` | 删除 skill 或 skill-set |

**已安装 Skill（`/aisk:` 命名空间）：**

| Skill | Set | 作用 | 触发场景 |
| --- | --- | --- | --- |
| `/aisk:refresh-arch` | `arch` | 扫描代码，生成或刷新 `architecture.md` | 初始化项目，或架构有较大变更后 |
| `/aisk:check-arch` | `arch` | 加载 `architecture.md`，检查代码变更是否偏离架构决策 | 定期检查，或 feature 完成前 |
| `/aisk:prepare-feature` | `feature` | 创建 feature 三文档，生成 feature-3doc path-rule | 启动需要跨会话的复杂 feature |
| `/aisk:close-feature` | `feature` | 完成 feature，清理文档；可选触发 `refresh-arch` | PR 合并前 |
| `/aisk:prepare-refactor` | `refactor` | 创建 refactor 两文档 | 启动需要跨会话的重构 |
| `/aisk:close-refactor` | `refactor` | 完成 refactor，清理文档 | PR 合并前 |
| `/aisk:setup-hooks` | — | 安装 git hooks | 初始化或更新 hooks 时 |
| `/aisk:setup-permissions` | — | 配置 `.claude/settings.json` | 初始化或更新权限时 |

内部工具（不直接调用）：

- `sync-rules`：由 `prepare-feature` / `close-feature` 内部调用，同步 path-rules 到 `.claude/rules/`

---

## 四、Feature 工作流

复杂 feature 使用三文档模式（REQUIREMENTS / DESIGN / PROGRESS），通过 path-rule 在 `docs/features/**` 下激活。

详见 [`docs/v2-design/templates/path-rules/feature-3doc.md`](./v2-design/templates/path-rules/feature-3doc.md)。

---

## 五、目录结构

```
项目根目录/
├── .ai-skills/
│   └── skills/
│       ├── {skill-name}/
│       │   ├── config.json        # skill 元数据（bootstrap 时下载）
│       │   ├── resource/          # 从远程下载的资源（模板、rules 等）
│       │   └── state.md           # 可选：运行时状态（本地生成）
│       └── {skill-set-name}/
│           ├── config.json
│           ├── resource/
│           └── state.md
│
├── .ai-rules/
│   └── path-rules/
│       └── feature-3doc.md        # Feature 三文档工作流（prepare-feature 生成）
│
├── .claude/
│   ├── settings.json              # 远程仓库配置（AISC_REGISTRY）+ 权限配置
│   ├── rules/
│   │   └── {skill}-*.md           # 从 resource/rules/ 同步（skill 安装时写入）
│   └── commands/
│       ├── skill.md               # skill 管理器（/skill list/install/remove...）
│       └── aisk/                  # 已安装 skill（/aisk:refresh-arch 等）
│
├── docs/
│   └── features/                  # prepare-feature 过程文档（feature branch，merge 前清理）
│
├── architecture.md                # 架构决策（按需加载，不 @ 引入 CLAUDE.md）
└── CLAUDE.md                      # 项目知识（始终加载，/init 自动维护）
```

`architecture.md` 不在 CLAUDE.md 中 @-引用，由 `check-arch` 和 `close-feature` 在需要时显式读取。

**settings.json 中的仓库配置：**

```json
{
  "env": {
    "AISC_REGISTRY": "https://raw.githubusercontent.com/{owner}/{repo}/main"
  }
}
```

---

## 六、架构文档拆分（Monorepo / 大型项目）

单一 `architecture.md` 适合单包项目。对于 monorepo 或有明显模块边界的大型项目，可按路径拆分子架构文档，通过 path-rules 按需加载。

```
.ai-rules/
└── path-rules/
    ├── web-arch.md              # paths: apps/web/**（包级架构决策）
    ├── api-arch.md              # paths: apps/api/**
    └── feature-3doc.md          # paths: docs/features/**
```

根级 `architecture.md` 记录跨包约束；子文档记录包级决策，格式与根文档相同。

**`refresh-arch` 适配**：
- `refresh-arch` → 更新根 `architecture.md`
- `refresh-arch apps/web/` → 更新 `.ai-rules/path-rules/web-arch.md`

---

## 七、遗留问题

- [ ] Feature 三文档模式细节：见 [plan-skill.md](./plan-skill.md)
- [x] `close-feature` 触发 `refresh-arch` 的时机：询问用户是否引入架构变更，由用户确认后触发
- [ ] 架构文档拆分：子架构文档模板待设计（Monorepo 场景启用时）
