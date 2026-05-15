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
**CI/CD**：（如 GitHub Actions + Turborepo 远程缓存等；可留空）
**统一的工具**：（ESLint 配置、TypeScript 基础配置、测试框架等）

## AI 工具支持

**Claude Code**：必选，始终生成 `CLAUDE.md`（根目录及各包）和 Claude Code slash 命令。

以下工具按需选择，未选择的不生成对应配置文件：

- [ ] OpenAI Codex / ChatGPT → 生成 `AGENTS.md`
- [ ] Cursor IDE → 生成 `.cursorrules`
- [ ] GitHub Copilot → 生成 `.github/copilot-instructions.md`
- [ ] 其他：

## 已确定的架构决策

每条独立的技术选型或设计约束算一条 ADR：

1.
2.
3.

## 项目阶段体系

- [ ] 使用默认：Phase 0 基础搭建 -> Phase 1+ 功能开发
- [ ] 自定义阶段描述如下：
- [ ] 不使用阶段模型

自定义阶段描述（如选择自定义）：

## 其他架构信息 / 背景

（可自由填写或粘贴大段内容）
