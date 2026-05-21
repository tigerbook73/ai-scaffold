# AI Skills — 项目概览

## 是什么

AI Skills 是一个**本地技能库**，以 Claude Code 命令（`.md` 文件）为单位，通过 `/aisk/sync` 将技能一键分发到任意项目的 `.claude/commands/aisk/`。

核心思路：技能在本地仓库集中维护，改一次、处处可用；新增技能通过 `/aisk/create-skill` 提升到全局库。

---

## 整体架构

```
本地技能仓库/
├── skills/              ← 技能源文件
├── claude/setting.json  ← 同步配置
└── ...

  ↓ npm run register（新机器，一次性）

~/.ai-skills/config.json          ← 记录仓库路径
~/.claude/commands/aisk/          ← 全局元命令（/aisk/sync、/aisk/create-skill）

  ↓ /aisk/sync（在目标项目中执行）

{project}/.claude/commands/aisk/  ← 同步的技能命令
{project}/.ai-skills/             ← sync 写入的资源文件 + 技能运行时生成的上下文
```

**三个层次：**

| 层次   | 位置                                        | 说明                   |
| ------ | ------------------------------------------- | ---------------------- |
| 仓库层 | `{repo}/`                                   | 技能源文件，集中维护   |
| 全局层 | `~/.ai-skills/`、`~/.claude/commands/aisk/` | 配置 + 元命令          |
| 项目层 | `.claude/commands/aisk/`、`.ai-skills/`     | 同步后的技能副本及资源 |

---

## 仓库目录结构

```
{repo}/
├── skills/                        ← 所有技能文件（命令 + 资源），按分组组织
│   ├── sync.md
│   ├── create-skill.md
│   ├── ...                          ← 其他元命令
│   ├── arch/
│   │   ├── refresh-arch.md
│   │   ├── check-arch.md
│   │   └── README.md              ← arch 技能组设计文档
│   └── task/
│       ├── prepare-task.md
│       ├── close-task.md
│       ├── README.md              ← task 技能组设计文档
│       └── resource/
│           └── task-planning.md  ← task 工作流规则（sync 到 .ai-skills/）
├── claude/
│   └── setting.json               ← 同步配置（sync.ts 读取，npm run build 生成）
├── scripts/
│   ├── setup.ts                   ← 全局初始化（一次性）
│   ├── sync.ts                    ← 同步实现
│   ├── create-skill.ts            ← 提升本地技能到全局仓库
│   └── build.ts                   ← 扫描 skills/ 生成 setting.json
├── package.json
└── docs/
    └── OVERVIEW.md                ← 本文档
```

> **技术栈**：所有脚本使用 TypeScript，通过 `npm run <command>` 调用，运行时依赖 `tsx`，CLI 框架使用 CAC。

---

## 同步后的项目结构

执行 `/aisk/sync` 后，目标项目的相关目录：

```
project/
├── .claude/
│   └── commands/
│       └── aisk/                      ← 技能命令（README.md 不同步）
│           ├── sync.md
│           ├── create-skill.md
│           ├── refresh-arch.md
│           ├── check-arch.md
│           ├── prepare-task.md
│           ├── close-task.md
│           └── ...
└── .ai-skills/
    └── task/
        └── resource/
            └── task-planning.md  ← sync 从仓库复制（task 工作流规则）
```

同步后，技能通过 `/aisk/refresh-arch`、`/aisk/prepare-task` 等命令调用。

`.ai-skills/` 内容来源分两类：

- **sync 写入**：`skills/task/resource/` 下的资源文件（随 `/aisk/sync` 同步到项目）
- **技能运行时生成**：`architecture.md`（由 `refresh-arch` 写入，不通过 sync）

---

## npm scripts 汇总

