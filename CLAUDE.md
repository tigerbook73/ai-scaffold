# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
npm run register      # 新机器一次性初始化（写入 ~/.ai-skills/config.json，安装全局元命令）
npm run build         # 扫描 skills/ 重新生成 claude/setting.json
npm run sync          # 同步技能到当前目录（通常由 /aisk/sync 调用）
npm run sync -- --target <dir>   # 同步到指定目录
npm run sync -- --dry-run        # 预览变更，不实际写入
npm run create-skill -- <file>   # 将技能文件提升到全局仓库
npm run lint          # ESLint + TypeScript 检查（仅检查 scripts/）
```

**修改技能文件或脚本后**：运行 `npm run lint` 确认无报错，再 `git commit`。  
**新增或删除 `skills/` 中的文件后**：必须运行 `npm run build` 重新生成 `claude/setting.json`。

## 架构

三层结构，数据单向流动：

```
本地技能仓库（本仓库）
    ↓ npm run register（新机器，一次性）
~/.ai-skills/config.json      ← 记录本仓库路径
~/.claude/commands/aisk/      ← 全局元命令（sync.md、create-skill.md）
    ↓ /aisk/sync（在目标项目中执行）
{project}/.claude/commands/aisk/   ← 同步的技能命令
{project}/.ai-skills/              ← 同步的资源文件 + 运行时生成的上下文
```

## 关键文件

- **`claude/setting.json`**：同步配置，由 `npm run build` 自动生成，**不要手动编辑 dst 字段**；description 和 en 字段可手动修改，build 会保留。
- **`scripts/build.ts`**：扫描 `skills/`，按路径规则推断 dst：`*/resource/**` → `.ai-skills/{relPath}`，其余 → `.claude/commands/aisk/{name}.md`。
- **`scripts/sync.ts`**：读取 `setting.json`，将 `skills/{src}` 复制到 `{target}/{dst}`；首次同步（`.ai-skills/` 不存在）时提示加入 `.gitignore`。
- **`scripts/setup.ts`**：仅安装 `sync.md` 和 `create-skill.md` 两个元命令到全局，其他技能通过 sync 分发。

## 技能文件规范

- 放在 `skills/` 下，按分组建子目录（`arch/`、`task/` 等，根目录为 `meta` 类）
- 首行必须是 `# 标题`，build 脚本用它自动填充 description
- `README.md` 会被自动跳过，不参与同步
- 资源文件（供技能运行时读取，不作为命令）放在 `*/resource/` 子目录下

详细设计见 `docs/OVERVIEW.md`。
