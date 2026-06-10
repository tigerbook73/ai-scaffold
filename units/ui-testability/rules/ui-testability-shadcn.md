---
paths: ["src/components/**/*.tsx", "src/app/**/*.tsx", "src/context/**/*.tsx"]
---

# UI 可测试性 / shadcn/ui 实现细节

> 本文档是 `ui-testability.md` 的 shadcn/ui 补充，仅说明 UI 源码写法。

---

## 规则 2：表单 label 关联

**场景 A：FormField（配合 react-hook-form）**

`FormLabel` 通过 `FormItem` context 自动关联 `Input`，无需手写 `htmlFor`。

```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
// ✅ page.getByLabel('Email') 和 getByLabelText('Email') 均正常工作
```

**场景 B：裸用 Label + Input（无 Form 组件）**

必须手写 `htmlFor` 与 `id` 绑定：

```tsx
<Label htmlFor="username">用户名</Label>
<Input id="username" />
```

---

## 规则 3 & 4：data-testid 透传

shadcn 的 `Button`、`Input`、`Textarea` 等基础组件均使用 `React.forwardRef` + `...props` 展开，`data-testid` 完全透传到底层 DOM。

```tsx
<Button data-testid="settings-save-btn">保存修改</Button>
// 渲染结果：<button data-testid="settings-save-btn" class="inline-flex ...">
```

---

## 规则 4：Dialog / Sheet 类组件的容器隔离

`Dialog`、`Sheet`、`Drawer` 中，必须在 `DialogContent` 上加 `data-testid` 作为测试作用域容器：

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button data-testid="open-confirm-dialog-btn">删除</Button>
  </DialogTrigger>
  <DialogContent data-testid="confirm-dialog">
    <DialogTitle>确认删除？</DialogTitle>
    <Button data-testid="confirm-delete-btn">确认</Button>
    <Button data-testid="cancel-btn">取消</Button>
  </DialogContent>
</Dialog>
```

---

## 可复用组件的 TypeScript 透传类型

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline";
}

function Button({ children, ...props }: ButtonProps) {
  return <button {...props}>{children}</button>;
}
```
