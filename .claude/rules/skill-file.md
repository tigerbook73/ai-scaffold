---
paths:
  - "skills/*/*.md"
---

# Skill File Conventions

Applies to all skill command files under `skills/` (excludes `README.md` and `resource/` subdirectory files).

---

## Directory Structure

- Skill files are placed under `skills/`, grouped into subdirectories (`arch/`, `task/`, etc.)
- `README.md` files are automatically skipped and not installed — do not treat them as skill files
- Resource files (read by skills at runtime) go in a `*/resource/` subdirectory; they stay in the repo and are not copied anywhere

---

## File Format

> The rules below are derived from `skills/create-skill/resource/skill-format.md`, which is the authoritative source. If you detect any divergence in meaning between this file and `skill-format.md`, report it to the user before proceeding.

### Mandatory Rules (all skill files)

- **Language**: All content must be written in English
- **H1 title**: Must be `# command-name` in kebab-case, matching the exact command invocation name
- **One-sentence description**: Must appear immediately after H1 — no blank line between them
- **Input section**: Include `**Input** ($ARGUMENTS, optional)` when the skill accepts arguments; omit entirely when it does not
- **Constraints section**: Required when the skill performs write operations or has important behavioral limits

### Format Tiers

Choose based on complexity:

| Tier           | When to use                                                               |
| -------------- | ------------------------------------------------------------------------- |
| **Compact**    | Steps ≤ 5 AND each step ≤ 3 lines AND no sub-modes                        |
| **Structured** | Steps > 5, OR any step > 3 lines, OR multiple sub-modes (Mode 1 / Mode 2) |

### Compact Template

```markdown
# command-name
One-sentence description.

**Constraints**

- [Write operation] Only writes to ... (omit this section if no constraints)

**Input** (`$ARGUMENTS`, optional)

- No argument → ...
- Path (e.g. `src/`) → ...

**Steps**

1. ...
2. ...
```

### Structured Template

```markdown
# command-name
One-sentence description.

**Usage**: `/aisk/command-name [args]` (omit if no fixed usage pattern)

---

## Constraints

- [Write operation] Only writes to ...

## Input

`$ARGUMENTS` can take the following forms:

- No argument → ...
- Path → ...

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
