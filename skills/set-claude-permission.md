整理当前项目的 .claude/settings.local.json 权限配置。

$ARGUMENTS：Level 2 类别，空格分隔，可选值：`read` `write` `shell` `npm`
- 若 $ARGUMENTS 为空，完成 Level 1 后列出选项，提示用户选择后继续

执行流程：

**第一步 — 读取现状**
1. 确定项目根目录（当前目录或最近含 .claude/ 的祖先目录）
2. 读取 .claude/settings.local.json（若不存在则从空 `permissions.allow: []` 开始）
3. 若 $ARGUMENTS 包含 `npm` 或为空：读取项目根目录的 package.json scripts 字段

**第二步 — Level 1：安全基线（自动应用，无需确认）**
以下权限若尚未覆盖，直接添加：
```
Bash(pwd), Bash(date), Bash(which *)
Bash(git status), Bash(git log *), Bash(git diff *)
```

**第三步 — Level 2：标准权限**
若 $ARGUMENTS 为空，展示以下选项并等待用户选择：
```
read  — Read(<project_root>/**)         项目内读取（含 .env* 等敏感文件）
write — Write(<project_root>/**)        项目内写入/创建文件
shell — find/grep/cat/ls/wc            路径限定的只读 shell 工具
npm   — npm run / pnpm run             package.json 中的安全脚本
```

按 $ARGUMENTS 或用户所选类别逐项处理：

**`read`**
添加 `Read(<project_root>/**)` 并在第六步预览时标注：该规则覆盖 .env* 等敏感文件。

**`write`**
添加 `Write(<project_root>/**)`。

**`shell`**
添加以下路径限定命令（以实际 project_root 替换占位符）：
```
Bash(ls <project_root>/*), Bash(find <project_root> *)
Bash(grep * <project_root>/*), Bash(cat <project_root>/*)
Bash(wc <project_root>/*)
```
注：`grep` 格式为 `grep <pattern> <path>`，权限前缀需覆盖完整命令形式。

**`npm`**
安全名称集合：`lint` `build` `test` `typecheck` `type-check` `tsc` `format` `check` `validate`
- 匹配 scripts 中名称在安全集合内的条目，添加 `Bash(npm run <name>)`
- 若项目根目录存在 `pnpm-lock.yaml`，同时添加 `Bash(pnpm run <name>)`
- 列出每条匹配脚本的实际命令内容（如 `lint → eslint src/`）供第六步确认
- 不在安全集合内的脚本：跳过，在第六步汇总提示
- 注意：仅按名称匹配，不检查脚本内容；用户需自行确认 package.json 来源可信

**第四步 — 整理合并现有规则**
对 allow 列表中的现有条目进行分析：
- 识别功能重叠的条目（如多条 `Bash(git -C /path ...)` 可统一为 `Bash(git *)`）
- 若合并结果权限范围 ≤ 原条目总和 → 直接合并
- 若合并会扩大权限范围（新增原来未允许的子命令）→ **暂停**，展示：
  - 原条目列表
  - 建议的合并结果
  - 具体扩大的权限说明
  - 询问用户是否接受，等待确认后继续

**第五步 — 敏感路径检查**
扫描现有规则中是否包含敏感路径（`.env*`、`*.pem`、`*secret*`、`*credential*`、`*token*`、`*.key`）：
- 若有，逐条列出，询问用户是否保留，等待确认

**第六步 — 预览与确认**
用 diff 格式展示最终 permissions.allow 的完整变更（标注 `+新增` / `-删除` / `保留`），同时汇总：
- 本次匹配的 npm 安全脚本及其实际命令内容
- 被跳过的 package.json 脚本（不在安全集合内）
- 覆盖了敏感文件的规则（如 read 类别）

等待用户确认后进入第七步。

**第七步 — 写入**
用户确认后，写入 .claude/settings.local.json，保留文件中其他字段不变。
