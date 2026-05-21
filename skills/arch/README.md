# arch Skill Group

Two complementary skills for maintaining and enforcing architecture decisions.

## Skills

**`refresh-arch`** — Scan the codebase and generate or update `.ai-skills/architecture.md`, which records design decisions that are easy to violate silently. Supports scoping by path, commit hash, number of commits, or full project (`ALL`). Always shows a diff and requires user confirmation before writing.

**`check-arch`** — Read `.ai-skills/architecture.md` and check whether code changes in the specified scope violate any recorded decision. Read-only; outputs deviations with file:line pointers and links each finding to the relevant decision. Supports the same input scopes as `refresh-arch`.

## Typical workflow

```
# First-time setup
/aisk/refresh-arch ALL

# After each commit (or on demand)
/aisk/check-arch
```
