# Route Access Shells Design

## Current Context

The project already has:

- Root app providers in `src/app/providers.tsx`.
- Public pages at `src/app/page.tsx` and `src/app/about/page.tsx`.
- Sign-in page at `src/app/auth/signin/page.tsx`.
- App routes under `src/app/chat` and `src/app/knowledge`.
- Admin routes under `src/app/admin`.
- Admin authorization in `src/app/admin/layout.tsx`.
- Route policy helpers in `src/lib/route-policy.ts`.
- Auth proxy logic in `src/proxy.ts`.

## Route Policy Model

Centralize route classification in `src/lib/route-policy.ts`.

Recommended route access types:

- `public-home`: `/`
- `public-auth-enhanced`: `/about`
- `public-only`: `/auth/signin`
- `authenticated-only`: `/chat`, `/knowledge`
- `admin-only`: `/admin`

Policy helpers should expose:

- Whether a route can bypass anonymous auth redirects.
- Whether a route is sign-in.
- Whether a route is admin.
- Whether a route should hide the app sidebar.
- Whether a route should use the admin shell.
- How to sanitize `from` redirect targets.
- The default signed-in redirect target: `/chat/last`.
- The admin access denied target: `/chat/last`.

## Auth Boundary

`src/proxy.ts` should enforce only authentication, not admin role authorization.

Proxy behavior:

- Allow public routes through: `/`, `/about`, `/auth/signin`.
- Allow explicit bypass routes such as `/api/ingest-hook`.
- Redirect anonymous protected routes to `/auth/signin?from=<pathname+search>`.
- Preserve query strings in the `from` target when safe and useful.
- Do not perform admin role checks in proxy.

Admin role authorization stays in `src/app/admin/layout.tsx` using `requireAdmin()`.

## Initial Auth State

Add initial auth state from a server boundary and pass it into the client auth provider.

Purpose:

- Avoid sidebar flicker on public-auth-enhanced pages.
- Let the app shell know whether the initial request is authenticated.
- Keep client-side auth subscriptions for later sign-in/sign-out changes.

Implementation approach:

- Fetch minimal session/user state in the server root layout or a small server wrapper.
- Pass only the needed fields into `AuthContextProvider`.
- Keep admin authorization separate and server-enforced.

## Shell Behavior

`src/app/providers.tsx` should choose the appropriate shell:

- Admin routes: render children outside the normal app shell; admin layout renders `AdminShell`.
- Sign-in route: no app sidebar.
- Anonymous public routes: no app sidebar.
- Signed-in public-auth-enhanced routes: allow normal app sidebar unless the route policy explicitly hides it.
- Authenticated app routes: render normal app sidebar.

`src/components/layout/TopBar.tsx` may use route policy helpers for navigation, sidebar trigger visibility, and sign-in/sign-out controls.

## Page Behavior

### Home Page

`src/app/page.tsx` should keep signed-in redirect behavior:

- Signed-in users redirect to `/chat/last`.
- Anonymous users see the public landing/about content.

### Sign-In Page

`src/app/auth/signin/page.tsx` should redirect signed-in users:

- Prefer a safe `from` path.
- Fall back to `/chat/last`.
- Never redirect back to `/auth/signin`.

The sign-in completion flow should reuse the same safe redirect logic.

### Admin Layout

`src/app/admin/layout.tsx` should keep server-side admin authorization:

- Anonymous users should usually be redirected by proxy before layout execution.
- Signed-in non-admin users redirect to `/chat/last`.
- Admin users render `AdminShell`.

## Tests

Add focused tests for route policy behavior:

- Route classification.
- Auth bypass behavior.
- Sidebar visibility.
- Safe redirect validation.
- Fallback redirect target.
- Sign-in loop prevention.

Add or update behavior tests where practical:

- Anonymous protected routes redirect to sign-in with `from`.
- Signed-in sign-in route redirects to safe `from`.
- Unsafe `from` falls back to `/chat/last`.
- Non-admin admin access redirects to `/chat/last`.

## Implementation Phases

### Phase 1: Document and centralize policy

- Create feature docs.
- Update `src/lib/route-policy.ts` with explicit route categories and redirect helpers.
- Add route policy unit tests.

### Phase 2: Enforce auth boundaries

- Update `src/proxy.ts` to use route policy helpers.
- Preserve safe `from` targets.
- Keep admin role checks out of proxy.

### Phase 3: Align app shells

- Add initial auth state to `AuthContextProvider`.
- Update provider shell selection.
- Ensure admin routes avoid the normal app shell.
- Ensure public anonymous routes do not show the app sidebar.

### Phase 4: Align page redirects

- Keep signed-in `/` redirect to `/chat/last`.
- Add signed-in `/auth/signin` redirect.
- Update sign-in completion redirect logic.
- Change non-admin admin redirect to `/chat/last`.

### Phase 5: Verify and release

- Run focused tests.
- Run `pnpm build`.
- Update `PROGRESS.md`.
- Commit with message: `route-access-shells phase 1: implement route access policy`.
