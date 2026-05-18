# Research Summary: How Does Authentication Work in This Codebase?

## Research Question
How does authentication work in this codebase?

## Research Type
Internal — codebase analysis only

## Date
2026-05-14

---

## Sources Investigated

| Category | Files Found | Key Source Area |
|----------|-------------|-----------------|
| codebase-security | 14 | SecurityFilterChain, JwtTokenProvider, login endpoint, User model |
| codebase-oauth2 | 23 | Custom OAuth2 server (13 files), migrations, consent UI, tests |
| codebase-plugin-mcp-auth | 22 | Plugin postMessage SDK, MCP server security module |
| codebase-frontend-tests | 16 | React auth layer, test helpers, integration tests |
| **Total** | **75** | |

---

## Overview

The codebase has **two coexisting authentication paths** built on a single shared HMAC JWT signing key:

1. **Direct login (frontend)**: `POST /api/auth/login` → validates username/password → issues a 24h app JWT with `permissions` claim
2. **OAuth2 authorization code flow (MCP clients)**: Full RFC 6749 authorization code flow → issues 15min access tokens with `scopes` claim

Both token types are validated by the same `JwtAuthenticationFilter` and `JwtTokenProvider`. The filter distinguishes token types by checking for the `permissions` claim first, then falling back to `scopes`.

---

## Key Findings by Category

### SecurityFilterChain Configuration

**Filter order** (`SecurityConfiguration.java:136-149`):
```
JwtAuthenticationFilter
  → PublicClientRegistrationFilter  (POST /oauth2/register)
  → OAuth2AuthorizationFilter       (POST /oauth2/authorize)
  → OAuth2TokenFilter               (POST /oauth2/token)
  → OAuth2IntrospectionFilter       (POST /oauth2/introspect)
```

Stateless (no sessions), CSRF disabled, custom JSON 401/403 responses.

**URL authorization model** — three permission tiers:
- `PERMISSION_READ` / `PERMISSION_mcp:read` — read-only API access
- `PERMISSION_EDIT` / `PERMISSION_mcp:edit` — write API access
- `PERMISSION_PLUGIN_MANAGEMENT` — plugin manifest/enable/delete management

---

### JWT Token Provider

**Library**: JJWT (`io.jsonwebtoken`). **Signing**: HMAC-SHA (algorithm determined by key length; default 32-byte key → HS256).

**Two JWT flavours** (same signing key, different claims):

| Aspect | App JWT | OAuth2 JWT (Token-A) | OAuth2 JWT (Token-B) |
|--------|---------|----------------------|----------------------|
| Issued by | `AuthController` | `OAuth2TokenFilter` | `OAuth2TokenFilter` (token exchange) |
| Expiry | 24 hours | 15 minutes | 15 minutes |
| Claims | `sub`, `permissions[]`, `iat`, `exp` | `sub`, `scopes[]`, `iss`, `aud`, `iat`, `exp` | `sub`, `scopes[]` (mapped perms), `iss`, `aud`, `iat`, `exp` |
| Scopes/perms | `READ`, `EDIT`, `PLUGIN_MANAGEMENT` | `mcp:read`, `mcp:edit` | `READ`, `EDIT` (mapped from mcp scopes) |

---

### Login Flow (App JWT)

1. `POST /api/auth/login` with `{username, password}`
2. `AuthenticationManager` → `CustomUserDetailsService.loadUserByUsername()` → BCrypt password check
3. On success: `JwtTokenProvider.generateToken(username, permissions)` → `{"token": "<jwt>"}`
4. Frontend stores JWT in `localStorage["auth_token"]`
5. Subsequent requests: `Authorization: Bearer <token>` injected by `api/client.ts`
6. `JwtAuthenticationFilter` extracts token, calls `parseToken()`, populates `SecurityContextHolder` — **no database call per request**

---

### OAuth2 Authorization Code Flow

1. MCP client discovers endpoints via `GET /.well-known/oauth-authorization-server`
2. Client registers dynamically via `POST /oauth2/register` (gets `client_id`, `client_secret`)
3. User authorizes at `POST /oauth2/authorize` (must be JWT-authenticated; `OAuth2AuthorizePage.tsx` sends `_token` form param)
4. Backend generates 43-char code (32 random bytes, Base64url, in-memory, 10min TTL)
5. Client exchanges code at `POST /oauth2/token` with PKCE verification (S256 only)
6. Backend returns `{access_token, token_type: "Bearer", expires_in: 900, refresh_token, scope}`
7. Refresh tokens rotate on use (24h TTL, in-memory)

