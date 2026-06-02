# AI 上下文

这是所有在此代码库中工作的 AI agent 的共享项目上下文。Claude Code 通过 `CLAUDE.md`（包含此文件的 `@AGENTS.md` 引用）读取本文件；Codex 直接读取此文件。

在重新生成或大幅更新 agent 入口文件时，请同步更新此文件以保持共享上下文的一致性。

## 项目目的

本代码库是一个本地 AI skill 库。它在一个代码库中维护可复用的 skill，并将其安装到各 agent 专属的全局位置。

同时支持 Claude Code 和 Codex。Skill 分别安装至 `~/.claude/commands/aisk/`（Claude Code）和 `~/.codex/skills/aisk-*/`（Codex）。多目标架构详见 `docs/codex-adapter/blueprint.md`。

## 常用命令

```bash
pnpm register                 # Install skills globally (Claude Code + Codex)
pnpm build                    # Sync skill-format.md and Claude rule files
pnpm create-skill -- <file>   # Promote a skill file to the repository
pnpm lint:check               # ESLint check without modifying files
pnpm lint:fix                 # ESLint fix for scripts, resources, and tests
pnpm typecheck                # TypeScript check
pnpm test                     # Run node:test test suite
pnpm verify                   # Run lint:check, typecheck, test, and build
pnpm format                   # Prettier format all supported files
```

单独运行某个测试文件：

```bash
node --import tsx --test --test-concurrency=1 --test-reporter=spec tests/<file>.test.ts
```

修改 skill 文件或脚本后，提交前请运行 `pnpm verify`。
无需手动维护 manifest —— 安装器会直接扫描 `skills/` 目录。

## 当前架构

```text
Local skill repository (this repo)
    -> pnpm register           Claude Code + Codex installation (scans skills/ directly)

~/.ai-skills/config.json       repository locator (shared by both agents)
~/.claude/commands/aisk/       Claude Code skill commands
~/.codex/skills/aisk-*/        Codex skill directories
```

`~/.ai-skills/config.json` 存储本代码库路径，由 `pnpm register` 写入。

Claude 斜杠命令（如 `/aisk/create-task`）不是 Codex 命令。Codex 通过自然语言匹配已安装 SKILL.md frontmatter 中的 `description` 字段来选择 skill。

Skill 默认同时支持 Claude Code 和 Codex 两个目标。在 frontmatter 中添加 `---\ntargets: [claude]\n---` 可将 skill 限制为仅 Claude Code。

## 关键文件

- `scripts/scan-skills.ts`：扫描 `skills/` 目录，从 SK-\*.md 的 frontmatter 和 H1 推断所有目标元数据。
- `skills/skill-format.md`：skill 源文件的规范格式（人工维护，由 `pnpm build` 同步至 Claude 规则文件）。
- `scripts/build.ts`：将 `skills/skill-format.md` 同步至 `.claude/rules/skill-rules.md`。同步内容为 `<!-- EXTRACT:skill-format:start -->` 与 `<!-- EXTRACT:skill-format:end -->` 标记之间的部分。编辑 `skills/skill-format.md` 后需运行 `pnpm build`。
- `scripts/setup.ts`：统一安装入口 —— 运行 Claude Code + Codex 安装（即 `pnpm register`）。
- `scripts/setup-claude.ts`：Claude 安装器 —— 扫描 skill 并安装至 `~/.claude/commands/aisk/`。
- `scripts/setup-codex.ts`：Codex 安装器 —— 扫描 skill 并安装至 `~/.codex/skills/aisk-*/`。
- `docs/codex-adapter/blueprint.md`：Claude + Codex 支持的方案规划与阶段门控。
- `tests/`：安装器和 skill 元数据的基线验证测试。

## Skill 目标控制

安装器从每个 `SK-*.md` 文件读取可选的 YAML frontmatter：

```yaml
---
targets: [claude]
---
```

无 frontmatter → 同时支持两个目标（claude + codex）。目前只有一个 skill 使用此配置：`set-claude-permission`。

Codex skill 元数据（name、description、shortDescription）由 `scripts/scan-skills.ts` 根据 skill 文件名和 H1 描述行自动推断。

## 无生成 Manifest 文件

不存在中间 JSON manifest 文件。`pnpm register` 在安装时直接扫描 `skills/` 目录以处理两个 agent 目标。`pnpm build` 命令仅同步 skill 格式文档，不生成安装 manifest。
