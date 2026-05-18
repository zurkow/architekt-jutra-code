# Findings: Plugin Auth + MCP Server Auth

## Category
codebase-plugin-mcp-auth

## Sources Investigated

| File | Status |
|------|--------|
| `src/main/frontend/src/plugin-sdk/host-app.ts` | found |
| `src/main/frontend/src/plugins/PluginMessageHandler.ts` | found |
| `src/main/frontend/src/plugin-sdk/messaging.ts` | found |
| `src/main/frontend/src/plugin-sdk/types.ts` | found |
| `src/main/frontend/src/plugin-sdk/index.ts` | found |
| `src/main/frontend/src/plugin-sdk/context.ts` | found (bonus) |
| `src/main/resources/static/assets/plugin-sdk.js` | found (built artifact — source is definitive) |
| `mcp-server/src/main/java/pl/devstyle/aj/mcp/config/SecurityConfig.java` | found |
| `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/McpJwtFilter.java` | found |
| `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/McpIntrospectionFilter.java` | found |
| `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/McpAuthenticationEntryPoint.java` | found |
| `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/AccessTokenHolder.java` | found |
| `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/ExchangedTokenHolder.java` | found |
| `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/TokenExchangeClient.java` | found |
| `mcp-server/src/test/java/pl/devstyle/aj/mcp/security/McpIntrospectionFilterTests.java` | found |
| `mcp-server/src/test/java/pl/devstyle/aj/mcp/security/McpJwtFilterTests.java` | found |
| `mcp-server/src/test/java/pl/devstyle/aj/mcp/security/AccessTokenHolderTests.java` | found |
| `.maister/docs/standards/backend/plugin-auth.md` | found |
| `mcp-server/src/main/java/pl/devstyle/aj/mcp/config/RestClientConfig.java` | found (bonus) |
| `mcp-server/src/main/java/pl/devstyle/aj/mcp/AjMcpApplication.java` | found (bonus) |
| `mcp-server/src/main/java/pl/devstyle/aj/mcp/controller/WellKnownController.java` | found (bonus) |
| `mcp-server/src/main/resources/application.yml` | found (bonus) |

---

## Key Findings

### Plugin Browser SDK — Token Retrieval (postMessage flow)

**Entry point**: `sdk.hostApp.getToken()` in `host-app.ts:21-23`

```typescript
getToken(): Promise<string | null> {
  return sendMessageAndWait("getToken", {}, getHostOrigin()) as Promise<string | null>;
}
```

Host origin resolved from `window.__pluginHostOrigin`, set during SDK initialization by parsing `window.name` (via `context.ts`).

**Initialization** (`index.ts:7-16`): SDK calls `parseContext(window.name)` to extract `hostOrigin` from the iframe's `window.name`. If parsing fails, `hostOrigin` defaults to `"*"`. Then `installResponseListener(hostOrigin)` wires up the global message event listener.

**Context format** (`context.ts:1-47`): `window.name` is encoded as `"<extensionPoint>{<json>}"` — everything before the first `{` is the extension point ID, everything from `{` onward is JSON containing `pluginId`, `pluginName`, `hostOrigin`, and optional `productId`. A fallback reads from `window.location.hash`.

---

### postMessage Protocol

**`sendMessageAndWait`** (`messaging.ts:20-39`):
- Generates unique `requestId` with prefix `"aj.plugin."` + UUID (`REQUEST_ID_PREFIX = "aj.plugin."`)
- Posts `{ requestId, type: "getToken", payload: {} }` to `window.parent` with `targetOrigin = hostOrigin`
- Returns a Promise resolved/rejected via `pending` Map
- Timeout: **10,000 ms** (`TIMEOUT_MS = 10_000`)

**Response handling** (`messaging.ts:62-74`): `handleResponse` looks up `data.responseId` in the `pending` Map. If `data.error` is set, promise is rejected; otherwise resolved with `data.payload`.

**Origin validation** (`messaging.ts:87-94`): `installResponseListener` only processes messages where `event.origin === hostOrigin`, preventing response spoofing.

**Message types**:

| Type | Direction | Purpose |
|------|-----------|---------|
| `"getToken"` | plugin → host | Retrieve current user's JWT |
| `"pluginFetch"` | plugin → host | Proxied HTTP request via host (limited to `/api/`) |
| `"getProducts"` | plugin → host | List products |
| `"getProduct"` | plugin → host | Get single product |
| `"getPlugins"` | plugin → host | List plugins |
| `"filterChange"` | plugin → host | Fire-and-forget filter notification |
| `"getData"` / `"setData"` / `"removeData"` | plugin → host | Plugin-scoped data storage |
| `"objectsList"` / `"objectsGet"` / `"objectsSave"` / `"objectsDelete"` | plugin → host | Plugin objects API |

**Request envelope**: `{ requestId: string, type: string, payload: Record<string, unknown> }`
**Response envelope** (`PluginMessageHandler.ts:11-14`): `{ responseId: string, payload: unknown, error?: string }`

---

### Plugin Message Handler

