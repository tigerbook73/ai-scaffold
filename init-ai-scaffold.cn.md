# /init-ai-scaffold — 初始化 AI 工程脚手架

在项目中创建标准化的 AI 辅助开发规范体系，支持全新项目、存量项目、以及 monorepo。
包含：多工具配置文件、规范文档、ADR 体系、slash 命令。

**规范类 Markdown 文件使用中文写作；代码注释、提交记录、文件名等使用英文。**

---

## 背景：核心概念说明

### 测试定位

- **学习型测试**：用于验证对第三方库/API 行为的理解，不进入 CI，可随时删除
- **生产型测试**：验证业务逻辑正确性，进入 CI，作为重构安全网长期维护

### 项目阶段体系（可选，主要适用于新项目）

| 阶段     | 名称          | 说明                      |
| -------- | ------------- | ------------------------- |
| Phase -1 | AI 工程脚手架 | 运行本命令，建立规范体系  |
| Phase 0  | 基础搭建      | 项目骨架、CI/CD、基础依赖 |
| Phase 1+ | 功能开发      | 按特性分阶段迭代          |

存量项目可在信息收集表中选择跳过或自定义阶段描述。

### Monorepo 规范分层模型

Monorepo 项目使用两层规范体系：

| 层级     | 位置                         | 内容                                                                |
| -------- | ---------------------------- | ------------------------------------------------------------------- |
| 共享层   | `docs/conventions/`          | 适用于所有包的通用规则（提交规范、跨包依赖约束等）                  |
| 包专属层 | `<包路径>/docs/conventions/` | 覆盖或补充共享层的包级规则（如前端的组件规范、后端的 API 设计规范） |

各包的 `CLAUDE.md` 利用 Claude Code 的原生递归加载机制叠加两层规范：在某个包目录下工作时，Claude Code 会自动读取该目录及所有父目录的 `CLAUDE.md`，因此包级规范与根目录规范自动叠加，无需额外配置。冲突时包专属层优先。

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

根据步骤 0 第二步的判断，输出对应模板，要求用户填写后直接粘贴回来，或提供文件路径。

---

### 单包项目模板

```markdown
# 项目信息收集表

## 基本信息

**项目名称**：
**项目描述**：

## 技术栈

**前端框架**：（如 Next.js 15 App Router、React 19、Vue 3 等）
**UI 库**：（如 shadcn/ui、Tailwind CSS、MUI 等）
**后端 / API 层**：（如 tRPC、REST、GraphQL、Next.js Route Handlers 等）
**数据库**：（如 PostgreSQL + Drizzle、MongoDB + Mongoose 等）
**其他主要依赖**：

## 目录结构

请描述或粘贴期望的顶层目录结构（大致即可）：

（在此粘贴目录树，或用文字描述，例如：使用 src/ 目录，按功能模块分层）

## AI 工具支持

- [ ] Claude Code（主力，必选）
- [ ] OpenAI Codex / ChatGPT（特性开发）
- [ ] GitHub Copilot（仅 IDE 自动补全）
- [ ] 其他：

## 已确定的架构决策

每条独立的技术选型或设计约束算一条 ADR，请逐条列出：

1.
2.
3.

## 项目阶段体系

- [ ] 使用默认：Phase 0 基础搭建 → Phase 1+ 功能开发
- [ ] 自定义阶段描述如下：
- [ ] 不使用阶段模型

自定义阶段描述（如选择自定义）：

## 其他架构信息 / 背景

（可自由填写：团队约定、设计原则、需要特别注意的约束、参考文档链接等；
也可直接粘贴大段设计文档、ADR 草稿、团队 Wiki 片段）
```

---

### Monorepo 项目模板

