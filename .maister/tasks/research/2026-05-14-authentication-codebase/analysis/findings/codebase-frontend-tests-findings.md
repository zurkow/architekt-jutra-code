# Findings: Frontend Auth + Test Helpers

## Category
codebase-frontend-tests

## Sources Investigated

| File | Status |
|------|--------|
| `src/main/frontend/src/auth/AuthContext.tsx` | found |
| `src/main/frontend/src/auth/AuthGuard.tsx` | found |
| `src/main/frontend/src/pages/LoginPage.tsx` | found |
| `src/main/frontend/src/api/client.ts` | found |
| `src/main/frontend/src/router.tsx` | found |
| `src/main/frontend/src/main.tsx` | found |
| `src/main/frontend/src/test/auth.test.tsx` | found |
| `src/main/frontend/src/test/plugin-sdk-auth.test.ts` | found |
| `src/test/java/pl/devstyle/aj/WithMockAdminUser.java` | found |
| `src/test/java/pl/devstyle/aj/WithMockEditUser.java` | found |
| `src/test/java/pl/devstyle/aj/SecurityMockMvcConfiguration.java` | found |
| `src/test/java/pl/devstyle/aj/core/security/AuthIntegrationTests.java` | found |
| `src/test/java/pl/devstyle/aj/core/security/JwtTokenProviderTests.java` | found |
| `src/test/java/pl/devstyle/aj/core/security/SecurityTestHelperTests.java` | found |
| `.maister/docs/standards/backend/security.md` | found |
| `.maister/docs/standards/testing/backend-testing.md` | found |

---

## Key Findings

### Auth Context (React)

**File**: `src/main/frontend/src/auth/AuthContext.tsx`

`AuthContextValue` interface (lines 4-10):
- `token: string | null` — raw JWT string
- `username: string | null` — decoded from JWT `sub` claim
- `permissions: string[]` — decoded from JWT `permissions` claim
- `login(username, password): Promise<void>` — fires POST to `/api/auth/login`
- `logout(): void` — clears localStorage, resets state, hard-navigates to `/login`

**Initial state**: `loadStoredAuth()` (lines 32-42) reads `localStorage.getItem("auth_token")`, calls `isTokenExpired()` against `exp` claim, returns parsed state or nulls. Expired tokens removed from localStorage on load (line 39). Auth state rehydrated synchronously at import time.

**`login`** (lines 51-69): sends credentials to `/api/auth/login`, stores JWT as `localStorage.setItem("auth_token", jwt)` (line 64), decodes client-side, updates state.

**`logout`** (lines 71-77): `localStorage.removeItem("auth_token")`, then `window.location.href = "/login"` — hard navigation, not React Router redirect.

`AuthProvider` uses `useState` for `token`, `username`, `permissions`. Context value memoized with `useMemo`.

`useAuth()` throws if called outside `AuthProvider`.

---

### Token Storage

Token stored in `localStorage` under key `"auth_token"`.

| Action | Code Location |
|--------|--------------|
| Set on login | `AuthContext.tsx:64` — `localStorage.setItem("auth_token", jwt)` |
| Cleared on logout | `AuthContext.tsx:72` — `localStorage.removeItem("auth_token")` |
| Cleared on 401 | `api/client.ts:33` — `localStorage.removeItem("auth_token")` |
| Cleared on expiry at load | `AuthContext.tsx:39` — `localStorage.removeItem("auth_token")` |
| Read by API client | `api/client.ts:17` — `localStorage.getItem("auth_token")` |
| Read by plugin message handler | `PluginMessageHandler.ts:62` — `localStorage.getItem("auth_token")` |
| Read by OAuth2 consent form | `OAuth2AuthorizePage.tsx:99` — `localStorage.getItem("auth_token") || ""` |

No in-memory-only option. No cookie-based storage. No refresh token mechanism.

---

### Auth Guard / Protected Routes

**File**: `src/main/frontend/src/auth/AuthGuard.tsx`

Props: `children: ReactNode`, `requireAuth?: boolean` (default `true`).

Logic (lines 15-25):
- `requireAuth=true` + no token → redirect to `/login?returnTo=<encoded-path>` via `<Navigate replace />`
- `requireAuth=false` + token present → redirect to `returnTo` param or `/products`
- Otherwise: renders children

The guard checks only `token` — no permission/role check at route level. Permission-based gating happens at UI component level.

---

### Router — Public vs Protected Routes

**File**: `src/main/frontend/src/router.tsx`

