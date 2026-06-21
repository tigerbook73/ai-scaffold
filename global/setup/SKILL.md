# setup

在目标项目中管理 ai-unit 安装（添加 / 更新 / 删除）。

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
node ~/.aisk/global/installer.cjs <subcommand> [units...]
```

若命令失败（exit code 非 0）则输出错误后停止。

### 2. 格式化并展示结果

将 JSON 格式化为可读报告。操作过程中不输出中间结果，操作完成后统一展示。

---

#### list 格式

分"已安装"/"未安装"两组展示（`units` 数组按 `installed` 分组）：

```
已安装：
  test-review-gate — Test review gate           [有待定制]
  smart-review     — Smart review skill

未安装：
  confirm-intent — Confirm intent before acting
  quick-ship     — Quick ship skill
```

`hasTodo: true` 时在名称右侧标注 `[有待定制]`。

---

#### add / update 格式

按三类（已添加 / 已更新 / 失败）分组展示。每个 unit 显示安装状态；仅当组件含未填写的 AISK:CUSTOM 块时，在 unit 名下列出对应路径：

```
已添加：
  confirm-intent              [installed]
  test-review-gate            [installed]
    rule: .claude/rules/aisk-test-review-gate/test-review-gate.md    [待定制]

已更新：
  smart-review                [updated]

失败：
  unknown-unit — unit 不在注册表中
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
  test-review-gate
    .claude/rules/aisk-trg/test-review-gate.md  [todo]
```

`todo` 数组为空时输出：`所有定制项已完成。`

---

#### show 格式

```
test-review-gate — Enforce human review markers on test files

组件：
  rule:   .claude/rules/aisk-trg/test-review-gate.md           [待定制]
  script: .aisk/trg/scripts/check-reviewed-by-commit-marker.js [installed, hook: pre-commit]
  script: .aisk/trg/scripts/check-test-cases-match-it.js       [installed]
```

---

### 状态标签

| 标签                | 含义                                          |
| ------------------- | --------------------------------------------- |
| `installed`         | 已安装，无需定制                              |
| `updated`           | 已更新，无需定制                              |
| `待定制`            | 已安装，含未填写的 AISK:CUSTOM 块（高亮显示） |
| `optional, skipped` | 可选组件，本次未安装（仅 update 时出现）      |
