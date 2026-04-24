# CLAUDE.md

Developer orientation for this frontend codebase. Keep this in mind while reading or changing code.

## 1) Fast Mental Model

- Stack: Next.js App Router + React 19 + TypeScript + Zustand + Tailwind.
- Routing split:
  - `lib/api/FrontendRoutes.ts` = client route constants.
  - `lib/api/BackendRoutes.ts` = backend endpoint constants.
- Data access split:
  - `lib/api/ApiClient.ts` = the only HTTP client abstraction (timeouts, retries, auth headers, token refresh integration).
  - `lib/api/services/*.Service.ts` = domain-facing wrappers around `apiClient`.
- Auth split:
  - `lib/api/auth/TokenManager.ts` = token persistence and refresh lifecycle.
  - `lib/api/auth/authContext.tsx` = app-facing auth state + hooks + protected route behavior.
- Realtime split:
  - `lib/api/auth/ws/WebSocketManager.ts` = low-level WS engine.
  - `lib/api/auth/ws/useWebSocket.tsx` = React hooks/provider API.
  - `lib/api/contexts/NotificationContext.tsx` = concrete notification integration.

## 2) Core Rules New Devs Should Follow

- Use `@/*` imports for project paths (configured in `tsconfig.json`).
- Add or use route constants instead of hardcoding paths/endpoints.
- Prefer service classes for backend interaction from UI components.
- For raw API calls, use `api`/`apiClient` from `ApiClient.ts`, not direct `fetch` (except very narrow infra code like token refresh internals).
- Respect auth defaults:
  - Requests are authenticated by default.
  - Pass `{ requiresAuth: false }` only for truly public endpoints (login/register/oauth/onboarding token steps).
- Keep response/data contracts typed in `lib/api/types/*`.
- Keep onboarding/auth redirect paths sanitized via helpers in `lib/api/auth/redirect.ts`.

## 3) lib/ Deep Dive (Most Important)

### `lib/api/ApiClient.ts`

This is the transport backbone.

- Handles:
  - base URL (`NEXT_PUBLIC_API_URL` fallback to local)
  - typed `get/post/put/patch/delete`
  - query param serialization (arrays, dates, primitives)
  - JSON vs FormData body handling
  - auth header injection via `authUtils.getAuthHeader()`
  - timeout via AbortController
  - retry with exponential backoff + jitter for retryable statuses/network/timeout
  - centralized API error shape
  - automatic token refresh path on 401 `TOKEN_EXPIRED`
- Do not bypass this in feature code unless there is a very specific reason.

Pattern to follow:

```ts
const res = await apiClient.get<MyType>(BackendRoutes.someRoute, {
  requiresAuth: true,
  params: { page: 1 },
});
return res.data;
```

### `lib/api/BackendRoutes.ts`

- Single source of truth for backend endpoints.
- Contains both current and deprecated aliases.
- Includes dynamic route helpers and websocket URL helper (`notificationsWs`).
- Before adding a new service method, add endpoint constant here first.

### `lib/api/auth/TokenManager.ts`

- Uses persisted Zustand store (`auth-token-storage`) to hold access/refresh tokens and expiries.
- Schedules pre-expiry refresh with a buffer.
- Supports single-flight refresh (no refresh stampede).
- Maintains auth-presence cookie (`bedflow_auth_present`) used by middleware.
- `authUtils` is the app-level utility surface for auth checks and headers.

Important behavior:

- A valid refresh token triggers auto-refresh when access token nears expiry.
- Repeated refresh failures clear auth and trigger expired callback.
- `setTokens` validates expiry values before storing.

### `lib/api/auth/authContext.tsx`

- App-level auth state and APIs (login/register/logout/fetchCurrentUser/refreshUser).
- Persists partial onboarding identity (`auth-user-storage`) to survive flow transitions.
- Exposes:
  - `useAuth`
  - `useRequireAuth`
  - `ProtectedRoute`
  - token/user convenience hooks.
- Integrates with `ApiClient` unauthorized callback (`configureApiClient`).

Practical implication:

- Protected app pages should use `ProtectedRoute` or `useRequireAuth` patterns.
- Login/register/onboarding pages should use context methods, not ad hoc auth logic.

### `lib/api/auth/redirect.ts`

- Contains redirect sanitation helpers (`isSafeRelativePath`, `sanitizeRedirectPath`, `getSafeNextPath`, `buildLoginRedirectPath`).
- Always use these for `next` redirects to avoid open redirect issues.

### `lib/api/services/*`

