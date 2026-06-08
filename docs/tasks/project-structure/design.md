# Design: skill-migration

## 总体策略

四步顺序执行，每步独立可验证：先迁移内容、再建规则、再清理、最后统一重命名。
重命名放最后，减少中间过程的路径变动对其他步骤的干扰。

---

## Step 1：迁移 skill 到 ai-unit 架构

**Step Type**: `final`

### 目标

将 `confirm-intent`、`quick-ship`、`smart-review` 三个 skill 改造为 ai-unit，加入 `ai-units/`（Step 4 前暂保持原目录名）。

### 各 unit 设计

三个 unit 均为纯 skill unit：`dependencies: []`，`components` 仅含 `skills`，无 rules / scripts / resources。

| unit                | skill 文件                 | skill name       |
| ------------------- | -------------------------- | ---------------- |
| `confirm-unit`      | `skills/confirm-intent.md` | `confirm-intent` |
| `quick-ship-unit`   | `skills/quick-ship.md`     | `quick-ship`     |
| `smart-review-unit` | `skills/smart-review.md`   | `smart-review`   |

skill 文件内容直接从 `skills/<dir>/SK-*.md` 复制，仅去掉 SK- 前缀（H1 标题已与文件名一致，`---` 分节符合 Structured 格式规范，无需调整）。

### 注册表更新

`pnpm buildx` 自动扫描 `ai-units/` 并重写 `units.json`，拓扑顺序为：
`[confirm-unit, poc-dep-unit, poc-unit, quick-ship-unit, smart-review-unit]`

### Verification

- `(auto)` `node --import tsx scripts/buildx.ts` — 解析所有 unit.json + 验证依赖 + 更新拓扑顺序，退出码 0
- `(auto)` `pnpm lint:check && pnpm typecheck && pnpm test` — 不引入新失败
- `(manual)` `pnpm pub` 后，在测试项目中通过 `aisk:setup` 安装，确认三个 skill 可调用

---

## Step 2：建立 gate 规则

**Step Type**: `final`

### 目标

在 `.claude/rules/ai-scaffold/` 下建立 `skill-gate.md`、`script-gate.md`、`rule-gate.md`，
迁移现有 `skill-rules.md` 和 `ts-script-commands.md` 内容后删除旧文件。

### 文件设计

- **路径 frontmatter**：各 gate 覆盖范围（`units/*/skills/*.md` 等）
- **内容来源**：`skill-gate` ← `skill-rules.md`；`script-gate` ← `ts-script-commands.md`；`rule-gate` 新建
- **sync 机制**：移除 `pnpm build` 中 `skill-rules.md` 的 EXTRACT 同步逻辑

### Verification

- `(manual)` 编辑 `units/poc-unit/skills/poc.md`，确认 skill-gate 规则生效

---

## Step 3：清理老架构产物

**Step Type**: `intermediate`

### 目标

删除老架构遗留文件和配置，为 Step 4 重命名清场。

### 清理范围

- `skills/` 目录（迁移完成后）
- `skill-format.md` 处理方式：TBD（并入 skill-gate 或保留为文档）
- 构建脚本中老架构残留逻辑：TBD（评估时补充）

### Verification

- `(auto)` `skills/` 目录不再存在（或为空）
- `(auto)` `pnpm verify` 通过

---

## Step 4：重命名约定统一

**Step Type**: `final`

### 目标

全局替换所有 `aisf` → `aisk` 命名，目录/脚本/路径一并更新。

### 影响范围

| 类别         | 变更                                   |
| ------------ | -------------------------------------- |
| 目录         | `ai-units/` → `units/`                 |
| 本地仓库路径 | `~/.aisf/` → `~/.aisk/`                |
| 边界符       | `AISF:CUSTOM` → `AISK:CUSTOM`          |
| 脚本命令     | `pub` → `register`，`buildx` → `build` |
| 代码内标识符 | `aisf*` 变量/函数/类名 → `aisk*`       |
| 安装路径前缀 | `aisf-` / `aisf:` → `aisk-` / `aisk:`  |

### 策略

- 优先处理目录重命名（影响所有引用路径）
- 再全局搜索替换字符串标识符
- 最后更新 package.json scripts 和文档

### Verification

- `(auto)` `grep -r "aisf" . --include="*.ts" --include="*.md" --include="*.json"` 无结果（排除 archive/）
- `(auto)` `pnpm register && pnpm clean` 正常工作
- `(manual)` 端到端：`pnpm register` → 测试项目 `aisk:setup` → 安装 unit → 验证可用

---

## Task Acceptance

- `(auto)` TBD
- `(manual)` TBD
