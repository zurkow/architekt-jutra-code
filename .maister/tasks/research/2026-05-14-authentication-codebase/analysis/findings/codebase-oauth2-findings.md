# Findings: OAuth2 Authorization Server

## Category
codebase-oauth2

## Sources Investigated

| File | Status |
|------|--------|
| `src/main/java/pl/devstyle/aj/core/oauth2/OAuth2AuthorizationFilter.java` | found |
| `src/main/java/pl/devstyle/aj/core/oauth2/OAuth2TokenFilter.java` | found |
| `src/main/java/pl/devstyle/aj/core/oauth2/OAuth2IntrospectionFilter.java` | found |
| `src/main/java/pl/devstyle/aj/core/oauth2/AuthorizationCodeService.java` | found |
| `src/main/java/pl/devstyle/aj/core/oauth2/OAuth2ClientAuthenticator.java` | found |
| `src/main/java/pl/devstyle/aj/core/oauth2/RefreshTokenService.java` | found |
| `src/main/java/pl/devstyle/aj/core/oauth2/DatabaseRegisteredClientRepository.java` | found |
| `src/main/java/pl/devstyle/aj/core/oauth2/RegisteredClientEntity.java` | found |
| `src/main/java/pl/devstyle/aj/core/oauth2/RegisteredClientJpaRepository.java` | found |
| `src/main/java/pl/devstyle/aj/core/oauth2/PublicClientRegistrationFilter.java` | found |
| `src/main/java/pl/devstyle/aj/core/oauth2/OAuth2MetadataController.java` | found |
| `src/main/java/pl/devstyle/aj/core/oauth2/OAuth2Error.java` | found |
| `src/main/java/pl/devstyle/aj/core/oauth2/OAuth2ErrorResponse.java` | found |
| `src/main/resources/db/changelog/2026/009-create-oauth2-registered-client-table.yaml` | found |
| `src/main/resources/db/changelog/2026/010-seed-mcp-server-oauth2-client.yaml` | found |
| `src/main/frontend/src/pages/OAuth2AuthorizePage.tsx` | found |
| `src/test/java/pl/devstyle/aj/core/oauth2/OAuth2IntegrationTests.java` | found |
| `src/test/java/pl/devstyle/aj/core/oauth2/OAuth2IntrospectionTests.java` | found |
| `src/test/java/pl/devstyle/aj/core/oauth2/TokenExchangeIntegrationTests.java` | found |

---

## Key Findings

### Supported Grant Types

Three grant types implemented in `OAuth2TokenFilter.java:74-88`:

1. `authorization_code` — code-for-token exchange
2. `refresh_token` — refresh token rotation
3. `urn:ietf:params:oauth:grant-type:token-exchange` (RFC 8693) — MCP server exchanges user's Token-A for backend-scoped Token-B

The well-known metadata advertises all three: `OAuth2MetadataController.java:48`.

---

### Authorization Code Flow

**Endpoint**: `POST /oauth2/authorize` — handled by `OAuth2AuthorizationFilter.java`

**Required request parameters** (`OAuth2AuthorizationFilter.java:67-73`):
- `client_id` — must match a registered client
- `redirect_uri` — must exactly match a registered URI
- `response_type` — only `"code"` accepted; other values → `unsupported_response_type`
- `scope` (optional) — space-separated; validated against client's registered scopes
- `state` (optional) — echoed back in redirect
- `code_challenge` / `code_challenge_method` — required for public clients (PKCE)

**Authentication requirement**: User must be JWT-authenticated. Filter reads `SecurityContextHolder` for username and `PERMISSION_*` authorities (`OAuth2AuthorizationFilter.java:92-102`).

**Scope consent UI**: `OAuth2AuthorizePage.tsx` displays consent form. POSTs to `/oauth2/authorize` with `_token` hidden field (JWT from localStorage). `mcp:read` is always pre-selected and locked (`OAuth2AuthorizePage.tsx:16`).

**Code generation**: 32 random bytes, Base64url-encoded without padding → ~43-character code (`OAuth2AuthorizationFilter.java:124-127`).

**Success**: HTTP 302 redirect to `{redirect_uri}?code={code}&state={state}` (`OAuth2AuthorizationFilter.java:111-121`).

**Storage**: In-memory `ConcurrentHashMap` inside `AuthorizationCodeService`. TTL: **10 minutes** (`AuthorizationCodeService.java:16`). Cleanup runs every 5 minutes (`AuthorizationCodeService.java:47`). **Not persisted to database**.

**Data stored per code** (`AuthorizationCodeService.java:64-73`): `clientId`, `redirectUri`, `scope`, `codeChallenge`, `codeChallengeMethod`, `username`, `permissions`, `createdAt`.

---

### Token Endpoint

**Endpoint**: `POST /oauth2/token` — handled by `OAuth2TokenFilter.java`

#### Authorization Code Grant

Request parameters (`OAuth2TokenFilter.java:93-103`): `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id` (optional), `client_secret` (for confidential clients), `code_verifier` (if PKCE was used).

