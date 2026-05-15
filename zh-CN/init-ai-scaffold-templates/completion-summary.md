# 完成摘要模板

根据项目类型只输出匹配的「下一步」版本。

```markdown
## AI 工程脚手架初始化完成

### 项目信息

- 类型：新项目 / 存量项目
- 结构：单包 / Monorepo（包列表：<包名列表>）
- 阶段模型：使用 Phase 体系 / 自定义 / 不使用

### 已创建的文件

**配置文件（<N> 个）**

- CLAUDE.md（根目录）
- <包路径>/CLAUDE.md（逐包列出，Monorepo）
- AGENTS.md（如适用：选择了 Codex / ChatGPT）
- .cursorrules（如适用：选择了 Cursor）
- .github/copilot-instructions.md（如适用：选择了 GitHub Copilot）

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

**Claude Code Slash 命令（3 个）**

- .claude/commands/check-conventions.md
- .claude/commands/update-convention.md
- .claude/commands/adr.md

### 跳过的文件（已存在，未覆盖）

<如有，列出文件名；无则省略此节>
```

## 新项目的下一步

```markdown
1. 检查 `docs/conventions/architecture.md` 的禁止事项是否完整
2. （Monorepo）检查各包的 `docs/conventions/` 是否准确反映包级技术栈
3. 如有额外的架构决策，在 Claude Code 中运行 `/adr`；在 Codex 中按 `AGENTS.md` 的 ADR 工作流创建记录
4. 开始开发（Phase 0 / 按自定义阶段描述）
```

## 存量项目的下一步

```markdown
1. 检查从现有代码提取的约定是否准确（重点看 architecture.md 和 directory.md）
2. （Monorepo）检查各包专属规范是否准确反映包级技术栈
3. 补充「其他架构信息」中提到但尚未体现在规范文件中的内容
4. 如有额外的架构决策，在 Claude Code 中运行 `/adr`；在 Codex 中按 `AGENTS.md` 的 ADR 工作流创建记录
```
