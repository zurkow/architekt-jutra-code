# Findings: Core Security (JWT + SecurityFilterChain)

## Category
codebase-security

## Sources Investigated

| File | Status |
|------|--------|
| `src/main/java/pl/devstyle/aj/core/security/SecurityConfiguration.java` | found |
| `src/main/java/pl/devstyle/aj/core/security/JwtTokenProvider.java` | found |
| `src/main/java/pl/devstyle/aj/core/security/JwtAuthenticationFilter.java` | found |
| `src/main/java/pl/devstyle/aj/core/security/CustomUserDetailsService.java` | found |
| `src/main/java/pl/devstyle/aj/api/AuthController.java` | found |
| `src/main/java/pl/devstyle/aj/api/LoginRequest.java` | found |
| `src/main/java/pl/devstyle/aj/api/LoginResponse.java` | found |
| `src/main/java/pl/devstyle/aj/user/User.java` | found |
| `src/main/java/pl/devstyle/aj/user/Permission.java` | found |
| `src/main/java/pl/devstyle/aj/user/UserRepository.java` | found |
| `src/main/resources/db/changelog/2026/008-create-users-table.yaml` | found |
| `src/main/resources/application.properties` | found |
| `.maister/docs/standards/backend/security.md` | found |
| `src/main/java/pl/devstyle/aj/core/BaseEntity.java` | found (supplemental) |

---

## Key Findings

### SecurityFilterChain Configuration

**File**: `src/main/java/pl/devstyle/aj/core/security/SecurityConfiguration.java`

The class is annotated `@Configuration @EnableWebSecurity` (lines 35–36) and declares a single `SecurityFilterChain` bean.

**Session management**: `SessionCreationPolicy.STATELESS` — no HTTP sessions are created (line 65).

**CSRF**: Disabled with inline comment "stateless JWT authentication with no cookie-based sessions" (line 64).

**CORS**: Configured via `CorsConfigurationSource` bean (lines 165–173). Allowed origins read from `app.cors.allowed-origins` property. Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS. All request headers allowed (`"*"`). Credentials allowed.

**Exception handlers** (lines 66–91):
- `AuthenticationEntryPoint`: returns HTTP 401 with JSON `ErrorResponse("Authentication required")`.
- `AccessDeniedHandler`: returns HTTP 403 with JSON `ErrorResponse("Access denied")`.
Both write directly to `response.getOutputStream()` using the injected `ObjectMapper`, bypassing the controller/exception-handler layer.

**URL authorization rules** (`authorizeHttpRequests`, lines 92–135):

Public (no auth required):
- `GET /.well-known/oauth-authorization-server`
- `POST /oauth2/register`, `/oauth2/token`, `/oauth2/introspect`
- `GET /api/oauth2/client-info`
- `POST /api/auth/login`
- `GET /api/health`
- `/assets/**`, `/`, `/index.html`, `/*.js`, `/*.css`, `/favicon.ico`
- Any request whose URI does not start with `/api/` (SPA routes)

`PERMISSION_READ` or `PERMISSION_mcp:read` required:
- `GET /api/categories/**`
- `GET /api/products/**`

`PERMISSION_READ` required (app users only):
- `GET /api/plugins`, `GET /api/plugins/*`, `GET /api/plugins/*/objects/**`, `GET /api/plugins/*/products/*/data`

`PERMISSION_EDIT` or `PERMISSION_mcp:edit` required:
- POST/PUT/DELETE on `/api/categories/**` and `/api/products/**`

`PERMISSION_EDIT` required:
- PUT/DELETE on `/api/plugins/*/objects/**` and `/api/plugins/*/products/*/data`

`PERMISSION_PLUGIN_MANAGEMENT` required:
- `PUT /api/plugins/*/manifest`
- `PATCH /api/plugins/*/enabled`
- `DELETE /api/plugins/*`

Fallback: `.anyRequest().authenticated()` (line 134).

