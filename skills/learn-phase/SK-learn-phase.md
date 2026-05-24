# learn-phase

Walk through the code implemented in the current Phase, grouped by layer, to help understand design decisions and implementation details.

**Usage**: `/aisk/learn-phase [group]`

---

## Input

`$group` (optional)

- No argument → full walkthrough starting from G1
- Group number (e.g. `G3`) → resume from that group

## Steps

### Step 1 — Restore Context

Find the active Phase document directory (a directory under `docs/features/` **without** a `-` prefix):

1. Read `PROGRESS.md`: understand the deliverables checklist and notes
2. Read `DESIGN.md`: understand architectural decisions and module groupings

If the user specified a starting group (e.g. `G3`), skip all groups with a lower number.

### Step 2 — Determine Groups

Use the groupings already defined in `DESIGN.md` when available. If the document has no explicit groupings, organize files bottom-up by layer, 2–4 related files per group:

1. **Infrastructure layer**: constants, type definitions, utility functions
2. **Data access layer**: GraphQL queries/mutations, Shopify client functions
3. **Server logic layer**: Server Actions, Route Handlers
4. **Component layer**: Server Components → Client Components (outer to inner)
5. **Routing layer**: `page.tsx`, `loading.tsx`, `layout.tsx`

### Step 3 — Walk Through Each Group

**Before starting each group**: read all files in the group first, then begin the explanation.

**Each group explanation covers**:

- **Before/after comparison**: show key changes with `// before` / `// after` so the user sees "where it came from"
- **Design rationale**: explain _why_ this design was chosen, not just _what_ it does
- **Trade-offs**: if other approaches exist, explain why this one was selected
- **Cross-layer relationships**: explain how this group works with other layers
- **Non-obvious details**: call these out explicitly (e.g. version-compatibility constraints, hidden invariants)

**Pacing**:

- After each group, stop and output: **G{N} done — continue to G{N+1}?**
- Wait for user confirmation before moving on; never explain all groups at once
- User follow-up questions are part of the walkthrough — answer them fully before asking to continue

### Step 4 — After All Groups

Output a learning summary for this Phase:

```
## Phase {N} Learning Summary

| Group | Files | Core Concepts |
|---|---|---|
| G1 | ... | ... |
...

**New concepts introduced in this Phase**: <list>
**Connection to the previous Phase**: <explain>
```

Then ask whether the user wants to update the learning progress record (memory).