```markdown
# 项目信息收集表（Monorepo）

## 基本信息

**项目名称**：
**项目描述**：
**Monorepo 工具**：（如 Turborepo、Nx、pnpm workspaces 等）

## 包列表

请逐包填写，每个 app 或 package 一节：

---

### 包：<包名>（如 web / api / admin）

**路径**：（如 apps/web）
**类型**：（前端 / 后端 / 共享库 / 工具包）
**前端框架**：
**UI 库**：
**后端 / API 层**：
**数据库**：
**其他主要依赖**：
**目录结构**：（粘贴目录树或文字描述）

---

### 包：<包名>

（重复上方结构）

---

## 共享配置

**共享代码位置**：（如 packages/shared、packages/ui）
**跨包依赖规则**：（如：api 不得引用 web，shared 不得引用 apps）
**统一的工具**：（ESLint 配置、TypeScript 基础配置、测试框架等）

## AI 工具支持

- [ ] Claude Code（主力，必选）
- [ ] OpenAI Codex / ChatGPT（特性开发）
- [ ] GitHub Copilot（仅 IDE 自动补全）
- [ ] 其他：

## 已确定的架构决策

每条独立的技术选型或设计约束算一条 ADR：

1.
2.
3.

## 项目阶段体系

- [ ] 使用默认：Phase 0 基础搭建 → Phase 1+ 功能开发
- [ ] 自定义阶段描述如下：
- [ ] 不使用阶段模型

自定义阶段描述（如选择自定义）：

## 其他架构信息 / 背景

（可自由填写或粘贴大段内容）
```

> 提示：「其他架构信息」一栏可以粘贴大量内容，如现有设计文档、ADR 草稿、团队 Wiki 片段等，这些内容将被用于生成更准确的规范文件。

收到用户填写的内容后，继续执行**步骤 2**。

---

## 步骤 1B：存量项目 — 索引项目并提取信息

### 1B-1. 冲突检测（优先执行）

在读取任何内容之前，先检查以下路径是否已存在：

**根目录层面**

```
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

```
<包路径>/CLAUDE.md
<包路径>/docs/conventions/
```

若存在任何路径，立即列出冲突清单并停止，格式如下：

```
## ⚠️ 检测到已存在的文件/目录，初始化已暂停

以下内容与脚手架目标路径冲突：

| 路径 | 类型 | 建议处理方式 |
|------|------|------------|
| CLAUDE.md | 文件 | 备份为 CLAUDE.md.bak 后覆盖 / 跳过 / 手动合并 |
| docs/conventions/ | 目录 | 检查内部文件后逐一决策 |
| apps/web/CLAUDE.md | 文件（包级） | 备份后覆盖 / 跳过 / 手动合并 |

请选择处理方式：
1. **逐一决策**（默认）：针对每个冲突文件单独确认
2. **全部备份并继续**：将所有冲突文件备份为 `.bak` 后自动覆盖，不再逐一询问
3. **全部跳过**：保留所有现有文件，仅生成不存在的文件

请告知选择（1 / 2 / 3），再继续初始化。
```

等待用户明确指示后再继续。

### 1B-2. 索引项目

冲突确认处理完毕后，对项目进行索引：

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

基于索引结果，选择对应格式（单包用单包模板，monorepo 用 monorepo 模板，格式同步骤 1A），预填写已知字段，在表格顶部注明：

```
<!-- 以下内容由项目索引自动生成，请确认后修改 -->
```

> 提示：请确认以上信息是否准确，可直接修改后粘贴回来。「其他架构信息」一栏欢迎补充大量内容。

收到用户确认或修改后的内容，继续执行**步骤 2**。

---

## 步骤 2：创建目录结构

根据用户提供的信息，创建以下目录（已存在则跳过）：

**所有项目（根目录）**

```
.github/
.cursorrules
docs/conventions/
docs/adr/
docs/features/
docs/refactors/
.claude/commands/
```

**Monorepo 追加（每个 app/package 一份）**

```
<包路径>/docs/conventions/
```

---

## 步骤 3：生成配置文件

根据步骤 0 的判断结果，每个配置文件只生成匹配的版本，不保留未使用的分支。

### 提交规范格式说明

统一使用 Conventional Commits 格式，新项目默认采用，存量项目以索引到的现有配置为准：

**单包：**

```
type(scope): description

feat(auth): implement JWT refresh token
fix(ci): resolve pipeline timeout
chore(deps): upgrade drizzle to v0.30
```

**Monorepo：**

```
type(pkg/scope): description

feat(web/auth): implement login page
feat(api/auth): add JWT refresh endpoint
fix(shared/ui): fix Button hover state
```

> 注意：scope 中含 `/` 时，若项目使用 commitlint，需在 `.commitlintrc` 中放开 scope 格式校验（`scope-case: [0]` 或自定义正则）。生成的 `docs/conventions/coding.md` 中会包含此提示。

---

### 3a. CLAUDE.md

#### 单包 CLAUDE.md

```markdown
# <项目名称> 项目规范（Claude Code）

