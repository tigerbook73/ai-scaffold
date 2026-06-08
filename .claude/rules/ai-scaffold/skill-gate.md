---
paths:
  - "ai-units/*/skills/*.md"
---

# Skill File Conventions

## Placement

Skill files must be placed directly under `ai-units/*/skills/` (one level deep). The file name must match the skill command name in kebab-case with a `.md` extension.

## 强制规则

- **Language**: 文件内容必须和本模板使用的语言一致
- **H1 标题**：`# command-name`，kebab-case —— 与文件名去掉 `.md` 扩展名后一致
- **描述**：H1 后空一行，然后写一句话摘要。若需要额外描述，再空一行后继续。
- **输入**：skill 接受参数时必须包含；Compact 格式使用加粗 `**Input**` 标题，Structured 格式使用 `## Input` 节标题；输入结构明确时优先使用描述性参数名（`$skill-name`、`$file-path` 等）；开放式或模糊输入可使用 `$ARGUMENTS`；否则省略
- **约束**：skill 有写操作或重要行为限制时必须包含；描述写入范围（已知时指定具体文件，否则描述边界）；否则省略
- **步骤**：所有 skill 文件必须包含；Compact 格式使用 `**步骤**`（加粗），Structured 格式使用 `## 步骤`（标题）

## 格式等级

| 等级           | 适用场景                                                           |
| -------------- | ------------------------------------------------------------------ |
| **Compact**    | 步骤数 ≤ 5，且每步 ≤ 3 行，且无子模式                              |
| **Structured** | 步骤数 > 5，或任一步骤 > 3 行，或存在多个子模式（Mode 1 / Mode 2） |

## Compact 模板

```markdown
# command-name

One-sentence description.

**Constraints**

- [Write operation] ... (omit this section if no constraints)

**Input** (`$path`, optional)

- No argument -> ...
- Path (e.g. `src/`) -> ...

**Steps**

1. ...
2. ...
```

## Structured 模板

```markdown
# command-name

One-sentence description.

**Usage**: `/aisk/command-name [args]` (omit if no fixed usage pattern)

---

## Constraints

- [Write operation] ...

## Input

- No argument -> ...
- Path -> ...

## Steps

### Mode 1 — Name

1. ...
2. ...

### Mode 2 — Name

1. ...

---

## Notes

- ... (omit this section if not needed)
```
