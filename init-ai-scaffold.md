# /init-ai-scaffold — Initialize AI Engineering Scaffold

Sets up a standardized AI-assisted development convention system in your project. Supports new projects, existing projects, and monorepos. Generates: multi-tool config files, convention docs, ADR system, and slash commands.

**All generated Markdown convention files are written in English.**

---

## Background: Core Concepts

### Test Classification

- **Learning tests**: Validate understanding of third-party library/API behavior. Do not run in CI; delete freely.
- **Production tests**: Verify business logic correctness. Run in CI; maintain long-term as a refactoring safety net.

### Project Phase System (optional, mainly for new projects)

| Phase    | Name                | Description                                         |
| -------- | ------------------- | --------------------------------------------------- |
| Phase -1 | AI Scaffold         | Run this command to establish the convention system |
| Phase 0  | Foundation          | Project skeleton, CI/CD, base dependencies          |
| Phase 1+ | Feature Development | Iterative feature delivery                          |

Existing projects may skip this or define custom phase descriptions in the info collection form.

### Monorepo Convention Layering Model

Monorepo projects use a two-layer convention system:

| Layer            | Location                       | Content                                                                                                                                 |
| ---------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Shared           | `docs/conventions/`            | Rules that apply to all packages (commit convention, cross-package dependency constraints, etc.)                                        |
| Package-specific | `<pkg-path>/docs/conventions/` | Rules that override or extend the shared layer for a specific package (e.g. component rules for frontend, API design rules for backend) |

Each package's `CLAUDE.md` leverages Claude Code's native recursive loading: when working inside a package directory, Claude Code automatically reads `CLAUDE.md` from that directory and all parent directories, so package-level and root-level rules are merged without any extra configuration. Package-specific rules take precedence on conflict.

---

## Step 0: Determine Project Type

**Part 1: New vs Existing project** (determines whether to go to 1A or 1B)

A project is **new** only if all of the following are true:

- No dependency manifest (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.)
- No source directories (`src/`, `app/`, `apps/`, `lib/`, etc.)
- No existing business code files

If any condition is not met, treat it as an existing project.

**Part 2: Single-package vs Monorepo** (determines which template to use within 1A/1B)

Treat as a monorepo if any of the following exist:

- `pnpm-workspace.yaml` / `turbo.json` / `nx.json` / `lerna.json`
- `workspaces` field in `package.json`
- An `apps/` or `packages/` directory whose subdirectories each contain their own `package.json`

---

## Step 1A: New Project — Output Info Collection Template

Based on Part 2 of Step 0, output the appropriate template. Ask the user to fill it in and paste it back, or provide a file path.

---

### Single-package Template

```markdown
# Project Info Collection

## Basic Info

**Project name**:
**Project description**:

## Tech Stack

**Frontend framework**: (e.g. Next.js 15 App Router, React 19, Vue 3)
**UI library**: (e.g. shadcn/ui, Tailwind CSS, MUI)
**Backend / API layer**: (e.g. tRPC, REST, GraphQL, Next.js Route Handlers)
**Database**: (e.g. PostgreSQL + Drizzle, MongoDB + Mongoose)
**Other key dependencies**:

## Directory Structure

Describe or paste your intended top-level directory structure (rough is fine):

(Paste a directory tree here, or describe in words — e.g. "uses src/ directory, organized by feature module")

## AI Tool Support

- [ ] Claude Code (primary, required)
- [ ] OpenAI Codex / ChatGPT (feature development)
- [ ] GitHub Copilot (IDE autocomplete only)
- [ ] Other:

## Confirmed Architecture Decisions

Each independent technology choice or design constraint counts as one ADR. List them:

1.
2.
3.

## Project Phase System

- [ ] Use default: Phase 0 Foundation → Phase 1+ Feature Development
- [ ] Custom phase description (see below):
- [ ] No phase model

Custom phase description (if selected):

## Other Architecture Info / Background

(Free-form: team conventions, design principles, key constraints, links to reference docs;
feel free to paste large blocks — design docs, ADR drafts, team wiki excerpts, etc.)
```

