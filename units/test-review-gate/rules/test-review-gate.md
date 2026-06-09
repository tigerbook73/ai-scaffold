---
paths:
  # AISK:CUSTOM name="paths" status="todo" hint="important test files shall be added here"
  - "**/*.test.ts"
  - "**/*.spec.ts"
  # AISK:CUSTOM:END"
---

# AI 测试审查规则

创建或修改测试文件时，必须遵守以下规则：

1. 更新文件头中的 `@description`，使其反映当前覆盖范围
2. 在每个 `@test-suite` 块中生成或更新 `@cases`；每条条目必须与其对应的 `it()` 名称完全一致
3. **禁止**以任何方式修改 `@reviewed-by (!HUMAN EDIT ONLY):`：
   - 若为空（`* @reviewed-by (!HUMAN EDIT ONLY):`）：保持空白，不得添加姓名、占位符或任何内容。
   - 若已有内容（`* @reviewed-by (!HUMAN EDIT ONLY): 姓名 @ [N]`）：原样保留，禁止递增 N、禁止修改姓名、禁止做任何改动。
     此字段由人工审查者专属管理。
4. 每个 `it()` 的命名须采用"条件 → 预期行为"格式（如 "returns OUT_OF_STOCK when stock is 0"）。避免使用含糊的名称如 "works" 或 "test order"。

## 文件头模板

```
/**
 * @test-file   <ServiceName>
 * @description <one-line coverage summary>
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
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
