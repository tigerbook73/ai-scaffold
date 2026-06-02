# AI Skills —— 项目概览

## 是什么

AI Skills 是一个**本地 skill 库**，通过一条 `pnpm register` 命令将可复用 skill 全局安装到 Claude Code 和 Codex。

核心理念：skill 集中维护在本地代码库中 —— 改一处，处处生效。新 skill 通过 `/aisk/create-skill` 晋升到全局库。

---

## 整体架构

```
Local skill repository/
└── skills/              ← skill 源文件（SK-*.md，含可选 frontmatter）

  ↓ pnpm register

~/.ai-skills/config.json          ← 记录代码库路径
~/.claude/commands/aisk/          ← Claude Code skill 命令
~/.codex/skills/aisk-*/           ← Codex skill 目录
```

安装器在安装时扫描 `skills/` —— 无中间 manifest。Skill 默认同时支持 Claude Code 和 Codex。Skill 可在 frontmatter 中添加 `targets: [claude]` 以退出 Codex 支持。

---

## 代码库目录结构

```
{repo}/
├── skills/                        ← 所有 skill 文件，按组组织
│   ├── skill-format.md            ← skill 源文件格式规范
│   ├── arch/
│   │   ├── SK-refresh-arch.md
│   │   └── SK-check-arch.md
│   ├── create-skill/
│   │   ├── SK-create-skill.md
│   │   └── resource/              ← 运行时资源（不作为命令安装）
│   ├── init-project/
│   │   └── SK-init-project.md
│   ├── set-claude-permission/
│   │   └── SK-set-claude-permission.md  ← 含 `targets: [claude]` frontmatter
│   ├── setup-precommit/
│   │   └── SK-setup-precommit.md
│   ├── smart-review/
│   │   └── SK-smart-review.md
│   ├── task/
│   │   ├── SK-create-task.md
│   │   ├── SK-start-task.md
│   │   ├── SK-verify-step.md
│   │   ├── SK-verify-task.md
│   │   ├── SK-complete-task.md
│   │   └── resource/              ← 任务文档模板
│   └── walkthrough/
│       ├── SK-create-walkthrough.md
│       └── SK-start-walkthrough.md
├── scripts/
│   ├── setup.ts                   ← pnpm register（运行 Claude + Codex 安装）
│   ├── setup-claude.ts            ← Claude 安装器
│   ├── setup-codex.ts             ← Codex 安装器
│   ├── scan-skills.ts             ← 共享扫描器：读取 SK-*.md frontmatter + H1
│   └── build.ts                   ← 同步 skill-format.md 和 Claude 规则文件
├── package.json
└── docs/
    └── OVERVIEW.md                ← 本文档
```

> **技术栈**：所有脚本使用 TypeScript，通过 `pnpm <script>` 调用，以 `node --import tsx` 执行；需要时通过 CAC 解析 CLI 参数。

---

## 项目运行时文件

Skill 可能在项目的 `.ai-skills/` 目录下运行时生成文件。这些文件**不**由 `pnpm register` 安装 —— 而是由各 skill 按需创建：

- `.ai-skills/architecture.md` —— 由 `/aisk/refresh-arch` 写入，记录项目专属的架构决策

这些文件应添加到 `.gitignore`（由 `/aisk/init-project` 处理）。

---

## pnpm 脚本汇总

| 命令                | 实现                                           | 用途                                                               |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| `pnpm register`     | `scripts/setup.ts`                             | 为 Claude Code 和 Codex 全局安装 skill                             |
| `pnpm build`        | `scripts/build.ts`                             | 同步 `skill-format.md` 和 Claude 规则文件                          |
| `pnpm create-skill` | `skills/create-skill/resource/create-skill.ts` | 将 skill 文件写入 `skills/`（由 `/aisk/create-skill` 调用）        |
| `pnpm verify`       | —                                              | lint:check + typecheck + test + build                              |

> **运行时依赖**：脚本通过 `node --import tsx` 以 TypeScript 形式执行；需要时 CLI 参数解析使用 CAC。

---

## 管理脚本

### scripts/setup.ts

**用途**：为 Claude Code 和 Codex 全局安装 skill。在新机器上运行一次。

**操作：**

1. 委托给 `ClaudeSetup`（安装至 `~/.claude/commands/aisk/`）
2. 委托给 `CodexSetup`（安装至 `~/.codex/skills/aisk-*/`）

**调用：**

```bash
pnpm register
```

---

### scripts/scan-skills.ts

**用途**：两个安装器共用的 skill 扫描器。读取每个 `SK-*.md` 文件并返回结构化的 `SkillEntry` 对象。

**为每个 skill 推断：**

- `targets`：来自可选的 YAML frontmatter（`targets: [claude]` 为仅 Claude；默认两者均支持）
- `description`：H1 后的第一个非空行（用作 Claude 斜杠命令描述）
- `codex.name`：`aisk-{skill-name}`（从文件名派生）
- `codex.description`：`"Use when the user wants to …"`（从 H1 描述加前缀）
- `codex.shortDescription`：skill 名称的首字母大写形式

---

### scripts/setup-claude.ts

**用途**：Claude 安装器 —— 扫描 skill 并安装至 `~/.claude/commands/aisk/`。

**操作：**

