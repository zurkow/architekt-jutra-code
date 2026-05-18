# Research Sources

## Codebase Sources — Core Security (category: codebase-security)

### Key Files
- `src/main/java/pl/devstyle/aj/core/security/SecurityConfiguration.java` — SecurityFilterChain bean, URL authorization rules, filter registration, entry points
- `src/main/java/pl/devstyle/aj/core/security/JwtTokenProvider.java` — JWT creation, signing (algorithm, secret), claims population, validation logic
- `src/main/java/pl/devstyle/aj/core/security/JwtAuthenticationFilter.java` — OncePerRequestFilter extracting Bearer token, parsing JWT, setting SecurityContext
- `src/main/java/pl/devstyle/aj/core/security/CustomUserDetailsService.java` — UserDetailsService loading User by username, wrapping with Spring Security UserDetails
- `src/main/java/pl/devstyle/aj/api/AuthController.java` — POST /api/auth/login handler (and any logout endpoint)
- `src/main/java/pl/devstyle/aj/api/LoginRequest.java` — Login request DTO (username, password fields)
- `src/main/java/pl/devstyle/aj/api/LoginResponse.java` — Login response DTO (token, expiry, user info)
- `src/main/java/pl/devstyle/aj/user/User.java` — User JPA entity (username, password hash, permissions)
- `src/main/java/pl/devstyle/aj/user/Permission.java` — Permission enum (values used in JWT claims and URL matchers)
- `src/main/java/pl/devstyle/aj/user/UserRepository.java` — Spring Data JPA repo for User lookups

### Migration Files
- `src/main/resources/db/changelog/2026/008-create-users-table.yaml` — Users table schema (columns, constraints)

### Configuration
- `src/main/resources/application.properties` — JWT secret and expiration config (`app.jwt.secret`, `app.jwt.expiration-ms`)

### Search Terms for Grep
- `SecurityFilterChain`, `HttpSecurity`, `authorizeHttpRequests`, `requestMatchers`
- `JwtAuthenticationFilter`, `OncePerRequestFilter`, `UsernamePasswordAuthenticationToken`
- `JwtTokenProvider`, `generateToken`, `validateToken`, `parseToken`, `Jwts`, `Claims`
- `BCryptPasswordEncoder`, `PasswordEncoder`
- `AuthenticationEntryPoint`, `AccessDeniedHandler`
- `app.jwt`, `@Value.*jwt`

---

## Codebase Sources — OAuth2 Authorization Server (category: codebase-oauth2)

### Key Files
- `src/main/java/pl/devstyle/aj/core/oauth2/OAuth2AuthorizationFilter.java` — Authorization endpoint filter (authorization code flow, consent handling)
- `src/main/java/pl/devstyle/aj/core/oauth2/OAuth2TokenFilter.java` — Token endpoint filter (code-for-token exchange, grant processing)
- `src/main/java/pl/devstyle/aj/core/oauth2/OAuth2IntrospectionFilter.java` — Introspection endpoint filter (validates tokens for external callers like MCP server)
- `src/main/java/pl/devstyle/aj/core/oauth2/AuthorizationCodeService.java` — Authorization code generation, storage, and validation
- `src/main/java/pl/devstyle/aj/core/oauth2/OAuth2ClientAuthenticator.java` — Client credential validation (client_id + client_secret)
- `src/main/java/pl/devstyle/aj/core/oauth2/RefreshTokenService.java` — Refresh token issuance and exchange
- `src/main/java/pl/devstyle/aj/core/oauth2/DatabaseRegisteredClientRepository.java` — Registered client lookup from database
- `src/main/java/pl/devstyle/aj/core/oauth2/RegisteredClientEntity.java` — JPA entity for OAuth2 registered clients
- `src/main/java/pl/devstyle/aj/core/oauth2/RegisteredClientJpaRepository.java` — Spring Data JPA repo for registered clients
- `src/main/java/pl/devstyle/aj/core/oauth2/PublicClientRegistrationFilter.java` — Handles public client registration (PKCE support)
- `src/main/java/pl/devstyle/aj/core/oauth2/OAuth2MetadataController.java` — RFC 8414 well-known metadata endpoint (`/.well-known/oauth-authorization-server`)
- `src/main/java/pl/devstyle/aj/core/oauth2/OAuth2Error.java` — OAuth2 error code enum
- `src/main/java/pl/devstyle/aj/core/oauth2/OAuth2ErrorResponse.java` — OAuth2 error response DTO