**Filter chain order** (lines 136–149):
1. `JwtAuthenticationFilter` — before `UsernamePasswordAuthenticationFilter`
2. `PublicClientRegistrationFilter` — after `JwtAuthenticationFilter`
3. `OAuth2AuthorizationFilter` — after `PublicClientRegistrationFilter`
4. `OAuth2TokenFilter` — after `OAuth2AuthorizationFilter`
5. `OAuth2IntrospectionFilter` — after `OAuth2TokenFilter`

Note: `JwtTokenProvider` is also injected into `OAuth2TokenFilter` and `OAuth2IntrospectionFilter`, so OAuth2 tokens are signed with the same key and validated by the same provider.

**Other beans in this class**:
- `PasswordEncoder passwordEncoder()` — `BCryptPasswordEncoder` (line 155–157).
- `AuthenticationManager authenticationManager(AuthenticationConfiguration)` — delegates to Spring's `AuthenticationConfiguration` (lines 159–163).

---

### JWT Token Provider

**File**: `src/main/java/pl/devstyle/aj/core/security/JwtTokenProvider.java`

**Library**: `io.jsonwebtoken` (JJWT) — imports `Claims`, `JwtException`, `Jwts`, `Keys` (lines 3–6).

**Key construction** (line 25):
```java
this.secretKey = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret));
```
The `app.jwt.secret` property value is a Base64-encoded HMAC key. The algorithm is determined by key length — `Keys.hmacShaKeyFor` selects HS256/HS384/HS512 based on key size.

**`generateToken(String username, Set<String> permissions)`** (lines 29–31): delegates to `generateTokenWithExpiration` using the configured `expirationMs`.

**`generateTokenWithExpiration(String username, Set<String> permissions, long expirationMs)`** (lines 33–43): builds a JWT with:
- `sub`: username
- `permissions`: `List.copyOf(permissions)` (a JSON array)
- `iat`: current timestamp
- `exp`: now + expirationMs
- Signed with `secretKey` (HMAC)

**`generateOAuth2Token(String username, Set<String> scopes, String issuer[, String audience])`** (lines 47–65): separate method for OAuth2 tokens with:
- Fixed expiration: 900,000 ms = 15 minutes (line 45)
- Claim name: `scopes` (not `permissions`)
- Additional `iss` and optionally `aud` claims

**`parseToken(String token)`** (lines 88–107): single-parse method — verifies signature, extracts `sub` and `permissions` claim. Falls back to `scopes` claim if `permissions` is null (line 98), enabling OAuth2 tokens to be used for authorization. Returns `Optional<ParsedToken>` — empty on any `JwtException` or `IllegalArgumentException`.

**`ParsedToken`** record (line 80): `record ParsedToken(String username, Set<String> permissions)` — lightweight value type.

**`parseRawClaims(String token)`** (lines 67–78): returns raw `Claims` object, used by OAuth2 introspection.

**`validateToken(String token)`** (lines 129–139): boolean — parses and discards result; returns false on any exception.

**`getUsernameFromToken(String token)`** and **`getPermissionsFromToken(String token)`** (lines 109–127): individual accessors; `getPermissionsFromToken` reads only the `permissions` claim (no fallback to `scopes`).

---

### JWT Authentication Filter

**File**: `src/main/java/pl/devstyle/aj/core/security/JwtAuthenticationFilter.java`

Extends `OncePerRequestFilter` (line 14) — executes at most once per request.

**Token extraction** (`extractToken`, lines 42–53):
1. Reads `Authorization` header; if present and starts with `"Bearer "`, strips prefix and returns the token.
2. Falls back to `_token` query/form parameter (for OAuth2 native form POST flows, line 48).
3. Returns `null` if neither is found.

**Authentication population** (lines 27–36): if a token is found, calls `jwtTokenProvider.parseToken(token)`. On success:
- Each permission string is wrapped as `SimpleGrantedAuthority("PERMISSION_" + p)`.
- Creates `UsernamePasswordAuthenticationToken(username, null, authorities)` with authorities (i.e., authenticated).
- Sets it in `SecurityContextHolder`.

If the token is missing or invalid, the filter proceeds without setting an authentication — Spring Security's default then enforces the `anyRequest().authenticated()` fallback if needed.

