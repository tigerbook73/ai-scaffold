---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/*.test.js"
  - "**/*.spec.js"
---

# AI Test Review Rules

When creating or modifying test files, you MUST follow these rules:

1. Update `@description` in the file header to reflect current coverage
2. Generate or update `@cases` in every `@test-suite` block; each entry must match its `it()` name exactly
3. Never fill in `@reviewed-by` — that is the human reviewer's responsibility
4. Name every `it()` in "condition → expected behavior" form (e.g. "returns OUT_OF_STOCK when stock is 0"). Avoid vague names like "works" or "test order".

## File Header Template

```
/**
 * @test-file   <ServiceName>
 * @description <one-line coverage summary>
 * @ai-generated
 * @reviewed-by
 */
```

## Test Suite Template

```
/**
 * @test-suite  <suite name>
 * @target      <what is being validated>
 * @strategy    <unit/integration, what is mocked>
 * @cases
 *   - [PASS] <expected behavior> when <condition>
 *   - [FAIL] returns <error> when <condition>
 */
```
