# Requirements: project-structure（架构）

> 本文档记录 ai-unit 架构的功能需求，对应 Phase 1 PoC 实现（已完成）。
> 命名约定将在迁移任务中统一更新（详见 `requirements.md`）。

## 目标

构建一个 **AI 智能单元管理仓库**：统一存储、管理可复用的 AI 辅助能力单元（ai-unit），并提供将其发布、安装到 Node.js 项目的机制（当前仅支持 Claude）。

一个 ai-unit 是一组可协同工作的 AI 辅助能力的集合。每个 ai-unit 有明确的能力描述和对其他 ai-unit 的依赖声明。

---

## 三层结构

```
开发仓库（ai-scaffold）         ← ai-unit 的开发和维护
    ↓ register  ↑ pull（低优先级）
本地仓库（~/.aisk/）             ← 已发布的可运行版本 + 全局 AI 配置
    ↓ setup    ↑ push（低优先级）
目标项目                         ← 使用 ai-unit 能力的 Node.js 项目
```

目标项目不直接访问开发仓库，只与本地仓库交互。

---

## ai-unit 模型

### 能力描述

每个 ai-unit 应声明：

- **名称与描述**：这个单元做什么，解决什么问题
- **提供的能力**：安装后，用户/AI 能获得哪些新能力（如可调用的命令、自动生效的规则）
- **适用场景**：推荐在什么类型的项目或工作流中使用
- **依赖**：依赖哪些其他 ai-unit（安装时自动检查）

### 组件类型

一个 ai-unit 可包含以下一种或多种组件：

| 类型           | 描述                                          | 安装目标（目标项目）                               |
| -------------- | --------------------------------------------- | -------------------------------------------------- |
| **skill**      | AI 可调用的命令（slash command）              | 目标项目本地 skill 目录                            |
| **rule guard** | AI 行为约束规则，可配置适用文件范围           | 目标项目 Claude 规则目录                           |
| **script**     | 可直接运行的脚本（如 pre-commit hook）        | 注册到目标项目对应 hook                            |
| **resource**   | 文件模板等静态资源，供 skill/rule/script 引用 | 不直接安装，由其他组件使用；随引用它的组件一并卸载 |

组件级属性：

- **`condition`**：字符串，说明该组件的适用条件。有此字段的组件为**可选组件**，setup 时 AI 根据条件和项目特征决定是否推荐安装，由用户最终确认。
- **`hasCustom`**：布尔值，标记该组件含 `AISK:CUSTOM` 定制区块，安装前需由 AI 生成定制内容。

### unit 注册表

开发仓库根目录维护 `units/units.json`，记录所有 unit 名称及其拓扑顺序。发布后复制到 `~/.aisk/units.json`，供 installer 确定安装顺序和可用 unit 列表。

### 依赖关系

- ai-unit 可声明对其他 ai-unit 的依赖
- 部分 ai-unit 作为公共基础单元，可被多个其他单元依赖（如 hook 管理能力）
- 安装时自动解析依赖，自动将传递依赖加入安装计划

---

## 功能需求

### 开发仓库中的操作

#### register（发布）

在开发仓库中运行，将 ai-unit 发布到本地仓库和全局 AI 配置：

- **build 前置步骤**：发布前自动运行 `build`，根据源文件刷新各 unit 的 `unit.json`（如更新 `hasCustom` 标志等派生字段），确保元数据与实际内容一致
- 发布后，本地仓库（`~/.aisk/`）包含所有 ai-unit 的可运行版本
- script 组件以可直接执行的形式发布，无需安装依赖、无需 TypeScript 编译环境（esbuild 打包为单文件 CJS bundle）
- 全局管理命令（如 setup）和 installer 脚本发布到全局 AI 配置，在任意 AI session 中可用
- `installer-types.ts` 作为类型参考文件一并发布到 `~/.aisk/global/`，供 skill 文件引用
- 仅发布可安装内容，开发资源（文档、测试等）不包含在内
- 幂等：重复发布覆盖旧版本，不产生重复条目

#### clean（清理）

在开发仓库中运行，清空本地仓库和全局 AI 配置中由本仓库发布的所有内容：

- 清理后，全局管理命令不再可用；目标项目中依赖全局命令的操作（如 setup）将无法执行
- 目标项目中已安装的内容**不受影响**（已安装即独立）

---

### 目标项目中的操作

#### setup（配置）

在目标项目中运行，统一管理已安装的 ai-unit（包含安装、更新、卸载）：

**核心模型：选中列表 = 期望状态。** 已安装的 unit 默认预选中。用户调整后的最终选中列表即为操作完成后的期望状态：移除已安装的 unit → 卸载；新增未安装的 unit → 安装；保留已安装的 unit → 更新。