`CustomUserDetailsService` is **not** called during this filter — authentication is fully self-contained in the JWT claims.

---

### Login Endpoint (AuthController)

**File**: `src/main/java/pl/devstyle/aj/api/AuthController.java`

`@RestController @RequestMapping("/api/auth")` (lines 22–23).

**`POST /api/auth/login`** handler `login(@Valid @RequestBody LoginRequest request)` (line 37):
1. Calls `authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password))`.
   - This triggers `CustomUserDetailsService.loadUserByUsername` → password check via `BCryptPasswordEncoder`.
2. On success: extracts authorities, strips `PERMISSION_` prefix, calls `jwtTokenProvider.generateToken(name, permissions)`, returns `200 OK` with `LoginResponse(token)`.
3. On `BadCredentialsException`: returns `401 Unauthorized` with `ErrorResponse("Invalid username or password")`.

**`LoginRequest`** (`src/main/java/pl/devstyle/aj/api/LoginRequest.java`): `record LoginRequest(@NotBlank String username, @NotBlank String password)` — JSR-380 validation on both fields.

**`LoginResponse`** (`src/main/java/pl/devstyle/aj/api/LoginResponse.java`): `record LoginResponse(String token)` — single field, serializes to `{"token":"..."}`.

---

### User and Permission Model

**File**: `src/main/java/pl/devstyle/aj/user/User.java`