> 本文件为项目级补充规则，与全局 ~/.claude/CLAUDE.md 叠加生效。

## 当前开发阶段

**Phase -1（AI 工程脚手架）已完成 → Phase 0（基础搭建）即将开始**

阶段体系：Phase -1 建立规范 → Phase 0 搭建骨架 → Phase 1+ 按特性迭代。

## 规范体系

所有规范的唯一权威来源：`docs/conventions/`

| 规范文件                           | 覆盖内容                                        |
| ---------------------------------- | ----------------------------------------------- |
| `docs/conventions/architecture.md` | 技术选型、架构分层、禁止事项                    |
| `docs/conventions/coding.md`       | TypeScript 规范、命名、注释、组件边界、提交规范 |
| `docs/conventions/testing.md`      | 测试范围、工具、文件位置                        |
| `docs/conventions/directory.md`    | 目录结构、文件命名规则                          |

[根据技术栈追加额外规范文件，如 graphql.md]

### 规范冲突处理规则

实现任何功能前，先检查 `docs/conventions/` 中的相关规范。若发现冲突，
必须先说明冲突点，等用户决定「调整实现」还是「更新规范」，不得擅自继续。

## 工作文档体系

`docs/features/` 和 `docs/refactors/` 用于为 AI 提供任务上下文，与 GitHub Issues /
Linear / Jira 等项目管理工具并行使用，不互相替代。

### 特性开发

进行中：`docs/features/<feature-id>/`
已完成：`docs/features/-<feature-id>/`（前加 `-`）

三件套：

- `REQUIREMENTS.md`：需求描述、验收标准、范围边界
- `DESIGN.md`：技术方案、关键决策、数据流
- `PROGRESS.md`：任务拆解、当前进度、阻塞项

### 重构工作

进行中：`docs/refactors/<refactor-id>/`
已完成：`docs/refactors/-<refactor-id>/`（前加 `-`）

三件套：

- `MOTIVATION.md`：重构动机、当前问题、成功标准、范围边界
- `DESIGN.md`：重构方案、迁移路径、风险评估、回滚策略
- `PROGRESS.md`：任务拆解、当前进度、阻塞项

## 可用 Slash 命令

| 命令                 | 用途                     |
| -------------------- | ------------------------ |
| `/check-conventions` | 审查近期改动是否符合规范 |
| `/update-convention` | 规范冲突时的引导更新流程 |
| `/adr`               | 创建新的架构决策记录     |

## 提交规范

格式：`type(scope): description`

示例：`feat(auth): implement JWT refresh token`
```

> 不使用 Phase 体系时，将「当前开发阶段」节替换为：
> `**当前阶段**：<根据实际情况填写，或删除本节>`

---

#### Monorepo 根目录 CLAUDE.md

```markdown
# <项目名称> 项目规范（Claude Code）— 根目录

> 本文件为 Monorepo 根目录规范，定义跨包的共享规则。
> Claude Code 会自动递归加载父目录的 CLAUDE.md，因此在各包目录下工作时，
> 根目录规范与包级规范自动叠加生效，无需手动引用。

## 当前开发阶段

**Phase -1（AI 工程脚手架）已完成 → Phase 0（基础搭建）即将开始**

阶段体系：Phase -1 建立规范 → Phase 0 搭建骨架 → Phase 1+ 按特性迭代。

## Monorepo 结构

| 包路径            | 类型   | 说明       |
| ----------------- | ------ | ---------- |
| `apps/web`        | 前端   | [简要说明] |
| `apps/api`        | 后端   | [简要说明] |
| `packages/shared` | 共享库 | [简要说明] |

[根据实际包列表填写]

## 规范分层

- **共享规范**（本文件适用）：`docs/conventions/`
- **包专属规范**（进入具体包时生效）：`<包路径>/docs/conventions/`
- 冲突时：包专属规范优先于共享规范

## 共享规范体系

| 规范文件                           | 覆盖内容                        |
| ---------------------------------- | ------------------------------- |
| `docs/conventions/architecture.md` | Monorepo 整体架构、包间依赖约束 |
| `docs/conventions/coding.md`       | 跨包通用编码规范、提交规范      |
| `docs/conventions/testing.md`      | 跨包通用测试规范                |
| `docs/conventions/directory.md`    | Monorepo 目录结构规则           |

