# Cross-Source Verification

Research question: How does authentication work in this codebase?

---

## Cross-Source Findings Comparison

### 1. JWT Claims Structure

| Aspect | codebase-security | codebase-oauth2 | codebase-frontend-tests | Verdict |
|--------|-------------------|-----------------|------------------------|---------|
| App JWT claim name | `permissions` (array) | — | Tests decode `permissions` claim (`AuthContext.tsx`) | **Consistent** |
| OAuth2 token claim name | `scopes` via fallback in `parseToken` | `scopes` in `generateOAuth2Token` | `JwtTokenProviderTests` tests `scopes` claim | **Consistent** |
| App JWT expiry | 24h via `app.jwt.expiration-ms=86400000` | — | No contradiction | **Consistent** |
| OAuth2 token expiry | `generateOAuth2Token` uses 15min | `expires_in: 900` in response | — | **Consistent** |
| Signing key | Base64-decoded HMAC, `app.jwt.secret` | Same key used for OAuth2 tokens | — | **Consistent** |

**Confidence**: High — all three relevant sources agree on JWT structure.

---

### 2. PERMISSION_ Prefix Convention

| Source | Authority format |
|--------|----------------|
| `SecurityConfiguration.java` URL rules | `PERMISSION_READ`, `PERMISSION_EDIT`, `PERMISSION_PLUGIN_MANAGEMENT` |
| `JwtAuthenticationFilter.java` | Adds `"PERMISSION_" + p` prefix when loading from JWT |
| `CustomUserDetailsService.java` | Adds `"PERMISSION_" + permission.name()` prefix |
| `WithMockAdminUser.java` | Uses `PERMISSION_READ`, `PERMISSION_EDIT`, `PERMISSION_PLUGIN_MANAGEMENT` |
| `WithMockEditUser.java` | Uses `PERMISSION_READ`, `PERMISSION_EDIT` |
| MCP introspection filter | Adds `"PERMISSION_" + scope` prefix for mcp scopes |

**Verdict**: **Fully consistent** across all sources. JWT stores `READ` / `EDIT` bare values; `PERMISSION_` prefix is always added when loading into Spring Security context.

**Confidence**: High.

---

### 3. `_token` Form Parameter Handling

| Source | Observation |
|--------|-------------|
| `OAuth2AuthorizePage.tsx` (codebase-oauth2) | Sends `_token` hidden form field with JWT from localStorage in consent form POST |
| `JwtAuthenticationFilter.java` (codebase-security) | Reads `_token` as fallback parameter (line 48) after `Authorization: Bearer` header |

**Verdict**: **Consistent** — the frontend sends it, the filter reads it. Initial uncertainty (noted as gap in codebase-oauth2 findings) is resolved by reading JwtAuthenticationFilter directly.

**Confidence**: High.

---

### 4. Token Storage (Frontend)

| Source | Observation |
|--------|-------------|
| `AuthContext.tsx` (codebase-frontend-tests) | Sets/clears `localStorage["auth_token"]` |
| `api/client.ts` (codebase-frontend-tests) | Reads `localStorage["auth_token"]` for every request |
| `OAuth2AuthorizePage.tsx` (codebase-oauth2) | Reads `localStorage["auth_token"]` for `_token` form field |
| `PluginMessageHandler.ts` (codebase-plugin-mcp-auth) | Reads `localStorage["auth_token"]` for plugin `getToken` responses |

**Verdict**: **Consistent** — `"auth_token"` is a shared convention used across 4 separate files. All reads from the same key.

**Confidence**: High.

---

### 5. No Token Refresh for App JWTs

| Source | Evidence |
|--------|---------|
| `AuthController.java` (codebase-security) | No refresh endpoint visible; only `POST /api/auth/login` |
| `AuthContext.tsx` (codebase-frontend-tests) | No refresh call; `logout()` hard-redirects on session end |
| `api/client.ts` (codebase-frontend-tests) | On 401 → clears localStorage and redirects to login; no retry |
| SecurityConfiguration URL rules | No `/api/auth/refresh` endpoint in URL rules |

**Verdict**: **Confirmed gap** — no refresh mechanism for app JWTs. 24h token with no renewal path. Expired sessions require a new login.

**Confidence**: High.

---

### 6. In-Memory Token Storage (OAuth2)

| Source | Evidence |
|--------|---------|
| `AuthorizationCodeService.java` (codebase-oauth2) | `ConcurrentHashMap`, not persisted to DB |
| `RefreshTokenService.java` (codebase-oauth2) | `ConcurrentHashMap`, not persisted to DB |
| `SecurityConfiguration.java` (codebase-security) | No token store bean visible in security config |

**Verdict**: **Confirmed** — both authorization codes and refresh tokens are in-memory only. Not cluster-safe.

**Confidence**: High.

---

### 7. MCP Server Active Filter

| Source | Evidence |
|--------|---------|
| `SecurityConfig.java` (codebase-plugin-mcp-auth) | Wires `McpIntrospectionFilter`, not `McpJwtFilter` |
| `McpJwtFilter.java` Javadoc | "trust-and-forward model" — superseded |
| `McpJwtFilterTests.java` | Tests exist but filter is not wired |
| codebase-oauth2 summary | References `McpIntrospectionFilter` as the active validator |

**Verdict**: **Consistent** — `McpIntrospectionFilter` is the active mechanism. `McpJwtFilter` is legacy code with tests but no production wiring.

**Confidence**: High.

---

### 8. Filter Chain Order

| Source | Evidence |
|--------|---------|
| `SecurityConfiguration.java` (codebase-security) | `JwtAuth → PublicClientReg → OAuth2Auth → OAuth2Token → OAuth2Introspect` |
| codebase-oauth2 findings | All 4 OAuth2 filters described as `OncePerRequestFilter` instances in same chain |
| codebase-plugin-mcp-auth findings | MCP server has its own separate `SecurityFilterChain` |

**Verdict**: **Consistent** — host app and MCP server have independent `SecurityFilterChain` beans. OAuth2 endpoints are `permit-all` in URL rules; authorization logic is inside the filters themselves.

**Confidence**: High.

---

## Contradictions Found

**None** — all four gatherers produced internally consistent and cross-consistent findings. The only initial uncertainty (gap #3 in codebase-oauth2 about `_token` handling) was resolved by cross-referencing `JwtAuthenticationFilter`.

---

## Confidence Summary

| Finding | Confidence | Basis |
|---------|------------|-------|
| JWT structure (claims, signing, expiry) | High | 3 sources agree |
| PERMISSION_ prefix convention | High | 6 code locations agree |
| Login flow end-to-end | High | Direct code evidence |
| OAuth2 flow (grant types, PKCE, introspection) | High | 19 files across 2 categories |
| Plugin postMessage auth flow | High | TypeScript + test evidence |
| MCP double-token flow | High | 7 files, test coverage |
| No app JWT refresh | High | 4 sources confirm absence |
| In-memory OAuth2 storage | High | 2 service classes confirmed |
| HMAC algorithm is HS256 | Medium | Inferred from key length, not declared |
| Cluster safety of in-memory stores | Low | Code confirms in-memory; production impact not observable from code |

---

## Declarative Conclusions

No declarative conclusions to report. All sources are code files, migrations, and tests — no transcripts or meeting notes were investigated. All findings are directly verifiable from source code.