---

### Monorepo Template

```markdown
# Project Info Collection (Monorepo)

## Basic Info

**Project name**:
**Project description**:
**Monorepo tool**: (e.g. Turborepo, Nx, pnpm workspaces)

## Package List

Fill in one section per app or package:

---

### Package: <name> (e.g. web / api / admin)

**Path**: (e.g. apps/web)
**Type**: (frontend / backend / shared library / tooling)
**Frontend framework**:
**UI library**:
**Backend / API layer**:
**Database**:
**Other key dependencies**:
**Directory structure**: (paste directory tree or describe)

---

### Package: <name>

(Repeat the structure above)

---

## Shared Config

**Shared code location**: (e.g. packages/shared, packages/ui)
**Cross-package dependency rules**: (e.g. api must not import web; shared must not import apps)
**Unified tooling**: (ESLint config, TypeScript base config, test framework, etc.)

## AI Tool Support

- [ ] Claude Code (primary, required)
- [ ] OpenAI Codex / ChatGPT (feature development)
- [ ] GitHub Copilot (IDE autocomplete only)
- [ ] Other:

## Confirmed Architecture Decisions

Each independent technology choice or design constraint counts as one ADR:

1.
2.
3.

## Project Phase System

- [ ] Use default: Phase 0 Foundation → Phase 1+ Feature Development
- [ ] Custom phase description (see below):
- [ ] No phase model

Custom phase description (if selected):

## Other Architecture Info / Background

(Free-form — paste as much as you like)
```

> Tip: The "Other Architecture Info" field accepts large amounts of content — design docs, ADR drafts, team wiki excerpts, etc. This context is used to generate more accurate convention files.

Once the user's input is received, proceed to **Step 2**.

---

## Step 1B: Existing Project — Index Project and Extract Info

### 1B-1. Conflict Detection (run first)

Before reading anything, check whether any of the following paths already exist:

**Root level**

```
CLAUDE.md
AGENTS.md
.github/copilot-instructions.md
docs/conventions/
docs/adr/
docs/features/
docs/refactors/
.claude/commands/
```

**Monorepo package level** (check per package if monorepo was detected)

```
<pkg-path>/CLAUDE.md
<pkg-path>/docs/conventions/
```

If any path exists, immediately list the conflicts and stop:

```
## ⚠️ Existing files/directories detected — initialization paused

The following conflict with scaffold target paths:

| Path | Type | Suggested action |
|------|------|-----------------|
| CLAUDE.md | file | Back up as CLAUDE.md.bak then overwrite / skip / merge manually |
| docs/conventions/ | directory | Review contents and decide per file |
| apps/web/CLAUDE.md | file (package-level) | Back up then overwrite / skip / merge manually |

Choose how to proceed:
1. **Decide per file** (default): confirm each conflict individually
2. **Back up all and continue**: back up all conflicting files as .bak, then overwrite automatically
3. **Skip all**: keep all existing files, only generate files that don't exist yet

Please reply with your choice (1 / 2 / 3) to continue.
```

Wait for explicit user input before continuing.

### 1B-2. Index the Project

Once conflicts are resolved, index the project:

**Single-package indexing**

- Read `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` etc. to identify framework, dependencies, tooling
- List top-level directory structure (2-3 levels deep)
- Check `README.md`, `CONTRIBUTING.md`, `.eslintrc`, `tsconfig.json` etc. for existing conventions
- Check for `docs/adr/` or similar; list existing decision titles
- Check `.github/workflows/`, `Dockerfile` etc. for CI/CD config
- Check for commitlint / semantic-release config to identify existing commit convention

**Monorepo additional indexing**