## 跨包依赖规则

[根据用户提供的信息填写，例如：]

- `packages/shared` 不得依赖任何 `apps/*`
- `apps/web` 不得直接依赖 `apps/api`（通过 API 层通信）
- 新增跨包依赖前必须在 `docs/conventions/architecture.md` 中记录

## 工作文档体系

`docs/features/` 和 `docs/refactors/` 用于为 AI 提供任务上下文，与 GitHub Issues /
Linear / Jira 等项目管理工具并行使用，不互相替代。

特性开发：`docs/features/<feature-id>/`（三件套：REQUIREMENTS / DESIGN / PROGRESS）
重构工作：`docs/refactors/<refactor-id>/`（三件套：MOTIVATION / DESIGN / PROGRESS）
完成后在目录名前加 `-` 前缀。

## 可用 Slash 命令

| 命令                 | 用途                     |
| -------------------- | ------------------------ |
| `/check-conventions` | 审查近期改动是否符合规范 |
| `/update-convention` | 规范冲突时的引导更新流程 |
| `/adr`               | 创建新的架构决策记录     |

## 提交规范

格式：`type(pkg/scope): description`

示例：`feat(web/auth): implement login page`
```

> 不使用 Phase 体系时，将「当前开发阶段」节替换为：
> `**当前阶段**：<根据实际情况填写，或删除本节>`

---

#### Monorepo 包级 CLAUDE.md（每个 app/package 一份）

```markdown
# <包名> 规范（Claude Code）

> 本文件为 `<包路径>` 的包级规范，与根目录 CLAUDE.md 的共享规范自动叠加生效。
> Claude Code 在此目录下工作时，会递归读取父目录的 CLAUDE.md，无需手动引用。
> 本文件规则优先于共享规范；共享规范未覆盖的内容仍然适用。

## 包概述

**类型**：前端 / 后端 / 共享库
**主要职责**：[简要说明]
**技术栈**：[框架、UI 库、主要依赖]

## 包专属规范

实现功能前，先读根目录共享规范，再读以下包专属规范（后者优先）：

| 规范文件                                    | 覆盖内容           |
| ------------------------------------------- | ------------------ |
| `<包路径>/docs/conventions/architecture.md` | 包内架构、禁止事项 |
| `<包路径>/docs/conventions/coding.md`       | 包专属编码规范     |
| `<包路径>/docs/conventions/testing.md`      | 包专属测试规范     |
| `<包路径>/docs/conventions/directory.md`    | 包内目录结构       |

## 规范冲突处理规则

若发现实现方案与规范冲突，必须先说明冲突点，等用户决定「调整实现」还是
「更新规范」，不得擅自继续。
```

> 生成时根据实际创建的文件，删除表格中未生成的规范文件行。

---

### 3b. AGENTS.md（Codex / ChatGPT 专属）

AGENTS.md 是 OpenAI Codex CLI 的原生约定配置文件，作用与 CLAUDE.md 对应，但不支持递归加载，需显式列出所有必读文件。

根据步骤 0 的判断结果，只生成匹配的版本。

---

#### 单包项目版

```markdown
# <项目名称> 项目规范（Codex / ChatGPT）

## 开始前必读

实现任何功能前，按顺序读取以下规范文件：

1. `docs/conventions/architecture.md` — 技术选型与禁止事项
2. `docs/conventions/coding.md` — 编码规范与命名约定
3. `docs/conventions/directory.md` — 目录结构与文件位置
4. `docs/conventions/testing.md` — 测试范围与工具
5. `docs/conventions/ai-workflow.md` — AI 工具选择与规范冲突决策框架

[如有技术栈专项规范，如 graphql.md，也需读取]

## 规范冲突处理规则

若实现方案与规范文件存在冲突：

1. 明确描述冲突点（引用规范文件名和章节）
2. 提出两种方案：「调整实现以符合规范」或「更新规范以反映新决策」
3. 等待用户决定，不得擅自继续

## 工作文档体系

`docs/features/` 和 `docs/refactors/` 用于为 AI 提供任务上下文，与 GitHub Issues /
Linear / Jira 等项目管理工具并行使用，不互相替代。

### 特性开发

