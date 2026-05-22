# Phase 6 — 用户账户 REQUIREMENTS

## 功能范围

实现基于 Shopify Storefront Customer API 的用户认证与账户页面。

## 用户故事

- 用户可以在 `/account/register` 注册新账户
- 用户可以在 `/account/login` 登录
- 登录后可访问 `/account` 查看姓名和邮箱
- 登录后可访问 `/account/orders` 查看历史订单
- 未登录时访问 `/account/*` 自动跳转至登录页
- 已登录时访问登录/注册页自动跳转至账户主页
- 用户可以登出

## 验收标准

| # | 场景 | 预期结果 |
|---|------|----------|
| 1 | 未登录访问 `/account` | 重定向至 `/account/login` |
| 2 | 未登录访问 `/account/orders` | 重定向至 `/account/login` |
| 3 | 已登录访问 `/account/login` | 重定向至 `/account` |
| 4 | 注册成功 | 自动登录，跳转至 `/account` |
| 5 | 登录成功 | 跳转至 `/account`，显示用户信息 |
| 6 | 登录失败（密码错误） | 显示错误提示，不跳转 |
| 7 | 注册失败（邮箱已存在） | 显示错误提示，不跳转 |
| 8 | 登出 | 清除 Cookie，跳转至 `/account/login` |
| 9 | 订单页 | 显示历史订单列表（无订单时展示空状态） |

## 技术约束

- 使用 Shopify Storefront Customer API（旧版，非 OAuth）
- Token 存入 httpOnly Cookie，前端不可读取
- Cookie maxAge 与 Shopify token 有效期一致（30 天上限）
- 用户密码由 Shopify 管理，前端不存储
- 所有个人数据页面 `force-dynamic`，不参与 Next.js Data Cache

## 超出范围（不实现）

- 修改密码 / 忘记密码
- 编辑账户信息
- 地址管理
- Token 续期（refresh）