### Migration Files
- `src/main/resources/db/changelog/2026/009-create-oauth2-registered-client-table.yaml` — OAuth2 client table schema
- `src/main/resources/db/changelog/2026/010-seed-mcp-server-oauth2-client.yaml` — MCP server OAuth2 client seed data

### Frontend OAuth2 Page
- `src/main/frontend/src/pages/OAuth2AuthorizePage.tsx` — Consent/authorization UI for the OAuth2 flow

### Test Files
- `src/test/java/pl/devstyle/aj/core/oauth2/OAuth2IntegrationTests.java` — End-to-end OAuth2 authorization code flow tests
- `src/test/java/pl/devstyle/aj/core/oauth2/OAuth2IntrospectionTests.java` — Token introspection endpoint tests
- `src/test/java/pl/devstyle/aj/core/oauth2/TokenExchangeIntegrationTests.java` — Token exchange flow tests

### Search Terms for Grep
- `OAuth2`, `oauth2`, `authorization_code`, `code_verifier`, `code_challenge`, `PKCE`
- `introspect`, `introspection`, `token_type_hint`
- `RegisteredClient`, `clientId`, `clientSecret`, `redirectUri`
- `refresh_token`, `RefreshToken`
- `well-known`, `oauth-authorization-server`

---

## Codebase Sources — Plugin Auth and MCP Server (category: codebase-plugin-mcp-auth)

### Plugin Browser SDK (Frontend)
- `src/main/frontend/src/plugin-sdk/host-app.ts` — `sdk.hostApp.getToken()` implementation (postMessage-based token retrieval)
- `src/main/frontend/src/plugins/PluginMessageHandler.ts` — Handles `getToken` messages from plugin iframes, reads JWT from localStorage and responds
- `src/main/frontend/src/plugin-sdk/messaging.ts` — postMessage protocol definitions
- `src/main/frontend/src/plugin-sdk/types.ts` — SDK type definitions including auth-related message types
- `src/main/frontend/src/plugin-sdk/index.ts` — SDK entry point / public API
- `src/main/resources/static/assets/plugin-sdk.js` — Built plugin SDK (distributed to plugin iframes)

### MCP Server Security Module
- `mcp-server/src/main/java/pl/devstyle/aj/mcp/config/SecurityConfig.java` — MCP server's SecurityFilterChain (separate from host app)
- `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/McpJwtFilter.java` — Filter validating JWT tokens on MCP server requests
- `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/McpIntrospectionFilter.java` — Filter that calls host introspection endpoint to validate OAuth2 access tokens
- `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/McpAuthenticationEntryPoint.java` — 401 JSON response for MCP auth failures
- `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/AccessTokenHolder.java` — Request-scoped holder for the access token received by MCP server
- `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/ExchangedTokenHolder.java` — Request-scoped holder for the token after exchange
- `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/TokenExchangeClient.java` — HTTP client calling host token exchange endpoint

### MCP Server Test Files
- `mcp-server/src/test/java/pl/devstyle/aj/mcp/security/McpIntrospectionFilterTests.java` — Introspection filter unit tests
- `mcp-server/src/test/java/pl/devstyle/aj/mcp/security/McpJwtFilterTests.java` — JWT filter unit tests
- `mcp-server/src/test/java/pl/devstyle/aj/mcp/security/AccessTokenHolderTests.java` — Token holder tests

### Search Terms for Grep
- `getToken`, `postMessage`, `hostApp`, `PluginMessageHandler`, `getToken`
- `McpJwtFilter`, `McpIntrospectionFilter`, `TokenExchangeClient`
- `introspect`, `token_exchange`, `AccessTokenHolder`, `ExchangedTokenHolder`
- `Authorization.*Bearer`, `plugin-sdk`, `sdk.hostApp`

---

