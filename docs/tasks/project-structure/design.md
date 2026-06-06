# Design: project-structure（Phase 1 PoC）

本设计覆盖 Phase 1 目标：在现有目录之外建立新目录结构，用专用 PoC 单元跑通
publish → local store → setup add 完整链路，验证定制化和幂等两个核心技术风险。

---

## Step 1：目录结构 + PoC 单元定义

**Step Type**：`intermediate`

### 目标

在仓库根目录创建新的顶层结构，不触碰现有 `skills/`。定义两个专用 PoC 单元，覆盖所有组件类型和复杂场景。后续步骤的 publish / setup 基于此结构实现。

### 顶层目录结构

```
ai-scaffold/
  ai-units/                    # 新增：所有可安装的 ai-unit
    poc-dep-unit/              # 简单依赖单元（仅含 skill + resource）
    poc-unit/                  # 完整覆盖单元（含全部组件类型）
  global/                      # 新增：全局管理命令
    setup/
      SKILL.md
    scripts/                   # setup 命令调用的工具脚本
  utils/                       # 新增：可复用工具模块
  skills/                      # 保持不变（现有内容）
  scripts/                     # 保持不变，后续新增 publish.ts / clean.ts
```

### ai-unit 内部结构

```
ai-units/{unit-name}/
  unit.json           # 元数据与组件声明
  skills/
    {skill-name}.md   # skill 内容
  rules/
    {rule-name}.md    # rule guard 模板（不含用户 config）
  scripts/
    {script-name}.ts  # 原始 TS 脚本
  resources/
    {file}.md         # 静态资源（模板等）
```

### unit.json 结构

组件分两类：
- `required: true`（默认）：始终安装
- `required: false`：可选组件，带 `condition` 描述；setup 时 AI 读取 condition，结合项目特征决定是否安装

`config` 字段中的 `hint` 是给 AI 的自然语言提示，用于在 setup 时推断参数推荐值。

```jsonc
{
  "name": "poc-unit",
  "description": "...",
  "provides": ["..."],
  "scope": "validation",
  "dependencies": ["poc-dep-unit"],
  "components": {
    "skills": [
      { "name": "poc", "file": "skills/poc.md" }
    ],
    "rules": [
      {
        "name": "poc-rule",
        "file": "rules/poc-rule.md",
        "required": true,
        "hint": "扫描项目中的测试文件找出实际使用的文件后缀和目录结构，推荐合适的 glob patterns"
      },
      {
        "name": "poc-rule-nextjs",
        "file": "rules/poc-rule-nextjs.md",
        "required": false,
        "condition": "仅当项目使用 Next.js（package.json dependencies 中含 next）时安装"
      }
    ],
    "scripts": [
      {
        "name": "poc-hook",
        "file": "scripts/poc-hook.ts",
        "hook": "pre-commit"
      }
    ],
    "resources": [
      { "name": "readme", "file": "resources/readme.md" }
    ]
  }
}
```

### AISF:CUSTOM 边界符格式

定制化参数通过在模板文件中嵌入边界符标记，使 AI 能够准确识别定制区块并在安装/更新时可靠地提取和注入用户值。边界符在源模板和已安装文件中**均保留**，保证 update 时无需额外存储。

YAML 文件（如 rule guard frontmatter）使用 `#` 注释：

```yaml
---
# AISF:CUSTOM name="globs" hint="指定规则适用的文件范围，如 **/*.test.ts"
globs: ["**/*.poc-test.*"]
# AISF:CUSTOM:END
description: poc 规则
---
```

Markdown 文件使用 HTML 注释：

```markdown
<!-- AISF:CUSTOM name="content" hint="..." -->
默认内容
<!-- AISF:CUSTOM:END -->
```

- `name`：跨版本匹配键，不依赖行号或内容相似度
- `hint`：AI 首次安装时的推断提示（unit.json 中的 `hint` 字段提供同等信息，两者互为补充）
- 边界符内的内容：源模板中为默认/示例值；已安装文件中为用户实际值

**更新流程**：AI 读取新模板 + 已安装文件（均含边界符）→ 按 `name` 配对 → 将用户值注入新模板对应块 → 人工确认 → 写入。若新版本新增了 `name` 在旧文件中不存在的块，退化为首次安装逻辑（AI 推断 + 用户确认）。