**File**: `src/main/frontend/src/plugins/PluginMessageHandler.ts`

`createMessageHandler` (line 158) returns a `MessageEvent` listener. For each incoming message:

1. **Prefix check** (line 167): Rejects `requestId` not starting with `"aj.plugin."`.
2. **Source validation** (lines 170-172): Resolves sending iframe via `registry.findBySource(event.source)`. Drops if unrecognised.
3. **Origin validation** (lines 174-179): Compares `event.origin` against `new URL(pluginInfo.pluginUrl).origin`. Drops if mismatch.
4. **`getToken` handling** (lines 190-199): Reads `localStorage.getItem("auth_token")` and sends `{ responseId: requestId, payload: token }` back synchronously. No async operation.
5. **`pluginFetch` handling** (lines 202-218): Calls `handlePluginFetch(payload)` which rejects `".."` paths and non-`"/api/"` URLs, reads `localStorage.getItem("auth_token")`, injects `Authorization: Bearer <token>` into the proxied fetch request (lines 71-72).

**Token source**: Both `getToken` and `pluginFetch` read `localStorage.getItem("auth_token")` directly (lines 191 and 62).

---

### MCP Server SecurityFilterChain

**File**: `mcp-server/src/main/java/pl/devstyle/aj/mcp/config/SecurityConfig.java`

- **CSRF**: disabled (stateless API, line 57)
- **Sessions**: `STATELESS` (line 58)
- **Permit-all paths**: `/.well-known/**`, `/actuator/health/**`, `/error` (lines 60-62)
- **All other requests**: `authenticated()` (line 63)
- **Active filter**: `McpIntrospectionFilter` inserted before `UsernamePasswordAuthenticationFilter` (line 68)
- **Entry point**: `McpAuthenticationEntryPoint` (lines 65-67)

**Config properties** (`application.yml`):
- `aj.backend.url` → `http://localhost:8080` (AJ host app)
- `aj.oauth.server-url` → `https://kuba-app.labs-skillpanel.com`
- `aj.oauth.client-id` → `mcp-server`
- `aj.oauth.client-secret` → `mcp-server-secret`
- `aj.mcp.base-url` → `https://kuba-mcp.labs-skillpanel.com`

---

### McpJwtFilter — JWT Validation (Legacy)

**File**: `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/McpJwtFilter.java`

**Status: NOT wired into SecurityConfig — legacy/superseded.**

Behaviour (lines 27-46): Reads `Authorization: Bearer <token>`. Creates `UsernamePasswordAuthenticationToken("mcp-user", null, List.of())` — no authorities, no token validation, hardcoded principal "mcp-user". Pure trust-and-forward. Javadoc: "No JWT validation — trust-and-forward model."

Tests (`McpJwtFilterTests.java`): Two tests — Bearer present sets authentication; Bearer absent passes through without authentication.

---

### McpIntrospectionFilter — Active OAuth2 Token Validation

**File**: `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/McpIntrospectionFilter.java`

**Status: current active filter** (wired in `SecurityConfig:68`).

**Skip paths** (lines 55-59): `/.well-known/**`, `/actuator/**`, `/error`.

**Full flow** (lines 63-111):

1. **Token extraction** (lines 66-73): Reads `Authorization` header. Absent or non-Bearer → 401 via `authenticationEntryPoint`.

2. **RFC 7662 Introspection** (lines 75-81): POSTs to `<aj.backend.url>/oauth2/introspect` with form body `{ token, client_id, client_secret }`. If `"active": false` or call throws → 401.

3. **Subject and scopes extraction** (lines 83-89): Reads `sub` and `scope` from introspection JSON. Scope split on spaces; each scope `s` becomes authority `"PERMISSION_" + s`.

4. **RFC 8693 Token Exchange** (lines 91-98): Delegates to `TokenExchangeClient.exchange(tokenA)` → Token-B. If fails → **502 Bad Gateway**.

5. **Store Token-B** (line 102): `request.setAttribute("exchanged_token", tokenB)`.

6. **SecurityContext** (lines 104-106): `UsernamePasswordAuthenticationToken(subject, null, authorities)`.

7. **Filter chain** (line 108): Continues.

8. **Cleanup** (line 110, `finally`): Clears `SecurityContextHolder`.

**Tests** (`McpIntrospectionFilterTests.java`):
- Success: Token-B stored as `"exchanged_token"`, correct principal and `PERMISSION_*` authorities
- `active: false` → 401 with `WWW-Authenticate` containing `"resource_metadata"`
- No Bearer → 401
- Exchange fails after introspection → 502, filter chain not called
- Introspection server error → treated as inactive → 401
- Non-Bearer scheme (`Basic ...`) → 401

---

### Token Exchange Flow

**File**: `mcp-server/src/main/java/pl/devstyle/aj/mcp/security/TokenExchangeClient.java`

**Protocol**: RFC 8693 Token Exchange.

**Request** (lines 42-56): POST to `<aj.backend.url>/oauth2/token`, form-encoded:

