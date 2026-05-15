# /init-ai-scaffold — 初始化 AI 工程脚手架

在项目中创建标准化的 AI 辅助开发规范体系，支持全新项目、存量项目、以及 monorepo。
包含：多工具配置文件、规范文档、ADR 体系、Claude Code slash 命令。

**规范类 Markdown 文件使用中文写作；代码注释、提交记录、文件名等使用英文。**

> 维护说明：本文只描述流程和决策规则。长篇输出模板统一维护在
> `init-ai-scaffold-templates/`。英文版 `../en/init-ai-scaffold.md` 与本文内容同步，
> 对应模板位于 `../en/init-ai-scaffold-templates/`。

---

## 模板索引

需要输出或写入完整模板内容时，使用以下文件作为唯一来源：

| 场景 | 模板文件 |
| ---- | -------- |
| 新项目信息收集表 | `../init-ai-scaffold-templates/project-info.single.md` |
| 新 Monorepo 信息收集表 | `../init-ai-scaffold-templates/project-info.monorepo.md` |
| 冲突检测提示 | `../init-ai-scaffold-templates/conflict-resolution.md` |
| `CLAUDE.md` / `AGENTS.md` / Copilot / Cursor 模板 | `../init-ai-scaffold-templates/config-files.md` |
| Claude Code Slash 命令模板 | `../init-ai-scaffold-templates/slash-commands.md` |
| 完成摘要模板 | `../init-ai-scaffold-templates/completion-summary.md` |

修改任一模板时，同时检查英文对应文件是否需要同步更新。

---

## 背景：核心概念说明

### 测试定位

- **学习型测试**：用于验证对第三方库/API 行为的理解，不进入 CI，可随时删除
- **生产型测试**：验证业务逻辑正确性，进入 CI，作为重构安全网长期维护

### 项目阶段体系（可选，主要适用于新项目）

| 阶段 | 名称 | 说明 |
| ---- | ---- | ---- |
| Phase -1 | AI 工程脚手架 | 运行本命令，建立规范体系 |
| Phase 0 | 基础搭建 | 项目骨架、CI/CD、基础依赖 |
| Phase 1+ | 功能开发 | 按特性分阶段迭代 |

存量项目可在信息收集表中选择跳过或自定义阶段描述。

### Monorepo 规范分层模型

Monorepo 项目使用两层规范体系：

| 层级 | 位置 | 内容 |
| ---- | ---- | ---- |
| 共享层 | `docs/conventions/` | 适用于所有包的通用规则（提交规范、跨包依赖约束等） |
| 包专属层 | `<包路径>/docs/conventions/` | 覆盖或补充共享层的包级规则（如前端组件规范、后端 API 设计规范） |

各包的 `CLAUDE.md` 利用 Claude Code 的原生递归加载机制叠加两层规范：在某个包目录下工作时，Claude Code 会自动读取该目录及所有父目录的 `CLAUDE.md`。冲突时包专属层优先。

---

## 步骤 0：判断项目类型

**第一步：判断新项目 vs 存量项目**（决定走 1A 还是 1B）

新项目须满足以下全部条件：

- 无 `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` 等依赖清单
- 无 `src/`、`app/`、`apps/`、`lib/` 等源码目录
- 无现有业务代码文件

不满足任一条件，即视为存量项目。

**第二步：判断单包 vs Monorepo**（在步骤 1A/1B 内决定使用哪个模板）

满足以下任一条件，视为 monorepo：

- 存在 `pnpm-workspace.yaml` / `turbo.json` / `nx.json` / `lerna.json`
- `package.json` 中含 `workspaces` 字段
- 存在 `apps/` 或 `packages/` 目录，且目录下包含独立的包（每个子目录有自己的 `package.json`）

---

## 步骤 1A：新项目 — 输出信息收集模板

根据步骤 0 第二步的判断，输出对应模板：

- 单包项目：`../init-ai-scaffold-templates/project-info.single.md`
- Monorepo 项目：`../init-ai-scaffold-templates/project-info.monorepo.md`

要求用户填写后直接粘贴回来，或提供文件路径。

收到用户填写的内容后，继续执行**步骤 2**。

---

## 步骤 1B：存量项目 — 索引项目并提取信息

### 1B-1. 冲突检测（优先执行）

在读取任何内容之前，先检查以下路径是否已存在：

**根目录层面**

```text
CLAUDE.md
AGENTS.md
.cursorrules
.github/copilot-instructions.md
docs/conventions/
docs/adr/
docs/features/
docs/refactors/
.claude/commands/
```

**Monorepo 包层面**（如已识别为 monorepo，逐包检查）

```text
<包路径>/CLAUDE.md
<包路径>/docs/conventions/
```

