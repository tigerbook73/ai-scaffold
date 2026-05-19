# AI Scaffold 重构方案

基于 skill 仓库模型重构整个 scaffold，类似 npm 的安装/管理体验。

---

## 一、核心理念

- 所有功能以 skill 为单位交付，减少全局 rule
- skill 从远程仓库按需安装，本地只保留已安装部分
- skill-set 是相关 skill 的集合，统一安装和删除

---

## 二、远程仓库规范

- 平台：GitHub only
- 访问方式：HTTPS public 仓库
- 分支：main（固定，不可配置）
- 文件结构：固定格式（见下）

**远程仓库目录结构：**

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
    { "name": "feature", "path": "skills/feature/" },
    { "name": "refactor", "path": "skills/refactor/" }
  ]
}
```

> registry.json 只做索引（路径指针），描述和版本信息以各目录下的 config.json 为准。

---

## 三、本地目录结构

```
项目根目录/
├── .ai-skills/
│   └── skills/
│       ├── {skill-name}/
│       │   ├── config.json        # skill 元数据
│       │   ├── resource/          # 从远程下载的资源（模板、rules 等）
│       │   └── state.md           # 可选：运行时状态（本地生成）
│       └── {skill-set-name}/
│           ├── config.json        # set 元数据
│           ├── resource/
│           └── state.md           # 可选：运行时状态
│
├── .claude/
│   ├── settings.json              # 包含远程仓库配置
│   ├── rules/                     # 从 resource/rules/ 同步（skill 安装时写入）
│   │   └── {skill}-*.md
│   └── commands/
│       ├── skill.md               # skill 管理器（顶层，/skill init/list/install...）
│       └── aisk/                  # 已安装 skill 的命名空间（/aisk:refresh-arch）
│           ├── refresh-arch.md
│           ├── check-arch.md
│           └── ...
│
└── architecture.md                # 架构决策文档（项目根目录，按需加载）
```

**settings.json 中的仓库配置：**

```json
{
  "env": {
    "AISC_REGISTRY": "https://raw.githubusercontent.com/{owner}/{repo}/main"
  }
}
```

---

## 四、Skill 管理命令

管理器 skill 安装后，通过 `/skill` 命令操作：

| 命令                    | 说明                                                              |
| ----------------------- | ----------------------------------------------------------------- |
| `/skill list`           | 列出远程仓库所有可用 skill 和 skill-set                           |
| `/skill installed`      | 列出本地已安装的 skill                                            |
| `/skill install <name>` | 安装单个 skill 或整个 skill-set；已安装时提示用户确认后重装       |
| `/skill remove <name>`  | 删除单个 skill 或整个 skill-set                                   |

> 无 update 命令——重新执行 `/skill install` 即为更新，始终取远程最新版本。

---

## 五、安装流程

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

**删除 skill / skill-set：**

1. 执行清理指令（优先读取 `resource/uninstall.md`，回退到 `comm/uninstall.md`，均不存在则跳过）
2. 删除 `.claude/commands/aisk/{skill-name}.md`
3. 删除 `.ai-skills/skills/{name}/`
4. 清理 `.claude/rules/` 中该 skill 写入的文件

---

## 六、Skill 命名规范

skill-set 内的 skill 统一使用动词-名词格式，成对出现：

| Set        | Skills                               |
| ---------- | ------------------------------------ |
| `arch`     | `refresh-arch`、`check-arch`         |
| `feature`  | `prepare-feature`、`close-feature`   |
| `refactor` | `prepare-refactor`、`close-refactor` |

---

## 七、各目录/文件规范

**config.json**（单 skill 和 skill-set 均必须有）

config.json 的存在本身表明该目录是一个 skill 或 skill-set，`skills` 字段的有无区分两者：

| 字段          | 必填           | 说明                                                       |
| ------------- | -------------- | ---------------------------------------------------------- |
| `name`        | ✓              | skill 或 set 名称                                          |
| `description` |                | 简短描述                                                   |
| `skills`      | skill-set 必填 | 包含的 skill 名称列表；有此字段 = skill-set，无 = 单 skill |

**state.md**（可选，运行时写入，紧靠 skill 目录）

frontmatter 存结构化字段，正文存补充说明：

```markdown
---
last_run: 2026-05-19
status: in-progress
---
```

**comm/ 与 resource/ 目录**

`comm/` 在远程仓库根目录，提供公共默认资源；`resource/` 在 skill 目录下，覆盖同名内容。两者结构相同：

| 文件/目录      | 说明                                                |
| -------------- | --------------------------------------------------- |
| `install.md`   | 安装时 AI 执行的操作（如写入 rules、初始化文件）    |
| `uninstall.md` | 删除时 AI 执行的清理操作                            |
| `templates/`   | 命令所需的文档模板（如 REQUIREMENTS.md、DESIGN.md） |
| `rules/`       | 需要写入 `.claude/rules/` 的 path-rule 文件         |

查找顺序：`resource/{file}` → `comm/{file}` → 跳过。

---

## 八、scripts/build-registry.js

每次新增或删除 skill / skill-set 后运行，自动重新生成 `registry.json`：

```bash
node scripts/build-registry.js
```

```js
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const skillsDir = path.join(__dirname, '..', 'skills');
const outputFile = path.join(__dirname, '..', 'registry.json');

const registry = { version: '1.0', skills: [], sets: [] };

for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const configPath = path.join(skillsDir, entry.name, 'config.json');
  if (!fs.existsSync(configPath)) continue;

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
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

fs.writeFileSync(outputFile, JSON.stringify(registry, null, 2) + '\n');
console.log(`registry.json updated: ${registry.skills.length} skills, ${registry.sets.length} sets`);
```
