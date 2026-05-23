# walkthrough2 Skill Group

Structured code walkthrough with pre-analysis: analyzes all changes in a single pass, pre-generates rich group content, then presents group by group with a global overview first.

## Key improvements over walkthrough

- **Single-pass analysis**: reads all changes and context documents once before presenting anything
- **Content-aware grouping**: groups based on diff content and design documents, not file names
- **File-based state**: pre-generated group content stored in separate markdown files (`g1.md`, `g2.md`, ...)
- **Global overview first**: presents a full change map before diving into groups
- **Checkout-based**: switches to the target version so VS Code and the Read tool both see the right files
- **Detached HEAD resume**: locates state by commit hash when the branch name is unavailable

## Skills

**`create-walkthrough2`** — Create a new walkthrough: confirm target, checkout if needed, analyze all changes, generate group content, present overview, then walk through group by group.

**`start-walkthrough2`** (`resume-walkthrough2` is an alias) — Resume a walkthrough from the state file. Re-run at the start of each new session.

## Input format

```
/aisk/create-walkthrough2              # all uncommitted changes, or latest commit if tree is clean
/aisk/create-walkthrough2 C1           # changes introduced by commit C1 (vs C1~1)
/aisk/create-walkthrough2 C1..         # from C1 to current worktree
/aisk/create-walkthrough2 C1..C5       # from C1 to C5 (cumulative)
```

## State layout

```
{cwd}/.ai-skills/walkthrough2/{stateKey}/
  index.json   ← progress metadata (managed by walkthrough2-state.ts)
  g1.md        ← pre-generated walkthrough content for group 1
  g2.md        ← pre-generated walkthrough content for group 2
  ...
```

`{stateKey}` = current branch name with `/` replaced by `-`.

## Resource files

- `resource/strategy.md` — analysis, grouping, and presentation strategies (tune this without touching skill flow files)
- `resource/walkthrough2-state.ts` — CLI script for managing `index.json`
- `resource/types.ts` — TypeScript types for the state index