1. 列出本地仓库中所有可用 ai-unit（`installer list`）及其状态；用户通过编号输入调整期望选中列表
2. 将完整期望选中列表传给 `installer resolve`，自动计算 changeset（`to_install` / `to_update` / `to_remove`）并解析传递依赖（自动补入 `auto` 列表）；向用户展示完整变更计划，等待确认
3. 对 `to_install ∪ to_update` 中有 `condition` 字段的可选组件，AI 结合项目特征判断是否推荐，由用户确认；确认结果以 `{type}:{name}` 格式列表传入后续步骤（`--optional` 参数）
4. 对有 `hasCustom: true` 的组件，调用 `installer prepare`，AI 逐项生成或更新 `AISK:CUSTOM` 定制内容（更新时读取已安装文件中的用户值作为默认值）并写入临时文件
5. 先执行卸载（`installer uninstall`），再按拓扑顺序执行安装/更新（`installer install --optional '...'`）；报告结果

**卸载行为**：移除 skill 目录、rule guard 文件、hook 条目；resource 文件随引用它的组件一并移除。孤立组件（已安装但不再出现于新版 unit.json 中的组件）在更新时自动清理。

---

### 定制化机制

部分 ai-unit 组件在安装时需要根据目标项目进行调整，不能直接复制：

- **rule guard** 的 `paths`：指定规则适用的文件范围（如 `**/*.test.ts`），需根据项目实际文件结构配置
- 未来可能有其他组件存在类似的项目级参数

定制化的行为要求：

- **安装时**：系统检测目标项目特征，给出推荐值；用户可确认或修改
- **更新时**：更新组件主体内容，**保留用户之前的定制配置**，不覆盖
- **定制项与主体分离**：定制配置与 ai-unit 的主体内容需要可区分，以支持独立更新

---

## 非功能需求

- **执行效率**：命令执行时，优先用脚本实现可确定性强的部分（简单逻辑用 shell，复杂逻辑用 Node.js），AI 指令仅用于需要智能判断的交互环节

---

## 约束

- 当前仅支持 **Node.js 项目**（目标项目需有 `package.json`）
- 当前仅支持 **Claude**（不考虑 Codex 或其他 AI 工具）
- **路径约定**：
  - 全局管理命令（register 安装）：`~/.claude/skills/aisk:{name}/`（冒号分隔）
  - 目标项目 skill（setup 安装）：`.claude/skills/aisk-{unit}-{name}/`（破折号分隔）
  - 目标项目 rule guard：`.claude/rules/aisk-{unit}/{rule-name}.md`
  - 目标项目资源：`.aisk/{unit}/resources/`
- **script hook 管理**：假定目标项目使用 [lefthook](https://github.com/evilmartians/lefthook)；目标项目需已初始化 lefthook

---

## 技术风险

以下风险已通过 Phase 1 实现验证，记录如下供参考。

### 风险 1：定制化与可更新性的兼容（已验证）

**问题**：rule guard 的 paths 等定制参数，在 update 时如何保留用户修改，同时更新组件主体内容。

**实现方案**：在模板文件中嵌入 `AISK:CUSTOM` 边界符标记定制区块（YAML 用 `#`，Markdown 用 `<!-- -->`），边界符在已安装文件中保留。更新时 AI 按 `name` 属性配对提取用户值并注入新模板，经人工确认后写入。`installed.json` 中的 `currentPath` 字段支持组件路径变更时的历史值读取。

### 风险 2：幂等性保证（已验证）

**问题**：setup 可能被多次执行，需保证每次执行后系统状态一致，不产生重复条目（如 hook 中重复注册同一脚本）。

**实现方案**：各安装目标统一采用幂等写入策略（skill/rule/resource 直接覆盖；hook 条目检查 name 是否已存在再写入）。`installer install` 设计为可反复执行，不依赖外部状态判断。

---

## 范围外

- ai-unit 版本管理
- 多开发仓库管理
- Codex 及其他 AI 工具支持
- pull（本地仓库 → 开发仓库）—— 低优先级，本次不实现
- push（目标项目 → 本地仓库）—— 低优先级，本次不实现

---

## 验收标准

1. `register` 后，全局管理命令在任意 AI session 可用；本地仓库包含所有 ai-unit 的可运行内容及 `units.json` 注册表
2. `clean` 后，全局管理命令不可用；已安装到目标项目的内容不受影响
3. `setup` 能正确展示可用 unit 列表及其状态，已安装的 unit 默认预选中；用户调整选中列表后展示完整变更计划，确认后执行
4. `setup` 安装完成后，目标项目具备对应 AI 能力（skill 可调用、rule guard 生效、pre-commit hook 在 git commit 时执行）
5. `setup` 卸载后，对应能力移除，相关文件不再存在
6. `setup` 更新后，组件更新至新内容，用户定制配置（`AISK:CUSTOM` 区块内容）保留
7. 安装有依赖的 ai-unit 时，系统自动将传递依赖加入安装计划（标注为"自动依赖"）
8. 重复执行 `setup` 不产生重复条目或文件冲突（幂等）
9. 重复执行 `register` 不产生重复全局命令条目（幂等）