- Extends `BaseEntity` (id: `Long`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime` with `@Version`).
- Table name: `users` (line 23).
- Sequence generator: `user_seq`, `allocationSize = 1` (line 24).
- `username`: `VARCHAR(50)`, NOT NULL, UNIQUE (line 31).
- `passwordHash`: `VARCHAR(72)`, NOT NULL (line 34). Column stores BCrypt hash.
- `permissions`: `Set<Permission>`, lazy `@ElementCollection`, stored in `user_permissions` table, joined by `user_id`, column name `permission`, stored as `EnumType.STRING` (lines 36–40).
- `equals`/`hashCode` based on `username` (lines 43–48) — business key, not entity id.
- Lombok: `@Getter @Setter @NoArgsConstructor`.

**File**: `src/main/java/pl/devstyle/aj/user/Permission.java`

Three values: `READ`, `EDIT`, `PLUGIN_MANAGEMENT` (lines 4–6).

Authority strings used in `SecurityFilterChain`:
- `PERMISSION_READ`
- `PERMISSION_EDIT`
- `PERMISSION_PLUGIN_MANAGEMENT`

OAuth2 scopes (used with `PERMISSION_mcp:read` and `PERMISSION_mcp:edit`) are not in this enum — they come from OAuth2 token `scopes` claim and are mapped by `parseToken`'s fallback.

**File**: `src/main/java/pl/devstyle/aj/user/UserRepository.java`

`JpaRepository<User, Long>` with one custom method: `Optional<User> findByUsername(String username)` (line 9).

**CustomUserDetailsService** (`src/main/java/pl/devstyle/aj/core/security/CustomUserDetailsService.java`):
- `@Service`, `@Transactional(readOnly = true)`.
- `loadUserByUsername(username)`: queries `userRepository.findByUsername`, throws `UsernameNotFoundException` if absent.
- Maps `Permission` enum values to `SimpleGrantedAuthority("PERMISSION_" + permission.name())`.
- Returns `org.springframework.security.core.userdetails.User(username, passwordHash, authorities)`.

---

### Database Schema (Users Table)

**File**: `src/main/resources/db/changelog/2026/008-create-users-table.yaml`

Three changesets (rollback defined for each):

**008-create-user-seq**: creates sequence `user_seq` starting at 1, incrementing by 1.

**008-create-users-table**: creates table `users`:
- `id` BIGINT PK NOT NULL
- `username` VARCHAR(50) NOT NULL
- `password_hash` VARCHAR(72) NOT NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL
- Unique constraint `uk_users_username` on `username`

**008-create-user-permissions-table**: creates table `user_permissions`:
- `user_id` BIGINT NOT NULL
- `permission` VARCHAR(30) NOT NULL
- Composite PK `pk_user_permissions` on `(user_id, permission)`
- FK `fk_user_permissions_user_id` → `users.id` with `ON DELETE CASCADE`

**008-seed-users** (context: `dev` only): inserts three seed users with BCrypt hashes and their permissions:
- `viewer`: `READ`
- `editor`: `READ`, `EDIT`
- `admin`: `READ`, `EDIT`, `PLUGIN_MANAGEMENT`

---

### Configuration Values

**File**: `src/main/resources/application.properties`

| Property | Value | Notes |
|----------|-------|-------|
| `app.jwt.secret` | `${APP_JWT_SECRET:i/WZnrbvFqiPfShuZjGmc5kC7IXxRZfpueJEdgCzGFc=}` | Base64-encoded HMAC key; fallback default is present (dev only) |
| `app.jwt.expiration-ms` | `86400000` | 24 hours (86,400,000 ms) |
| `app.cors.allowed-origins` | `http://localhost:*,https://kuba-app.labs-skillpanel.com` | Comma-separated list |
| `spring.liquibase.contexts` | `dev` | Enables seed data changeset |

**Security standards doc** (`.maister/docs/standards/backend/security.md`) confirms:
- Stateless JWT with `SecurityFilterChain`, no `@PreAuthorize`.
- Custom `AuthenticationEntryPoint`/`AccessDeniedHandler` returning JSON `ErrorResponse`.
- `BCryptPasswordEncoder` for passwords, `VARCHAR(72)` column.
- JWT must contain: `sub`, `permissions`, `iat`, `exp`. Parse once per request.

---

## Gaps and Uncertainties

1. **OAuth2 layer**: `SecurityConfiguration` imports and wires five OAuth2 filters (`PublicClientRegistrationFilter`, `OAuth2AuthorizationFilter`, `OAuth2TokenFilter`, `OAuth2IntrospectionFilter`, `OAuth2ClientAuthenticator`). These are outside the current category's scope but interact with the same `JwtTokenProvider` and `PasswordEncoder`. The OAuth2 flow is partially understood from the filter registration but the implementations were not read.

2. **`version` column / `updatedAt`**: `BaseEntity` uses `@Version` on `updatedAt` (optimistic locking). The users table schema defines `updated_at` as a plain TIMESTAMP with no DEFAULT — it must be set explicitly on insert (handled by Liquibase seed via `valueDate: "now()"`). JPA `@Version` behavior on `updatedAt` means any concurrent update to a `User` row will increment this field.

3. **No token refresh endpoint for app tokens**: `generateToken` is called once at login. There is no `POST /api/auth/refresh` visible in `AuthController`. Token lifetime is 24 hours with no in-app refresh mechanism observed.

4. **`app.jwt.secret` default value**: The fallback default (`i/WZnrbvFqiPfShuZjGmc5kC7IXxRZfpueJEdgCzGFc=`) is present in `application.properties` and used when `APP_JWT_SECRET` env var is not set. This is a known-plaintext default and would be insecure in production without the env var being overridden.

5. **Algorithm specifics**: `Keys.hmacShaKeyFor` selects the algorithm by key byte length. The default Base64 secret decodes to 32 bytes → HS256. Not explicitly declared in code; depends on JJWT's key-length selection logic.

6. **No password reset / user management endpoints** observed in `AuthController`. User creation is seeded only via Liquibase (dev context).

---

## Rejected Information

| # | Information | Source | Why Rejected | Re-include If |
|---|-------------|--------|--------------|---------------|
| 1 | OAuth2 filter implementations (PublicClientRegistrationFilter, OAuth2AuthorizationFilter, OAuth2TokenFilter, OAuth2IntrospectionFilter) | SecurityConfiguration.java imports | Out of scope for codebase-security category; relates to OAuth2 server functionality, not core JWT app auth | Category expanded to include OAuth2 |
| 2 | `BaseEntity` JPA auditing (`@CreatedDate`, `@Version`) | BaseEntity.java | Peripheral to authentication; included only to document `User` entity's inherited fields | Needed for entity modeling research |
