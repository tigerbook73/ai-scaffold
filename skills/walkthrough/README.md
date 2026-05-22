# walkthrough Skill Group

Skills for walking through code changes or file content in structured, resumable sessions.

## Skills

**`create-walkthrough`** — Start a new walkthrough: confirm the target (uncommitted changes, a commit range, or a file/directory), generate groups, and immediately begin presenting the first group. State is saved to `.ai-skills/data/walkthrough.json` so the session can be resumed later.

**`start-walkthrough`** (`resume-walkthrough` is an alias) — Resume a walkthrough from the state file at the start of a new session. Validates that the recorded target and groups are still current, then continues from the last completed group.

## Typical workflow

```
# Start a walkthrough of uncommitted changes
/aisk/create-walkthrough

# Start a walkthrough of a specific commit range
/aisk/create-walkthrough main..HEAD

# In a new session, resume where you left off
/aisk/start-walkthrough
```

## State file

`.ai-skills/data/walkthrough.json` — local only, gitignored. One key per branch; keys are removed automatically when a walkthrough completes. All access goes through `resource/walkthrough-state.ts`.
