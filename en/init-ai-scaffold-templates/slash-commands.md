# Claude Code Slash Command Templates

## `.claude/commands/check-conventions.md`

```markdown
# /check-conventions — Convention Compliance Review

## Steps

1. **Confirm scope**
   Ask the user: review recent git diff, or a specific file/directory?
   Monorepo: confirm which package is being reviewed.

2. **Load relevant conventions**
   - Single-package: load relevant files from `docs/conventions/`
   - Monorepo: load root shared conventions + current package-specific conventions; package-specific rules take precedence

3. **Check each item**
   - [ ] Naming conventions (file names, variable names, component names)
   - [ ] TypeScript rules (strict mode, no any, return types)
   - [ ] Directory structure (files in correct locations)
   - [ ] Test coverage (any production tests needed?)
   - [ ] Comment rules (only explain "why", not "what")
   - [ ] Architecture constraints (any prohibited patterns violated?)
   - [ ] New dependencies (recorded in architecture.md?)
   - [ ] Monorepo: any cross-package dependency rules violated?

4. **Output report**

   ## Convention Review Report

   Scope: <files/directories>
   Conventions applied: <list of convention files>

   ### Compliant
   - <details>

   ### Needs attention
   - <issue> -> Suggestion: <improvement>

   ### Violation
   - <convention file + section> — <specific violation> -> Must fix: <direction>
```

## `.claude/commands/update-convention.md`

```markdown
# /update-convention — Convention Conflict Resolution Flow

## Steps

1. **Classify the conflict**
   - Type A: implementation does not match convention -> adjust implementation
   - Type B: convention is outdated or does not apply -> update convention
   - Type C: genuinely new scenario -> add a new convention entry

   Ask the user which type this is.

2. **Type A — Adjust implementation**
   Identify the specific non-compliant location and provide a conforming rewrite.

3. **Type B / C — Update convention**
   - Draft the proposed change and show it to the user for confirmation
   - Determine scope: if it affects one package, update package-specific conventions; if it affects multiple packages, update root shared conventions
   - If the change is significant, ask whether an ADR is needed
   - Once confirmed, update the relevant convention file(s)

4. **Sync check**
   Follow the `/check-conventions` flow on the modified files to confirm no new conflicts were introduced.
```

## `.claude/commands/adr.md`

```markdown
# /adr — Create Architecture Decision Record

## Steps

1. **Gather info**
   Ask the user:
   - What is this decision? (one-sentence description)
   - Monorepo: is this global or scoped to a specific package?
   - Why is this decision needed?
   - What alternatives were considered?
   - What was chosen and why?
   - What are the known consequences or trade-offs?

2. **Determine filename and number**
   Read `docs/adr/` to find the highest existing number; increment by one.
   - Global decision: `docs/adr/<four-digit-number>-<kebab-case-title>.md`
   - Package-scoped decision: `docs/adr/<four-digit-number>-<pkg-name>-<kebab-case-title>.md`

3. **Generate file**

   # <Number>. <Title>

   **Status**: Accepted
   **Date**: <YYYY-MM-DD>
   **Scope**: global / <package name>

   ## Context

   <Why this decision was needed>

   ## Decision

   <What was chosen and why>

   ## Alternatives Considered

   - **<Option A>**: <brief description and reason for not choosing>
   - **<Option B>**: <brief description and reason for not choosing>

   ## Consequences

   <Impact, trade-offs, known limitations>

4. **Update index**
   Append a new entry to the decision index table in `docs/adr/README.md`.
```