---

### Plugin Browser SDK Authentication

Plugin iframes run sandboxed and have no direct access to the host app's localStorage.

**Flow**:
1. Plugin calls `sdk.hostApp.getToken()` → `sendMessageAndWait("getToken", {}, hostOrigin)`
2. postMessage sent to `window.parent` with `requestId` prefix `"aj.plugin."` and 10s timeout
3. Host's `PluginMessageHandler` validates source, origin, `requestId` prefix
4. Reads `localStorage.getItem("auth_token")` and responds synchronously with the JWT
5. Plugin resolves its Promise with the JWT string

Plugins can also proxy API calls via `pluginFetch` — the host injects `Authorization: Bearer` on behalf of the plugin.

---

### MCP Server Authentication (Double Token Flow)

The MCP server accepts Token-A (OAuth2 access token) and performs two backend calls per request:

1. **Introspect Token-A**: `POST <backend>/oauth2/introspect` → verifies `active: true`, extracts `sub` and `scope`
2. **Exchange for Token-B**: `POST <backend>/oauth2/token` with RFC 8693 token-exchange → gets backend-scoped JWT
3. Token-B stored as `request.setAttribute("exchanged_token")` → bridged to MCP tool thread via `contextExtractor` → `ExchangedTokenHolder` ThreadLocal
4. `TokenBForwardingInterceptor` attaches Token-B to all backend API calls

**Cost**: 2 extra HTTP calls to the backend per MCP request (no caching).

---

### Frontend Auth State

- **Storage**: `localStorage["auth_token"]`
- **Context**: React `AuthContext` with `token`, `username`, `permissions` (decoded from JWT on load)
- **Route protection**: `AuthGuard` redirects unauthenticated users to `/login?returnTo=<path>`; only `token` is checked (no permission check at route level)
- **Expiry**: Checked at app load only; active session relies on API 401 for expiry detection
- **Logout**: Hard `window.location.href = "/login"` (not React Router)

---

### Test Infrastructure

**Backend test helpers**:
- `@WithMockAdminUser` → authorities: `PERMISSION_READ`, `PERMISSION_EDIT`, `PERMISSION_PLUGIN_MANAGEMENT`
- `@WithMockEditUser` → authorities: `PERMISSION_READ`, `PERMISSION_EDIT`
- `SecurityMockMvcConfiguration` — required import in all integration tests (Spring Boot 4 / Security 7 no longer auto-wires `springSecurity()` to MockMvc)

Test users seeded via Liquibase (`context: dev`): `admin/admin123`, `viewer/viewer123`, `editor/editor123`.

---

## Gaps Identified

| Gap | Source(s) |
|-----|-----------|
| No token refresh for app JWTs (24h sessions, no refresh endpoint) | codebase-security, codebase-frontend-tests |
| In-memory-only authorization code and refresh token storage (not cluster-safe) | codebase-oauth2 |
| No token-B caching in MCP server — 2 HTTP calls per request | codebase-plugin-mcp-auth |
| `AccessTokenHolder` is dead code (no callers, `McpJwtFilter` not wired) | codebase-plugin-mcp-auth |
| Insecure default JWT secret in `application.properties` (fallback for dev) | codebase-security |
| No JWKS endpoint — JWT keys cannot be externally validated via OIDC standards | codebase-oauth2 |
| Grant type not verified in token exchange handler | codebase-oauth2 |

---

## Confidence Assessment

**High confidence** (multiple sources confirm, direct code evidence):
- JWT structure and signing mechanism
- SecurityFilterChain filter order and URL rules
- Login flow end-to-end
- OAuth2 grant types supported
- Plugin postMessage auth flow
- MCP double-token flow

**Medium confidence** (single source or inferred):
- HMAC algorithm is HS256 (inferred from 32-byte key length, not explicitly declared)
- `_token` form param in OAuth2 consent form works correctly (confirmed by reading JwtAuthenticationFilter)

**Low confidence** (gaps):
- Production deployment behavior with `APP_JWT_SECRET` override
- Cluster behavior with in-memory token stores