进行中：`docs/features/<feature-id>/`，完成后移至 `docs/features/-<feature-id>/`

**继续开发已有特性时的协议：**

1. 读取 `REQUIREMENTS.md` 和 `DESIGN.md`
2. 读取 `PROGRESS.md` 确认当前进度和阻塞项
3. 完成阶段性工作后，更新 `PROGRESS.md`

### 重构工作

进行中：`docs/refactors/<refactor-id>/`，完成后移至 `docs/refactors/-<refactor-id>/`

**继续已有重构时的协议：**

1. 读取 `MOTIVATION.md` 确认重构范围和成功标准
2. 读取 `DESIGN.md` 了解迁移路径和风险点
3. 读取 `PROGRESS.md` 确认当前进度和阻塞项
4. 完成阶段性工作后，更新 `PROGRESS.md`

## 文档一致性检查

每次提交前确认：

- [ ] 代码改动是否需要更新对应的规范文件？
- [ ] 新增依赖是否需要记录在 `architecture.md`？
- [ ] 是否产生了新的架构决策，需要创建 ADR？
- [ ] `PROGRESS.md` 是否反映最新进度？

## 提交规范

格式：`type(scope): description`

示例：`feat(auth): implement JWT refresh token`
```

---

#### Monorepo 版

```markdown
# <项目名称> 项目规范（Codex / ChatGPT）— Monorepo

## 开始前必读

实现任何功能前，先确认当前工作的包，然后按顺序读取：

1. 根目录共享规范 `docs/conventions/architecture.md` — 整体架构与包间约束
2. 根目录共享规范 `docs/conventions/coding.md` — 跨包通用编码规范
3. 根目录共享规范 `docs/conventions/testing.md` — 跨包通用测试规范
4. 根目录共享规范 `docs/conventions/directory.md` — Monorepo 目录约定
5. 包专属规范 `<包路径>/docs/conventions/`（该目录下所有文件，覆盖上方共享规范中的对应内容）
6. 根目录 `docs/conventions/ai-workflow.md` — AI 工具选择与规范冲突决策框架

[如有技术栈专项规范，如 graphql.md，也需读取]

## 规范冲突处理规则

若实现方案与规范文件存在冲突：

1. 明确描述冲突点（引用规范文件名和章节）
2. 提出两种方案：「调整实现以符合规范」或「更新规范以反映新决策」
3. 等待用户决定，不得擅自继续

## 工作文档体系

`docs/features/` 和 `docs/refactors/` 用于为 AI 提供任务上下文，与 GitHub Issues /
Linear / Jira 等项目管理工具并行使用，不互相替代。

### 特性开发

进行中：`docs/features/<feature-id>/`，完成后移至 `docs/features/-<feature-id>/`

**继续开发已有特性时的协议：**

1. 读取 `REQUIREMENTS.md` 和 `DESIGN.md`
2. 读取 `PROGRESS.md` 确认当前进度和阻塞项
3. 完成阶段性工作后，更新 `PROGRESS.md`

### 重构工作

进行中：`docs/refactors/<refactor-id>/`，完成后移至 `docs/refactors/-<refactor-id>/`

**继续已有重构时的协议：**

1. 读取 `MOTIVATION.md` 确认重构范围和成功标准
2. 读取 `DESIGN.md` 了解迁移路径和风险点
3. 读取 `PROGRESS.md` 确认当前进度和阻塞项
4. 完成阶段性工作后，更新 `PROGRESS.md`

## 文档一致性检查

每次提交前确认：

- [ ] 代码改动是否需要更新对应的规范文件？
- [ ] 新增依赖是否需要记录在 `architecture.md`？
- [ ] 是否产生了新的架构决策，需要创建 ADR？
- [ ] `PROGRESS.md` 是否反映最新进度？
- [ ] 是否违反了跨包依赖规则？

## 提交规范

格式：`type(pkg/scope): description`

示例：`feat(web/auth): implement login page` / `fix(api/auth): fix token refresh`
```

---

### 3c. .github/copilot-instructions.md（仅当用户选择支持 Copilot 时）

```markdown
# <项目名称> Copilot 补全规范

> 本文件仅用于 IDE 自动补全辅助，不作为完整开发规范使用。

## TypeScript