## Codebase Sources — Frontend Auth and Test Helpers (category: codebase-frontend-tests)

### Frontend Auth Layer
- `src/main/frontend/src/auth/AuthContext.tsx` — React context providing auth state (token, user, login/logout methods)
- `src/main/frontend/src/auth/AuthGuard.tsx` — Route guard component redirecting unauthenticated users to login
- `src/main/frontend/src/pages/LoginPage.tsx` — Login form page component
- `src/main/frontend/src/api/client.ts` — Axios/fetch client configuration (JWT Authorization header injection)
- `src/main/frontend/src/router.tsx` — React Router setup showing which routes are protected vs public
- `src/main/frontend/src/main.tsx` — App entry point (AuthContext provider wrapping)

### Frontend Test Files
- `src/main/frontend/src/test/auth.test.tsx` — Auth context and guard tests
- `src/main/frontend/src/test/plugin-sdk-auth.test.ts` — Plugin SDK authentication tests

### Backend Test Helpers
- `src/test/java/pl/devstyle/aj/WithMockAdminUser.java` — Custom @WithMockUser-based annotation for admin role
- `src/test/java/pl/devstyle/aj/WithMockEditUser.java` — Custom @WithMockUser-based annotation for edit role
- `src/test/java/pl/devstyle/aj/SecurityMockMvcConfiguration.java` — MockMvc security configuration import for Spring Boot 4/Security 7
- `src/test/java/pl/devstyle/aj/core/security/AuthIntegrationTests.java` — Integration tests for login endpoint and JWT flow
- `src/test/java/pl/devstyle/aj/core/security/JwtTokenProviderTests.java` — Unit tests for JWT creation and validation
- `src/test/java/pl/devstyle/aj/core/security/SecurityTestHelperTests.java` — Tests for custom security annotations

### Search Terms for Grep
- `AuthContext`, `useAuth`, `AuthGuard`, `PrivateRoute`
- `localStorage.*token`, `Authorization.*Bearer`, `axios.*interceptor`, `fetch.*Authorization`
- `WithMockAdminUser`, `WithMockEditUser`, `SecurityMockMvcConfiguration`
- `@WithMockUser`, `@WithUserDetails`, `@SecurityMockMvcRequestPostProcessors`
- `login.*test`, `jwt.*test`, `token.*test`

---

## Documentation Sources

### Project Standards (directly relevant)
- `.maister/docs/standards/backend/security.md` — JWT pattern, SecurityFilterChain rules, BCrypt, token claims structure
- `.maister/docs/standards/backend/plugin-auth.md` — Browser SDK getToken(), server-side SDK JWT forwarding, permission checking in plugins
- `.maister/docs/standards/testing/backend-testing.md` — Custom security test annotations, MockMvc security integration

### Project Architecture
- `.maister/docs/project/architecture.md` — Overall microkernel architecture context
- `.maister/docs/project/tech-stack.md` — Technology choices (Spring Boot 4, Spring Security, JWT library)

---

## Configuration Sources

| File | Auth-Relevant Content |
|------|----------------------|
| `src/main/resources/application.properties` | `app.jwt.secret`, `app.jwt.expiration-ms`, CORS origins |
| `src/main/resources/db/changelog/2026/008-create-users-table.yaml` | Users schema (password column, permissions column) |
| `src/main/resources/db/changelog/2026/009-create-oauth2-registered-client-table.yaml` | OAuth2 client registration schema |
| `src/main/resources/db/changelog/2026/010-seed-mcp-server-oauth2-client.yaml` | MCP server client_id, client_secret, grant types, redirect URIs |
| `pom.xml` | JWT library dependency (io.jsonwebtoken or nimbus), Spring Security version |
| `mcp-server/pom.xml` | MCP server dependencies (separate module) |

---

## File Counts by Category

| Category | Main source files | Test files | Config/migration files |
|----------|------------------|------------|----------------------|
| codebase-security | 10 | 3 | 2 |
| codebase-oauth2 | 13 | 3 | 2 |
| codebase-plugin-mcp-auth | 13 | 3 | 0 |
| codebase-frontend-tests | 7 | 2 | 0 |
| **Total** | **43** | **11** | **4** |