### 路径约定（发布后）

**本地仓库（`~/.aisf/`）：**

```
~/.aisf/
  units/{unit-name}/
    unit.json
    skills/{skill-name}.md
    rules/{rule-name}.md        # 原始模板（含 AISF:CUSTOM 边界符）
    scripts/{script-name}.js    # 编译后的 JS
    resources/{file}.md
  global/{command-name}/
    SKILL.md                    # 全局管理命令
```

**目标项目（安装后）：**

```
{project}/
  .claude/
    skills/
      aisf:{unit-name}:{skill-name}/
        SKILL.md
    rules/
      {unit-name}/
        {rule-name}.md          # 含 AISF:CUSTOM 边界符 + 用户实际值
  .aisf/
    installed.json
    {unit-name}/
      resources/
        {file}.md               # 拷贝的资源文件
```

**全局 AI 配置：**

```
~/.claude/
  skills/
    aisf:{command-name}/
      SKILL.md                  # 全局管理命令（由 publish 安装）
```

### PoC 单元设计

#### poc-dep-unit（依赖目标单元）

最小化设计，作为 poc-unit 的依赖项：

- **skill** `poc-dep.md`：调用时输出确认信息 + 读取并展示 resource 内容（验证 resource 路径）
- **resource** `info.md`：包含单元说明文本

#### poc-unit（完整覆盖单元）

覆盖所有组件类型，每类组件都设计为可直接观察：

- **skill** `poc.md`：调用时输出安装信息，并读取 `resources/readme.md` 内容展示（验证 resource 路径正确）
- **rule** `poc-rule.md`（required）：对匹配 `paths` 的文件生效，规则内容为"在每次回复中包含特殊标记 `[POC_RULE_ACTIVE]`"，用户在目标项目打开匹配文件问任意问题即可验证
- **rule** `poc-rule-nextjs.md`（optional，condition：项目含 next 依赖）：生效后在回复中包含 `[POC_NEXTJS_RULE_ACTIVE]`，用于验证条件组件安装逻辑
- **script** `poc-hook.ts`：pre-commit hook，每次运行向 `.aisf/poc-unit/hook-log.txt` 追加时间戳一行（验证 hook 已注册且每次 commit 都执行）
- **resource** `readme.md`：内容为纯文本说明，由 skill 读取输出
- **依赖**：poc-dep-unit

### Auto Verification

（此步骤为 intermediate，仅验证文件结构正确性）

- `(auto)` `test -f ai-units/poc-unit/unit.json && test -f ai-units/poc-dep-unit/unit.json`
- `(auto)` `node -e "JSON.parse(require('fs').readFileSync('ai-units/poc-unit/unit.json','utf8'))"`
- `(auto)` `node -e "JSON.parse(require('fs').readFileSync('ai-units/poc-dep-unit/unit.json','utf8'))"`

### Manual Verification

- `(manual)` 检查 `ai-units/poc-unit/` 目录结构包含 skills/、rules/、scripts/、resources/ 四个子目录
- `(manual)` 检查 `poc-unit/unit.json` 的 dependencies 包含 `poc-dep-unit`

---

## Step 2：publish 命令

**Step Type**：`final`

### 目标

实现 `scripts/publish.ts`（通过 `pnpm pub` 调用），将 ai-units/ 和 global/ 中的内容
发布到本地仓库（`~/.aisf/`）和全局 AI 配置（`~/.claude/skills/`）。

### 职责

1. 扫描 `ai-units/` 下所有 `unit.json`，逐个处理
2. 对每个 unit：
   - 复制 `skills/`、`rules/`、`resources/` 到 `~/.aisf/units/{name}/`
   - 编译 `scripts/*.ts` → `*.js`，输出到 `~/.aisf/units/{name}/scripts/`
   - 复制 `unit.json`
3. 扫描 `global/` 下所有 `SKILL.md`，复制到 `~/.claude/skills/aisf:{name}/SKILL.md`
4. 写入 `~/.aisf/config.json`（包含 dev repo 路径、publish 时间戳）
5. 全程幂等：目标目录先清空再写入（unit 级别的清空，不影响用户 config）