- 始终开启 strict 模式
- 禁止使用 `any`，用 `unknown` 替代
- 函数必须声明返回类型

## 命名约定

- React 组件：PascalCase
- 文件名：kebab-case
- 变量 / 函数：camelCase
- 常量：UPPER_SNAKE_CASE

## 注释规则

- 默认不写注释
- 只在需要解释「为什么」时写，不解释「是什么」
```

### 3d. .cursorrules

```
Please refer to CLAUDE.md and docs/conventions/ for all project rules and coding standards.
```

> 此文件确保规范在 Cursor IDE 环境下同样生效。内容保持单行，不展开具体规则（规则的唯一来源仍是 `CLAUDE.md` 和 `docs/conventions/`）。

---

若某项信息不足，生成带 `[待补充]` 占位符的版本。

### 单包项目

在 `docs/conventions/` 下生成：

| 文件              | 内容要点                                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`       | 规范文件列表、更新流程、健康检查说明                                                                                                                                                                                                                                                                                                                          |
| `architecture.md` | 技术栈表格、架构分层、禁止事项、引入新依赖的规则                                                                                                                                                                                                                                                                                                              |
| `coding.md`       | TypeScript 规范、命名约定、注释规则、导出规则；Next.js 项目强制包含：禁止在无 UI 交互需求的情况下添加 `use client`，Server Component 优先，`use client` 仅用于事件处理、浏览器 API、useState/useEffect；提交规范（Conventional Commits 格式及 commitlint 配置说明）；**禁止在此文件中粘贴长篇代码示例，规则用伪代码或模式说明表达，或指向项目内典型文件路径** |
| `testing.md`      | 学习型 vs 生产型测试定位、测什么/不测什么、工具版本、文件组织规则                                                                                                                                                                                                                                                                                             |
| `directory.md`    | 目录树（基于用户提供的结构）；若项目目录结构复杂，可选追加新增文件决策树                                                                                                                                                                                                                                                                                      |
| `ai-workflow.md`  | 工具选择矩阵（各 AI 工具适用场景）、规范冲突决策框架                                                                                                                                                                                                                                                                                                          |

> `ai-workflow.md` 主要供 Codex / ChatGPT 等工具参考；Claude Code 凭上下文自行判断工作流，无需依赖此文件。

> 存量项目：若从 `CONTRIBUTING.md` 或 README 中提取到已有约定，优先整合进来并标注来源。若已有 commitlint 配置，将现有提交规范整合进 `coding.md`；若 scope 含 `/`，注明需在 `.commitlintrc` 中放开 scope 格式校验。

### Monorepo 项目

**根目录共享规范**（`docs/conventions/`）