| 命令                   | 实现                      | 用途                                                                               |
| ---------------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| `npm run register`     | `scripts/setup.ts`        | 全局初始化（新机器一次性运行）                                                     |
| `npm run sync`         | `scripts/sync.ts`         | 将技能同步到目标项目（通常由 `/aisk/sync` 调用）                                   |
| `npm run build`        | `scripts/build.ts`        | 扫描 `skills/` 重新生成 `claude/setting.json`                                      |
| `npm run create-skill` | `scripts/create-skill.ts` | 将技能文件写入 `skills/` 并更新 `setting.json`（通常由 `/aisk/create-skill` 调用） |

> **运行时依赖**：所有脚本通过 `tsx` 执行 TypeScript，CLI 参数解析使用 CAC。

---

## 管理脚本

### scripts/setup.ts

**用途**：全局初始化，在新机器上执行一次。

**操作：**

1. 将当前仓库路径写入 `~/.ai-skills/config.json`
2. 将 `sync.md`、`create-skill.md` 两个元命令复制到 `~/.claude/commands/aisk/`，使其在所有项目中全局可用

**调用：**

```bash
npm run register
```

---

### scripts/sync.ts

**用途**：按 `setting.json` 的配置，将 `skills/` 下的文件同步到目标项目。

**逻辑：**

1. 读取 `~/.ai-skills/config.json` → 获取仓库路径
2. 读取 `{repo}/claude/setting.json` → 获取文件列表，每条记录包含 `src` 和 `dst`
3. 将 `{repo}/skills/{src}` 复制到 `{target}/{dst}`，直接覆盖已有文件（目录不存在则创建）
4. 提示是否将目标目录加入 `.gitignore`（是/否）
5. 输出同步摘要（新增 / 覆盖各多少个）

**选项：**

```bash
npm run sync                         # 同步到当前目录，直接覆盖
npm run sync -- --target <dir>       # 指定目标项目目录
npm run sync -- --dry-run            # 预览变更，不实际写入
```

**由 `/aisk/sync` 命令间接调用**（见下方），用户通常不直接运行。

---

### scripts/create-skill.ts

**用途**：将一个技能文件写入全局仓库 `skills/`，并自动更新 `setting.json`。

**参数（基于 CAC）：**

```bash
npm run create-skill -- <file> [--name <n>] [--description <desc>] [--force]
```

| 参数            | 说明                             | 默认值              |
| --------------- | -------------------------------- | ------------------- |
| `<file>`        | 源文件路径（必填）               | —                   |
| `--name`        | 技能名（目标文件名，不含 `.md`） | 取源文件名          |
| `--description` | 技能描述                         | 取文件首行 `#` 标题 |
| `--force`       | 跳过同名冲突确认                 | false               |

**逻辑：**

1. 读取 `~/.ai-skills/config.json` → 获取仓库路径
2. 确定目标路径：`{repo}/skills/{name}.md`
3. 若目标已存在且未传 `--force`，输出警告并要求确认
4. 复制源文件到目标路径
5. 调用 `npm run build` 重新生成 `setting.json`
6. 输出确认（目标路径、提示运行 `git commit` 持久化）

**由 `/aisk/create-skill` 命令间接调用**，用户通常不直接运行。

---

### scripts/build.ts

**用途**：扫描 `skills/` 目录，自动生成 `claude/setting.json`。

**逻辑：**

1. 递归枚举 `skills/` 下所有 `.md` 文件
2. 跳过 `README.md`
3. 对每个文件，按路径约定推断 `dst`：
   - `*/resource/**` → `.ai-skills/*/resource/`（资源文件）
   - 其余 `.md` → `.claude/commands/aisk/`（技能命令）
4. `description`：取文件首行 `#` 标题；`category`：按目录推断（`arch/` → `arch`，`task/` → `task`，根目录 → `meta`）
5. 若 `setting.json` 中已有该条目，保留其现有的 `description`、`en`（不覆盖手动改动）；`category` 始终按路径重新推断
6. 写入 `claude/setting.json`，输出变更摘要（新增 / 更新 / 删除各多少条）

**调用：**

```bash
npm run build
```

