# Rejected Information

Research question: How does authentication work in this codebase?
Scope: JWT authentication, OAuth2 server, plugin auth, MCP server auth, frontend auth state, test infrastructure

---

## Out of Scope (Different Module/Component)

| # | Information | Source | Why Rejected | Re-include If |
|---|------------|--------|-------------|---------------|
| 1 | Spring Authorization Server auto-configuration | codebase-oauth2 | Project imports Spring Authorization Server types (e.g. `OidcClientRegistrationHttpMessageConverter`) but all OAuth2 logic is custom hand-rolled. The auto-config is not used. | Research specifically targets the Spring Authorization Server integration decision |
| 2 | `BaseEntity` JPA auditing (`@CreatedDate`, `@Version`) | codebase-security | Peripheral to authentication; included only to document `User` entity's inherited fields (`createdAt`, `updatedAt`) | Entity modeling research |
| 3 | Plugin server-SDK data URL patterns (`getData`/`setData` paths) | codebase-frontend-tests | Tests URL path construction for plugin data storage, not auth behavior | Investigating plugin data storage architecture |
| 4 | `IntegrationTests.java` (root class) | codebase-frontend-tests | Tests health endpoint and SPA routing forwarding — not auth flows specifically | Investigating general application integration or SPA routing |

---

## Out of Scope (Solution Not Problem)

| # | Information | Source | Why Rejected | Re-include If |
|---|------------|--------|-------------|---------------|
| 1 | Cluster-safety implications and solutions for in-memory token stores | codebase-oauth2 | The finding is a known limitation (pre-alpha). Solution evaluation (Redis, DB-backed store, etc.) is out of scope for "how does auth work" research | Scope includes solution evaluation or production readiness |

---

## Out of Scope (Different Information Layer)

| # | Information | Source | Why Rejected | Re-include If |
|---|------------|--------|-------------|---------------|
| 1 | OAuth2 filter implementations read as supplemental by codebase-security gatherer | codebase-security | Filter chain registration was in scope; individual filter implementations were deferred to codebase-oauth2 gatherer to avoid overlap | Category boundaries are removed |
| 2 | `plugin-sdk.js` built artifact | codebase-plugin-mcp-auth | Built artifact exists at `src/main/resources/static/assets/plugin-sdk.js` but source TypeScript is authoritative. Reading the built JS would duplicate findings with lower readability. | Investigating whether the distributed SDK matches source (e.g., build pipeline issue) |

---

## Superseded / Legacy Code

| # | Information | Source | Why Rejected | Re-include If |
|---|------------|--------|-------------|---------------|
| 1 | `McpJwtFilter` as the current MCP authentication mechanism | codebase-plugin-mcp-auth | `McpJwtFilter` exists and has tests but is NOT wired into `SecurityConfig`. `McpIntrospectionFilter` supersedes it. Javadoc states: "trust-and-forward model — superseded." | `SecurityConfig` is changed to re-wire `McpJwtFilter` |
| 2 | `AccessTokenHolder` as an active component | codebase-plugin-mcp-auth | `@Component` bean with no production callers. `McpJwtFilter` (its documented populator) is not wired. Grep confirms zero `setAccessToken()` calls in production code. | `McpJwtFilter` is re-wired and `setAccessToken` calls added |
| 3 | `hostOrigin = "*"` as the postMessage target | codebase-plugin-mcp-auth | Only the fallback default used in non-iframe environments. Normal operation always parses a real origin from `window.name`. | Evidence of plugins running in non-iframe contexts |

---

## Summary

- Total findings collected: ~120 (across 75 files in 4 categories)
- Total rejected: 10
- Rejection rate: ~8%

**Dominant rejection reason**: Legacy/superseded code (`McpJwtFilter`, `AccessTokenHolder`, Spring Authorization Server auto-config) — 3 items. All other rejections are scope boundary decisions (different layer, different module, built artifacts).

No findings were rejected due to insufficient evidence — all rejections were based on clear scope determinations or explicit supersession markers in the code.
