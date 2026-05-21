# arch Skill Group Design

The `arch` skill group contains two complementary skills: `refresh-arch` (generate/update the architecture decision document) and `check-arch` (check whether code aligns with architecture decisions).

---

## Core Design Philosophy

An AI's rule compliance during coding comes from **context**, not system-level enforcement. This means:

- We do not rely on static rule files to block certain operations
- Instead, the AI actively checks each action against recorded architecture decisions before proceeding

`architecture.md` is the core carrier of this mechanism: it records design choices that "can be violated, but should not be."

**Inclusion criteria** (all three must be satisfied simultaneously):
1. There is a clear "what not to do" (a violable choice)
2. There is no immediate signal when violated (tools do not report it; impact is delayed)
3. Understanding "why it was designed this way" requires reading multiple files

Content that does not meet all three criteria is excluded — standard usage of the tech stack and purely descriptive content without a counter-example are not architecture decisions.

---

## refresh-arch Design

### Why this skill is needed

`architecture.md` becomes outdated as the codebase evolves. New decisions emerge, old ones become invalid. `refresh-arch` delegates the repetitive "scan → extract → update" work to the AI, keeping the document consistent with the codebase.

### Key design decisions

**Show diff before writing; require user confirmation**
Adding or removing architecture decisions is a high-impact operation. Automatic writes can introduce incorrect judgements; user confirmation is a necessary safety valve.

**Err on the side of fewer entries**
When in doubt, do not add an entry. Too many entries dilute the document's value and reduce the precision of `check-arch`.

**Support multiple input scopes**
No argument (latest commit), path, commit hash, last N commits — covering the main scenarios of daily development, avoiding full scans every time.

### architecture.md format

Each decision uses a fixed format:
```
**[Decision title]**
Counter-example: what not to do (one sentence)
Rationale: why it was designed this way
Consequence: what happens if violated
```

The intent of the three-part structure: the counter-example tells the AI what is wrong, the Rationale provides context, and the Consequence states the cost. Only when all three are present can the AI make the correct judgement in new situations.

---

## check-arch Design

### Why "read-only + point to a specific decision"

`check-arch` is a diagnostic tool, not an execution tool. Its responsibility is to find deviations and point them out — it does not auto-fix.

Output must point to a specific decision in `architecture.md` (rather than generic code quality suggestions), because:
- Generic suggestions are prone to false positives, reducing signal-to-noise ratio
- Specific pointers let the user trace "why this is a problem"
- Prevents `check-arch` from becoming a general-purpose lint tool with blurred responsibilities

### Division of labor with refresh-arch

| Skill | Responsibility | Write operations |
|-------|----------------|-----------------|
| `refresh-arch` | Maintain `architecture.md` | Yes (limited to architecture.md) |
| `check-arch` | Use `architecture.md` for review | No |

The two are complementary and do not trigger each other: after `check-arch` finds a deviation, the user decides whether `refresh-arch` needs to update the document.
