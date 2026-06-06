# setup

在目标项目中交互式安装 ai-unit（Phase 1：仅支持 add）。

---

**步骤**

## 1. 确认本地仓库存在

读取 `~/.aisf/config.json`（路径：`~` 展开为 `$HOME`）。  
若文件不存在，输出错误并停止：

```
错误：本地仓库未找到（~/.aisf/config.json 不存在）。
请在开发仓库运行 pnpm pub 后再试。
```

## 2. 读取已安装状态

读取当前目录下的 `.aisf/installed.json`。  
若不存在，视为空（无已安装 unit）。

## 3. 列出可用 unit

扫描 `~/.aisf/units/` 目录，对每个 unit 读取 `unit.json`，获取 `name` 和 `description`。

对比 `.aisf/installed.json`，为每个 unit 标注状态：

- **未安装** —— installed.json 中不存在
- **已安装（最新）** —— installed.json 中存在，且 `~/.aisf/units/{unit}` 内容与安装时一致
- **已安装（内容有变更）** —— installed.json 中存在，但内容已变更（默认选中更新）

> **内容对比方式**：对比已安装 skill/rule 文件内容与 `~/.aisf/units/` 中对应模板的差异；  
> rule 文件对比时忽略 `AISF:CUSTOM` 边界符内的区块（这是用户定制部分，属于预期差异）。

以清单形式展示，等待用户选择要安装的 unit（勾选）。

## 4. 依赖解析（自动）

调用：
```
node ~/.aisf/global/installer.js --check-deps --units {选中的 unit 名称，逗号分隔}
```

若输出中 `unmet` 非空，**自动将缺失依赖加入待安装列表**，不询问用户。  
重复本步骤直至无缺失依赖（支持多层依赖）。  
在步骤 8 的安装结果中说明哪些是自动补充的依赖。

## 5. 可选组件确认

对所有待安装 unit（含步骤 4 自动补充的依赖单元），逐个读取其 `unit.json` 中 `required: false` 的组件：

- 读取 `condition` 字段，结合当前项目的 `package.json` 和文件结构判断是否推荐
- 向用户展示判断结论和理由，格式：`{unit-name} / {component-name}（{component-type}）`  
  例：`poc-unit / poc-rule-nextjs（rule）—— 检测到 next 依赖，推荐安装`
- 由用户最终确认是否安装

## 6. 定制配置收集

对所有待安装 unit 中含 `AISF:CUSTOM` 边界符的组件（通常是 rule guard）：

1. 读取模板文件（来自 `~/.aisf/units/{unit}/{file}`）
2. 找到所有 `AISF:CUSTOM` 块（格式见下方说明）
3. 结合 `hint` 和项目文件结构，推断推荐值
4. 向用户展示推荐值，等待确认或修改

**AISF:CUSTOM 格式（YAML 文件）**：
```yaml
# AISF:CUSTOM name="paths" hint="..."
paths: ["**/*.poc-test.*"]
# AISF:CUSTOM:END
```

**AISF:CUSTOM 格式（Markdown 文件）**：
```markdown
<!-- AISF:CUSTOM name="content" hint="..." -->
默认内容
<!-- AISF:CUSTOM:END -->
```

用户确认后，将每个 AISF:CUSTOM 块的 `name` 和用户值收集为 `customValues` 对象，传给 installer。

## 7. 执行安装

**安装顺序**：依赖单元必须先于被依赖单元安装。按依赖拓扑序逐个调用 installer。

对每个待安装 unit，调用：

```
node ~/.aisf/global/installer.js --install --unit {unit-name} --components '{JSON}'
```

其中 `--components` 的 JSON 格式为 `ComponentSpec[]`：

```jsonc
[
  // skill 组件
  { "type": "skill", "name": "poc", "file": "skills/poc.md" },
  // rule 组件：customValues 为步骤 6 收集的用户确认值，installer 自行读取模板并应用
  { "type": "rule", "name": "poc-rule", "file": "rules/poc-rule.md", "customValues": { "paths": "[\"**/*.test.ts\"]" } },
  // script 组件
  { "type": "script", "name": "poc-hook", "file": "scripts/poc-hook.js", "hook": "pre-commit" },
  // resource 组件
  { "type": "resource", "name": "readme", "file": "resources/readme.md" }
]
```

## 8. 报告结果

汇总安装结果，列出每个 unit 及其组件的安装路径；自动补充的依赖单元标注 `（自动依赖）`：

```
已安装 poc-dep-unit（自动依赖）：
  skill: .claude/skills/aisf:poc-dep-unit:poc-dep/SKILL.md

已安装 poc-unit：
  skill:    .claude/skills/aisf:poc-unit:poc/SKILL.md
  rule:     .claude/rules/poc-unit/poc-rule.md
  script:   .aisf/poc-unit/scripts/poc-hook.js（已注册到 lefthook pre-commit）
  resource: .aisf/poc-unit/resources/readme.md
```
