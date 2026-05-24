# check-arch

Check the alignment between code changes in the specified scope and architecture decisions.

**Constraints**

- [Read-only] Only reads code within the specified scope; does not modify any files
- Does not auto-update rules; only outputs deviations and suggested directions
- Each output item must point to a specific decision in `.ai-skills/architecture.md`; generic code quality suggestions are not output

**Input** (`$ARGUMENTS`, optional)

- No argument → auto-detect: if working tree has changes (staged/unstaged/untracked) → same as `changes`; otherwise → same as `commit 1`
- `help` → list all available modes, then stop
- `ALL` → full project file tree (intelligently ignores auto-generated code)
- `changes` → all working tree changes: `git diff` (unstaged) + `git diff --cached` (staged) + untracked new files (`git ls-files --others --exclude-standard`)
- `commit [N|hash]` → files changed between that point and current worktree:
  - `commit` or `commit 1` → HEAD~1 to current (`git diff HEAD~1`)
  - `commit N` → HEAD~N to current (`git diff HEAD~N`)
  - `commit <hash>` → `<hash>` to current (`git diff <hash>`)
- `<path>` → current content of files under that directory/file

**Steps**

1. Read `.ai-skills/architecture.md` (if it does not exist, prompt the user to run `refresh-arch` first, then stop)
2. Parse `$ARGUMENTS` and determine the review scope; retrieve the corresponding files or diff content
3. For each decision in `.ai-skills/architecture.md`, check whether the code exhibits the anti-pattern described in its Counter-example; if so, record it as a deviation
4. Output results following the output format below

**Output format**

```
Review scope: <scope description>

[architecture.md · Auth Pattern] src/app/admin/page.tsx:8 — queries DB directly, should go through the server/data/ layer
[architecture.md · Embedding Router] src/lib/ingest/pipeline.ts:42 — references bge.ts directly, should import from router.ts

No deviations: ✅ Code in review scope is consistent with architecture decisions

---
Scope: <scope description> | Violations: 2
Scope: changes (2 modified, 1 staged, 1 untracked) | No violations ✅
```
