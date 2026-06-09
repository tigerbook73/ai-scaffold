# Requirements: skill-migration

## 目标

将现有 skill（`confirm-intent`、`quick-ship`、`smart-review`）迁移到 ai-unit 架构，
完成后清理老架构产物，并统一重命名约定使其与原先命名对齐。

---

## 背景

Phase 1（架构需求见 `requirements-arch.md`）已完成 ai-unit 架构的核心实现（PoC 验证通过）。
当前代码库中仍存在以老架构方式组织的 skill，需逐步迁移。

**待迁移 skill（`skills/` 目录下，非 `archive/`）：**

| skill          | 路径                                         |
| -------------- | -------------------------------------------- |
| confirm-intent | `skills/confirm-intent/SK-confirm-intent.md` |
| quick-ship     | `skills/quick-ship/SK-quick-ship.md`         |
| smart-review   | `skills/smart-review/SK-smart-review.md`     |

---

## 功能需求

### Step 1：迁移 skill 到 ai-unit 架构

将上述 3 个 skill 改造为符合 ai-unit 结构，移入 `units/`（重命名后的顶层目录，见 Step 3）：

- 为每个 skill 创建对应的 `unit.json`（参考 `poc-unit` 结构）
- 按 ai-unit 目录约定组织内容（`skills/`、`rules/`（如有）、`resources/`（如有））
- 将 skill 文件从 SK-\*.md 格式转换为 ai-unit 的 SKILL.md 格式（如需调整）
- 更新 `units.json` 注册表，将新 unit 加入拓扑顺序

### Step 2：建立项目内部 gate 规则

在 `.claude/rules/ai-scaffold/` 下建立三个 gate 规则文件，约束本项目 `units/` 目录下各类文件的命名和格式：

- `skill-gate.md`：约束 `units/*/skills/` 下的 skill 文件
- `script-gate.md`：��束 `units/*/scripts/` 下的 TypeScript 脚本
- `rule-gate.md`：约束 `units/*/rules/` 下的 rule guard 文件

这些规则仅作用于本项目开发，不随 unit 安装同步到目标项目。
现有 `.claude/rules/skill-rules.md` 和 `ts-script-commands.md` 的内容迁移至对应 gate 文件后删除。

### Step 3：清理老架构产物

迁移完成后，删除老架构遗留内容：

- 删除 `skills/` 顶层目录（迁移完成后仅剩 `skill-format.md` 等非 unit 文件，按实际情况处理）
- 评估并清理老架构相关脚本、配置（如旧版 `pnpm register` 逻辑残留等）

### Step 4：重命名约定统一

按以下映射执行全局重命名，使代码库与原先命名约定对齐：

| 当前名称                            | 目标名称                          | 范围                         |
| ----------------------------------- | --------------------------------- | ---------------------------- |
| `ai-units/` 目录                    | `units/`                          | 顶层目录                     |
| `aisf` 前缀                         | `aisk` 前缀                       | 所有脚本、命令、路径、变量名 |
| `~/.aisf/`                          | `~/.aisk/`                        | 本地仓库路径                 |
| `AISF:CUSTOM` 边界符                | `AISK:CUSTOM`                     | 模板文件及已安装文件         |
| `pnpm pub` 脚本                     | `pnpm register`                   | package.json scripts         |
| `scripts/buildx.ts` + `pnpm buildx` | `scripts/build.ts` + `pnpm build` | 脚本文件及 package.json      |

其他重命名视发现情况补充。

---

## 范围外

- `archive/skills/` 中旧 skill 的迁移评估（单独dev-task，低优先级）

---

## 约束

- 重命名需全局一致，不允许混用（如 `aisk` 和 `aisf` 同时存在）
- 迁移后的 skill 需通过 `pnpm register` 安装验证（端到端可用）

---

## 验收标准

1. `confirm-intent`、`quick-ship`、`smart-review` 均以 ai-unit 形式存在于 `units/` 下，可通过 `pnpm register` 安装
2. 安装后，3 个 skill 在目标项目中可正常调用
3. `.claude/rules/ai-scaffold/` 下存在 `skill-gate.md`、`script-gate.md`、`rule-gate.md`，旧规则文件已删除
4. `skills/` 顶层目录不再包含待安装的 skill（老架构产物已清理）
5. 代码库中不再出现 `aisf` 前缀或 `~/.aisf/` 路径
6. `pnpm register` 和 `pnpm build` 命令正常工作，`pub` 和 `buildx` 别名不再存在
7. `units/units.json` 注册表包含所有迁移后的 unit