- Service classes are thin wrappers returning `res.data`.
- Keep them boring: typed inputs/outputs, one concern per method.
- Existing services:
  - `Register.Service.ts`
  - `Onboarding.Service.ts`
  - `OAuth.Service.ts`
  - `User.Service.ts`
  - `Settings.Service.ts`
  - `Notification.Service.ts`

### `lib/api/auth/ws/*`

- `WebSocketManager` is robust and stateful:
  - reconnection/backoff
  - heartbeat and timeout logic
  - queueing messages until connected
  - per-instance Zustand state
  - visibility-aware heartbeat behavior
- `useWebSocket.tsx` wraps this in composable hooks:
  - `useWebSocket`
  - `useWebSocketStatus`
  - `useWebSocketSubscription`
  - `useWebSocketSend`
  - `useWebSocketRequest`

### `lib/api/contexts/NotificationContext.tsx`

- Good reference for combining:
  - initial REST fetch
  - websocket subscriptions
  - optimistic UI updates
  - rollback/refetch on failure

### `lib/utils.ts`

- `cn(...)`: Tailwind + clsx merge helper for class composition.
- `interpretServerError(...)`: recursively flattens nested server error structures.
- Use this helper for user-facing error fallback logic in forms.

### `lib/appconfig.ts`

- Centralized UI/app metadata and static config.
- Typed with `satisfies` and `as const` for strictness.
- Keep static mapping/config here (plan types, branding assets, template metadata).

## 4) Env Variables Used in lib

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_GITHUB_CLIENT_ID`
- `NEXT_PUBLIC_APPLE_CLIENT_ID`
- `NEXT_PUBLIC_TWITTER_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_REDIRECT_URI`
- `NEXT_PUBLIC_GITHUB_REDIRECT_URI`
- `NEXT_PUBLIC_APPLE_REDIRECT_URI`
- `NEXT_PUBLIC_TWITTER_REDIRECT_URI`

## 5) Common Implementation Pattern (Add New API Feature)

1. Add endpoint in `BackendRoutes.ts`.
2. Add/extend DTO types in `lib/api/types/*`.
3. Add service method in a relevant `*.Service.ts` file using `apiClient`.
4. Call service from page/component/context layer.
5. If route navigation is involved, use `FrontendRoutes.ts` constants.
6. If redirecting after auth, sanitize/encode via redirect helpers.

## 6) Known Gotchas / Inconsistencies

- Project naming/domain strings are mixed in places (hospital-bed-management repo vs Bedflow financial strings). Treat behavior as source of truth, not branding text.
- `BackendRoutes.ts` intentionally keeps deprecated aliases for compatibility. Prefer non-deprecated names for new code.
- Some services still use legacy/deprecated backend routes (`getUser`, `getUsers`, older 2FA aliases). Validate backend support before extending those paths.
- `Onboarding.Service.setProfilePicture` currently forces FormData behavior via header override; this is deliberate to let browser set multipart boundaries.
- `AuthProvider` and token store are client-side persisted state; be careful when adding SSR-only assumptions.

## 7) Middleware/Auth Protection Notes

- `middleware.ts` guards core app routes by checking the auth-presence cookie (`bedflow_auth_present`).
- Cookie presence is not a full auth guarantee; page-level `ProtectedRoute` and token validity checks still matter.
- If you add protected routes, include them in middleware matcher and guard at component level.

## 8) Coding Style You Should Preserve

- Strict TypeScript-first changes.
- Small, typed service methods returning payloads directly.
- Reusable constants over magic strings.
- Lightweight comments only where behavior is non-obvious.
- Keep auth/realtime concerns centralized in existing modules instead of scattering logic across pages.

## 9) Quick File Map

- Core HTTP: `lib/api/ApiClient.ts`
- Backend route catalog: `lib/api/BackendRoutes.ts`
- Frontend route catalog: `lib/api/FrontendRoutes.ts`
- Auth lifecycle: `lib/api/auth/TokenManager.ts`
- Auth app context: `lib/api/auth/authContext.tsx`
- Redirect safety: `lib/api/auth/redirect.ts`
- WS engine: `lib/api/auth/ws/WebSocketManager.ts`
- WS hooks: `lib/api/auth/ws/useWebSocket.tsx`
- Notifications integration: `lib/api/contexts/NotificationContext.tsx`
- Shared types: `lib/api/types/auth.ts`, `lib/api/types/common.types.ts`
- Utility helpers: `lib/utils.ts`
- UI config/constants: `lib/appconfig.ts`

## 10) Design guide

- full info on the app's design guide is at app_design_guide.md
---

If you only remember one thing: build new behavior through the existing route constants + ApiClient + service layer + auth context patterns. Most regressions happen when bypassing those seams.