| Parameter | Value |
|-----------|-------|
| `grant_type` | `urn:ietf:params:oauth:grant-type:token-exchange` |
| `subject_token` | Token-A |
| `subject_token_type` | `urn:ietf:params:oauth:token-type:access_token` |
| `client_id` | `aj.oauth.client-id` |
| `client_secret` | `aj.oauth.client-secret` |

**Response parsing** (lines 57-62): Reads `access_token`. Missing/null → `TokenExchangeException`.

**No caching** (Javadoc line 8: "No caching -- exchange per request."). Every MCP request triggers both introspection and token exchange.

---

### Request-Scoped Token Holders

**AccessTokenHolder** (`AccessTokenHolder.java`): `@Component` `ThreadLocal<String>`. Javadoc says "Populated by McpJwtFilter". Grep confirms no production caller — `McpJwtFilter` is not wired. **Dead code**.

**ExchangedTokenHolder** (`ExchangedTokenHolder.java`): Static `ThreadLocal<String>` (not a Spring bean). Methods: `set(String)`, `get()`, `clear()`.

**Bridge from servlet to MCP thread** (`AjMcpApplication.java:39-54`): `WebMvcStatelessServerTransport.contextExtractor` lambda reads `"exchanged_token"` request attribute (set by `McpIntrospectionFilter`) and puts it into `McpTransportContext["token_b"]` (constant `TOKEN_B_KEY = "token_b"`). This bridges servlet thread to MCP handler thread (runs on `boundedElastic`).

**Consumption**: `RestClientConfig.TokenBForwardingInterceptor` (lines 81-95) reads `ExchangedTokenHolder.get()` and calls `request.getHeaders().setBearerAuth(tokenB)` before each backend HTTP call. Tool handlers (`ProductService`, `CategoryService`) call `ExchangedTokenHolder.set/clear` around each invocation.

---

### MCP Auth Error Handling

**File**: `McpAuthenticationEntryPoint.java`

On 401, sets:
- HTTP status 401
- Header `WWW-Authenticate: Bearer resource_metadata="<mcpBaseUrl>/.well-known/oauth-protected-resource"`

**`/.well-known/oauth-protected-resource`** (`WellKnownController.java:20-28`):
```json
{
  "resource": "<aj.mcp.base-url>",
  "authorization_servers": ["<aj.oauth.server-url>"],
  "bearer_methods_supported": ["header"],
  "scopes_supported": ["mcp:read", "mcp:edit"]
}
```

On 502 (token exchange failure): `McpIntrospectionFilter` sets `response.setStatus(502)` directly.

---

### Complete MCP Authentication Flow

1. MCP client sends `Authorization: Bearer <Token-A>` to MCP server.
2. `McpIntrospectionFilter` extracts Token-A.
3. POSTs to `<aj.backend.url>/oauth2/introspect` with `{ token, client_id, client_secret }`. Not `active` → 401.
4. Extracts `sub` and `scope` → `PERMISSION_*` authorities.
5. POSTs to `<aj.backend.url>/oauth2/token` with RFC 8693 token-exchange params → Token-B.
6. Stores Token-B as `request.setAttribute("exchanged_token", tokenB)`. Sets SecurityContext.
7. `contextExtractor` in `AjMcpApplication` reads `"exchanged_token"` → `McpTransportContext["token_b"]`.
8. MCP tool handler calls `ExchangedTokenHolder.set(ctx.get("token_b"))`.
9. `TokenBForwardingInterceptor` reads `ExchangedTokenHolder.get()` → `Authorization: Bearer <Token-B>` on every backend API call.
10. Tool handler calls `ExchangedTokenHolder.clear()` in `finally`.

---

## Gaps and Uncertainties

1. **`AccessTokenHolder` is dead code**: No production caller exists. `McpJwtFilter` is not wired. May cause confusion.

2. **`McpJwtFilter` supersession not marked**: No `@Deprecated` annotation. Class has tests but is not wired.

3. **No Token-B caching**: Every MCP request triggers both introspection and token exchange — 2 extra HTTP calls per request to the backend.

4. **`plugin-sdk.js` built artifact not verified**: The distributed SDK at `src/main/resources/static/assets/plugin-sdk.js` exists but not compared against TypeScript sources.

5. **`ExchangedTokenHolder` pattern not enforced**: Any future MCP tool service must manually call `set/clear`. No framework enforcement.

---

## Rejected Information

| # | Information | Source | Why Rejected | Re-include If |
|---|------------|--------|-------------|---------------|
| 1 | `AccessTokenHolder.setAccessToken()` called by McpJwtFilter | McpJwtFilter.java Javadoc | Grep confirms no production caller; McpJwtFilter not in filter chain | McpJwtFilter is re-wired into SecurityConfig |
| 2 | `hostOrigin = "*"` as the actual postMessage target | index.ts:7 | Only the fallback default for non-iframe environments | Evidence of plugins running in non-iframe contexts |
| 3 | McpJwtFilter as the current authentication mechanism | McpJwtFilterTests.java | Tests verify its behavior but SecurityConfig wires McpIntrospectionFilter instead | SecurityConfig changed to register McpJwtFilter |
