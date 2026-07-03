# setup

在当前项目中管理**本地(local)unit** 的安装(添加 / 更新 / 删除)。

**注意**:全局(global)unit(commit、confirm-intent、quick-ship、smart-review、staged-plan、walkthrough)不在这里管理——注册一次 `ai-skills register` 后,对本机所有项目自动可用;内容改了要手动重新执行 `ai-skills register`(无自动检测)。本 skill 只处理需要项目级安装的 local unit(含 rules 组件,或需要写 lefthook hook 的 script,或带 `hasCustom` 定制内容的 unit)。

## 命令

| 命令                         | 说明                                               |
| ---------------------------- | -------------------------------------------------- |
| `/setup list`                | 列出当前项目相关的 local unit 及安装状态           |
| `/setup init <units\|all>`   | 安装(已安装转 update;local-to-local 依赖自动安装） |
| `/setup remove <units\|all>` | 卸载                                               |
| `/setup update <units\|all>` | 更新（未安装则报错跳过）                           |
| `/setup refresh`             | 扫描状态 + 输出 TODO 清单 + 执行清理               |
| `/setup show <unit>`         | 展示 unit 详情与各组件状态                         |
| `/setup`                     | 输出本帮助后停止                                   |

---

## 步骤

### 0. 解析参数

读取 `$1` 作为子命令，`$2+` 作为 unit 名称列表（可为 `all`）。

无参数时输出上方命令表后停止。

### 1. 执行主命令

运行对应 installer 命令，直接使用其默认的人类可读输出（不加 `--json`）：

```
ai-skills <subcommand> [units...]
```

`list` 额外加 `--scope=local`，只看 local unit：

```
ai-skills list --scope=local
```

若命令失败（exit code 非 0）则输出错误后停止。

### 2. 展示结果

CLI 输出已经是可读文本，**直接转发给用户**，不做二次解析或重新排版。操作过程中不输出中间结果，操作完成后统一展示。

若用户对某个 unit 执行 `/setup show <unit>`，而该 unit 实际是全局 unit（CLI 输出的"范围"为"全局"），追加一句提示：改用 `ai-skills show <unit>` 在终端查看，本 skill 不负责全局 unit 的展示细节。

---

### 状态标签（来自 CLI 输出，原样展示）

| 标签       | 含义                                                    |
| ---------- | ------------------------------------------------------- |
| `已安装`   | 已安装，无需定制                                        |
| `已更新`   | 已更新，无需定制                                        |
| `[待定制]` | 已安装，含未填写的 AISK:CUSTOM 块（高亮显示）           |
| `自动依赖` | 因被其它 local unit 依赖而自动安装                      |
| `失败`     | 操作未成功，附带原因（如"unit 为全局 unit，无需 init"） |