1. 将代码库路径写入 `~/.ai-skills/config.json`
2. 通过 `scanSkills()` 扫描 `skills/`，按 `targets.claude` 过滤
3. 将每个 skill 以 `{name}.md` 形式安装，附带 YAML `description` frontmatter
4. 删除 `~/.claude/commands/aisk/` 中的过期 `.md` 文件

---

### scripts/setup-codex.ts

**用途**：Codex 安装器 —— 扫描 skill 并安装至 `~/.codex/skills/aisk-*/SKILL.md`。

**操作：**

1. 将代码库路径写入 `~/.ai-skills/config.json`
2. 通过 `scanSkills()` 扫描 `skills/`，按 `targets.codex` 过滤
3. 转换每个 skill：去除 Claude 专属的 `**Usage**` 行，将 `/aisk/x` 替换为 `aisk-x`，添加 YAML frontmatter 和 Codex Notes 章节
4. 删除过期的 `aisk-*` Codex skill 目录（保留第三方 skill）

---

### scripts/build.ts

**用途**：将 skill 格式规则从 `skills/skill-format.md` 同步到 `.claude/rules/skill-rules.md`。不生成安装 manifest。

**操作：**

1. 读取 `skills/skill-format.md`，提取 EXTRACT 标记之间的内容
2. 将该内容同步到 `.claude/rules/skill-rules.md`（使 Claude Code 在编辑 SK-\*.md 文件时自动加载格式规则）

**调用：**

```bash
pnpm build
```

编辑 `skills/skill-format.md` 后运行。

---

### skills/create-skill/resource/create-skill.ts

**用途**：将 skill 文件写入全局代码库的 `skills/`。

**参数（通过 CAC）：**

```bash
pnpm create-skill -- <file> [--name <n>] [--cleanup] [--force]
```

| 参数        | 描述                                         | 默认值             |
| ----------- | -------------------------------------------- | ------------------ |
| `<file>`    | 源文件路径（必填）                           | —                  |
| `--name`    | Skill 名称（目标文件名，不含 `.md`）         | 取自源文件名       |
| `--cleanup` | 复制后删除源文件                             | false              |
| `--force`   | 名称重复时跳过冲突确认                       | false              |

**由 `/aisk/create-skill` 命令间接调用**；用户通常不直接运行此脚本。

---

## Skill 目标控制

安装器从每个 `SK-*.md` 文件读取可选的 YAML frontmatter：

```yaml
---
targets: [claude]
---
```

- 无 frontmatter → Claude Code 和 Codex 均支持（默认）
- `targets: [claude]` → 仅 Claude Code
- 目前只有一个 skill 使用此配置：`set-claude-permission`

---

## Skill 命令

### /aisk/init-project

**调用**：`/aisk/init-project`（无参数）

**效果**：为当前项目配置全局安装的 aisk skill 的使用环境：

1. 将 `.ai-skills/` 添加到 `.gitignore`（经确认）
2. 在 `.claude/settings.json` 中添加 `Read(~/.ai-skills/*)` 和 `Bash(pnpm --dir {repo} run *)`

---

### /aisk/create-skill

**调用**：`/aisk/create-skill <file-path>` 或 `/aisk/create-skill <skill-name>`

**效果**：将 skill 晋升到全局代码库。

| 模式       | 参数形式                        | 行为                                                                                                                      |
| ---------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 文件路径   | 已有 `.md` 文件的路径           | 传入 `create-skill.ts` 处理                                                                                               |
| Skill 名称 | 普通名称（如 `my-skill`）        | Claude 根据对话上下文生成内容，写入 `{repo}/skills/{name}/SK-{name}.md`，调用 `pnpm build`                                |

执行后，在 ai-skills 代码库中运行 `git commit` 以持久化，然后运行 `pnpm register` 全局应用。

---

### /aisk/task/\* —— 任务工作流

一组 skill，用于管理带有分支独占工作流和逐步验收验证的结构化开发任务。完整工作流详见 `skills/task/README.md`。

| 命令            | 描述                                                                   |
| --------------- | ---------------------------------------------------------------------- |
| `create-task`   | 初始化新任务：创建分支、搭建任务文档，并进入工作模式                   |
| `start-task`    | 为当前 session 进入任务工作模式（每次新 session 开始时重新运行）       |
| `verify-step`   | 对单个步骤运行验收检查                                                 |
| `verify-task`   | 对所有步骤运行验收检查                                                 |
| `complete-task` | 验证任务完成，清理任务文档，并提示创建 PR                              |

---

### /aisk/smart-review

**调用**：`/aisk/smart-review <target-path> [focus description]`

**效果**：对目标文件、模块或目录进行迭代式审查和修复。最多运行 3 轮；遇到需要用户输入的决策时暂停。

---

### /aisk/refresh-arch / /aisk/check-arch

**`refresh-arch`**：扫描代码库，生成或刷新 `.ai-skills/architecture.md`，记录架构决策。

**`check-arch`**：检查给定范围内的代码变更是否与已记录的架构决策一致。

---

## 典型工作流

**在新机器上初始化：**

```
git clone .../ai-skills ~/code/ai-skills
cd ~/code/ai-skills && pnpm install && pnpm register
```

**配置新项目：**

```
/aisk/init-project
```

**将临时 skill 晋升为全局 skill：**

```
/aisk/create-skill .claude/commands/aisk/my-experiment.md
# → 在 ai-skills 代码库中运行 git commit
# → 运行 pnpm register 全局应用
```
