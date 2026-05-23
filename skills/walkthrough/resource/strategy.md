# Walkthrough Strategy

Three strategy sections referenced by the walkthrough skills. Update these independently without touching the skill flow files.

---

## Analysis Strategy

Read context documents in this priority order after obtaining the diff. Stop at the level that provides sufficient context for grouping.

**Priority 1 — Design documents** (read if present, always):

- Glob `docs/tasks/*/design*.md` — covers `design.md`, `design-step1.md`, `design-step2.md`, etc.
- Read all matching files. These map the changes to design steps and drive grouping in Mode A.

**Priority 2 — Project conventions** (always read):

- `CLAUDE.md` in the project root.
- If `CLAUDE.md` itself appears in the diff, use its pre-change content (the `-` lines in the diff) as the architectural baseline for analyzing other files. Use the post-change content to understand why the conventions changed.

**Priority 3 — Anchor files** (read only when needed):

- For each directory that contains changed files: check for `README.md`, `types.ts`, `index.ts`.
- Read these only when the module's purpose or interface boundary is unclear from the diff alone, or when the directory has ≥ 3 changed files.

---

## Grouping Strategy

Choose the mode based on whether design documents were found.

### Mode A — With design documents

- Map each changed file to its corresponding design step based on the step's "主要变更" section.
- Create one group per design step that has at least one associated change.
- Label each group after the step title: `Step N: {title}`.
- Order groups by step number ascending.
- If a single step maps to too many files (estimated walkthrough output > 300 lines), split it into sub-groups labeled `Step N-a`, `Step N-b`, etc.

### Mode B — Without design documents

Group by dependency layer, bottom-up (present lower layers first):

1. **Foundation** — types, constants, configuration, schema definitions
2. **Core logic** — business logic, state management, utilities, helpers
3. **Interfaces** — API handlers, CLI entry points, UI components, external integrations

Rules:

- Aim for 2–5 files per group; never put a single file alone unless it is large and self-contained.
- If a single group would produce more than 300 lines of walkthrough output, split it further by sub-module or functional boundary.
- Label groups by layer or functional boundary (e.g., "Resource Templates", "Skill Commands", "Integration Config").
- When a file sits at the boundary between layers, assign it to the lower layer.

---

## Presentation Format

Use this template for every group file (`g{N}.md`). Write in the analysis language (Chinese if the project uses Chinese).

```
## G{N} — {label}

[承接] How this group fits the overall change and how it connects to the previous group. For G1, explain its role in the full change.

[核心变更] The most important before/after changes from the diff. Extract directly from the diff — do not re-read source files unless a complete function context is needed to explain a subtle point.

[设计意图] Why this approach was chosen. If design documents exist, cite the relevant step's 目标 or 验收条件. Otherwise, infer from the diff and context documents.

[非显然细节] Hidden constraints, subtle invariants, non-obvious decisions, or workarounds that a reader would otherwise miss. Omit this section if nothing qualifies.

---
G{N} 完成？
```
