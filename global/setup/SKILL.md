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

### 1. 前置静默 refresh

对 `list` / `add` / `remove` / `update` 命令，先执行静默 refresh（同步磁盘状态到 installed.json）：

```
node ~/.aisk/global/installer.js refresh --silent
```

若失败则输出错误并停止。

### 2. 执行主命令

运行对应 installer 命令，获取 JSON 输出：

```
node ~/.aisk/global/installer.js <subcommand> [units...]
```

若命令失败（exit code 非 0）则输出错误后停止。

### 3. 格式化并展示结果

将 JSON 格式化为可读报告。操作过程中不输出中间结果，操作完成后统一展示。

---

#### list 格式

分"已安装"/"未安装"两组展示（`units` 数组按 `installed` 分组）：

```
已安装：
  poc          — PoC unit                      [有待定制]
  smart-review — Smart review skill

未安装：
  poc-dep      — PoC dep unit
  quick-ship   — Quick ship skill
```

`hasTodo: true` 时在名称右侧标注 `[有待定制]`。

---

#### add / update 格式

按三类分组，组内按处理顺序列出，各组件逐行展示：

```
已添加：
  test-review-gate
    rule:   .claude/rules/aisk-trg/test-review-gate.md    [installed]
    script: .aisk/trg/scripts/check-test-review.js        [installed, hook: pre-commit]

已更新：
  poc
    rule: .claude/rules/aisk-poc/poc-rule.md              [done]
    rule: .claude/rules/aisk-poc/poc-rule-nextjs.md       [todo - 需要定制]  （可选）

失败：
  unknown-unit — unit 不在注册表中
```

`autoDep: true` 的 unit 在名称后标注 `（自动依赖）`。

---

#### remove 格式

```
已删除：
  another-unit
    rule:   .claude/rules/aisk-another/rule.md
    script: .aisk/another/scripts/hook.js

失败：
  missing-unit — unit 未安装
```

---

#### refresh 格式

```
refresh 完成。

待定制（需处理）：
  poc
    .claude/rules/aisk-poc/poc-rule-nextjs.md  [todo]
  test-review-gate
    .claude/rules/aisk-trg/test-review-gate.md  [todo]
```

`todo` 数组为空时输出：`所有定制项已完成。`

---

#### show 格式

```
poc — PoC unit covering all four component types
依赖：poc-dep

组件：
  skill:    poc              [installed]
  rule:     poc-rule         [done]
  rule:     poc-rule-nextjs  [todo - 需要定制]  （可选）
  script:   poc-hook         [installed, hook: pre-commit]
  resource: readme           [installed]
```

---

### 状态标签

| 标签                | 含义                                     |
| ------------------- | ---------------------------------------- |
| `installed`         | 已安装，无需定制                         |
| `todo - 需要定制`   | 已安装，含未填写的 AISF:CUSTOM 块        |
| `done`              | 已安装，定制已完成                       |
| `optional, skipped` | 可选组件，本次未安装（仅 update 时出现） |
