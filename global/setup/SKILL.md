# setup

在目标项目中交互式管理 ai-unit 安装（安装 / 更新 / 卸载）。

---

**核心模型：选中列表 = 期望状态**

已安装的 unit 默认预选中。用户调整后的最终选中列表即为操作完成后的期望状态：

- 从选中中**移除**已安装的 unit → 卸载
- **新增**未安装的 unit → 安装
- 保留已安装的 unit → 更新

---

## 步骤

### 1. 获取列表并收集期望状态

运行：

```
node ~/.aisf/global/installer.js list
```

若命令失败，输出 installer 的错误并停止。

将结果格式化为编号列表展示给用户，**已安装的 unit 默认预选中**：

```
可管理的 unit：
  1. poc-dep-unit  — PoC dep unit（未安装）
  2. poc-unit      — PoC unit（已安装）
  3. another-unit  — 另一个 unit（未安装）

提示用户输入（正数安装/更新，负数删除，all全部安装/更新，none全部卸载）：
```

**输入语法：**

| 示例            | 含义               |
| --------------- | ------------------ |
| `1 3` 或 `1, 3` | 将 1、3 号加入选中 |
| `-2`            | 将 2 号从选中移除  |
| `all`           | 选中全部           |
| `none`          | 清空所有选中       |
| `all -3`        | 全选后排除 3 号    |

解析规则：先处理 `all`/`none`（若存在），再按顺序处理各编号（正数加入、负数移除）。编号超范围时直接忽略。

### 2. 依赖解析与变更计算

**若选中列表为空**（用户全部删除），跳过 resolve 调用，直接以所有已安装的 unit 作为 `to_remove`，`to_install`、`to_update`、`auto`、`order` 均为空，进入步骤 3。

否则，将**完整的期望选中列表**传给 resolve，由 installer 负责计算 changeset 并解析依赖：

```
node ~/.aisf/global/installer.js resolve {所有选中的 unit 名称，空格分隔}
```

输出结构见 `~/.aisf/global/installer-types.ts` → `ResolveResult`。

**冲突检查**：若 `auto` 中的某 unit 出现在 `to_remove` 中，说明用户选择与依赖冲突，终止并提示：

```
错误：poc-unit 依赖 poc-dep-unit，但 poc-dep-unit 已从选中中移除。
请重新选择。
```

### 3. 计划确认

向用户展示完整变更计划，**等待明确确认后再执行**：

```
变更计划：
  卸载：another-unit
  安装：new-unit
  更新：poc-dep-unit（自动依赖）、poc-unit

确认执行？(yes/no)
```

标注规则：

- `auto` 中的 unit 标注 `（自动依赖）`
- 三类操作（卸载 / 安装 / 更新）分行展示，无对应操作时省略该行

用户回复 `no` 时终止，不执行任何操作。

### 4. 可选组件确认

对 `to_install ∪ to_update` 中的所有 unit，逐个直接读取 `~/.aisf/units/{unit}/unit.json`（结构见 `~/.aisf/global/installer-types.ts` → `UnitJson`），找出有 `condition` 字段的组件（即可选组件）：

- 根据 `condition` 字段描述，结合当前项目的 `package.json` 和文件结构判断是否推荐
- 向用户展示判断结论和理由，格式：`{unit-name} / {component-name}（{component-type}）`  
  例：`poc-unit / poc-rule-nextjs（rule）—— 检测到 next 依赖，推荐安装`
- 由用户最终确认是否安装

确认结束后，将本次所有已选可选组件记录为 `{type}:{name}` 格式列表（如 `["rule:poc-rule-nextjs", "resource:config"]`），供步骤 5、6 的 `--optional` 参数使用。

### 5. 定制内容生成（hasCustom 组件）

对 `to_install ∪ to_update` 中的每个 unit，逐一执行：

**5a. 查询定制组件：**

```
node ~/.aisf/global/installer.js prepare {unit-name} --optional '{选中的可选组件名 JSON 数组}'
```

`--optional` 与步骤 4 用户确认的结果一致，格式为 `["rule:poc-rule", "resource:config"]`；无可选项时可省略。

installer 从 `unit.json` 读取 `hasCustom: true` 的组件，仅返回本次将安装的组件（必装 + 已选可选项），输出 `PrepareItem[]`（字段定义见 `~/.aisf/global/installer-types.ts` → `PrepareItem`）。

列表为空则跳过，直接进入步骤 6。

**5b. 逐项生成定制内容：**

1. 读取 `templatePath`，找出所有 `AISF:CUSTOM` 块：
   - YAML 文件：`# AISF:CUSTOM name="..." hint="..."` … `# AISF:CUSTOM:END`
   - Markdown 文件：`<!-- AISF:CUSTOM name="..." hint="..." -->` … `<!-- AISF:CUSTOM:END -->`

2. 确定每个块的内容：
   - `exists: true`（更新）：从 `targetPath` 提取当前值，作为默认值展示，等待确认或修改；若 `currentPath` 存在且与 `targetPath` 不同，则从 `currentPath` 读取旧内容作为迁移参考
   - `exists: false`（首次）：结合 `hint` 和项目文件结构推断推荐值，展示后等待确认

3. 将所有 `AISF:CUSTOM` 块替换为用户确认的内容，将完整渲染结果写入 `tempPath`

> `tempPath` 与 `targetPath` 在同一目录下，目录已由 `prepare` 命令预先创建。

### 6. 执行并报告

**先卸载，再安装/更新。**

**卸载**（按 `to_remove` 列表，顺序不限）：

```
node ~/.aisf/global/installer.js uninstall {unit-name}
```

**安装/更新**（按步骤 2 输出的 `order` 顺序）：

```
node ~/.aisf/global/installer.js install {unit-name} --optional '{选中的可选组件名 JSON 数组}'
```

`--optional` 格式为 `["rule:poc-rule", "resource:config"]`，无可选项时可省略。

installer 自行从 `unit.json` 读取完整组件配置：

- 无 `condition` 的组件 → 必装
- 有 `condition` 的组件 → 仅在 `--optional` 列表中时安装，否则若已安装则删除
- 已安装组件中不再出现于 `unit.json` 的（版本升级移除的）→ 自动删除（孤立组件清理）
- 有 `hasCustom: true` 的组件 → installer 按命名约定（`.aisf-tmp-{unit}-{comp}`）读取步骤 5 写入的临时文件并拷贝；若临时文件不存在，installer 报错退出

执行完成后输出汇总报告：

```
已卸载：
  another-unit

已安装：
  new-unit：
    skill: .claude/skills/aisf-new-unit-foo/SKILL.md

已更新：
  poc-dep-unit（自动依赖）：
    skill: .claude/skills/aisf-poc-dep-unit-poc-dep/SKILL.md
  poc-unit：
    skill:    .claude/skills/aisf-poc-unit-poc/SKILL.md
    rule:     .claude/rules/aisf-poc-unit/poc-rule.md
    script:   .aisf/poc-unit/scripts/poc-hook.js（已注册到 lefthook pre-commit）
    resource: .aisf/poc-unit/resources/readme.md
```