| 文件              | 内容要点                                                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`       | 规范分层说明（共享层 + 包专属层）、更新流程                                                                                                                            |
| `architecture.md` | Monorepo 整体架构、包清单与职责、跨包依赖规则、禁止事项                                                                                                                |
| `coding.md`       | 跨包通用编码规范（仅填写所有包均适用的内容）；提交规范及 commitlint 配置说明；**禁止在此文件中粘贴长篇代码示例，规则用伪代码或模式说明表达，或指向项目内典型文件路径** |
| `testing.md`      | 跨包通用测试规范                                                                                                                                                       |
| `directory.md`    | Monorepo 顶层目录树、包间目录约定                                                                                                                                      |
| `ai-workflow.md`  | 工具选择矩阵（各 AI 工具适用场景）、跨包开发场景说明、规范冲突决策框架                                                                                                 |

**包专属规范**（`<包路径>/docs/conventions/`）

按以下矩阵判断各包需要生成哪些文件，仅生成有实质差异的文件：

| 包类型                     |       architecture.md       |                                                                                coding.md                                                                                 | testing.md | directory.md |
| -------------------------- | :-------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :--------: | :----------: |
| 前端（React / Next.js 等） |    ✅ 框架规则、组件规范    | ✅ 组件边界规则；Next.js 项目强制包含：禁止在无 UI 交互需求的情况下添加 `use client`，Server Component 优先，`use client` 仅用于事件处理、浏览器 API、useState/useEffect |   视差异   |    视差异    |
| 后端（REST / GraphQL 等）  | ✅ API 设计规范、服务层结构 |                                                                              ✅ 服务层规范                                                                               |   视差异   |    视差异    |
| 共享库 / UI 包             |           视差异            |                                                                      ✅ 公共 API 设计、版本兼容规则                                                                      |   视差异   |    视差异    |

「视差异」：若包级规则与共享规范一致，则不创建该文件。

### 技术栈专项规范（按需）

生成位置规则：仅某个包使用的技术放对应包目录下；多个包均使用的放根目录共享规范下。

| 技术     | 文件名          | 内容要点                          |
| -------- | --------------- | --------------------------------- |
| GraphQL  | `graphql.md`    | 查询/变更/Fragment 规范、缓存标签 |
| REST API | `api-design.md` | 端点命名、错误格式、版本策略      |
| 数据库   | `database.md`   | 迁移规范、命名约定、查询模式      |

---

## 步骤 5：生成 ADR 文件

### docs/adr/README.md（必须）

内容：

- 何时需要创建 ADR（判断标准：影响多个模块、难以逆转、涉及外部依赖选型）
- ADR 粒度说明：每个独立的技术选型或设计约束算一条
- Monorepo 说明：所有决策统一放根目录 `docs/adr/`，文件名以包名为前缀区分范围（如 `0002-web-use-nextjs-app-router.md`）；仅在团队明确要求时才建包级 ADR 目录
- 决策索引表（初始为空，后续由 `/adr` 命令维护）
- ADR 文件模板

### 初始 ADR

为每个已确定的架构决策创建一个 ADR 文件：

`docs/adr/<四位编号>-<kebab-case-标题>.md`

Monorepo 包级决策示例：`docs/adr/0002-web-use-nextjs-app-router.md`

> 存量项目：若现有 `docs/adr/` 中已有文件，从最大编号续接，不覆盖已有文件。

---

## 步骤 6：生成 slash 命令

### .claude/commands/check-conventions.md

```markdown
# /check-conventions — 规范符合性审查

## 执行步骤

1. **确认审查范围**
   询问用户：审查最近的 git diff，还是指定文件/目录？
   Monorepo 项目：确认当前工作在哪个包？

2. **读取相关规范**
   - 单包：读取 `docs/conventions/` 中对应规范文件
   - Monorepo：读取根目录共享规范 + 当前包的专属规范，包专属规范优先

3. **逐项检查**
   - [ ] 命名约定（文件名、变量名、组件名）
   - [ ] TypeScript 规范（strict、禁 any、返回类型）
   - [ ] 目录结构（文件是否放在正确位置）
   - [ ] 测试覆盖（是否需要补充生产型测试）
   - [ ] 注释规则（只写"为什么"，不写"是什么"）
   - [ ] 架构约束（是否触碰禁止事项）
   - [ ] 新依赖（是否已在 architecture.md 中记录）
   - [ ] Monorepo 项目：是否违反了跨包依赖规则？

4. **输出报告**

   ## 规范审查报告

   审查范围：<文件/目录>
   适用规范：<规范文件列表>

   ### ✅ 符合规范
   - <具体说明>

   ### ⚠️ 需要关注
   - <问题描述> → 建议：<改进方式>

   ### ❌ 违反规范
   - <规范文件名 + 章节> — <具体违反点> → 必须修改：<修改方向>
```

---

### .claude/commands/update-convention.md

```markdown
# /update-convention — 规范冲突引导更新流程

## 执行步骤

1. **判断冲突类型**
   - 类型 A：实现方式与规范不符，应调整实现
   - 类型 B：规范已过时或不适用，应更新规范
   - 类型 C：真正的新场景，需要新增规范条目

   询问用户属于哪种类型。

2. **类型 A — 调整实现**
   指出不符合规范的具体位置，提供符合规范的改写方案。

3. **类型 B / C — 更新规范**
   a. 起草规范变更内容，展示给用户确认
   b. 判断影响范围（Monorepo 项目）：
   - 仅影响单个包 → 更新该包的专属规范
   - 影响多个包 → 更新根目录共享规范，并检查各包专属规范是否需要同步
     c. 若变更影响重大（涉及多个模块或难以逆转），询问是否需要创建 ADR
     d. 用户确认后，更新对应的规范文件

4. **同步检查**
   更新完成后，运行一次 `/check-conventions` 确认改动后无新冲突。
```

---

### .claude/commands/adr.md

```markdown
# /adr — 创建架构决策记录

## 执行步骤

