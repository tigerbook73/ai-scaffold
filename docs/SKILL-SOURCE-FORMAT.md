# Skill Source Format

This document defines the canonical source format for repository skill files. Agent-specific rule files may refer to this document, but this document is the source of truth for generated skill format resources.

## Placement

SK files must be placed directly under `skills/*/` (one level deep). Files at `skills/SK-*.md` or `skills/*/resource/SK-*.md` are misplacements and should not be treated as valid skill commands.

<!-- EXTRACT:skill-format:start -->

## Mandatory Rules

- **Language**: All content must be written in English
- **H1 title**: `# command-name` in kebab-case — matches the filename minus the `SK-` prefix and `.md` extension
- **Description**: One blank line after H1, then a one-sentence summary. If additional description is needed, add another blank line followed by more text.
- **Input**: Include when the skill accepts arguments; use a bold `**Input**` heading in Compact, `## Input` section heading in Structured; prefer descriptive argument names (`$skill-name`, `$file-path`, etc.) when the input structure is clear; `$ARGUMENTS` is acceptable for open-ended or ambiguous input; omit otherwise
- **Constraints**: Include when the skill has write operations or important behavioral limits; describe write scope (name specific files when known, otherwise describe the boundary); omit otherwise
- **Steps**: Required in all skill files; use `**Steps**` (bold) in Compact, `## Steps` (heading) in Structured

## Format Tiers

| Tier           | When to use                                                               |
| -------------- | ------------------------------------------------------------------------- |
| **Compact**    | Steps <= 5 AND each step <= 3 lines AND no sub-modes                      |
| **Structured** | Steps > 5, OR any step > 3 lines, OR multiple sub-modes (Mode 1 / Mode 2) |

## Compact Template

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

## Structured Template

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

<!-- EXTRACT:skill-format:end -->
