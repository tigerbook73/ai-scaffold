# Route Access Shells Requirements

## Product Goals

Define clear route access and shell behavior for public, authenticated, and admin areas.

The app should support:

- Public entry pages for anonymous users.
- Automatic routing from signed-in entry points to the app workspace.
- Authenticated-only app routes for chat and knowledge management.
- Admin-only routes with a separate admin shell.
- Predictable redirects that do not loop.

## Roles

- Anonymous user: visitor without a valid session.
- Signed-in user: authenticated user with the `user` role.
- Admin user: authenticated user with the `admin` role.

## Route Rules

### `/`

- Anonymous users can access `/`.
- Anonymous users should not see the app sidebar.
- Signed-in users should automatically redirect to `/chat/last`.

### `/about`

- Anonymous users can access `/about`.
- Signed-in users can access `/about`.
- `/about` should not receive route-specific special handling beyond the normal public-auth-enhanced shell rules.

### `/auth/signin`

- Anonymous users can access the sign-in page.
- Signed-in users should automatically redirect.
- Redirect should prefer a safe `from` path when present.
- Redirect should fall back to `/chat/last` when `from` is absent or unsafe.
- Redirect logic must avoid loops back to `/auth/signin`.

### `/chat`

- `/chat` and child routes are authenticated-only.
- Anonymous users should redirect to `/auth/signin?from=<current path>`.
- Signed-in users can access these routes with the normal app shell.

### `/knowledge`

- `/knowledge` and child routes are authenticated-only.
- Anonymous users should redirect to `/auth/signin?from=<current path>`.
- Signed-in users can access these routes with the normal app shell.

### `/admin`

- `/admin` and child routes require authentication and admin authorization.
- Anonymous users should redirect to `/auth/signin?from=/admin`.
- Signed-in non-admin users should redirect to `/chat/last`.
- Admin users should access admin routes inside the independent admin shell.

## Redirect Safety

Redirect targets derived from user-controlled input must be validated.

Safe redirect targets:

- Must be same-origin app paths.
- Must start with `/`.
- Must not start with `//`.
- Must not be absolute external URLs.
- Must not point back to `/auth/signin`.

Unsafe redirect targets must fall back to `/chat/last`.

## Acceptance Criteria

- Anonymous `/` renders the public page without the app sidebar.
- Signed-in `/` redirects to `/chat/last`.
- Anonymous `/about` renders without forced authentication.
- Signed-in `/about` follows normal public-auth-enhanced shell behavior.
- Anonymous `/auth/signin` renders the sign-in page.
- Signed-in `/auth/signin` redirects to safe `from` or `/chat/last`.
- Anonymous `/chat` redirects to `/auth/signin?from=/chat`.
- Anonymous `/knowledge` redirects to `/auth/signin?from=/knowledge`.
- Anonymous `/admin` redirects to `/auth/signin?from=/admin`.
- Signed-in non-admin `/admin` redirects to `/chat/last`.
- Admin `/admin` renders inside the independent admin shell.