### TS 编译方案

优先限制 scripts 只使用 Node.js 内置模块（`fs`、`path`、`child_process` 等），
用 `tsc` 或 `tsx` 直接编译为 JS，无需打包，`node script.js` 即可运行。
若某个 script 确实需要第三方依赖，再引入 `esbuild` bundle 单文件（`--bundle --platform=node --format=cjs`）。

### Auto Verification

- `(auto)` `pnpm pub && test -f ~/.aisf/units/poc-unit/unit.json`
- `(auto)` `test -f ~/.aisf/units/poc-unit/skills/poc.md`
- `(auto)` `test -f ~/.aisf/units/poc-unit/scripts/poc-hook.js`
- `(auto)` `test -f ~/.aisf/units/poc-dep-unit/unit.json`
- `(auto)` `test -f ~/.claude/skills/aisf:setup/SKILL.md`
- `(auto)` `node ~/.aisf/units/poc-unit/scripts/poc-hook.js --dry-run 2>&1 | grep -q "poc-hook"`

### Manual Verification

- `(manual)` 检查 `~/.aisf/config.json` 包含正确的 repo 路径和时间戳
- `(manual)` 检查 `~/.aisf/units/poc-unit/scripts/poc-hook.js` 可直接 `node` 运行，无需 npm install

---

## Step 3：setup 命令（add only）

**Step Type**：`final`

### 目标

实现全局 skill `global/setup/SKILL.md`，在任意目标项目中可调用，
完成 ai-unit 的交互式安装（add only，update/remove 留后续）。

安装的机械部分（文件复制、hook 注册、config 写入）委托给 `global/scripts/installer.ts`
（publish 后编译为 `~/.aisf/global/installer.js`）；
需要智能判断的部分（项目特征检测、config 推荐、用户交互）由 SKILL.md 中的 AI 逻辑处理。

### setup SKILL.md 流程

```
1. 读取 ~/.aisf/config.json，确认本地仓库存在
2. 读取目标项目 .aisf/installed.json（不存在则视为空）
3. 扫描 ~/.aisf/units/ 列出所有可用 unit，标注：
   - 未安装 / 已安装（最新）/ 已安装（内容有变更）
4. 用户选择要安装/更新/卸载的 unit
5. 依赖与可选组件确认（两阶段，覆盖所有选中 unit）：
   a. 调用 installer.js --check-deps 聚合所有选中 unit 的依赖，展示缺口，询问用户是否一并安装
   b. 对所有待安装 unit（含步骤 a 新增的依赖单元），读取 unit.json 识别可选组件（required: false）
      - 读取 condition，结合项目特征（package.json、文件结构）判断是否推荐安装
      - 向用户展示判断结果和原因，由用户最终确认
6. 定制配置收集（覆盖所有待安装/更新 unit，含依赖单元）：
   - 对含 AISF:CUSTOM 边界符的组件，读取 hint，检测项目文件结构，推荐参数值
   - 展示推荐值，等待用户确认或修改
7. 调用 installer.js --install {unit-name} --components '[...]' 执行安装
8. 报告安装结果
```

### installer.ts 职责

处理所有机械性文件操作，全程幂等：

**skill 安装：**

- 在目标项目创建 `skills/aisf:{unit-name}:{skill-name}/SKILL.md`
- 幂等：直接覆盖

**rule guard 安装：**

- 首次安装：读取模板（含 AISF:CUSTOM 边界符 + 默认值）→ AI 用 hint + 项目特征推断实际值 → 替换边界符块内容 → 写入 `.claude/rules/{unit-name}/{rule-name}.md`（边界符随内容保留在目标文件）
- 更新：读取已安装文件（含边界符 + 用户值）→ 按 `name` 提取用户值 → 注入新模板 → 人工确认 → 覆盖写入；用户值已提取，覆盖安全

**script（hook）安装：**

- 调用 installer 的 hook-manager 模块
- 在 `lefthook.yml` 的 `pre-commit` 组中添加 hook 条目（幂等：检查是否已存在相同 name 条目）

**resource 安装：**