- Identify monorepo tool and workspace config
- List all apps / packages and their paths
- Run single-package indexing per package; summarize tech stack differences
- Extract root-level shared config (ESLint, TypeScript base config, turbo pipeline, etc.)
- Map cross-package dependencies from `dependencies` fields in each package's `package.json`

### 1B-3. Output Pre-filled Info Collection Form

Based on the index results, choose the appropriate format (single-package or monorepo, matching Step 1A), pre-fill known fields, and add at the top:

```
<!-- Pre-filled by project indexing — please review and edit as needed -->
```

> Tip: Please confirm whether the information is accurate. Edit and paste back as needed. The "Other Architecture Info" field welcomes large amounts of additional context.

Once the user confirms or edits the form, proceed to **Step 2**.

---

## Step 2: Create Directory Structure

Create the following directories (skip if already exists):

**All projects (root)**

```
.github/
docs/conventions/
docs/adr/
docs/features/
docs/refactors/
.claude/commands/
```

**Monorepo addition (one per app/package)**

```
<pkg-path>/docs/conventions/
```

---

## Step 3: Generate Config Files

Based on Step 0 results, generate only the matching version of each file. Do not include unused branches.

### Commit Convention Format

All projects use Conventional Commits. New projects adopt it by default; existing projects use whatever was detected during indexing.

**Single-package:**

```
type(scope): description

feat(auth): implement JWT refresh token
fix(ci): resolve pipeline timeout
chore(deps): upgrade drizzle to v0.30
```

**Monorepo:**

```
type(pkg/scope): description

feat(web/auth): implement login page
feat(api/auth): add JWT refresh endpoint
fix(shared/ui): fix Button hover state
```

> Note: When scope contains `/`, commitlint requires relaxed scope validation in `.commitlintrc` (`scope-case: [0]` or a custom regex). This note will be included in the generated `docs/conventions/coding.md`.

---

### 3a. CLAUDE.md

#### Single-package CLAUDE.md

```markdown
# <Project Name> — Project Conventions (Claude Code)

> This file supplements the global ~/.claude/CLAUDE.md and is merged with it.

## Current Phase

**Phase -1 (AI Scaffold) complete → Phase 0 (Foundation) starting**

Phase system: Phase -1 establishes conventions → Phase 0 builds skeleton → Phase 1+ iterates features.

## Convention System

Single source of truth: `docs/conventions/`

| File                               | Covers                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `docs/conventions/architecture.md` | Tech stack, architecture layers, prohibited patterns                        |
| `docs/conventions/coding.md`       | TypeScript rules, naming, comments, component boundaries, commit convention |
| `docs/conventions/testing.md`      | Test scope, tooling, file locations                                         |
| `docs/conventions/directory.md`    | Directory structure, file naming rules                                      |

[Append additional convention files based on tech stack, e.g. graphql.md]

### Convention Conflict Rule

Before implementing any feature, check the relevant conventions in `docs/conventions/`. If a conflict is found, describe it and wait for the user to decide whether to "adjust the implementation" or "update the convention" — do not proceed unilaterally.

## Working Docs

`docs/features/` and `docs/refactors/` provide task context for AI. They complement — not replace — GitHub Issues, Linear, Jira, or other project management tools.

### Feature Development

In progress: `docs/features/<feature-id>/`
Done: `docs/features/-<feature-id>/` (prefix with `-`)

Three files:

- `REQUIREMENTS.md`: requirements, acceptance criteria, scope boundaries
- `DESIGN.md`: technical approach, key decisions, data flow
- `PROGRESS.md`: task breakdown, current status, blockers

### Refactoring Work

In progress: `docs/refactors/<refactor-id>/`
Done: `docs/refactors/-<refactor-id>/` (prefix with `-`)

Three files:

- `MOTIVATION.md`: motivation, current problems, success criteria, scope
- `DESIGN.md`: refactor approach, migration path, risk assessment, rollback strategy
- `PROGRESS.md`: task breakdown, current status, blockers

## Available Slash Commands

| Command              | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `/check-conventions` | Review recent changes against conventions      |
| `/update-convention` | Guided flow for resolving convention conflicts |
| `/adr`               | Create a new Architecture Decision Record      |

## Commit Convention

Format: `type(scope): description`

Example: `feat(auth): implement JWT refresh token`
```

