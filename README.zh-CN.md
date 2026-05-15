# AI Scaffold

AI Scaffold 是一个用于初始化 AI 工程体系规范的工具。

它适用于新项目，也适用于已有项目。你可以把它交给 Claude Code 等 AI 编码助手，让助手在目标项目中生成一套可持续使用的工程规范、AI 工作流约束和项目协作文档。

## 它会做什么

AI Scaffold 会根据项目情况生成项目级 AI 工程体系规范，大致包括：

- AI 编码助手入口规范，例如 `CLAUDE.md` 和 `AGENTS.md`
- 项目工程规范，例如架构、编码、测试、目录结构和 AI 工作流规范
- ADR 文档结构，用于记录重要技术决策
- feature / refactor 工作文档目录，方便 AI 按任务读取上下文
- Claude Code slash commands，例如规范检查、规范更新和 ADR 创建命令
- monorepo 项目的共享规范层和包级规范层

生成结果不是一次性的说明文档，而是给 AI 编码助手长期读取和执行的项目工程规则。

## 怎么用

以 Claude Code 为例：

1. 选择语言目录：
   - `en/`：生成英文规范
   - `zh-CN/`：生成简体中文规范
2. 将所选语言目录下的内容复制到 Claude Code 命令目录：

```bash
mkdir -p ~/.claude/commands
cp zh-CN/init-ai-scaffold.md ~/.claude/commands/
cp -R zh-CN/init-ai-scaffold-templates ~/.claude/
```

3. 进入你的项目目录并启动 Claude Code：

```bash
cd your-project
claude
```

4. 在 Claude Code 中运行：

```text
/init-ai-scaffold
```

命令会先判断当前项目是新项目还是已有项目，是单包项目还是 monorepo，然后再生成匹配的规范文件。

## 用完后有什么

运行完成后，你的项目中会出现一套 AI 可读取、可执行、可维护的工程体系文件。

常见输出包括：

- `CLAUDE.md`
- `AGENTS.md`
- `docs/conventions/`
- `docs/adr/`
- `docs/features/`
- `docs/refactors/`
- `.claude/commands/`

生成的 `.claude/commands/` 还会包含这些辅助命令：

- `/check-conventions`：根据项目规范审查最近改动或指定文件
- `/update-convention`：当实现与规范不一致时，引导更新项目约定
- `/adr`：创建新的架构决策记录，并更新 ADR 索引

这些 slash commands 是 Claude Code 专用的。Codex 不会读取 `.claude/commands/` 目录；Codex 主要读取 `AGENTS.md` 和 `docs/conventions/`。

在 Codex 中，可以用自然语言触发同类流程，例如：

- “根据 `AGENTS.md` 和 `docs/conventions/` 检查当前 diff。”
- “为这个架构决策创建 ADR。”
- “当前实现已经变化，请更新相关项目规范。”

之后你可以让 AI 编码助手基于这些规范继续开发功能、检查改动、补充 ADR，或在实现与规范冲突时更新项目约定。

对于已有项目，如果目标文件已经存在，初始化流程会先停下来处理冲突，避免直接覆盖已有内容。