在以下情况需要运行：新增或删除 `skills/` 中的文件后、首次初始化时。

---

## 管理技能

### /aisk/sync

**调用方式**：在任意项目的 Claude Code 中运行 `/aisk/sync`

**作用**：读取全局配置，调用 `sync.ts`，将所有技能同步到当前项目。

**流程：**

```
读取 ~/.ai-skills/config.json
  → npm --prefix {repo} run sync -- --target {project-dir}
  → .claude/commands/aisk/ 和 .ai-skills/ 中出现 setting.json 记录的所有文件
```

**安装路径**：`~/.claude/commands/aisk/sync.md`（由 `setup.ts` 安装，全局可用）

---

### /aisk/create-skill

**调用方式**：`/aisk/create-skill <文件路径>` 或 `/aisk/create-skill <技能名>`

**作用**：将一个技能提升到全局仓库，使其可通过 `/aisk/sync` 分发到其他项目。

**两种输入模式：**

| 模式     | 参数形式                | 行为                                                                                      |
| -------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| 文件路径 | 现有 `.md` 文件的路径   | 直接传给 `create-skill.ts` 处理                                                           |
| 技能名   | 纯名称（如 `my-skill`） | Claude 根据对话上下文生成内容，直接写入 `{repo}/skills/{name}.md`，再调用 `npm run build` |

**流程（文件路径模式）：**

```
读取 ~/.ai-skills/config.json
  → npm --prefix {repo} run create-skill -- <file> [--name <n>] [--force]
  → setting.json 自动更新（create-skill.ts 内部调用 npm run build）
```

**流程（技能名模式）：**

```
读取 ~/.ai-skills/config.json
  → Claude 生成技能内容，直接写入 {repo}/skills/{name}.md
  → npm --prefix {repo} run build
  → setting.json 自动更新
```

执行后需在 ai-skills 仓库中手动 `git commit` 以持久化。

**安装路径**：`~/.claude/commands/aisk/create-skill.md`（由 `setup.ts` 安装，全局可用）

---

## claude/setting.json

同步配置文件，`sync.ts` 的数据来源，描述哪些文件参与同步及各自的目标路径。

> 此文件通过 `npm run build` 自动生成，无需手动维护。生成规则：
>
> - `*/resource/**` → `.ai-skills/*/resource/`（资源文件）
> - `README.md` → 排除（设计文档，不同步）
> - 其余 `.md` → `.claude/commands/aisk/`（技能命令）

**格式：**

```json
{
  "version": "1.0",
  "files": [
    {
      "src": "sync.md",
      "dst": ".claude/commands/aisk/sync.md",
      "description": "同步全局技能到当前项目",
      "category": "meta",
      "en": null
    },
    {
      "src": "arch/refresh-arch.md",
      "dst": ".claude/commands/aisk/refresh-arch.md",
      "description": "生成或刷新架构决策文档",
      "category": "arch",
      "en": null
    },
    {
      "src": "task/resource/task-planning.md",
      "dst": ".ai-skills/task/resource/task-planning.md",
      "description": "task 工作流规则",
      "category": "task",
      "en": null
    }
  ]
}
```

- `src`：相对于 `skills/` 目录的源路径
- `dst`：在目标项目中的路径（相对于项目根目录），支持任意目录
- `category`：技能分类（`meta`、`arch`、`task`）
- `en`：英文版本文件路径，`null` 表示待补充

新增或删除技能后，运行 `npm run build` 重新生成此文件，再 `git commit`。

---

## 典型工作流

**新机器初始化：**

```
git clone .../ai-skills ~/code/ai-skills
cd ~/code/ai-skills && npm install && npm run register
```

**在新项目中启用技能：**

```
/aisk/sync
```

**将临时技能提升为全局技能：**

```
/aisk/create-skill .claude/commands/aisk/my-experiment.md
# → 在 ai-skills 仓库中 git commit
# → 在其他项目中 /aisk/sync
```
