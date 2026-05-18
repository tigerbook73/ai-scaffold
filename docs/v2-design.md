# AI Scaffold V2 设计方案

> 开发流程操作手册见 [v2-workflows.md](./v2-workflows.md)。

---

## 一、设计理念

AI 编码时的规则遵守来自上下文，而非系统级强制。

核心机制：将项目特有的架构约束和典型模式加入 AI 上下文（via CLAUDE.md），由 AI 在编码时主动遵守；通过 `audit` 定期检查偏离；`refresh-arch` 保持上下文与代码同步。

### 两类内容，两种策略

| 内容                                                              | 维护者             | 作用                                |
| ----------------------------------------------------------------- | ------------------ | ----------------------------------- |
| 架构约束（如 Server Component → Service → DB；API 必须 Zod 校验） | 人工，写一次极少改 | AI 编码时严格遵守，`audit` 重点检查 |
| 典型模式（目录结构、技术栈、代码中重复出现的结构）                | AI 自动提取刷新    | AI 编码时作为参考，按项目惯例来     |

### 与 `/init` 的关系

`refresh-arch` 与 Claude Code 内置 `/init` 本质相同（扫描代码 → 生成文档），区别在于：

- `/init` 生成通用 CLAUDE.md
- `refresh-arch` 按 architecture.md 的结构定向刷新，保护人工维护区不被覆盖

---

## 二、核心文件：architecture.md

单一来源，分两个区，由 `---` 分隔。

**AI 维护区**（`refresh-arch` 自动更新，用户无需手工维护）

- `## 项目概览`：简介、技术栈、常用命令
- `## 目录结构`：顶层目录树 + 职责
- `## 典型模式`：从代码中提取的重复结构和通用做法

**人工维护区**（AI 永远不覆盖）

- `## 架构约束`：必须遵守的规则，违反会导致功能或安全问题
- `## 例外与特殊情况`：偏离框架默认或通用模式的有意决策
- `## 遗留问题`：已决策但未实施的方向，或待讨论的架构问题

两区之间以注释明确分界：

```markdown
<!-- AI 维护区：由 refresh-arch 自动更新 -->

## 项目概览

...

## 目录结构

...

## 典型模式

...

---

<!-- 人工维护区：AI 不覆盖此线以下内容 -->

## 架构约束

...
```

---

## 三、Skill 列表

Bootstrap 安装到 `.claude/commands/aisc/`，提交到 git 后团队共享。

| Skill                     | 作用                                                           | 触发场景                             |
| ------------------------- | -------------------------------------------------------------- | ------------------------------------ |
| `/aisc:refresh-arch`      | 扫描代码，刷新 AI 维护区，保留人工维护区                       | 代码有较大变更后，或感觉上下文过时时 |
| `/aisc:audit`             | 检查代码变更是否偏离架构约束                                   | 定期检查，或 feature 完成前          |
| `/aisc:plan-feature`      | 创建 feature 三文档，生成 feature-3doc path-rule               | 启动需要跨会话的复杂 feature         |
| `/aisc:close-work`        | 完成 feature，提取结论到 architecture.md，清理文档和 path-rule | PR 合并前                            |
| `/aisc:setup-hooks`       | 安装 git hooks                                                 | 初始化或更新 hooks 时                |
| `/aisc:setup-permissions` | 配置 `.claude/settings.json`                                   | 初始化或更新权限时                   |

内部工具（不直接调用）：

- `sync-rules`：由 `plan-feature` / `close-work` 内部调用，同步 path-rules 到 `.claude/rules/`

---

## 四、Feature 工作流

复杂 feature 使用三文档模式（REQUIREMENTS / DESIGN / PROGRESS），通过 path-rule 在 `docs/features/**` 下激活。

详见 [`docs/v2-design/templates/path-rules/feature-3doc.md`](./v2-design/templates/path-rules/feature-3doc.md)。

---

## 五、目录结构

```
项目根目录/
├── .ai-rules/
│   ├── context/
│   │   └── architecture.md        # 单一来源（AI + 人工混合维护）
│   └── path-rules/
│       └── feature-3doc.md        # Feature 三文档工作流（plan-feature 生成）
│
├── .claude/
│   ├── settings.json              # 权限配置
│   ├── rules/
│   │   └── aisc-*.md              # sync-rules 从 path-rules/ 生成，勿直接修改
│   └── commands/
│       └── aisc/                  # Bootstrap 安装的 Skill
│
├── docs/
│   └── features/                  # plan-feature 过程文档（feature branch，merge 前清理）
│
├── CLAUDE.md                      # @ 引用 .ai-rules/context/architecture.md
└── CLAUDE.local.md                # 个人偏好（gitignore）
```

**CLAUDE.md 引用块**（Bootstrap 追加，`aisc:start/end` 标记，幂等）：

```markdown
<!-- aisc:start -->

@.ai-rules/context/architecture.md

<!-- aisc:end -->
```

---

## 六、架构文档拆分（Monorepo / 大型项目）

单一 `architecture.md` 适合单包项目。对于 monorepo 或有明显模块边界的大型项目，可按路径拆分子架构文档，通过 path-rules 按需加载，减少上下文占用。

```
.ai-rules/
├── context/
│   └── architecture.md          # 根级：整体结构 + 跨包约束（始终加载）
└── path-rules/
    ├── web-arch.md              # paths: apps/web/**
    ├── api-arch.md              # paths: apps/api/**
    └── feature-3doc.md          # paths: docs/features/**
```

**加载效果**：在 `apps/web/` 工作时，只加载根文档 + `web-arch.md`，不加载其他包的文档。

**内容边界**：
- 根文档：monorepo 整体结构、包间接口约定、跨包强制约束
- 子文档：包内典型模式、包级架构约束、包内例外；结构与根文档相同（AI 维护区 + 人工维护区）

**`refresh-arch` 适配**：按输入路径决定更新哪个文档。
- `refresh-arch` → 更新根 architecture.md
- `refresh-arch apps/web/` → 更新 `path-rules/web-arch.md`

---

## 七、遗留问题

- [ ] `close-work` 提取策略：哪些内容提取到 architecture.md 人工维护区，哪些直接丢弃
- [ ] Feature 三文档模式细节：refactor 是否需要单独模式；见 [plan-skill.md](./plan-skill.md)
- [ ] 架构文档拆分：子架构文档模板待设计（Monorepo 场景启用时）