- 复制 `~/.aisf/units/{unit-name}/resources/` 到 `.aisf/{unit-name}/resources/`
- 幂等：直接覆盖
- 卸载时随引用组件一并移除（Phase 1 不实现）

**installed.json 更新：**

- 追加或更新 unit 条目，记录安装时间和各组件路径

### PoC 端到端验证场景

在测试目标项目中执行 `/aisf:setup`，安装 poc-unit（含 poc-dep-unit）后验证：

| 组件             | 验证方式                                                                              |
| ---------------- | ------------------------------------------------------------------------------------- |
| skill（poc-dep） | 调用 `/aisf:poc-dep-unit:poc-dep`，观察输出                                           |
| skill（poc）     | 调用 `/aisf:poc-unit:poc`，观察输出 + resource 内容                                   |
| rule guard       | 在测试目录创建 `.poc-test.ts` 文件，提问任意内容，观察回复是否含 `[POC_RULE_ACTIVE]`  |
| script hook      | 执行 `git commit`（可为空 commit），检查 `.aisf/poc-unit/hook-log.txt` 新增一行时间戳 |
| resource 路径    | skill 输出中包含 readme.md 内容（间接验证）                                           |
| 幂等性           | 再次运行 setup 安装相同 unit，确认无重复条目、无文件冲突                              |
| 依赖             | poc-dep-unit skill 可用                                                               |

### Auto Verification

- `(auto)` `node ~/.aisf/global/installer.js --help 2>&1 | grep -q "install"`
- `(auto)` `pnpm test -- --grep "installer"`

### Manual Verification

- `(manual) [automation-candidate]` 在测试项目运行 `/aisf:setup`，安装 poc-unit，验证上表所有场景通过
- `(manual)` 再次运行 setup 安装相同 unit，确认幂等（无重复 hook 条目，config 文件未被覆盖）
- `(manual)` 确认 rule guard 安装后，`.claude/rules/` 中的文件保留 AISF:CUSTOM 边界符，且 globs 值为用户确认的实际值
- `(manual)` 模拟更新场景：修改模板中非定制内容，重新 publish + setup，确认用户 globs 值被保留，非定制内容更新

---

## Step 4：clean 命令

**Step Type**：`final`

### 目标

实现 `scripts/clean.ts`（通过 `pnpm clean` 调用），清除本地仓库和全局 AI 配置中
由本仓库 publish 的所有内容。

### 职责

1. 读取 `~/.aisf/config.json` 确认是本仓库的发布内容（防止误删其他来源）
2. 删除 `~/.aisf/units/`、`~/.aisf/global/`、`~/.aisf/config.json`
3. 删除 `~/.claude/skills/` 下所有 `aisf:*` 目录

### Auto Verification

- `(auto)` `pnpm clean && test ! -f ~/.aisf/config.json`
- `(auto)` `test ! -d ~/.claude/skills/aisf:setup`

### Manual Verification

- `(manual)` clean 后，在任意目录确认 `/aisf:setup` 不再可用
- `(manual)` 确认目标项目中已安装的内容（skills/、.claude/rules/、.aisf/）不受影响

---

## Task Acceptance

对应 requirements.md 验收标准：

- `(auto)` `pnpm pub && test -f ~/.aisf/units/poc-unit/unit.json && test -f ~/.claude/skills/aisf:setup/SKILL.md`
- `(auto)` `pnpm clean && test ! -f ~/.aisf/config.json && test ! -d ~/.claude/skills/aisf:setup`
- `(manual)` `setup` 展示三种状态（未安装 / 已安装最新 / 内容有变更）
- `(manual)` `setup` 安装 poc-unit 后，skill 可调用、rule guard 生效、hook 运行
- `(superseded)` setup 卸载后对应组件从目标项目中移除——Phase 1 不实现 remove
- `(superseded)` setup 更新后组件更新至新版本——Phase 1 不实现 update
- `(manual)` 安装 poc-unit 时系统提示安装 poc-dep-unit 依赖
- `(manual)` 重复执行 `setup` 不产生重复条目（幂等）
- `(manual)` 重复执行 `pnpm pub`，确认 `~/.claude/skills/` 中 aisf: 命令目录无重复（幂等）
