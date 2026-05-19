# AI Scaffold V2 设计方案

---

## 一、设计理念

AI 编码时的规则遵守来自上下文，而非系统级强制。

**两类文档，两种加载策略：**

| 文档              | 内容                                                     | 维护者                       | 加载方式     |
| ----------------- | -------------------------------------------------------- | ---------------------------- | ------------ |
| `CLAUDE.md`       | 项目知识（技术栈、目录结构、常用命令、典型模式）         | `/init` 和更新指令自动维护   | 始终加载     |
| `architecture.md` | 架构决策（违反后无即时信号、需跨文件理解原因的设计约束） | `refresh-arch` 生成，AI 维护 | 按需显式加载 |

**Skill 交付模型（类 npm）：**

所有功能以 skill 为单位，从远程 GitHub 仓库按需安装到本地项目。skill-set 是相关 skill 的集合，统一安装和删除。

---

## 二、核心文件：architecture.md

记录代码库中已经做出的架构决策，供 `check-arch` 按需加载。

**每条记录必须同时满足：**

1. 是一个可以被违反的选择——有明确的"不该做什么"
2. 违反后没有即时信号——工具不报告，行为看似正常；影响可能在其他模块才显现、延迟暴露，或作为质量隐患悄悄积累
3. 需要阅读多个文件才能理解"为什么这样设计"

**不收录：**

- 技术栈的标准用法
- 没有明确反例的描述性内容（"系统使用 X"不算决策）

**每条格式：**

```markdown
**[决策标题]**
反例：不该做什么（一句话）
Rationale：为什么这样设计
Consequence：违反后会发生什么
```

**刷新原则（`refresh-arch` 执行时）：**

- 已有条目覆盖的决策不重复；视角不同但覆盖相同决策时，以已有条目为准
- 新条目必须明确通过以上三条；存疑时不加，宁少勿滥
- 已有条目若不再满足标准或对应设计已变更，删除

---

## 三、远程仓库规范

- 平台：GitHub only
- 访问方式：HTTPS public 仓库
- 分支：main（固定，不可配置）

**目录结构：**

```
remote-repo/
├── README.md                  # 人类文档：说明用途、bootstrap raw URL、registry 维护方式
├── bootstrap.md               # AI 可执行的初始化指令（入口文件）
├── skill.md                   # skill 管理器命令文件（bootstrap 时下载到 .claude/commands/）
├── registry.json              # skill 注册表（AI 维护或由 scripts/build-registry.js 自动生成）
├── scripts/
│   └── build-registry.js      # 可选：扫描 skills/ 自动生成 registry.json
├── comm/                      # 公共资源（skill 级 resource/ 不存在时回退到此）
│   ├── install.md
│   ├── uninstall.md
│   ├── templates/
│   └── rules/
└── skills/
    ├── {skill-name}/          # 单独 skill
    │   ├── config.json        # skill 元数据
    │   ├── {skill-name}.md    # skill 命令文件
    │   └── resource/          # 可选：覆盖 comm/ 中同名内容
    │       ├── install.md
    │       ├── uninstall.md
    │       ├── templates/
    │       └── rules/
    └── {skill-set-name}/      # skill 集合
        ├── config.json        # set 元数据
        ├── {skill-1}.md
        ├── {skill-2}.md
        └── resource/          # 可选：覆盖 comm/ 中同名内容
```

资源查找优先级：`resource/{file}` > `comm/{file}` > 跳过。

**config.json 格式（单 skill）：**

```json
{
  "name": "refresh-arch",
  "description": "扫描代码库，生成或刷新 architecture.md"
}
```

**config.json 格式（skill-set）：**

```json
{
  "name": "arch",
  "description": "架构决策管理工具集",
  "skills": ["refresh-arch", "check-arch"]
}
```

**registry.json 格式：**

```json
{
  "version": "1.0",
  "skills": [{ "name": "refresh-arch", "set": "arch", "path": "skills/arch/" }],
  "sets": [
    { "name": "arch", "path": "skills/arch/" },
    { "name": "task", "path": "skills/task/" }
  ]
}
```

> registry.json 只做索引（路径指针），描述和版本信息以各目录下的 config.json 为准。

---

## 四、Skill 管理

### 管理器命令

通过 Bootstrap 安装到 `.claude/commands/skill.md`，提交到 git 后团队共享。

| 命令                    | 说明                                            |
| ----------------------- | ----------------------------------------------- |
| `/skill list`           | 列出远程仓库所有可用 skill 和 skill-set         |
| `/skill installed`      | 列出本地已安装的 skill                          |
| `/skill install <name>` | 安装 skill 或 skill-set；已安装时提示确认后重装 |
| `/skill remove <name>`  | 删除 skill 或 skill-set                         |

