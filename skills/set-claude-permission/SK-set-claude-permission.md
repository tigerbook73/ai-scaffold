---
targets: [claude]
---

# set-claude-permission

为当前项目整理 `.claude/settings.local.json` 的权限配置。

---

## 约束

- [写操作] 仅写入 `.claude/settings.local.json`；文件中的所有其他字段保持不变

## 输入

`$ARGUMENTS`：二级分类，空格分隔。有效值：`read` `write` `shell` `npm`

- 若 `$ARGUMENTS` 为空，先完成一级权限，然后列出选项，提示用户选择后再继续

## 步骤

### 第一步 — 读取当前状态

1. 确定项目根目录（当前目录或包含 `.claude/` 的最近祖先目录）
2. 读取 `.claude/settings.local.json`（若不存在，从空的 `permissions.allow: []` 开始）
3. 若 `$ARGUMENTS` 包含 `npm` 或为空：读取项目根目录 `package.json` 中的 `scripts` 字段

### 第二步 — 一级：安全基线（自动应用，无需确认）

若以下权限尚未覆盖，添加：

```
Bash(pwd), Bash(date), Bash(which *)
Bash(git status), Bash(git log *), Bash(git diff *)
```

### 第三步 — 二级：标准权限

若 `$ARGUMENTS` 为空，展示以下选项并等待用户选择：

```
read  — Read(<project_root>/**)         在项目内读取（含 .env* 等敏感文件）
write — Write(<project_root>/**)        在项目内写入/创建文件
shell — find/grep/cat/ls/wc            路径限制的只读 shell 工具
npm   — npm run / pnpm run             来自 package.json 的安全脚本
```

按 `$ARGUMENTS` 或用户选择逐项处理：

**`read`**
添加 `Read(<project_root>/**)` 并在第六步预览中注明：此规则覆盖 `.env*` 等敏感文件。

**`write`**
添加 `Write(<project_root>/**)`.

**`shell`**
添加以下路径限制命令（将占位符替换为实际的 `project_root`）：

```
Bash(ls <project_root>/*), Bash(find <project_root> *)
Bash(grep * <project_root>/*), Bash(cat <project_root>/*)
Bash(wc <project_root>/*)
```

注意：`grep` 格式为 `grep <pattern> <path>`；权限前缀必须覆盖完整命令形式。

**`npm`**
安全名称集合：`lint` `build` `test` `typecheck` `type-check` `tsc` `format` `check` `validate`

- 匹配名称在安全集合中的脚本；添加 `Bash(npm run <name>)`
- 若项目根目录存在 `pnpm-lock.yaml`，同时添加 `Bash(pnpm run <name>)`
- 列出每个匹配脚本的实际命令内容（如 `lint → eslint src/`），在第六步中供用户确认
- 不在安全集合中的脚本：跳过，在第六步中汇总
- 注意：仅按名称匹配，不按脚本内容；用户负责确认 `package.json` 来源可信

### 第四步 — 合并已有规则

分析 allow 列表中的已有条目：

- 识别功能上重叠的条目（如多个 `Bash(git -C /path ...)` 可合并为 `Bash(git *)`）
- 若合并结果的权限范围 ≤ 原条目合计 → 直接合并
- 若合并会扩大范围（授予之前未允许的子命令）→ **暂停**，展示：
  - 原条目列表
  - 建议的合并结果
  - 权限扩大的具体描述
  - 询问用户是否接受；等待确认后继续

### 第五步 — 敏感路径检查

扫描已有规则中的敏感路径（`.env*`、`*.pem`、`*secret*`、`*credential*`、`*token*`、`*.key`）：

- 若发现，逐一列出并询问用户是否保留；等待确认

### 第六步 — 预览并确认

以 diff 格式展示 `permissions.allow` 变更的完整对比（标注 `+added` / `-removed` / `kept`），并汇总：

- 已匹配的 npm 安全脚本及其实际命令内容
- 跳过的 `package.json` 脚本（不在安全集合中）
- 覆盖敏感文件的规则（如 `read` 分类）

等待用户确认后再执行第七步。

### 第七步 — 写入

用户确认后，写入 `.claude/settings.local.json`，文件中的所有其他字段保持不变。