> When not using the Phase system, replace the "Current Phase" section with:
> `**Current phase**: <fill in based on actual situation, or delete this section>`

---

#### Monorepo Root CLAUDE.md

```markdown
# <Project Name> — Project Conventions (Claude Code) — Root

> This file defines shared rules for the monorepo root.
> Claude Code auto-loads CLAUDE.md recursively, so when working inside a package,
> root-level and package-level rules are merged automatically — no manual wiring needed.

## Current Phase

**Phase -1 (AI Scaffold) complete → Phase 0 (Foundation) starting**

Phase system: Phase -1 establishes conventions → Phase 0 builds skeleton → Phase 1+ iterates features.

## Monorepo Structure

| Package path      | Type           | Description         |
| ----------------- | -------------- | ------------------- |
| `apps/web`        | frontend       | [brief description] |
| `apps/api`        | backend        | [brief description] |
| `packages/shared` | shared library | [brief description] |

[Fill in based on actual package list]

## Convention Layers

- **Shared conventions** (this file): `docs/conventions/`
- **Package-specific conventions** (active when inside a package): `<pkg-path>/docs/conventions/`
- On conflict: package-specific conventions take precedence

## Shared Convention System

| File                               | Covers                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| `docs/conventions/architecture.md` | Monorepo-wide architecture, cross-package dependency constraints |
| `docs/conventions/coding.md`       | Cross-package coding standards, commit convention                |
| `docs/conventions/testing.md`      | Cross-package testing standards                                  |
| `docs/conventions/directory.md`    | Monorepo directory structure rules                               |

## Cross-Package Dependency Rules

[Fill in based on user input, for example:]

- `packages/shared` must not depend on any `apps/*`
- `apps/web` must not directly depend on `apps/api` (communicate via API layer)
- Any new cross-package dependency must be documented in `docs/conventions/architecture.md`

## Working Docs

`docs/features/` and `docs/refactors/` provide task context for AI. They complement — not replace — GitHub Issues, Linear, Jira, or other project management tools.

Features: `docs/features/<feature-id>/` (three files: REQUIREMENTS / DESIGN / PROGRESS)
Refactors: `docs/refactors/<refactor-id>/` (three files: MOTIVATION / DESIGN / PROGRESS)
Prefix directory name with `-` when done.

## Available Slash Commands

| Command              | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `/check-conventions` | Review recent changes against conventions      |
| `/update-convention` | Guided flow for resolving convention conflicts |
| `/adr`               | Create a new Architecture Decision Record      |

## Commit Convention

Format: `type(pkg/scope): description`

Example: `feat(web/auth): implement login page`
```

> When not using the Phase system, replace the "Current Phase" section with:
> `**Current phase**: <fill in based on actual situation, or delete this section>`

---

#### Monorepo Package-level CLAUDE.md (one per app/package)

```markdown
# <Package Name> — Conventions (Claude Code)

> This file defines package-specific rules for `<pkg-path>`, merged with root CLAUDE.md.
> Claude Code reads parent CLAUDE.md files recursively — no manual reference needed.
> Rules here take precedence over shared conventions; shared rules still apply where not overridden.

## Package Overview

**Type**: frontend / backend / shared library
**Responsibility**: [brief description]
**Tech stack**: [framework, UI library, key dependencies]

## Package-Specific Conventions

Before implementing, read root shared conventions first, then these (these take precedence):

| File                                          | Covers                                    |
| --------------------------------------------- | ----------------------------------------- |
| `<pkg-path>/docs/conventions/architecture.md` | Package architecture, prohibited patterns |
| `<pkg-path>/docs/conventions/coding.md`       | Package-specific coding rules             |
| `<pkg-path>/docs/conventions/testing.md`      | Package-specific testing rules            |
| `<pkg-path>/docs/conventions/directory.md`    | Package directory structure               |

## Convention Conflict Rule

If a conflict is found between implementation and conventions, describe the conflict and wait for the user to decide whether to "adjust the implementation" or "update the convention" — do not proceed unilaterally.
```

> When generating, remove table rows for convention files that were not actually created.

---

### 3b. AGENTS.md (Codex / ChatGPT)

AGENTS.md is OpenAI Codex CLI's native convention config file — the counterpart to CLAUDE.md. It does not support recursive loading, so all must-read files are listed explicitly.

Generate only the matching version based on Step 0 results.

---

#### Single-package version

```markdown
# <Project Name> — Project Conventions (Codex / ChatGPT)

## Must Read Before Starting

Before implementing any feature, read these files in order:

1. `docs/conventions/architecture.md` — tech stack and prohibited patterns
2. `docs/conventions/coding.md` — coding standards and naming conventions
3. `docs/conventions/directory.md` — directory structure and file locations
4. `docs/conventions/testing.md` — test scope and tooling
5. `docs/conventions/ai-workflow.md` — AI tool selection and convention conflict framework

[Also read any tech-stack-specific conventions, e.g. graphql.md]

## Convention Conflict Rule

If an implementation conflicts with a convention file:

1. Describe the conflict precisely (cite the file name and section)
2. Offer two options: "adjust implementation to match convention" or "update convention to reflect new decision"
3. Wait for the user to decide — do not proceed unilaterally

## Working Docs

`docs/features/` and `docs/refactors/` provide task context for AI. They complement — not replace — GitHub Issues, Linear, Jira, or other project management tools.

### Feature Development

In progress: `docs/features/<feature-id>/`, move to `docs/features/-<feature-id>/` when done

**Protocol when continuing an existing feature:**

1. Read `REQUIREMENTS.md` and `DESIGN.md`
2. Read `PROGRESS.md` to confirm current status and blockers
3. Update `PROGRESS.md` after completing incremental work

### Refactoring Work

In progress: `docs/refactors/<refactor-id>/`, move to `docs/refactors/-<refactor-id>/` when done

**Protocol when continuing an existing refactor:**

1. Read `MOTIVATION.md` to confirm scope and success criteria
2. Read `DESIGN.md` to understand the migration path and risks
3. Read `PROGRESS.md` to confirm current status and blockers
4. Update `PROGRESS.md` after completing incremental work

## Pre-commit Checklist

- [ ] Do code changes require updates to any convention file?
- [ ] Should new dependencies be recorded in `architecture.md`?
- [ ] Did this produce a new architecture decision that needs an ADR?
- [ ] Does `PROGRESS.md` reflect current status?

## Commit Convention

Format: `type(scope): description`

Example: `feat(auth): implement JWT refresh token`
```

---

#### Monorepo version

```markdown
# <Project Name> — Project Conventions (Codex / ChatGPT) — Monorepo

## Must Read Before Starting

Confirm which package you are working in, then read in order:

1. Shared: `docs/conventions/architecture.md` — overall architecture and cross-package constraints
2. Shared: `docs/conventions/coding.md` — cross-package coding standards
3. Shared: `docs/conventions/testing.md` — cross-package testing standards
4. Shared: `docs/conventions/directory.md` — monorepo directory conventions
5. Package-specific: `<pkg-path>/docs/conventions/` (all files; override shared rules where they overlap)
6. Shared: `docs/conventions/ai-workflow.md` — AI tool selection and convention conflict framework

[Also read any tech-stack-specific conventions, e.g. graphql.md]

## Convention Conflict Rule

If an implementation conflicts with a convention file:

1. Describe the conflict precisely (cite the file name and section)
2. Offer two options: "adjust implementation to match convention" or "update convention to reflect new decision"
3. Wait for the user to decide — do not proceed unilaterally

## Working Docs

`docs/features/` and `docs/refactors/` provide task context for AI. They complement — not replace — GitHub Issues, Linear, Jira, or other project management tools.

### Feature Development

In progress: `docs/features/<feature-id>/`, move to `docs/features/-<feature-id>/` when done

**Protocol when continuing an existing feature:**

1. Read `REQUIREMENTS.md` and `DESIGN.md`
2. Read `PROGRESS.md` to confirm current status and blockers
3. Update `PROGRESS.md` after completing incremental work

### Refactoring Work

In progress: `docs/refactors/<refactor-id>/`, move to `docs/refactors/-<refactor-id>/` when done

**Protocol when continuing an existing refactor:**

1. Read `MOTIVATION.md` to confirm scope and success criteria
2. Read `DESIGN.md` to understand the migration path and risks
3. Read `PROGRESS.md` to confirm current status and blockers
4. Update `PROGRESS.md` after completing incremental work

## Pre-commit Checklist

- [ ] Do code changes require updates to any convention file?
- [ ] Should new dependencies be recorded in `architecture.md`?
- [ ] Did this produce a new architecture decision that needs an ADR?
- [ ] Does `PROGRESS.md` reflect current status?
- [ ] Does this violate any cross-package dependency rule?

## Commit Convention

Format: `type(pkg/scope): description`

Example: `feat(web/auth): implement login page` / `fix(api/auth): fix token refresh`
```

---

### 3c. .github/copilot-instructions.md (only if user selected Copilot support)

```markdown
# <Project Name> — Copilot Autocomplete Rules

> This file is for IDE autocomplete only — not a complete development convention reference.

## TypeScript

- Always enable strict mode
- Never use `any`; use `unknown` instead
- All functions must declare return types

## Naming Conventions

- React components: PascalCase
- File names: kebab-case
- Variables / functions: camelCase
- Constants: UPPER_SNAKE_CASE

## Comment Rules

- No comments by default
- Only write comments to explain _why_, never _what_
```

---

## Step 4: Generate Convention Files

If information is insufficient for any file, generate a version with `[TBD]` placeholders.

### Single-package

Generate in `docs/conventions/`:

| File              | Key contents                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`       | Convention file index, update process, health check instructions                                                                                                                                                                                                                                                                                                                                                                                                           |
| `architecture.md` | Tech stack table, architecture layers, prohibited patterns, rules for adding new dependencies                                                                                                                                                                                                                                                                                                                                                                              |
| `coding.md`       | TypeScript rules, naming conventions, comment rules, export rules; Next.js projects must include: never add `use client` without a UI interaction need, prefer Server Components, `use client` only for event handlers, browser APIs, useState/useEffect; Conventional Commits format and commitlint config notes; **do not paste long code examples in this file — express rules as pseudocode or pattern descriptions, or reference a typical file path in the project** |
| `testing.md`      | Learning vs production test classification, what to test / what not to test, tool versions, file organization rules                                                                                                                                                                                                                                                                                                                                                        |
| `directory.md`    | Directory tree (based on user-provided structure); optionally append a new-file decision tree for complex structures                                                                                                                                                                                                                                                                                                                                                       |
| `ai-workflow.md`  | AI tool selection matrix, convention conflict decision framework                                                                                                                                                                                                                                                                                                                                                                                                           |

> `ai-workflow.md` is primarily for Codex / ChatGPT; Claude Code uses context to make workflow decisions and does not rely on this file.

> Existing projects: if conventions are extracted from `CONTRIBUTING.md` or README, integrate them and note the source. If a commitlint config exists, incorporate the commit convention into `coding.md`; if scope contains `/`, note the required `.commitlintrc` change.

### Monorepo

**Root shared conventions** (`docs/conventions/`)

| File              | Key contents                                                                                                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `README.md`       | Convention layering explained (shared + package-specific), update process                                                                                                                                                                                                      |
| `architecture.md` | Monorepo-wide architecture, package inventory and responsibilities, cross-package dependency rules, prohibited patterns                                                                                                                                                        |
| `coding.md`       | Cross-package coding standards (only rules that apply to all packages); commit convention and commitlint config notes; **do not paste long code examples in this file — express rules as pseudocode or pattern descriptions, or reference a typical file path in the project** |
| `testing.md`      | Cross-package testing standards                                                                                                                                                                                                                                                |
| `directory.md`    | Top-level monorepo directory tree, cross-package directory conventions                                                                                                                                                                                                         |
| `ai-workflow.md`  | AI tool selection matrix, cross-package development scenarios, convention conflict decision framework                                                                                                                                                                          |

**Package-specific conventions** (`<pkg-path>/docs/conventions/`)

Generate only files with substantive differences from the shared layer:

| Package type                    |               architecture.md                |                                                                                         coding.md                                                                                          |  testing.md  | directory.md |
| ------------------------------- | :------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :----------: | :----------: |
| Frontend (React / Next.js etc.) |  ✅ framework rules, component conventions   | ✅ component boundary rules; Next.js: never add `use client` without UI interaction need, prefer Server Components, `use client` only for event handlers, browser APIs, useState/useEffect | if different | if different |
| Backend (REST / GraphQL etc.)   | ✅ API design rules, service layer structure |                                                                                   ✅ service layer rules                                                                                   | if different | if different |
| Shared library / UI package     |                 if different                 |                                                                     ✅ public API design, backward compatibility rules                                                                     | if different | if different |

"if different": only create the file if the package-level rules differ from the shared conventions.

### Tech Stack-Specific Conventions (as needed)

Placement rule: if only one package uses a technology, put the file in that package's directory; if multiple packages use it, put it in the root shared conventions.

| Technology | File            | Key contents                                        |
| ---------- | --------------- | --------------------------------------------------- |
| GraphQL    | `graphql.md`    | Query/mutation/fragment rules, cache tags           |
| REST API   | `api-design.md` | Endpoint naming, error format, versioning strategy  |
| Database   | `database.md`   | Migration rules, naming conventions, query patterns |

---

## Step 5: Generate ADR Files

### docs/adr/README.md (required)

Contents:

- When to create an ADR (criteria: affects multiple modules, hard to reverse, involves external dependency selection)
- ADR granularity: one ADR per independent technology choice or design constraint
- Monorepo note: all decisions go in root `docs/adr/`; use a package name prefix in the filename to scope them (e.g. `0002-web-use-nextjs-app-router.md`); only create package-level ADR directories if the team explicitly requests it
- Decision index table (empty initially; maintained by `/adr` command)
- ADR file template

### Initial ADRs

Create one ADR file per confirmed architecture decision:

`docs/adr/<four-digit-number>-<kebab-case-title>.md`

Monorepo package-scoped example: `docs/adr/0002-web-use-nextjs-app-router.md`

> Existing projects: if `docs/adr/` already contains files, continue from the highest existing number. Do not overwrite existing files.

---

## Step 6: Generate Slash Commands

### .claude/commands/check-conventions.md

```markdown
# /check-conventions — Convention Compliance Review

## Steps

1. **Confirm scope**
   Ask the user: review recent git diff, or a specific file/directory?
   Monorepo: confirm which package is being reviewed.

2. **Load relevant conventions**
   - Single-package: load the relevant files from `docs/conventions/`
   - Monorepo: load root shared conventions + current package's specific conventions; package-specific rules take precedence

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

   ### ✅ Compliant
   - <details>

   ### ⚠️ Needs attention
   - <issue> → Suggestion: <improvement>

   ### ❌ Violation
   - <convention file + section> — <specific violation> → Must fix: <direction>
```

---

### .claude/commands/update-convention.md

```markdown
# /update-convention — Convention Conflict Resolution Flow

## Steps

1. **Classify the conflict**
   - Type A: implementation doesn't match convention → adjust implementation
   - Type B: convention is outdated or doesn't apply → update convention
   - Type C: genuinely new scenario → add a new convention entry

   Ask the user which type this is.

2. **Type A — Adjust implementation**
   Identify the specific location that doesn't comply and provide a conforming rewrite.

3. **Type B / C — Update convention**
   a. Draft the proposed change and show it to the user for confirmation
   b. Determine scope (Monorepo):
   - Affects one package only → update that package's specific conventions
   - Affects multiple packages → update root shared conventions, then check if package-specific files need syncing
     c. If the change is significant (affects multiple modules or is hard to reverse), ask whether an ADR is needed
     d. Once confirmed, update the relevant convention file(s)

4. **Sync check**
   Run `/check-conventions` once after updating to confirm no new conflicts were introduced.
```

---

### .claude/commands/adr.md

```markdown
# /adr — Create Architecture Decision Record

## Steps

1. **Gather info**
   Ask the user:
   - What is this decision? (one-sentence description)
   - Monorepo: is this global or scoped to a specific package (used for filename prefix)?
   - Why is this decision needed? (context and problem)
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

---

## Step 7: Output Completion Summary

Based on Step 0 results, output only the matching "Next Steps" version.

```
## AI Scaffold Initialization Complete

### Project Info
- Type: new project / existing project
- Structure: single-package / Monorepo (packages: <list>)
- Phase model: using Phase system / custom / none

### Files Created

**Config files (<N> total)**
- CLAUDE.md (root)
- <pkg-path>/CLAUDE.md (per package, Monorepo)
- AGENTS.md
- .github/copilot-instructions.md (if applicable)

**Convention files (<N> total)**
- docs/conventions/README.md
- docs/conventions/architecture.md
- docs/conventions/coding.md
- docs/conventions/testing.md
- docs/conventions/directory.md
- docs/conventions/ai-workflow.md
- <pkg-path>/docs/conventions/... (per file, Monorepo)
- docs/conventions/graphql.md (if applicable)

**ADR files (<N> total)**
- docs/adr/README.md
- docs/adr/0001-xxx.md (if initial decisions exist, list each)

**Slash commands (3)**
- .claude/commands/check-conventions.md
- .claude/commands/update-convention.md
- .claude/commands/adr.md

### Skipped Files (already existed, not overwritten)
<list if any; omit this section if none>
```

**New project — next steps:**

```
1. Review docs/conventions/architecture.md — are the prohibited patterns complete?
2. (Monorepo) Review each package's docs/conventions/ — does it accurately reflect the package's tech stack?
3. Run /adr for any additional architecture decisions
4. Start development (Phase 0 / per custom phase description)
```

**Existing project — next steps:**

```
1. Review the extracted conventions for accuracy (focus on architecture.md and directory.md)
2. (Monorepo) Review each package's specific conventions — do they accurately reflect the package's tech stack?
3. Add anything from "Other Architecture Info" not yet reflected in the convention files
4. Run /adr for any additional architecture decisions
```

---

## Notes

- **All generated Markdown convention files are written in English**
- **Generate only the matching version**: for all branching templates (CLAUDE.md, AGENTS.md, Step 7 next steps), select the correct version based on Step 0 results — do not include unused branches in the generated files
- **File overwrite protection**: existing projects pause at Step 1B-1 for conflict resolution; new projects check file-by-file in Step 2 — skip by default, wait for user confirmation before overwriting
- Generate content based on user-provided information (including free-form "Other Architecture Info"); do not fabricate uncertain technical decisions
- If a convention file cannot be filled due to insufficient info, generate a version with `[TBD]` placeholders
- ADR granularity: one ADR per independent technology choice or design constraint
- **Monorepo package-specific conventions**: use the matrix in Step 4 to determine which files to generate; avoid redundancy
- Indexing results for existing projects are a pre-fill reference only; user-confirmed content takes precedence