> 无 update 命令——重新执行 `/skill install` 即为更新，始终取远程最新版本。

### 已安装 Skill（`/aisk:` 命名空间）

| Skill                     | Set    | 作用                                                      | 触发场景                             |
| ------------------------- | ------ | --------------------------------------------------------- | ------------------------------------ |
| `/aisk:refresh-arch`      | `arch` | 扫描代码，生成或刷新 `architecture.md`                    | 初始化项目，或架构有较大变更后       |
| `/aisk:check-arch`        | `arch` | 加载 `architecture.md`，检查代码变更是否偏离架构决策      | 定期检查，或 feature 完成前          |
| `/aisk:prepare-task`      | `task` | 创建 feature 或 refactor 三文档，按需生成 path-rule       | 启动需要跨会话的 feature 或 refactor |
| `/aisk:close-task`        | `task` | 完成工作，清理文档                                        | PR 合并前                            |
| `/aisk:setup-hooks`       | —      | 安装 git hooks                                            | 初始化或更新 hooks 时                |
| `/aisk:setup-permissions` | —      | 配置 `.claude/settings.json`                              | 初始化或更新权限时                   |

内部工具（不直接调用）：

- `sync-rules`：由 `prepare-task` 内部调用，同步 path-rules 到 `.claude/rules/`

### 安装流程

**首次初始化（Bootstrap）：**

两种方式均可：

**方式 A：提供 URL（AI 自行 fetch）**

> 请执行 https://raw.githubusercontent.com/{owner}/{repo}/main/bootstrap.md

- 必须使用 raw URL，blob URL 返回 HTML 无法读取
- raw URL 固定写在仓库 README.md 中，从那里复制

**方式 B：直接粘贴文件内容**

> 以下是 bootstrap.md 的内容，请按指令执行：[粘贴内容]

- 内容已提供，无需 fetch，blob URL 或 raw URL 均可用于标注来源

两种方式均执行相同步骤：

1. fetch `registry.json`，确认仓库格式有效
2. 下载 `skill.md` 到 `.claude/commands/skill.md`
3. 将 raw base URL 写入 `settings.json`（`AISC_REGISTRY`）
4. 初始化完成，后续通过 `/skill` 命令管理

**安装单个 skill / skill-set：**

1. 若已安装，提示用户确认（"已安装 {name}，是否重新安装？"），取消则终止
2. 从 `AISC_REGISTRY` fetch `registry.json`，查找目标
3. 下载 `.md` 文件到 `.claude/commands/aisk/{skill-name}.md`（skill-set 内 skill 平铺）
4. 下载 `config.json` 和 `resource/`（若存在）到 `.ai-skills/skills/{name}/`
5. 执行安装指令（按优先级查找）：
   - 优先读取 `resource/install.md`，不存在则回退到 `comm/install.md`，均不存在则跳过
   - 安装指令为 AI 可读的 Markdown，shell 操作由 AI 调用执行
   - 典型操作：将 `resource/rules/`（或 `comm/rules/`）下文件写入 `.claude/rules/`
6. 输出安装摘要

### 删除流程

1. 执行清理指令（优先读取 `resource/uninstall.md`，回退到 `comm/uninstall.md`，均不存在则跳过）
2. 删除 `.claude/commands/aisk/{skill-name}.md`
3. 删除 `.ai-skills/skills/{name}/`
4. 清理 `.claude/rules/` 中该 skill 写入的文件

---

## 五、本地目录结构与文件规范

### 本地目录结构

```
项目根目录/
├── .ai-skills/
│   └── skills/
│       ├── {skill-name}/
│       │   ├── config.json        # skill 元数据（bootstrap 时下载）
│       │   ├── resource/          # 从远程下载的资源（模板、rules 等）
│       │   └── state.md           # 可选：运行时状态（本地生成）
│       └── {skill-set-name}/
│           ├── config.json
│           ├── resource/
│           └── state.md
│
├── .ai-rules/
│   └── path-rules/
│       └── task-planning.md       # 任务工作流（prepare-task 生成）
│
├── .claude/
│   ├── settings.json              # 远程仓库配置（AISC_REGISTRY）+ 权限配置
│   ├── rules/
│   │   ├── {skill}-*.md           # 从 resource/rules/ 同步（skill 安装时写入）
│   │   └── aisc-*.md              # 从 .ai-rules/path-rules/ 同步（sync-rules 写入）
│   └── commands/
│       ├── skill.md               # skill 管理器（/skill list/install/remove...）
│       └── aisk/                  # 已安装 skill（/aisk:refresh-arch 等）
│
├── docs/
│   └── tasks/                     # prepare-task 过程文档（feature/refactor branch，merge 前清理）
│
├── architecture.md                # 架构决策（按需加载，不 @ 引入 CLAUDE.md）
└── CLAUDE.md                      # 项目知识（始终加载，/init 自动维护）
```

