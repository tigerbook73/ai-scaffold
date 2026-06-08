---
paths:
  - "ai-units/*/scripts/*.ts"
---

# TypeScript Script Conventions

- **Imports**: `import { ... } from 'fs'` — no `node:` prefix
- **Structure**: one class per file with a `run()` method; instantiate at the bottom (`new Foo().run()`)
- **CLI args**: use `cac` when the script has subcommands or `--options`; use `process.argv` only for simple single-command positional args
- **Errors**: `console.error(message)` + `process.exit(1)` — no thrown errors at the top level
- **JSON output**: `JSON.stringify(data, null, 2) + '\n'` — always trailing newline
- **Async**: synchronous by default; use `async run()` only when interactive prompts (readline) are required
- **Types**: define interfaces for all data shapes; `strict` mode is already enabled in tsconfig
- **tsconfig coverage**: `scripts/**/*.ts` is included in tsconfig; unit scripts under `ai-units/*/scripts/*.ts` require updating `tsconfig.json` if type-checking is needed
