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

- Map each changed file to its corresponding design step based on the step's "Key changes" section.
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

[Context] How this group fits the overall change and how it connects to the previous group. For G1, explain its role in the full change.

[Key changes]
Break into one `###` subsection per meaningful change (type, function, config entry, etc.):

### {item name}

Before/after code snippet extracted directly from the diff.

- **Modified items**: show the relevant changed lines from the diff; omit unchanged surrounding context beyond what aids understanding.
- **New items (purely additive)**: do not reproduce the full addition. Show only the core section — primary entry point, key function/class signature, or central algorithm — targeting 10–30 lines. Omit boilerplate, imports, and obvious scaffolding. Readers can open the file directly for the full content.

Explain what changed AND why — inline in the same paragraph. Do not separate "what" from "why".

▎ 对比：{comparison with a similar pattern already in the codebase} — add this callout when a reader might conflate this item with something similar, or when the contrast clarifies a design decision. Omit if no meaningful comparison exists.

(Repeat `###` subsections for each meaningful item.)

For groups in the foundation layer (types, constants, schema definitions), append after all subsections:

[层间关系]
Show which modules depend on this group's output, as a downward arrow chain:
  {this group's module} → {direct dependents} → {their dependents}

[Design intent] Why this overall approach was chosen for the group. If design documents exist, cite the relevant step's goal or acceptance criteria. Otherwise, infer from the diff and context documents. Keep to 2–4 sentences.

---
G{N} 讲完，继续 G{N+1}？
```
