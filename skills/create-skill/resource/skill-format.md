# Skill Format Specification

All skills and resource files in this repository must follow the rules below.
Format structure (Compact / Structured) applies to command-type skills only; resource files have no structural constraints.

---

## Mandatory Rules (all files)

- **English**: All content (descriptions, step text, notes, etc.) must be written in English. Translate before submitting if needed.
- **H1 title**: Must be `# command-name` in kebab-case, matching the exact command invocation name.
- **One-sentence description**: Immediately after H1, no blank line in between.
- **Input section**: Use `**Input** (\`$ARGUMENTS\`, optional)` when the skill accepts arguments; omit entirely when it does not.
- **Constraints section**: Required when the skill performs write operations or has important behavioral limits.

---

## Format Tiers

Choose based on complexity:

| Tier | When to use |
|---|---|
| **Compact** | Steps ≤ 5 AND each step ≤ 3 lines AND no sub-modes |
| **Structured** | Steps > 5, OR any step > 3 lines, OR multiple sub-modes (Mode 1 / Mode 2) |

---

## Compact Template

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

---

## Structured Template

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