Validation sequence:
1. `AuthorizationCodeService.consumeAuthorizationCode(code)` — one-time use, atomically removed
2. `client_id` match if provided
3. `redirect_uri` match
4. Confidential client: `client_secret` BCrypt-verified
5. PKCE: SHA-256(`code_verifier`) must equal stored `code_challenge`

Token generated via `JwtTokenProvider.generateOAuth2Token()`. Access token carries granted OAuth2 scopes in `scopes` claim.

**Success response** (`OAuth2TokenFilter.java:312-333`):
```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "<opaque>",
  "scope": "mcp:read mcp:edit"
}
```
Headers: `Cache-Control: no-store`, `Pragma: no-cache`.

`expires_in` is hardcoded at 900 (15 minutes) (`OAuth2TokenFilter.java:323`, `JwtTokenProvider.java:45`).

#### Refresh Token Grant

Request parameters: `grant_type=refresh_token`, `refresh_token`. No client authentication required.

`RefreshTokenService.consumeAndRotate()` atomically removes old token and issues new one (rotation). Same response shape as authorization code grant.

#### Token Exchange Grant (RFC 8693)

Request parameters (`OAuth2TokenFilter.java:197-258`):
- `grant_type=urn:ietf:params:oauth:grant-type:token-exchange`
- `subject_token` — Token-A (user's access token)
- `subject_token_type` — must be `urn:ietf:params:oauth:token-type:access_token`
- `scope` (optional) — falls back to subject token's scopes if omitted
- Client credentials via `client_secret_post` or `client_secret_basic`

**Scope mapping** (`OAuth2TokenFilter.java:33-36`): `mcp:read` → `READ`, `mcp:edit` → `EDIT`. Unknown scopes silently dropped.

Token-B is generated with mapped backend permissions as `scopes` claim and `audience = issuer URL` (`OAuth2TokenFilter.java:251-253`).

**Token exchange response** (`OAuth2TokenFilter.java:262-277`):
```json
{
  "access_token": "<jwt-token-b>",
  "issued_token_type": "urn:ietf:params:oauth:token-type:access_token",
  "token_type": "Bearer",
  "expires_in": 900
}
```
No `refresh_token` field (RFC 8693 Section 2.2 compliant).

---

### Token Introspection

**Endpoint**: `POST /oauth2/introspect` — handled by `OAuth2IntrospectionFilter.java`

**Client authentication required**: `client_secret_post` or `client_secret_basic` (`OAuth2IntrospectionFilter.java:46-56`). Public client → `invalid_client`.

**Request parameter**: `token`. Missing/blank → `{"active": false}` without error (`OAuth2IntrospectionFilter.java:59-63`).

**Validation**: `JwtTokenProvider.parseRawClaims(token)` — verifies HMAC signature and expiry.

**Active response** (RFC 7662 compliant, `OAuth2IntrospectionFilter.java:74-99`):
```json
{
  "active": true,
  "sub": "<username>",
  "scope": "mcp:read mcp:edit",
  "exp": 1234567890,
  "iat": 1234567000,
  "iss": "https://example.com",
  "aud": "https://example.com",
  "token_type": "Bearer",
  "client_id": "<calling-client-id>"
}
```

`scope` built from JWT `scopes` claim (List) joined by spaces (`OAuth2IntrospectionFilter.java:80-83`).

**Inactive response**: `{"active": false}` with HTTP 200 (RFC 7662 compliant).

---

### Client Registration Model

**Dynamic registration endpoint**: `POST /oauth2/register` (unauthenticated)
Handled by `PublicClientRegistrationFilter.java`.

**Token endpoint auth methods** (`PublicClientRegistrationFilter.java:122-133`):
- `"client_secret_post"` — default if omitted
- `"client_secret_basic"` — HTTP Basic Auth
- `"none"` — public client (PKCE required)

**Scope restriction** (`PublicClientRegistrationFilter.java:32`): Only `mcp:read` and `mcp:edit` allowed. Other scopes → 400 `invalid_client_metadata`.

**Redirect URI validation** (`PublicClientRegistrationFilter.java:163-174`): Must be HTTPS or loopback. No fragments allowed.

**Client credentials**: `clientId = UUID`, `clientSecret = UUID` (plain), then BCrypt-encoded for storage (`PublicClientRegistrationFilter.java:84-91`).

**Response**: HTTP 201 with OIDC Client Registration response, including plain-text `client_secret` and `client_secret_expires_at: 0` (never expires).

---

### PKCE Support

**Only `S256` method supported**; `plain` explicitly rejected (`OAuth2AuthorizationFilter.java:164`, `OAuth2TokenFilter.java:292`).

**At authorization** (`OAuth2AuthorizationFilter.java:149-173`):
- Public clients: PKCE **mandatory**
- Confidential clients: PKCE **optional**
- `code_challenge` must be 43–128 characters, base64url chars

**At token exchange** (`OAuth2TokenFilter.java:279-309`):
- Verification: SHA-256(`code_verifier`) Base64url-encodes to stored `code_challenge`
- `code_verifier` must be 43–128 chars, unreserved chars

---

### Refresh Token Flow

**Service**: `RefreshTokenService.java`
**Storage**: In-memory `ConcurrentHashMap` — **not persisted** to database.
**TTL**: 24 hours (`RefreshTokenService.java:18`).
**Cleanup**: Scheduled every 30 minutes (`RefreshTokenService.java:52`).
**Format**: 32 random bytes, Base64url-encoded without padding (`RefreshTokenService.java:69-72`).
**Rotation**: Each use atomically removes old token and issues new one. Reuse → `invalid_grant` (`RefreshTokenService.java:31-49`).

Data stored: `username`, `permissions`, `scope`, `createdAt` (`RefreshTokenService.java:75-79`).

---

### Well-Known Metadata

**Endpoint**: `GET /.well-known/oauth-authorization-server` — `OAuth2MetadataController.java:38-53`

Honours `X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-Port` headers for URL construction.

**Response**:
```json
{
  "issuer": "https://example.com",
  "authorization_endpoint": "https://example.com/oauth2/authorize",
  "token_endpoint": "https://example.com/oauth2/token",
  "registration_endpoint": "https://example.com/oauth2/register",
  "introspection_endpoint": "https://example.com/oauth2/introspect",
  "grant_types_supported": ["authorization_code", "refresh_token", "urn:ietf:params:oauth:grant-type:token-exchange"],
  "response_types_supported": ["code"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic", "none"],
  "scopes_supported": ["mcp:read", "mcp:edit"]
}
```

Additional: `GET /api/oauth2/client-info?client_id={id}` returns `{client_id, client_name, scopes}` for consent page (`OAuth2MetadataController.java:25-35`).

---

### Database Schema (OAuth2 Clients)

Table: `oauth2_registered_client` (`009-create-oauth2-registered-client-table.yaml`)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK NOT NULL |
| `client_id` | varchar(255) | NOT NULL UNIQUE |
| `client_id_issued_at` | timestamp | NOT NULL |
| `client_secret` | varchar(255) | nullable |
| `client_secret_expires_at` | timestamp | nullable |
| `client_name` | varchar(255) | NOT NULL |
| `client_authentication_methods` | text[] | NOT NULL |
| `authorization_grant_types` | text[] | NOT NULL |
| `redirect_uris` | text[] | nullable |
| `scopes` | text[] | NOT NULL |
| `created_at` / `updated_at` | timestamp | NOT NULL |

Array columns use PostgreSQL native `text[]`, mapped via `@JdbcTypeCode(SqlTypes.ARRAY)` (`RegisteredClientEntity.java:47-61`).

**Pre-seeded client** (`010-seed-mcp-server-oauth2-client.yaml`):
- `client_id = "mcp-server"`, grant type: `urn:ietf:params:oauth:grant-type:token-exchange` only
- Seeded in `context: dev` only

---

### JWT Token Structure

Two JWT flavours, both HMAC-signed with the same `app.jwt.secret` key:

**App JWT** (`generateToken()`): claim `"permissions"` (list of backend permission strings: `READ`, `EDIT`, `PLUGIN_MANAGEMENT`). No issuer/audience. Expiry: 24 hours.

**OAuth2 JWT** (`generateOAuth2Token()`): claim `"scopes"` (list: e.g. `["mcp:read","mcp:edit"]` for Token-A, or `["READ","EDIT"]` for Token-B), plus `iss`, optionally `aud`. Expiry: 15 minutes.

`parseToken()` handles both by checking `"permissions"` first, then falling back to `"scopes"` (`JwtTokenProvider.java:96-99`).

---

## Gaps and Uncertainties

1. **In-memory storage is not cluster-safe**: `AuthorizationCodeService` and `RefreshTokenService` use in-memory `ConcurrentHashMap`. Multi-instance deployments would not share state.

2. **`_token` hidden field handling**: The frontend sends `_token` (JWT) as a hidden form field in the consent form POST. The filter reads authentication from `SecurityContextHolder` set by `JwtAuthenticationFilter`. It is not clear whether `JwtAuthenticationFilter` reads from the `_token` form parameter or only from `Authorization: Bearer` header. Investigation of `JwtAuthenticationFilter` shows it does fall back to `_token` form param (line 48), so this works.

3. **Grant type validation gap**: The token exchange handler does not verify the calling client has `urn:ietf:params:oauth:grant-type:token-exchange` in its `authorization_grant_types`. Only the client secret is verified.

4. **No JWKS endpoint**: No `jwks_uri` in well-known metadata. JWT signature keys cannot be validated externally via standard JWKS.

5. **`client_secret_expires_at: 0`**: Registration response sets `clientSecretExpiresAt` to `Instant.ofEpochSecond(0)` (epoch). Per RFC 7591, `0` means never expires.

---

## Rejected Information

| # | Information | Source | Why Rejected | Re-include If |
|---|------------|--------|-------------|---------------|
| 1 | Spring Authorization Server auto-configuration | N/A | Project imports some Spring Authorization Server types but all OAuth2 logic is custom hand-rolled | Never |
| 2 | `McpJwtFilter` trust-and-forward model | mcp-server | Superseded by `McpIntrospectionFilter` per doc comment | If old trust-forward behaviour is re-examined |
