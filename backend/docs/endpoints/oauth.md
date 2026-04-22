# OAuth Endpoints

> **Base URL**: `/api/v1/oauth/`
>
> All OAuth endpoints are **public** — no `Authorization` header required.

---

## Table of Contents

- [Overview — How It Works](#overview--how-it-works)
- [Available Endpoints](#available-endpoints)
  - [GET /oauth/get_providers/](#1-get-available-providers)
  - [POST /oauth/{provider}/login-or-register/](#2-login-or-register-via-oauth)
  - [GET /oauth/{provider}/callback/](#3-oauth-callback-server-side)
- [Integration Guide (Frontend)](#integration-guide-frontend)
  - [Recommended Flow — Authorization Code Exchange](#recommended-flow--authorization-code-exchange)
  - [Step-by-Step (Google Example)](#step-by-step-google-example)
  - [Handling the JWT Response](#handling-the-jwt-response)
- [Error Reference](#error-reference)

---

## Overview — How It Works

The backend supports **multiple OAuth providers** (Google, GitHub, Facebook, etc.).
The list of active providers is configured server-side — you don't need to worry about which ones are enabled.

There are **two** ways OAuth can work:

| Flow | Endpoint | Who does the token exchange? | Best for |
|---|---|---|---|
| **Code Exchange** (recommended) | `POST /oauth/{provider}/login-or-register/` | The **backend** exchanges the code | SPAs, mobile apps |
| **Server Callback** | `GET /oauth/{provider}/callback/` | The **backend** receives the redirect | Server-rendered apps, direct redirects |

**In both cases**, the backend:
1. Takes the authorization `code` from the OAuth provider
2. Exchanges it for user info (email, name, etc.)
3. Creates a new user if one doesn't exist, or finds the existing user
4. Returns **JWT tokens** (`access` + `refresh`)

> **Important**: OAuth users skip email verification during onboarding — the provider's email is trusted automatically.

---

## Available Endpoints

### 1. Get Available Providers

Returns the list of OAuth providers currently enabled on the server.

```
GET /api/v1/oauth/get_providers/
```

**Response** `200 OK`:

```json
{
  "providers": ["google", "github", "facebook"]
}
```

Use this to dynamically render your "Sign in with …" buttons. If a provider isn't in the list, don't show its button.

---

### 2. Login or Register via OAuth

**This is the main endpoint you'll use.** Your frontend gets an authorization code from the provider (e.g. Google), then sends it here. The backend does the rest.

```
POST /api/v1/oauth/{provider}/login-or-register/
```

**Path Parameters**:

| Param | Type | Description |
|---|---|---|
| `provider` | `string` | Provider name, e.g. `google`, `github`, `facebook` |

**Request Body** (JSON):

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | `string` | ✅ Yes | The authorization code from the OAuth provider |
| `redirect_uri` | `string` (URL) | ⚠️ Depends | The redirect URI you used when initiating the OAuth flow. **Must match exactly** what was sent to the provider. |
| `state` | `string` | No | The state parameter (if you sent one to the provider) |
| `code_verifier` | `string` | No | PKCE code verifier (if using PKCE) |

**Example Request**:

```bash
curl -X POST http://localhost:9000/api/v1/oauth/google/login-or-register/ \
  -H "Content-Type: application/json" \
  -d '{
    "code": "4/0AQSTgQF...your_auth_code_here",
    "redirect_uri": "http://localhost:3000/auth/callback"
  }'
```

**Success Response** `200 OK`:

```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "access_expiry": "1710523200",
  "refresh_expiry": "1710609600"
}
```

- `access` — JWT access token. Send this as `Authorization: Bearer <access>` on all authenticated requests.
- `refresh` — JWT refresh token. Use this to get a new access token when it expires.
- `access_expiry` — Unix timestamp (seconds) when the access token expires (**60 minutes** from now).
- `refresh_expiry` — Unix timestamp (seconds) when the refresh token expires (**1 day** from now).

---

### 3. OAuth Callback (Server-Side)

This endpoint is for **server-side redirect flows** — the OAuth provider redirects the user's browser here directly after authorization. You probably **won't use this** in a typical SPA. It's available if needed.

```
GET /api/v1/oauth/{provider}/callback/?code=...&state=...
```

**Query Parameters**:

| Param | Type | Required | Description |
|---|---|---|---|
| `code` | `string` | ✅ Yes | Authorization code from the provider |
| `state` | `string` | No | State parameter |
| `redirect_uri` | `string` | No | Redirect URI used in the original request |
| `code_verifier` | `string` | No | PKCE code verifier |

**Response**: Same JWT response as the login-or-register endpoint above.

---

## Integration Guide (Frontend)

### Recommended Flow — Authorization Code Exchange

```
┌──────────┐                  ┌──────────────┐                  ┌──────────┐
│ Frontend │                  │ OAuth        │                  │ Backend  │
│          │                  │ Provider     │                  │          │
└────┬─────┘                  │ (e.g Google) │                  └────┬─────┘
     │                        └──────┬───────┘                       │
     │  1. Open provider login page  │                               │
     │ ─────────────────────────────>│                               │
     │                               │                               │
     │  2. User logs in & consents   │                               │
     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                               │
     │                               │                               │
     │  3. Redirect back with ?code= │                               │
     │ <─────────────────────────────│                               │
     │                                                               │
     │  4. POST /oauth/google/login-or-register/                     │
     │   { "code": "...", "redirect_uri": "..." }                    │
     │ ─────────────────────────────────────────────────────────────>│
     │                                                               │
     │  5. Backend exchanges code with Google for user info           │
     │                                                               │
     │  6. Returns JWT { access, refresh, ... }                      │
     │ <─────────────────────────────────────────────────────────────│
     │                                                               │
     │  7. Store tokens, user is logged in ✅                        │
     │                                                               │
```

### Step-by-Step (Google Example)

#### Step 1 — Redirect to Google

When the user clicks **"Sign in with Google"**, open Google's authorization URL:

```javascript
const GOOGLE_CLIENT_ID = "your-google-client-id";
const REDIRECT_URI = "http://localhost:3000/auth/callback"; // your frontend callback route

const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
googleAuthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
googleAuthUrl.searchParams.set("redirect_uri", REDIRECT_URI);
googleAuthUrl.searchParams.set("response_type", "code");
googleAuthUrl.searchParams.set("scope", "openid email profile");
googleAuthUrl.searchParams.set("access_type", "offline");
googleAuthUrl.searchParams.set("prompt", "consent");

// Redirect the user
window.location.href = googleAuthUrl.toString();
```

> **Note**: You need the Google **Client ID** only. The **Client Secret** is stored server-side — the frontend never sees it.

#### Step 2 — Handle the Callback

Google redirects back to your `REDIRECT_URI` with a `code` in the query string:

```
http://localhost:3000/auth/callback?code=4/0AQSTgQF...&scope=openid+email+profile
```

In your callback page/component, extract the code and send it to the backend:

```javascript
// On your /auth/callback page
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get("code");

if (!code) {
  // Handle error — user denied access or something went wrong
  console.error("No authorization code received");
  return;
}

const response = await fetch(
  "http://localhost:9000/api/v1/oauth/google/login-or-register/",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: code,
      redirect_uri: "http://localhost:3000/auth/callback", // MUST match step 1
    }),
  }
);

const data = await response.json();

if (response.ok) {
  // Success — store the tokens
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  // Redirect to dashboard or home
  window.location.href = "/dashboard";
} else {
  // Handle error
  console.error("OAuth login failed:", data);
}
```

### Handling the JWT Response

Once you have the tokens:

```javascript
// Use the access token on all authenticated API calls
const res = await fetch("http://localhost:9000/api/v1/users/me/", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

**Token Refresh** — when the access token expires, use the refresh token:

```bash
POST /api/v1/login/token/refresh/
Content-Type: application/json

{
  "refresh": "<your_refresh_token>"
}
```

Returns:

```json
{
  "access": "new_access_token_here",
  "access_expiry": "1710526800"
}
```

---

## Error Reference

All errors return a JSON body with an `error` key. Here are the ones you might encounter:

### Validation Errors (`400`)

| Error | Meaning | What to do |
|---|---|---|
| `unsupported oauth provider` | The provider name in the URL isn't enabled | Check `GET /oauth/get_providers/` for valid providers |
| `email_required` | The provider didn't return the user's email | Make sure your OAuth app requests email scope |
| `missing_authorization_code` | No `code` was provided | Your frontend didn't send the authorization code |

### Authentication Errors (`401`)

| Error | Meaning | What to do |
|---|---|---|
| `oauth_exchange_failed` | The backend couldn't exchange the code for user info | Code is expired or invalid — restart the OAuth flow |
| `oauth_authentication_failed` | Code exchanged but no user was returned | Rare — likely a provider misconfiguration |
| `oauth_provider_error` | The provider itself returned an error (user denied, etc.) | Check the `details` field for more info |
| `inactive_user` | The matched user account is deactivated | Contact support |

### Example Error Response

```json
{
  "error": "oauth_exchange_failed",
  "provider": "google",
  "details": "The code has expired or has already been used."
}
```

---

## Quick Reference

| What | Value |
|---|---|
| Get providers | `GET /api/v1/oauth/get_providers/` |
| Login/Register | `POST /api/v1/oauth/{provider}/login-or-register/` |
| Server callback | `GET /api/v1/oauth/{provider}/callback/` |
| Auth header format | `Authorization: Bearer <access_token>` |
| Access token lifetime | 60 minutes |
| Refresh token lifetime | 1 day |
| Refresh endpoint | `POST /api/v1/login/token/refresh/` |