| Path | Auth requirement |
|------|----------------|
| `/login` | `requireAuth=false` (redirects away if authenticated) |
| `/oauth2/authorize` | `requireAuth=true` (default) |
| `/` and all children | `requireAuth=true` (default) |

Protected children include: `/products`, `/products/new`, `/products/:id`, `/products/:id/edit`, `/categories/**`, `/plugins/**`.

Root `/` index redirects to `/products` (line 44).

---

### API Client — JWT Header Injection

**File**: `src/main/frontend/src/api/client.ts`

Plain `fetch`-based wrapper (no Axios). All requests go through `request<T>()` (lines 15-52).

**On every call** (lines 17-24):
```typescript
token = localStorage.getItem("auth_token")
if (token) headers["Authorization"] = `Bearer ${token}`
```

Token read from localStorage on every individual request — no in-memory cache.

**On 401 response** (lines 32-37):
1. Removes `auth_token` from localStorage
2. Hard-redirects `window.location.href = "/login"` (if not already there)
3. Throws `ApiError`

All paths prefixed with `/api` (line 16: `` const url = `/api${path}` ``).

---

### Login Page Component

**File**: `src/main/frontend/src/pages/LoginPage.tsx`

Local state: `username`, `password`, `error`, `loading`.

On submit (lines 15-28):
1. Calls `login(username, password)` from `useAuth()`
2. Success → navigate to `returnTo` or `/products`
3. Failure → sets error from `Error.message`

Submit button disabled while loading or if either field is empty (line 95).

---

### Backend Test Helpers (WithMock* Annotations)

**`WithMockAdminUser`** (`src/test/java/pl/devstyle/aj/WithMockAdminUser.java`):
```java
@WithMockUser(username = "test-admin", authorities = {"PERMISSION_READ", "PERMISSION_EDIT", "PERMISSION_PLUGIN_MANAGEMENT"})
public @interface WithMockAdminUser {}
```

**`WithMockEditUser`** (`src/test/java/pl/devstyle/aj/WithMockEditUser.java`):
```java
@WithMockUser(username = "test-editor", authorities = {"PERMISSION_READ", "PERMISSION_EDIT"})
public @interface WithMockEditUser {}
```

Both: `ElementType.TYPE` + `ElementType.METHOD`, `RetentionPolicy.RUNTIME`.

**Authority string format note**: Authority strings use `PERMISSION_` prefix (`PERMISSION_READ` etc.) — matching the format that `JwtAuthenticationFilter` and `CustomUserDetailsService` produce when loading into the Spring Security context. The JWT `permissions` claim stores values WITHOUT this prefix (`READ`, `EDIT` etc.).

---

### SecurityMockMvcConfiguration

**File**: `src/test/java/pl/devstyle/aj/SecurityMockMvcConfiguration.java`

`@TestConfiguration` that registers a `MockMvcBuilderCustomizer` applying `SecurityMockMvcConfigurers.springSecurity()`.

**Why it exists**: Spring Boot 4 / Spring Security 7's `@AutoConfigureMockMvc` no longer automatically applies `springSecurity()` to MockMvc. Without this, `@WithMockUser` / `@WithMockAdminUser` / `@WithMockEditUser` have no effect — security context is not applied to servlet filter chain.

**Required import in every integration test**:
```java
@Import({TestcontainersConfiguration.class, SecurityMockMvcConfiguration.class})
```

Uses Spring Boot 4's `MockMvcBuilderCustomizer` interface from `org.springframework.boot.webmvc.test.autoconfigure`.

---

### Integration Tests Coverage

**`AuthIntegrationTests.java`** — does NOT import `SecurityMockMvcConfiguration` (tests the real JWT filter chain):

| Test | What It Verifies |
|------|----------------|
| `login_validCredentials_returnsTokenInResponse` | POST `/api/auth/login` with `admin`/`admin123` → 200 with non-null `$.token` |
| `login_invalidPassword_returns401` | Wrong password → 401 |
| `login_unknownUser_returns401` | Unknown username → 401 |
| `protectedEndpoint_noToken_returns401` | GET `/api/products` without header → 401 |
| `protectedEndpoint_validToken_returns200` | Valid token in `Authorization: Bearer` → 200 |
| `protectedEndpoint_expiredToken_returns401` | Expired token → 401 |
| `editEndpoint_readOnlyUser_returns403` | `viewer` user POSTing to `/api/products` → 403 |
| `pluginManagement_nonAdminUser_returns403` | `editor` user trying `PUT /api/plugins/*/manifest` → 403 |
| `protectedEndpoint_malformedJwt_returns401` | Non-JWT string as Bearer → 401 |
| `protectedEndpoint_jwtSignedWithWrongKey_returns401` | Wrong signing key → 401 |
| `healthEndpoint_noToken_returns200` | `/api/health` is public |
| `loginEndpoint_noToken_isAccessible` | `/api/auth/login` is public |
| `readEndpoint_viewerUser_returns200` | `viewer` user can GET `/api/products` |
| `protectedEndpoint_bearerPrefixMissing_returns401` | Token without `"Bearer "` prefix → 401 |

