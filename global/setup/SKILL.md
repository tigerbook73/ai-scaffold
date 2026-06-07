# setup

在目标项目中交互式安装 ai-unit（Phase 1：仅支持 add）。

---

**步骤**

## 1. 获取可用 unit 列表

运行：
```
node ~/.aisf/global/installer.js list
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
node ~/.aisf/global/installer.js resolve {选中的 unit 名称，空格分隔}
```

输出 `order`（拓扑排序后的完整安装列表）和 `auto`（自动补充的依赖列表）。  
无需用户确认，直接采纳。

## 3. 可选组件确认

对所有待安装 unit（`order` 中的所有 unit），逐个读取其 `unit.json` 中 `required: false` 的组件：

- 读取 `condition` 字段，结合当前项目的 `package.json` 和文件结构判断是否推荐
- 向用户展示判断结论和理由，格式：`{unit-name} / {component-name}（{component-type}）`  
  例：`poc-unit / poc-rule-nextjs（rule）—— 检测到 next 依赖，推荐安装`
- 由用户最终确认是否安装

## 4. 定制内容生成（hasCustom 组件）

对所有待安装 unit，逐一执行以下流程：

### 4a. 查询需定制的组件

运行：
```
node ~/.aisf/global/installer.js prepare {unit-name}
```

输出 `PrepareItem[]`，每项包含：
- `componentType`：`"skill"` / `"rule"` / `"resource"`
- `templatePath`：模板文件路径（`~/.aisf/units/{unit}/{file}`）
- `targetPath`：最终安装路径
- `tempPath`：AI 应写入渲染结果的临时文件路径（`.aisf-tmp-{unit}-{comp}` 后缀）
- `exists`：目标文件是否已存在（用于判断是更新还是首次安装）

若列表为空，跳过此步骤直接进入步骤 5。

### 4b. 逐项生成定制内容

对每个 `PrepareItem`，执行：

1. 读取 `templatePath` 中的模板文件，找到所有 `AISF:CUSTOM` 块：
   - **YAML 文件**：`# AISF:CUSTOM name="..." hint="..."` … `# AISF:CUSTOM:END`
   - **Markdown/其他文件**：`<!-- AISF:CUSTOM name="..." hint="..." -->` … `<!-- AISF:CUSTOM:END -->`

2. 确定每个块的内容：
   - **更新**（`exists: true`）：读取 `targetPath` 中的已安装文件，按 `name` 提取用户当前值作为默认值展示，等待确认或修改
   - **新块**（更新场景下旧文件中找不到对应 `name`）：退化为首次安装逻辑
   - **首次安装**（`exists: false`）：结合 `hint` 和项目文件结构推断推荐值，展示后等待用户确认

3. 将模板文件中所有 `AISF:CUSTOM` 块替换为用户确认的内容，将完整渲染结果写入 `tempPath`

> **注意**：`tempPath` 与 `targetPath` 在同一目录下，目录已由 `prepare` 命令预先创建。

## 5. 执行安装并报告

**安装顺序**：按步骤 2 输出的 `order` 列表逐个调用 installer。

对每个待安装 unit，调用：

```
node ~/.aisf/global/installer.js install {unit-name} --components '{JSON}'
```

其中 `--components` 的 JSON 格式为 `ComponentSpec[]`：

```jsonc
[
  // skill 组件
  { "type": "skill", "name": "poc", "file": "skills/poc.md" },
  // skill 组件（含定制块）：hasCustom=true 时 installer 从 tempPath 拷贝，tempPath 在步骤 4 由 AI 写入
  { "type": "skill", "name": "poc-custom", "file": "skills/poc-custom.md", "hasCustom": true },
  // rule 组件
  { "type": "rule", "name": "poc-rule", "file": "rules/poc-rule.md" },
  // rule 组件（含定制块）
  { "type": "rule", "name": "poc-rule-guard", "file": "rules/poc-rule-guard.md", "hasCustom": true },
  // script 组件：params 来自 unit.json，对应 lefthook 模板变量（如 {staged_files}）
  { "type": "script", "name": "poc-hook", "file": "scripts/poc-hook.js", "hook": "pre-commit", "params": ["staged_files"] },
  // resource 组件
  { "type": "resource", "name": "readme", "file": "resources/readme.md" },
  // resource 组件（含定制块）
  { "type": "resource", "name": "config", "file": "resources/config.md", "hasCustom": true }
]
```

**hasCustom 行为**：installer 遇到 `hasCustom: true` 时，从 `tempPath`（步骤 4 写入）拷贝内容到最终路径，并删除临时文件。若 `tempPath` 不存在，installer 报错退出——需重新执行步骤 4。

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
