# Phase 6 — 用户账户 DESIGN

## 架构概览

```
Middleware (/account/*)
    ↓ 检查 customerAccessToken Cookie
    ↓ 未登录 → redirect /account/login
    ↓ 已登录访问 login/register → redirect /account

app/account/
├── layout.tsx         (读 Cookie，公共 shell)
├── page.tsx           (async Server Component，getCustomer)
├── login/page.tsx     (登录页)
├── register/page.tsx  (注册页)
└── orders/page.tsx    (async Server Component，getCustomerOrders)

components/account/
├── LoginForm.tsx      (Client Component，useActionState)
└── RegisterForm.tsx   (Client Component，useActionState)

lib/
├── shopify/
│   ├── types.ts              (+Customer, Order 类型)
│   ├── queries/customer.ts   (GET_CUSTOMER_QUERY, GET_CUSTOMER_ORDERS_QUERY)
│   ├── mutations/customer.ts (CREATE / ACCESS_TOKEN_CREATE / ACCESS_TOKEN_DELETE)
│   └── client.ts             (+4 个 customer API 函数)
└── actions/customer.ts       (login, register, logout Server Actions)
```

## GraphQL 设计

### Mutations

```graphql
# 注册
mutation CustomerCreate($input: CustomerCreateInput!) {
  customerCreate(input: $input) {
    customer { id email firstName lastName }
    customerUserErrors { field message code }
  }
}

# 登录（获取 token）
mutation CustomerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
  customerAccessTokenCreate(input: $input) {
    customerAccessToken { accessToken expiresAt }
    customerUserErrors { field message code }
  }
}

# 登出（删除 token）
mutation CustomerAccessTokenDelete($customerAccessToken: String!) {
  customerAccessTokenDelete(customerAccessToken: $customerAccessToken) {
    deletedAccessToken
    userErrors { field message }
  }
}
```

### Queries

```graphql
# 账户主页
query GetCustomer($token: String!) {
  customer(customerAccessToken: $token) {
    id email firstName lastName displayName
  }
}

# 订单历史
query GetCustomerOrders($token: String!, $first: Int!) {
  customer(customerAccessToken: $token) {
    orders(first: $first) {
      nodes {
        id orderNumber processedAt
        financialStatus fulfillmentStatus
        currentTotalPrice { amount currencyCode }
        lineItems(first: 5) {
          nodes {
            title quantity
            variant {
              image { url altText }
              price { amount currencyCode }
            }
          }
        }
      }
    }
  }
}
```

## Cookie 策略

| 字段 | 值 |
|------|-----|
| 名称 | `customerAccessToken` |
| httpOnly | true（防 XSS） |
| sameSite | `lax` |
| maxAge | 60 × 60 × 24 × 30（30 天） |
| path | `/` |

## 表单状态管理

登录/注册表单使用 React 19 `useActionState`：

```typescript
// 初始状态
type FormState = { error: string } | null;

// 组件内
const [state, action, isPending] = useActionState(login, null);
return (
  <form action={action}>
    <input name="email" type="email" required />
    <input name="password" type="password" required />
    {state?.error && <p className="text-red-500">{state.error}</p>}
    <button disabled={isPending}>{isPending ? "..." : "登录"}</button>
  </form>
);
```

Server Action 在成功时调用 `redirect()`，失败时返回 `{ error }` 作为新状态。

## 组件边界

```
account/page.tsx           Server Component（async）
  └─ 直接展示 customer 数据（无需独立子组件）

account/login/page.tsx     Server Component（静态 shell）
  └─ LoginForm             Client Component（useActionState）

account/register/page.tsx  Server Component（静态 shell）
  └─ RegisterForm          Client Component（useActionState）

account/orders/page.tsx    Server Component（async，force-dynamic）
  └─ 直接展示订单列表
```

## 学习分组（/learn-phase）

| 组 | 文件 | 核心概念 |
|----|------|----------|
| G1 | types.ts | Customer / Order 类型扩展 |
| G2 | mutations/customer.ts, queries/customer.ts | 带 userErrors 的 Auth Mutation |
| G3 | client.ts | Customer token 作为请求参数；no-store 缓存 |
| G4 | actions/customer.ts | Server Action 中的 redirect + Cookie |
| G5 | middleware.ts | Next.js Middleware 路由保护 |
| G6 | LoginForm.tsx, RegisterForm.tsx, login/page, register/page | useActionState 表单模式 |
| G7 | account/layout.tsx, account/page.tsx | 账户信息展示 |
| G8 | account/orders/page.tsx | 嵌套 GraphQL 查询 + 订单展示 |
