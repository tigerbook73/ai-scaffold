# walkthrough Skill Group

Structured code walkthrough: analyzes all changes in a single pass, pre-generates group content, presents a global overview, then walks through group by group.

## Skills

**`create-walkthrough`** — Create a new walkthrough. Confirms target range, checks out the target version if needed, reads all diffs and context documents in one pass, groups the changes, pre-generates walkthrough content, shows a global overview, then enters the interactive loop.

**`start-walkthrough`** (`resume-walkthrough` is an alias) — Resume a walkthrough from the state file. Re-run at the start of each new session to restore progress.

## Input format

```
/aisk/create-walkthrough              # all uncommitted changes, or latest commit if tree is clean
/aisk/create-walkthrough C1           # changes introduced by commit C1 (vs C1~1)
/aisk/create-walkthrough C1..         # from C1 to current worktree
/aisk/create-walkthrough C1..C5       # from C1 to C5 (cumulative)
```

## Navigation (during walkthrough)

```
wtgroup next      # advance to next group
wtgroup prev      # go back to previous group
wtgroup G3        # jump to group 3
wtgroup list      # list all groups and completion status
wtgroup overview  # re-display global overview
wtgroup finish    # finish and optionally delete state
```

## State layout

```
{cwd}/.ai-skills/walkthrough/{stateKey}/
  index.json   ← progress metadata (managed by walkthrough-state.ts)
  g1.md        ← pre-generated walkthrough content for group 1
  g2.md        ← pre-generated walkthrough content for group 2
  ...
```

`{stateKey}` = current branch name with `/` replaced by `-`.

## Resource files

- `resource/strategy.md` — analysis, grouping, and presentation strategies (tune this without touching skill flow files)
- `resource/walkthrough-loop.md` — shared interactive loop used by both `create-walkthrough` and `start-walkthrough`
- `resource/walkthrough-state.ts` — CLI script for managing `index.json`
- `resource/types.ts` — TypeScript types for the state index
