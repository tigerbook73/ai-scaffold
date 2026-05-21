# check-arch

Check the alignment between code changes in the specified scope and architecture decisions.

**Constraints**

- [Read-only] Only reads code within the specified scope; does not modify any files
- Does not auto-update rules; only outputs deviations and suggested directions
- Each output item must point to a specific decision in `.ai-skills/architecture.md`; generic code quality suggestions are not output

**Input** (`$ARGUMENTS`, defaults to the most recent commit if not provided)

- No argument → most recent commit (`git diff HEAD~1`)
- Path (e.g. `src/`) → current files under that directory
- Commit hash → changes in that commit (`git diff <hash>~1 <hash>`)
- Number (e.g. `3`) → changes across the last N commits (`git diff HEAD~N`)
- ALL → full project (intelligently ignores auto-generated code)

**Steps**

1. Read `.ai-skills/architecture.md` (if it does not exist, prompt the user to run `refresh-arch` first, then stop)
2. Parse the input and determine the review scope
3. Retrieve the files or diff content within the scope
4. Compare against the decisions in `.ai-skills/architecture.md` and identify deviations
5. Output results

**Output format**

```
Review scope: most recent 1 commit (abc1234)

[architecture.md · Auth Pattern] src/app/admin/page.tsx:8 — queries DB directly, should go through the server/data/ layer
[architecture.md · Embedding Router] src/lib/ingest/pipeline.ts:42 — references bge.ts directly, should import from router.ts

No deviations: ✅ Code in review scope is consistent with architecture decisions
```
