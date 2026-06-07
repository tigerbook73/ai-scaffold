# setup

在目标项目中交互式安装 ai-unit（Phase 1：仅支持 add）。

---

**步骤**

## 1. 获取可用 unit 列表

运行：
```
bun ~/.aisf/global/installer.ts --list
```

若命令失败（config.json 不存在），输出 installer 的错误并停止。

将输出的 units 列表以多选形式展示给用户：

- `installed: false`：选项描述显示 unit 的 description
- `installed: true`：选项描述末尾加注 `——已安装，勾选将更新`

在列表说明中注明：**若所选 unit 有依赖，依赖 unit 将自动安装，无需手动勾选。**

等待用户勾选。

## 2. 依赖解析（自动）

运行：
```
bun ~/.aisf/global/installer.ts --check-deps --units {选中的 unit 名称，逗号分隔}
```

输出 `order`（拓扑排序后的完整安装列表）和 `auto`（自动补充的依赖列表）。  
无需用户确认，直接采纳。

## 3. 可选组件确认

对所有待安装 unit（`order` 中的所有 unit），逐个读取其 `unit.json` 中 `required: false` 的组件：

- 读取 `condition` 字段，结合当前项目的 `package.json` 和文件结构判断是否推荐
- 向用户展示判断结论和理由，格式：`{unit-name} / {component-name}（{component-type}）`  
  例：`poc-unit / poc-rule-nextjs（rule）—— 检测到 next 依赖，推荐安装`
- 由用户最终确认是否安装

## 4. 定制配置收集

对所有待安装 unit 中含 `AISF:CUSTOM` 边界符的组件（通常是 rule guard）：

1. 读取模板文件（来自 `~/.aisf/units/{unit}/{file}`），找到所有 `AISF:CUSTOM` 块
2. 对每个块，按以下优先级确定初始值：
   - **更新**（unit 已在 installed.json 中）：读取已安装文件（`.claude/rules/{unit}/{rule}.md`），
     按 `name` 属性提取用户的当前值，作为默认值展示给用户确认
   - **新块**（新版本模板新增、旧文件中找不到对应 `name`）：退化为首次安装逻辑
   - **首次安装**：结合 `hint` 和项目文件结构推断推荐值
3. 向用户展示每个块的当前值/推荐值，等待确认或修改

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

## 5. 执行安装并报告

**安装顺序**：按步骤 2 输出的 `order` 列表逐个调用 installer。

对每个待安装 unit，调用：

```
bun ~/.aisf/global/installer.ts --install --unit {unit-name} --components '{JSON}'
```

其中 `--components` 的 JSON 格式为 `ComponentSpec[]`：

```jsonc
[
  // skill 组件
  { "type": "skill", "name": "poc", "file": "skills/poc.md" },
  // rule 组件：customValues 为步骤 4 收集的用户确认值，installer 自行读取模板并应用
  { "type": "rule", "name": "poc-rule", "file": "rules/poc-rule.md", "customValues": { "paths": "[\"**/*.test.ts\"]" } },
  // script 组件：params 来自 unit.json，对应 lefthook 模板变量（如 {staged_files}）
  { "type": "script", "name": "poc-hook", "file": "scripts/poc-hook.js", "hook": "pre-commit", "params": ["staged_files"] },
  // resource 组件
  { "type": "resource", "name": "readme", "file": "resources/readme.md" }
]
```

安装完成后汇总报告，列出每个 unit 及其组件的安装路径；`auto` 中的 unit 标注 `（自动依赖）`：

```
已安装 poc-dep-unit（自动依赖）：
  skill: .claude/skills/aisf:poc-dep-unit:poc-dep/SKILL.md

已安装 poc-unit：
  skill:    .claude/skills/aisf:poc-unit:poc/SKILL.md
  rule:     .claude/rules/poc-unit/poc-rule.md
  script:   .aisf/poc-unit/scripts/poc-hook.js（已注册到 lefthook pre-commit）
  resource: .aisf/poc-unit/resources/readme.md
```