**Hard-coded test users** (must be seeded via Liquibase): `admin`/`admin123`, `viewer`/`viewer123`, `editor`/`editor123`.

`jwtTokenProvider.generateTokenWithExpiration()` is a test-facing method for creating already-expired tokens.

**`JwtTokenProviderTests.java`** — unit tests, no Spring context. Tests OAuth2 token path (`generateOAuth2Token`) only:
- Generates JWT with correct `aud`, `sub`, `iss` claims
- Null audience → no `aud` claim
- `parseRawClaims` on valid token returns all claims including `scopes`
- `parseRawClaims` on invalid token returns `Optional.empty()`

Note: No unit test for the regular `generateToken` method used by `AuthController`.

**`SecurityTestHelperTests.java`** — verifies `WithMock*` wiring end-to-end:
- `@WithMockEditUser` → GET/POST `/api/categories` returns 200/201
- `@WithMockAdminUser` → GET `/api/plugins` (200), PUT `/api/plugins/*/manifest` (200)
- No security context → GET `/api/categories` returns 401

---

### Frontend Test Patterns

**`auth.test.tsx`** setup:
- `fetch` globally stubbed via `vi.stubGlobal("fetch", mockFetch)`
- `window.location` replaced with writable mock object
- `AuthContext` mocked with `vi.mock()` + `vi.resetAllMocks()` in `beforeEach`
- `renderWithProviders` wraps with `ChakraProvider` + `MemoryRouter`

Test suites:
- **"API Client Auth"**: `api.get()` sends `Authorization: Bearer` from localStorage; 401 clears localStorage and redirects to `/login`
- **"LoginPage"**: form renders inputs, calls `login(username, password)` on submit
- **"AuthContext"**: real `AuthProvider` + `useAuth` with valid JWT → correct `token`, `username`, `permissions`; logout clears `token`
- **"Permission-based UI visibility"**: `ProductListPage` hides "+ Add Product" button when `permissions` is empty

**`plugin-sdk-auth.test.ts`**:
1. `handlePluginFetch` injects `Authorization: Bearer <token>` from localStorage
2. `createServerSDK` propagates `Authorization: Bearer` from passed headers
3. Plugin data endpoint URL pattern: `/api/plugins/{plugin-id}/products/{id}/data`

---

## Gaps and Uncertainties

1. **No token refresh mechanism**: No refresh token, no silent token renewal, no proactive expiry check during active session. Expired sessions detected only on next page reload or on 401 from API.

2. **Expiry checked only at load time**: `loadStoredAuth()` checks expiry once at startup. If token expires during an active session, expiry won't be detected until the next API call returns 401.

3. **`JwtTokenProviderTests` only tests OAuth2 path**: No unit test for the regular `generateToken` method used by the login flow.

4. **`OAuth2AuthorizePage` sends JWT as hidden form field** (`_token`): JWT read from localStorage and embedded in HTML form body rather than `Authorization` header. Relies on `JwtAuthenticationFilter` reading from `_token` form param (which it does, as seen in `JwtAuthenticationFilter.java:48`).

5. **Test users seeded in dev context only**: `admin`/`admin123`, `viewer`/`viewer123`, `editor`/`editor123` are seeded by Liquibase `context: dev`. Integration tests depend on these users being present — they must run with `dev` liquibase context active.

---

## Rejected Information

| # | Information | Source | Why Rejected | Re-include If |
|---|------------|--------|-------------|---------------|
| 1 | `JwtTokenProviderTests` tests `generateOAuth2Token` / `parseRawClaims` | JwtTokenProviderTests.java | Covers OAuth2 token variant, not primary login JWT flow | Investigating OAuth2 server-side implementation |
| 2 | `IntegrationTests.java` (root class) | IntegrationTests.java | Tests health endpoint and SPA forwarding, not auth flows | Investigating general application integration or SPA routing |
| 3 | Plugin server-SDK data URL patterns | plugin-sdk-auth.test.ts:90-124 | Tests URL path construction for plugin data storage, not auth | Investigating plugin data storage architecture |
