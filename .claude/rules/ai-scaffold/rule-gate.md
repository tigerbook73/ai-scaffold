---
paths:
  - "ai-units/*/rules/*.md"
---

# Rule Guard File Conventions

Rule guard files are installed to the target project and activate as Claude rules based on their `paths:` frontmatter.

## Required Frontmatter

Every rule guard file must have a `paths:` frontmatter field (plain YAML array or `AISF:CUSTOM` block):

```yaml
---
paths:
  - "**/*.ext"
---
```

## AISF:CUSTOM Blocks

Use `AISF:CUSTOM` blocks for frontmatter fields that should be customized per-project during installation. The installer prompts the user to fill in the value:

```yaml
---
# AISF:CUSTOM name="paths" hint="describe how to derive the value"
paths: ["**/*.placeholder"]
# AISF:CUSTOM:END
description: short description of what this rule does
---
```

- `name`: the frontmatter key being customized
- `hint`: instruction shown to the AI when generating the value
- The placeholder value after the key is replaced by the installer

## Content

- Rule content follows Claude's rule file format: plain markdown, activated when paths match
- Keep rules concise and actionable — avoid prose explanations
- `description:` frontmatter is optional but recommended for clarity
