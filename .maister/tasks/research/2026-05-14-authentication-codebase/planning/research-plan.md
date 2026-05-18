# Research Plan: How Does Authentication Work in This Codebase?

## Research Overview

**Research question**: How does authentication work in this codebase?
**Research type**: Internal — codebase analysis only (no external sources needed)
**Date**: 2026-05-14

### Scope

**Included**:
- SecurityFilterChain configuration and URL-based authorization rules
- JWT token lifecycle: creation, signing, validation, claims structure
- Security filters and their ordering in the filter chain
- Login and logout endpoints (request/response contracts)
- Permission and authorization enforcement model
- OAuth2 server-side flows (authorization code, token endpoint, introspection, token exchange, refresh)
- Plugin browser SDK authentication (postMessage / getToken)
- Plugin server-side SDK authentication (JWT forwarding)
- Custom security test annotations and test helpers
- MCP server authentication (separate Spring Boot module)
- Frontend auth state management and protected route enforcement

**Excluded**:
- External OAuth/OIDC identity providers not referenced in existing code
- Future planned authentication changes not reflected in current implementation

---

## Methodology

**Primary approach**: Multi-layer codebase analysis

The codebase has two distinct Spring Boot applications (main `aj` app and `mcp-server` module) plus a React frontend. Authentication spans all three. The research must trace the full request lifecycle from HTTP entry point through filter chain to controller, covering both the host-app JWT path and the OAuth2 authorization server path, as well as the MCP server's independent security model.

**Analysis framework**:
1. Entry point mapping — which URLs require authentication, which are public
2. Filter chain ordering — how filters intercept requests and set the SecurityContext
3. Token lifecycle — how JWTs are minted, signed, validated, and expired
4. User/permission model — how users are stored and how permissions reach the JWT claims
5. OAuth2 server flows — authorization code, token issuance, introspection, token exchange
6. Plugin auth bridge — how plugins obtain and forward the host-app JWT
7. MCP server auth — how the separate mcp-server module authenticates inbound requests
8. Frontend auth state — how the React app manages tokens and enforces protected routes
9. Test infrastructure — custom annotations, mock helpers, and integration test patterns

---

## Research Phases

### Phase 1: Broad Discovery
- Confirm all security-related files are accounted for in sources.md
- Scan SecurityConfiguration for the complete filter chain and URL matcher rules
- Scan the oauth2 package to understand the authorization server components
- Identify the full set of custom filters and their registration points

### Phase 2: Targeted Reading
- Read SecurityConfiguration to extract URL rules, filter order, entry points, and access-denied handlers
- Read JwtTokenProvider to understand signing algorithm, claims structure, and validation logic
- Read JwtAuthenticationFilter to understand token extraction and SecurityContext population
- Read AuthController + LoginRequest + LoginResponse for the login endpoint contract
- Read the full oauth2 package (AuthorizationCodeService, OAuth2TokenFilter, OAuth2IntrospectionFilter, OAuth2AuthorizationFilter, OAuth2ClientAuthenticator, RefreshTokenService, DatabaseRegisteredClientRepository, RegisteredClientEntity, PublicClientRegistrationFilter, OAuth2MetadataController)
- Read User entity, Permission enum, UserRepository, and CustomUserDetailsService for the user/permission model
- Read the Liquibase migrations 008 (users table) and 009-010 (OAuth2 client table and seed) for schema
- Read MCP server: SecurityConfig, McpJwtFilter, McpIntrospectionFilter, McpAuthenticationEntryPoint, AccessTokenHolder, ExchangedTokenHolder, TokenExchangeClient
- Read frontend: AuthContext.tsx, AuthGuard.tsx, LoginPage.tsx, OAuth2AuthorizePage.tsx, client.ts, plugin-sdk/host-app.ts, plugins/PluginMessageHandler.ts
- Read test helpers: WithMockAdminUser, WithMockEditUser, SecurityMockMvcConfiguration, and test classes under core/security and core/oauth2

### Phase 3: Deep Dive
- Trace a complete login request: POST /api/auth/login → AuthController → UserDetailsService → JwtTokenProvider → LoginResponse
- Trace a protected API request: Authorization header → JwtAuthenticationFilter → SecurityContext → controller
- Trace the OAuth2 authorization code flow: /oauth2/authorize → consent page → code → /oauth2/token → access token
- Trace token introspection: MCP server → introspection endpoint on host
- Trace plugin iframe auth: iframe loads → sdk.hostApp.getToken() → postMessage → PluginMessageHandler → JWT from localStorage
- Trace token exchange: MCP server receives user token → exchanges for scoped token → calls host API

### Phase 4: Verification
- Cross-reference filter order in SecurityConfiguration with actual filter implementations
- Verify JWT claims structure matches between JwtTokenProvider (minting) and JwtAuthenticationFilter (parsing)
- Confirm test annotations match security configuration (roles/permissions used in WithMock* align with Permission enum)
- Check Liquibase migrations match entity definitions for User and RegisteredClientEntity

---

## Gathering Strategy

| Category ID | Description | Source Types | Agent Focus |
|-------------|-------------|--------------|-------------|
| codebase-security | Core JWT and SecurityFilterChain | Java (.java) | SecurityConfiguration, JwtTokenProvider, JwtAuthenticationFilter, CustomUserDetailsService, AuthController |
| codebase-oauth2 | OAuth2 authorization server implementation | Java (.java) | All files in core/oauth2 package: flows, filters, client registration, token exchange, refresh |
| codebase-plugin-mcp-auth | Plugin browser SDK auth + MCP server auth module | Java + TypeScript | PluginMessageHandler, host-app.ts, mcp-server/security/*, mcp-server SecurityConfig |
| codebase-frontend-tests | Frontend auth state, protected routes, and test helpers | TypeScript + Java | AuthContext, AuthGuard, LoginPage, OAuth2AuthorizePage, WithMock* annotations, SecurityMockMvcConfiguration, auth test classes |

**Gatherer count**: 4
**Parallel execution**: Yes

### Rationale
The authentication system has four clearly separated concerns that map cleanly to parallel gatherers: (1) the core JWT + Spring Security filter chain, (2) the OAuth2 authorization server (a substantial package of its own), (3) the plugin iframe bridge and MCP server module (two related external-client auth mechanisms), and (4) the frontend layer plus test helpers which must be understood together to validate the full picture. Keeping OAuth2 separate from core JWT prevents context overload given the oauth2 package has 13 files.

---

## Success Criteria

1. End-to-end request authentication flow documented: from HTTP header extraction to SecurityContext population
2. JWT claims structure fully documented (field names, types, signing algorithm, expiry)
3. Authorization model understood: how Permission enum values flow into JWT and how URL rules reference them
4. OAuth2 authorization server flows documented: which grant types are supported, how clients are registered, how tokens are issued and introspected
5. Plugin auth bridge documented: browser SDK getToken() path and server-side JWT forwarding path
6. MCP server auth documented: its independent filter chain and token exchange flow
7. Frontend auth state documented: how the React app stores, refreshes, and guards with the JWT
8. All relevant files identified with line-level citations in findings
9. Test infrastructure documented: custom annotations, SecurityMockMvcConfiguration, and what they mock

---

## Expected Outputs

- Raw findings files per gatherer category (codebase-security-*.md, codebase-oauth2-*.md, codebase-plugin-mcp-auth-*.md, codebase-frontend-tests-*.md)
- Final research report synthesizing all findings into a coherent authentication architecture description