1. **收集信息**
   询问用户：
   - 这个决策是什么？（一句话描述）
   - Monorepo 项目：影响范围是全局还是特定包（用于生成文件名前缀）？
   - 为什么需要做这个决策？（背景和问题）
   - 有哪些备选方案？
   - 最终选择什么，理由是什么？
   - 这个决策有哪些已知的后果或权衡？

2. **确定文件名和编号**
   读取 `docs/adr/` 目录，找到当前最大编号，加一作为新编号。
   - 全局决策：`docs/adr/<四位编号>-<kebab-case-标题>.md`
   - 包级决策：`docs/adr/<四位编号>-<包名>-<kebab-case-标题>.md`

3. **生成文件**

   # <编号>. <标题>

   **状态**：已接受
   **日期**：<YYYY-MM-DD>
   **影响范围**：全局 / <包名>

   ## 背景

   <为什么需要做这个决策>

   ## 决策

   <最终选择及理由>

   ## 备选方案
   - **<方案 A>**：<简要说明及未选择的原因>
   - **<方案 B>**：<简要说明及未选择的原因>

   ## 后果

   <这个决策带来的影响、权衡、已知限制>

4. **更新索引**
   在 `docs/adr/README.md` 的决策索引表中追加新条目。
```

---

## 步骤 7：输出完成摘要

根据步骤 0 的判断结果，只输出对应的「下一步」版本。

```
## AI 工程脚手架初始化完成

### 项目信息
- 类型：新项目 / 存量项目
- 结构：单包 / Monorepo（包列表：<包名列表>）
- 阶段模型：使用 Phase 体系 / 自定义 / 不使用

### 已创建的文件

**配置文件（<N> 个）**
- CLAUDE.md（根目录）
- <包路径>/CLAUDE.md（逐包列出，Monorepo）
- AGENTS.md
- .cursorrules
- .github/copilot-instructions.md（如适用）

**规范文件（<N> 个）**
- docs/conventions/README.md
- docs/conventions/architecture.md
- docs/conventions/coding.md
- docs/conventions/testing.md
- docs/conventions/directory.md
- docs/conventions/ai-workflow.md
- <包路径>/docs/conventions/...（逐文件列出，Monorepo）
- docs/conventions/graphql.md（如适用）

**ADR 文件（<N> 个）**
- docs/adr/README.md
- docs/adr/0001-xxx.md（如有初始决策，按实际列出）

**Slash 命令（3 个）**
- .claude/commands/check-conventions.md
- .claude/commands/update-convention.md
- .claude/commands/adr.md

### 跳过的文件（已存在，未覆盖）
<如有，列出文件名；无则省略此节>
```

**新项目的下一步：**

```
1. 检查 `docs/conventions/architecture.md` 的禁止事项是否完整
2. （Monorepo）检查各包的 `docs/conventions/` 是否准确反映包级技术栈
3. 如有额外的架构决策，运行 `/adr` 创建记录
4. 开始开发（Phase 0 / 按自定义阶段描述）
```

**存量项目的下一步：**

```
1. 检查从现有代码提取的约定是否准确（重点看 architecture.md 和 directory.md）
2. （Monorepo）检查各包专属规范是否准确反映包级技术栈
3. 补充「其他架构信息」中提到但尚未体现在规范文件中的内容
4. 如有额外的架构决策，运行 `/adr` 创建记录
```

---

## 注意事项

- **规范类 Markdown 文件使用中文写作**；代码注释、提交记录、文件名等使用英文
- **生成模板时只输出匹配版本**：所有带分支的模板根据步骤 0 的判断结果选择对应版本生成，不保留未使用的分支
- **文件覆盖保护**：存量项目在步骤 1B-1 集中检测冲突并暂停；新项目在步骤 2 逐文件检查，已存在则默认跳过，等待用户确认
- 生成内容基于用户提供的信息（含收集表「其他架构信息」自由文本），不编造不确定的技术决策
- 若某规范文件因信息不足无法填写，生成带 `[待补充]` 占位符的版本
- ADR 粒度标准：每个独立的技术选型或设计约束算一条
- **Monorepo 包专属规范**：按步骤 4 的矩阵判断生成哪些文件，避免内容冗余
- 存量项目索引结果仅作为预填写参考，以用户最终确认的内容为准