> `AGENTS.md`、`.cursorrules`、`.github/copilot-instructions.md` 为条件生成文件，仅在用户选择对应工具时生成。若用户最终未选择对应工具，这些路径的冲突可忽略。

若存在任何路径，使用 `../init-ai-scaffold-templates/conflict-resolution.md` 输出冲突清单并暂停，等待用户明确选择后再继续。

### 1B-2. 索引项目

**单包项目索引**

- 读取 `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` 等，识别框架、依赖、工具
- 列出顶层目录结构（深度 2-3 层）
- 检查 `README.md`、`CONTRIBUTING.md`、`.eslintrc`、`tsconfig.json` 等，提取已有约定
- 检查是否存在 `docs/adr/` 或类似目录，列出已有决策标题
- 检查 `.github/workflows/`、`Dockerfile` 等 CI/CD 配置
- 检查是否存在 commitlint / semantic-release 配置，识别现有提交规范

**Monorepo 追加索引**

- 识别 monorepo 工具和 workspace 配置
- 列出所有 apps / packages 及其路径
- 对每个包分别执行单包索引，归纳各包的技术栈差异
- 提取根目录共享配置（ESLint、TypeScript base config、turbo pipeline 等）
- 从各包 `package.json` 的 `dependencies` 中提取 workspace 引用，梳理跨包依赖关系

### 1B-3. 输出预填写的信息收集表

基于索引结果，选择对应格式（单包用单包模板，monorepo 用 monorepo 模板），预填写已知字段，并在表格顶部注明：

```markdown
<!-- 以下内容由项目索引自动生成，请确认后修改 -->
```

提示用户确认或修改；收到确认后继续执行**步骤 2**。

---

## 步骤 2：创建目录结构

根据用户提供的信息，创建以下目录（已存在则跳过）：

**所有项目（根目录）**

```text
docs/conventions/
docs/adr/
docs/features/
docs/refactors/
.claude/commands/
```

**仅当用户选择 GitHub Copilot 时**

```text
.github/
```

**Monorepo 追加（每个 app/package 一份）**

```text
<包路径>/docs/conventions/
```

---

## 步骤 3：生成配置文件

根据步骤 0 的判断结果（单包/Monorepo）和用户填写的 AI 工具选择，按以下规则生成，不保留未使用的分支：

**必须生成（所有项目）**

- `CLAUDE.md`（根目录；Monorepo 另需为每个包生成包级 `CLAUDE.md`）

**按 AI 工具选择条件生成**

| 配置文件 | 生成条件 |
| -------- | -------- |
| `AGENTS.md` | 用户选择了 Codex / ChatGPT |
| `.cursorrules` | 用户选择了 Cursor |
| `.github/copilot-instructions.md` | 用户选择了 GitHub Copilot |

配置文件模板统一见：`../init-ai-scaffold-templates/config-files.md`。

### 提交规范格式说明

统一使用 Conventional Commits 格式，新项目默认采用，存量项目以索引到的现有配置为准。

**单包：**

```text
type(scope): description

feat(auth): implement JWT refresh token
fix(ci): resolve pipeline timeout
chore(deps): upgrade drizzle to v0.30
```

**Monorepo：**

```text
type(pkg/scope): description

feat(web/auth): implement login page
feat(api/auth): add JWT refresh endpoint
fix(shared/ui): fix Button hover state
```

> 注意：scope 中含 `/` 时，若项目使用 commitlint，需在 `.commitlintrc` 中放开 scope 格式校验（`scope-case: [0]` 或自定义正则）。生成的 `docs/conventions/coding.md` 中会包含此提示。

---

## 步骤 4：生成规范文件

若某项信息不足，生成带 `[待补充]` 占位符的版本。

### 单包项目

在 `docs/conventions/` 下生成：

| 文件 | 内容要点 |
| ---- | -------- |
| `README.md` | 规范文件列表、更新流程、健康检查说明 |
| `architecture.md` | 技术栈表格、架构分层、禁止事项、引入新依赖的规则 |
| `coding.md` | TypeScript 规范、命名约定、注释规则、导出规则；Next.js 项目强制包含 Server Component / `use client` 边界；提交规范；禁止粘贴长篇代码示例 |
| `testing.md` | 学习型 vs 生产型测试定位、测什么/不测什么、工具版本、文件组织规则 |
| `directory.md` | 目录树（基于用户提供的结构）；复杂目录可追加新增文件决策树 |
| `ai-workflow.md` | 工具选择矩阵、规范冲突决策框架 |

`ai-workflow.md` 记录项目的 AI 工具选择策略和规范冲突决策框架，Claude Code 和 Codex 均可参考。