`architecture.md` 不在 CLAUDE.md 中 @-引用，由 `check-arch` 在需要时显式读取。

**settings.json 中的仓库配置：**

```json
{
  "env": {
    "AISC_REGISTRY": "https://raw.githubusercontent.com/{owner}/{repo}/main"
  }
}
```

### config.json 字段规范

config.json 的存在本身表明该目录是一个 skill 或 skill-set，`skills` 字段的有无区分两者：

| 字段          | 必填           | 说明                                                       |
| ------------- | -------------- | ---------------------------------------------------------- |
| `name`        | ✓              | skill 或 set 名称                                          |
| `description` |                | 简短描述                                                   |
| `skills`      | skill-set 必填 | 包含的 skill 名称列表；有此字段 = skill-set，无 = 单 skill |

### state.md 格式

frontmatter 存结构化字段，正文存补充说明：

```markdown
---
last_run: 2026-05-19
status: in-progress
---
```

### comm/ 与 resource/ 目录

`comm/` 在远程仓库根目录，提供公共默认资源；`resource/` 在 skill 目录下，覆盖同名内容。两者结构相同：

| 文件/目录      | 说明                                                |
| -------------- | --------------------------------------------------- |
| `install.md`   | 安装时 AI 执行的操作（如写入 rules、初始化文件）    |
| `uninstall.md` | 删除时 AI 执行的清理操作                            |
| `templates/`   | 命令所需的文档模板（如 REQUIREMENTS.md、DESIGN.md） |
| `rules/`       | 需要写入 `.claude/rules/` 的 path-rule 文件         |

查找顺序：`resource/{file}` → `comm/{file}` → 跳过。

### scripts/build-registry.js

每次新增或删除 skill / skill-set 后运行，自动重新生成 `registry.json`：

```bash
node scripts/build-registry.js
```

```js
#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const skillsDir = path.join(__dirname, "..", "skills");
const outputFile = path.join(__dirname, "..", "registry.json");

const registry = { version: "1.0", skills: [], sets: [] };

for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const configPath = path.join(skillsDir, entry.name, "config.json");
  if (!fs.existsSync(configPath)) continue;

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const dirPath = `skills/${entry.name}/`;

  if (config.skills) {
    registry.sets.push({ name: config.name, path: dirPath });
    for (const skillName of config.skills) {
      registry.skills.push({ name: skillName, set: config.name, path: dirPath });
    }
  } else {
    registry.skills.push({ name: config.name, path: dirPath });
  }
}

fs.writeFileSync(outputFile, JSON.stringify(registry, null, 2) + "\n");
console.log(`registry.json updated: ${registry.skills.length} skills, ${registry.sets.length} sets`);
```

---

## 六、任务工作流

feature 和 refactor 均使用三文档模式（REQUIREMENTS / DESIGN / PROGRESS），REQUIREMENTS.md 的模板内容不同。通过 path-rule 在 `docs/tasks/**` 下激活。

详见 [`docs/v2-design/templates/path-rules/task-planning.md`](./v2-design/templates/path-rules/task-planning.md)。

---

## 七、架构文档拆分（Monorepo / 大型项目）

单一 `architecture.md` 适合单包项目。对于 monorepo 或有明显模块边界的大型项目，可按路径拆分子架构文档，通过 path-rules 按需加载。

```
.ai-rules/
└── path-rules/
    ├── web-arch.md              # paths: apps/web/**（包级架构决策）
    ├── api-arch.md              # paths: apps/api/**
    └── task-planning.md         # paths: docs/tasks/**
```

根级 `architecture.md` 记录跨包约束；子文档记录包级决策，格式与根文档相同。

**`refresh-arch` 适配**：

- `refresh-arch` → 更新根 `architecture.md`
- `refresh-arch apps/web/` → 更新 `.ai-rules/path-rules/web-arch.md`

---

## 八、遗留问题

- [x] 任务工作流文档模式：feature 和 refactor 均采用三文档，REQUIREMENTS.md 模板内容不同
- [x] `close-task` 不触发 `refresh-arch`，由用户手动调用
- [ ] 架构文档拆分：子架构文档模板待设计（Monorepo 场景启用时）
