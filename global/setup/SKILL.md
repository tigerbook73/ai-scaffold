# setup

在目标项目中管理 ai-unit 安装（添加 / 更新 / 删除）。

**注意**：默认安装模型是"全局可用，项目内仅保存本地定制/状态"。普通 skill/script/resource 由 `ai-skills sync-global` 以 symlink 形式装到 `~/.claude/skills`（对所有本机项目生效），本命令只处理声明了 `hasCustom` 或 `localCopy: true` 的组件，以及 hook 注册。声明了 `rules` 组件的 unit 暂时整体屏蔽（`list` 默认不展示；显式 `add` 报 disabled 错误；`add all` 静默跳过）。

## 命令

| 命令                         | 说明                                  |
| ---------------------------- | ------------------------------------- |
| `/setup list`                | 列出所有 unit 及安装状态              |
| `/setup add <units\|all>`    | 添加（已安装转 update；自动安装依赖） |
| `/setup remove <units\|all>` | 卸载                                  |
| `/setup update <units\|all>` | 更新（未安装则报错跳过）              |
| `/setup refresh`             | 扫描状态 + 输出 TODO 清单 + 执行清理  |
| `/setup show <unit>`         | 展示 unit 详情与各组件状态            |
| `/setup`                     | 输出本帮助后停止                      |

---

## 步骤

### 0. 解析参数

读取 `$1` 作为子命令，`$2+` 作为 unit 名称列表（可为 `all`）。

无参数时输出上方命令表后停止。

### 1. 执行主命令

运行对应 installer 命令，获取 JSON 输出：

```
ai-skills <subcommand> [units...]
```

若命令失败（exit code 非 0）则输出错误后停止。

### 2. 格式化并展示结果

将 JSON 格式化为可读报告。操作过程中不输出中间结果，操作完成后统一展示。

---

#### list 格式

分"已安装"/"未安装"两组展示（`units` 数组按 `installed` 分组）：

```
已安装：
  staged-plan  — Staged planning workflow        [有待定制]
  smart-review — Smart review skill

未安装：
  confirm-intent — Confirm intent before acting
  quick-ship     — Quick ship skill
```

`hasTodo: true` 时在名称右侧标注 `[有待定制]`。

声明了 `rules` 组件的 unit（暂时禁用）不出现在此列表中。

---

#### add / update 格式

按三类（已添加 / 已更新 / 失败）分组展示。每个 unit 显示安装状态；仅当组件含未填写的 AISK:CUSTOM 块时，在 unit 名下列出对应路径。普通（全局）组件不写入项目，不会出现在 `components` 里：

```
已添加：
  confirm-intent               [installed]
  staged-plan                  [installed]
    resource: .aisk/staged-plan/resources/assets/brief-template.md    [待定制]

已更新：
  smart-review                 [updated]

失败：
  unknown-unit — unit 不在注册表中
  test-review-gate — unit 包含 rules 组件，rules 暂不支持，已临时禁用
```

`autoDep: true` 的 unit 在名称后标注 `（自动依赖）`。

---

#### remove 格式

```
已删除：
  smart-review

失败：
  missing-unit — unit 未安装
```

---

#### refresh 格式

```
refresh 完成。

待定制（需处理）：
  staged-plan
    .aisk/staged-plan/resources/assets/brief-template.md  [todo]
```

`todo` 数组为空时输出：`所有定制项已完成。`

refresh 只扫描项目本地文件（hasCustom/localCopy 组件），不涉及 `~/.claude/skills` 下的全局 symlink。

---

#### show 格式

```
staged-plan — Staged planning workflow

组件：
  skill:    staged-plan                                              (global)
  resource: assets/brief-template                                    (global)  [待定制]
  script:   walkthrough-state                                        (global, hook: pre-commit)
```

`(global)` 标注的组件由 `ai-skills sync-global` 提供，不写入项目；仅当组件为 `local`（hasCustom/localCopy）且实际已复制到项目时才不带此标注。

disabled unit（含 rules 组件）展示为：

```
test-review-gate — 禁用: unit 包含 rules 组件，rules 暂不支持，已临时禁用
```

---

### 状态标签

| 标签                | 含义                                                       |
| ------------------- | ---------------------------------------------------------- |
| `installed`         | 已安装，无需定制                                           |
| `updated`           | 已更新，无需定制                                           |
| `待定制`            | 已安装，含未填写的 AISK:CUSTOM 块（高亮显示）              |
| `optional, skipped` | 可选组件，本次未安装（仅 update 时出现）                   |
| `(global)`          | 由 `ai-skills sync-global` 提供，不写入项目                |
| `禁用`              | unit 声明了 rules 组件，rules 暂不支持，本次操作不会安装它 |