存量项目：若从 `CONTRIBUTING.md` 或 README 中提取到已有约定，优先整合进来并标注来源。若已有 commitlint 配置，将现有提交规范整合进 `coding.md`。

### Monorepo 项目

**根目录共享规范**（`docs/conventions/`）

| 文件 | 内容要点 |
| ---- | -------- |
| `README.md` | 规范分层说明（共享层 + 包专属层）、更新流程 |
| `architecture.md` | Monorepo 整体架构、包清单与职责、跨包依赖规则、禁止事项 |
| `coding.md` | 跨包通用编码规范、提交规范及 commitlint 配置说明；禁止粘贴长篇代码示例 |
| `testing.md` | 跨包通用测试规范 |
| `directory.md` | Monorepo 顶层目录树、包间目录约定 |
| `ai-workflow.md` | 工具选择矩阵、跨包开发场景说明、规范冲突决策框架 |

**包专属规范**（`<包路径>/docs/conventions/`）

按以下矩阵判断各包需要生成哪些文件，仅生成有实质差异的文件：

| 包类型 | architecture.md | coding.md | testing.md | directory.md |
| ------ | :-------------: | :-------: | :--------: | :----------: |
| 前端（React / Next.js 等） | 框架规则、组件规范 | 组件边界规则；Next.js Server Component / `use client` 边界 | 视差异 | 视差异 |
| 后端（REST / GraphQL 等） | API 设计规范、服务层结构 | 服务层规范 | 视差异 | 视差异 |
| 共享库 / UI 包 | 视差异 | 公共 API 设计、版本兼容规则 | 视差异 | 视差异 |

「视差异」：若包级规则与共享规范一致，则不创建该文件。

### 技术栈专项规范（按需）

生成位置规则：仅某个包使用的技术放对应包目录下；多个包均使用的放根目录共享规范下。

| 技术 | 文件名 | 内容要点 |
| ---- | ------ | -------- |
| GraphQL | `graphql.md` | 查询/变更/Fragment 规范、缓存标签 |
| REST API | `api-design.md` | 端点命名、错误格式、版本策略 |
| 数据库 | `database.md` | 迁移规范、命名约定、查询模式 |

---

## 步骤 5：生成 ADR 文件

### `docs/adr/README.md`（必须）

内容：

- 何时需要创建 ADR（判断标准：影响多个模块、难以逆转、涉及外部依赖选型）
- ADR 粒度说明：每个独立的技术选型或设计约束算一条
- Monorepo 说明：所有决策统一放根目录 `docs/adr/`，文件名以包名为前缀区分范围（如 `0002-web-use-nextjs-app-router.md`）；仅在团队明确要求时才建包级 ADR 目录
- 决策索引表（初始为空；Claude Code 可由 `/adr` 维护，Codex 按 `AGENTS.md` 的 ADR 工作流维护）
- ADR 文件模板

### 初始 ADR

为每个已确定的架构决策创建一个 ADR 文件：

```text
docs/adr/<四位编号>-<kebab-case-标题>.md
```

Monorepo 包级决策示例：`docs/adr/0002-web-use-nextjs-app-router.md`。

存量项目：若现有 `docs/adr/` 中已有文件，从最大编号续接，不覆盖已有文件。

---

## 步骤 6：生成 Claude Code slash 命令

Claude Code slash 命令模板统一见：`../init-ai-scaffold-templates/slash-commands.md`。

生成以下文件：

- `.claude/commands/check-conventions.md`
- `.claude/commands/update-convention.md`
- `.claude/commands/adr.md`

---

## 步骤 7：输出完成摘要

根据步骤 0 的判断结果，只输出匹配的「下一步」版本。

完成摘要模板见：`../init-ai-scaffold-templates/completion-summary.md`。

---

## 注意事项

- **规范类 Markdown 文件使用中文写作**；代码注释、提交记录、文件名等使用英文
- **生成模板时只输出匹配版本**：所有带分支的模板根据步骤 0 的判断结果（单包/Monorepo）和用户选择的 AI 工具生成对应版本，不保留未使用的分支
- **文件覆盖保护**：存量项目在步骤 1B-1 集中检测冲突并暂停；新项目在步骤 2 逐文件检查，已存在则默认跳过，等待用户确认
- 生成内容基于用户提供的信息（含收集表「其他架构信息」自由文本），不编造不确定的技术决策
- 若某规范文件因信息不足无法填写，生成带 `[待补充]` 占位符的版本
- ADR 粒度标准：每个独立的技术选型或设计约束算一条
- **Monorepo 包专属规范**：按步骤 4 的矩阵判断生成哪些文件，避免内容冗余
- 存量项目索引结果仅作为预填写参考，以用户最终确认的内容为准
