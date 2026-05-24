# setup-precommit

Configure a git pre-commit hook for the current Node.js project using lint-staged.

---

## Constraints

- [Write operation] Writes to `package.json` (adds `lint-staged` config) and `.git/hooks/pre-commit`
- Node.js projects only; stops if `package.json` is not found in the project root
- Does not overwrite an existing pre-commit hook without user confirmation

## Steps

### Step 1 — Prerequisites

1. Check that `package.json` exists in the project root. If not, output:

   > This skill is for Node.js projects only. No `package.json` found.
   > Then stop.

2. Check whether `.git/hooks/pre-commit` already exists.
   - If it exists: read and display its content; ask "A pre-commit hook already exists. Overwrite it?"
     Wait for confirmation; stop if declined.

### Step 2 — Detect toolchain

Read `package.json` and collect:

- **ESLint**: present if `eslint` appears in `devDependencies` or `dependencies`
- **Prettier**: present if `prettier` appears in `devDependencies` or `dependencies`
- **Existing lint-staged**: check for a `lint-staged` field already in `package.json`
- **Package manager**: check for `pnpm-lock.yaml` → pnpm; `yarn.lock` → yarn; otherwise npm

Scan `devDependencies`/`dependencies` for framework indicators (e.g. `@types/react` → include `.tsx`).

### Step 3 — Build lint-staged config

Construct the `lint-staged` configuration based on detected tools:

- TypeScript/JavaScript files (`"*.{ts,tsx,js,jsx}"`):
  - Add `"eslint --fix"` if ESLint is present
  - Add `"prettier --write"` if Prettier is present
- Markup/data files (`"*.{md,json,yaml,yml}"`):
  - Add `"prettier --write"` if Prettier is present

Skip a glob pattern entirely if no commands would be added to it.

If neither ESLint nor Prettier is detected, warn the user and ask whether to continue
with an empty lint-staged config (which would make the hook a no-op).

### Step 4 — Preview and confirm

Show a combined preview of the changes before writing anything:

```
lint-staged config to be added to package.json:
{ "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"], ... }

.git/hooks/pre-commit:
#!/bin/sh
npx lint-staged
```

Wait for user confirmation.

### Step 5 — Install lint-staged

Check if `lint-staged` already appears in `devDependencies`. If not, run the appropriate command:

- pnpm: `pnpm add -D lint-staged`
- yarn: `yarn add -D lint-staged`
- npm: `npm install --save-dev lint-staged`

### Step 6 — Write

1. Add the `lint-staged` object to `package.json`, preserving all existing fields.
2. Create `.git/hooks/pre-commit`:
   ```sh
   #!/bin/sh
   npx lint-staged
   ```
3. Run `chmod +x .git/hooks/pre-commit`.

### Step 7 — Verify

Run `ls -la .git/hooks/pre-commit` to confirm the file is executable, then output a one-line
summary of what was configured.

---

## Notes

- The hook calls `npx lint-staged`, so no global install of lint-staged is required
- To test without committing: run `npx lint-staged` in the project root
- If ESLint or Prettier is added to the project later, re-run this skill to update the config
