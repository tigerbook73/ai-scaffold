---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/*.test.js"
  - "**/*.spec.js"
---

# AI 测试审查规则

创建或修改测试文件时，必须遵守以下规则：

1. 更新文件头中的 `@description`，使其反映当前覆盖范围
2. 在每个 `@test-suite` 块中生成或更新 `@cases`；每条条目必须与其对应的 `it()` 名称完全一致
3. 不得填写 `@reviewed-by` —— 这是人工审查者的职责
4. 每个 `it()` 的命名须采用"条件 → 预期行为"格式（如 "returns OUT_OF_STOCK when stock is 0"）。避免使用含糊的名称如 "works" 或 "test order"。

## 文件头模板

```
/**
 * @test-file   <ServiceName>
 * @description <one-line coverage summary>
 * @ai-generated
 * @reviewed-by
 */
```

## 测试套件模板

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
