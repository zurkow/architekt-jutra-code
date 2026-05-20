# Gap Analysis: Cart Recommend Button (AI-powered product recommendations)

## Summary
- **Risk Level**: Medium
- **Estimated Effort**: Medium
- **Detected Characteristics**: creates_new_entities, involves_data_operations, ui_heavy, modifies_existing_code

## Task Characteristics
- Has reproducible defect: no
- Modifies existing code: yes (CartPage.tsx gets a new button; koszyk plugin gains new files)
- Creates new entities: yes (new BAML function, new API backend, new recommendation UI section)
- Involves data operations: yes (READ product list, CREATE/READ AI recommendation result)
- UI heavy: yes (button + recommendation display panel on CartPage)

---

## Gaps Identified

### Missing Features

**1. Backend API endpoint for AI recommendation**
CartPage is a pure Vite+React SPA (port 3012). There are no server-side API routes — no `pages/api/`, no Express/Hono, nothing. The BAML/AI call requires a server-side runtime because:
- ANTHROPIC_API_KEY must never be exposed in browser bundles
- BAML `@boundaryml/baml` runs in Node.js
- `createServerSDK()` is designed for server-side Node.js contexts only

Evidence: `plugins/koszyk/package.json` — dependencies are `react`, `react-dom`, `react-router-dom` only. `vite.config.ts` defines a plain Vite SPA. No `next`, no express, no hono.

Contrast: `plugins/ai-description/package.json` has `"next": "^15.3.3"` and `"@boundaryml/baml": "^0.220.0"`, plus `src/pages/api/generate.ts` (Next.js API route).

**2. BAML function for cart recommendation**
No BAML function exists for cart-based recommendations. The existing `GenerateProductDescription` function in `plugins/ai-description/baml_src/main.baml` operates on a single product (name + description). A cart recommendation function needs:
- Input: list of cart item names/IDs
- Input: list of available products (or a subset)
- Output: structured list of recommended products with rationale

**3. Recommendation display UI in CartPage**
CartPage has no state, handler, or JSX for displaying AI recommendations. The button, loading state, and result panel are entirely absent.

**4. `ProductRecommendation` domain type**
`plugins/koszyk/src/domain.ts` has `Cart`, `CartItem`, `Product`, `CustomerSummary` — no recommendation type. A typed response shape is needed for the API result.

### Incomplete Features

**None** — this is a fully additive capability. No existing behavior changes.

### Behavioral Changes Needed

- CartPage will gain a new stateful interaction path (recommend button triggers async AI call, shows panel). The existing cart/item CRUD flows are unchanged.
- The Recommend button should only be active when a cart is selected AND it has at least one item. Currently there is no such conditional rendering hook to leverage.

---

## Critical Gap: No Backend Runtime in Koszyk

This is the central architectural decision of the task. The four viable options are:

| Option | Summary | Complexity | Introduces New Pattern? |
|--------|---------|-----------|------------------------|
| A. Migrate koszyk to Next.js | Convert Vite SPA to Next.js app; add `pages/api/recommend.ts` | Medium | No — follows ai-description exactly |
| B. Add Express/Hono server alongside Vite | Keep Vite for frontend; add a separate Node server on a second port | Medium | Yes — new dual-server pattern |
| C. New standalone Node plugin backend | Separate service (e.g., `plugins/koszyk-ai/`) | High | Yes — fragmented plugin pair |
| D. Add endpoint to Spring Boot host | Java controller calling AI (no BAML) | High | Yes — Java AI integration, no BAML |

**Option A is strongly recommended** because:
- It is the established pattern (ai-description is already Next.js + BAML)
- `plugins/server-sdk.ts` and `baml_src/clients.baml` are already structured for reuse
- BAML generators output to TypeScript — works naturally in Next.js
- Cart frontend React code is compatible with Next.js Pages Router
- No new infrastructure, tooling, or patterns introduced

---

## User Journey Impact Assessment

| Dimension | Current | After | Assessment |
|-----------|---------|-------|------------|
| Reachability | CartPage accessible via sidebar menu.main | Same path, same page | No change |
| Discoverability | Button added inline in cart items section | 8/10 — primary button, visible when cart selected | Additive improvement |
| Flow Integration | User selects cart, manages items | User selects cart, manages items, optionally requests recommendations | Positive additive |
| Multi-Persona | All users who can view the cart | Same — recommendation is read-only and non-destructive | No regression |

**Discoverability score**: 8/10 — the Recommend button will sit alongside "Dodaj produkt" in the items section header, visible when a cart is selected. This follows the existing pattern (all secondary actions appear there).

**Scope note**: The button should only appear / be enabled when `selectedCartId !== null && cartItems.filter(i => i.cartId === selectedCartId).length > 0`. This prevents calling AI with an empty input list.

---

## Data Lifecycle Analysis

### Entity: CartRecommendation

| Operation | Backend | UI Component | User Access | Status |
|-----------|---------|--------------|-------------|--------|
| CREATE (trigger AI) | MISSING — no API endpoint | MISSING — no button/handler | MISSING | Missing |
| READ (display result) | MISSING — no endpoint to fetch saved result | MISSING — no display panel | MISSING | Missing |
| UPDATE (re-trigger) | MISSING | MISSING | MISSING | Missing |
| DELETE | Not required for MVP | Not required | N/A | N/A |

**Completeness**: 0% — entire lifecycle missing.
**Orphaned Operations**: N/A (nothing exists yet).
**Missing Touchpoints**: None beyond CartPage (recommendations are cart-scoped, not cross-page).

### Entity: Product (pre-existing, used as input)

| Operation | Backend | UI Component | User Access | Status |
|-----------|---------|--------------|-------------|--------|
| READ (load all products for context) | `hostApp.getProducts()` | `loadProducts()` callback | Already called on mount | Complete |

The recommendation AI will receive the already-loaded `products` state from CartPage — no new data-fetch needed for the input side.

---

## New Capability Analysis

### Integration Points
- **Button placement**: Inside the `selectedCartId !== null` section header (tc-flex div), alongside "Dodaj produkt" — matches existing layout pattern
- **API route**: `pages/api/recommend.ts` (Next.js) or equivalent
- **BAML function**: New `RecommendCartProducts` in `baml_src/main.baml` (shared or koszyk-local)
- **Result display**: New `tc-card` section below the cart items table — non-intrusive, collapses when no result

### Patterns to Follow

| Concern | Pattern Source | File |
|---------|---------------|------|
| API route structure | ai-description | `plugins/ai-description/src/pages/api/generate.ts` |
| BAML function definition | ai-description | `plugins/ai-description/baml_src/main.baml` |
| LLM client config | ai-description | `plugins/ai-description/baml_src/clients.baml` |
| Frontend fetch + auth token | ai-description | `plugins/ai-description/src/pages/product-tab.tsx` lines 57-68 |
| Domain type + mapper | ai-description | `plugins/ai-description/src/domain.ts` |
| Error display | koszyk | `CartPage.tsx` uses `tc-error` class pattern |
| Loading/generating state | ai-description | `product-tab.tsx` `generating` boolean state |

### Architectural Impact

**If Option A (Next.js migration) is chosen:**
- `plugins/koszyk/package.json` — add `next`, `@boundaryml/baml` dependencies; remove pure-Vite scripts
- `plugins/koszyk/vite.config.ts` — replaced by Next.js config
- `plugins/koszyk/src/pages/CartPage.tsx` — moved to `pages/index.tsx` (Next.js Pages Router convention) or kept with a wrapper page
- `plugins/koszyk/src/main.tsx` — replaced by Next.js `_app.tsx`
- New: `plugins/koszyk/baml_src/` or reference shared `baml_src/`
- New: `plugins/koszyk/pages/api/recommend.ts`
- New: `plugins/koszyk/baml_client/` (generated by BAML CLI)
- Test infrastructure: migrate from Vitest to Jest (ai-description uses Jest + ts-jest) — OR keep Vitest for component tests and test the API route separately

**Architectural Impact rating**: Medium — Next.js migration touches build config, entry points, and test runner. React component logic (CartPage.tsx ~416 lines) transfers cleanly. No domain logic changes.

**If Option B (Express/Hono alongside Vite) is chosen:**
- Introduces dual-process development pattern not yet in codebase
- Would need a proxy or CORS setup
- Vite test infrastructure (Vitest) preserved
- Architectural impact: Medium-High (new pattern, more configuration)

---

## Issues Requiring Decisions

### Critical (Must Decide Before Proceeding)

**1. Backend runtime: How to add server-side API to koszyk?**

The AI call cannot be made from the browser. A server-side runtime is mandatory.

- **Option A**: Migrate `plugins/koszyk` from Vite to Next.js — mirrors `plugins/ai-description`, reuses established BAML + server-sdk pattern, clean API routes, medium migration effort
- **Option B**: Add a lightweight Node.js server (Express/Hono) alongside the existing Vite dev server — preserves Vite+Vitest, but introduces a new dual-process pattern not established in this project
- **Option C**: Add a Java/Spring Boot endpoint in the host for AI recommendations — different language, no BAML, does not follow ai-description pattern
- **Option D**: Create a separate plugin service (`plugins/koszyk-ai/`) — most isolated but fragments the cart feature across two services

**Recommendation**: Option A (Next.js migration)
**Rationale**: The ai-description plugin already establishes Next.js + BAML as the standard for AI-enabled plugins. Reusing this pattern avoids introducing new infrastructure. The koszyk React component transfers to Next.js with minimal changes.

---

**2. BAML location: Shared baml_src or koszyk-local?**

The `clients.baml` LLM client config is currently inside `plugins/ai-description/baml_src/`. The koszyk recommendation needs the same LLM clients.

- **Option A**: Copy `clients.baml` into `plugins/koszyk/baml_src/` (koszyk-local) — each plugin is fully self-contained, no shared state
- **Option B**: Create a shared `plugins/baml_src/` directory with shared `clients.baml`, each plugin's `baml_src/` imports from it — DRY but requires a shared module resolution convention not yet in place

**Recommendation**: Option A (koszyk-local copy)
**Rationale**: Each plugin is a standalone deployable. Shared BAML would require a new convention. Self-contained is simpler and follows existing precedent (ai-description is self-contained).

---

### Important (Should Decide)

**3. Recommendation result persistence: Save to plugin objects or ephemeral?**

The ai-description plugin saves generated descriptions to plugin objects (`sdk.thisPlugin.objects.save`), making them persistent and re-loadable. The cart recommendation could:

- **Option A**: Ephemeral (in-memory React state only) — simpler, recommendation disappears on page reload or cart re-selection
- **Option B**: Persistent (saved to plugin objects keyed by cartId) — recommendation survives page reload, shows last result on cart selection

**Recommendation**: Option A (ephemeral) for MVP
**Rationale**: Cart recommendations are perishable — they depend on current cart contents. If items change, the old recommendation is stale. Showing a stale saved recommendation could be misleading. Ephemeral state avoids this confusion. Can be upgraded later.

---

**4. Recommendation trigger context: Which products to recommend from?**

The AI prompt needs a product catalog to recommend from. CartPage already loads `products` (all products via `hostApp.getProducts()`). The question is what to pass as "available products" to the AI:

- **Option A**: Pass ALL products from the catalog — complete but may overwhelm the LLM context window with large catalogs
- **Option B**: Pass a filtered subset — products NOT already in the cart — more targeted, smaller context
- **Option C**: Pass top-N products by some criterion (category match, price range) — most precise but requires product metadata

**Recommendation**: Option B (products not already in cart)
**Rationale**: Products already in the cart don't need to be recommended. Excluding them gives the AI a cleaner, focused input. If the catalog is very large, a hard cap (e.g., top 20 by name alphabetically) can be added.

---

**5. Test strategy after Next.js migration (if Option A chosen)**

Current koszyk tests use Vitest + @testing-library/react. Next.js projects conventionally use Jest (as ai-description does).

- **Option A**: Migrate tests to Jest + ts-jest (matches ai-description test setup exactly)
- **Option B**: Keep Vitest for component tests; use a different approach for API route tests
- **Option C**: Keep Vitest and configure it to work with Next.js (possible but non-standard)

**Recommendation**: Option A (migrate to Jest)
**Rationale**: Consistency with ai-description. Existing CartPage.test.tsx test logic transfers cleanly to Jest; only the test runner config changes. The 9 existing tests are straightforward to migrate.

---

## Recommendations

1. Choose Next.js migration (Option A for decision 1) — it is the lowest-risk path that follows the established pattern and avoids introducing any new architectural concepts.

2. Keep BAML self-contained per plugin (Option A for decision 2) — simpler, no shared convention needed.

3. Start with ephemeral recommendations (Option A for decision 3) — defer persistence until there is a clear need.

4. Filter cart products from the recommendation input (Option B for decision 4) — immediately improves recommendation quality.

5. Migrate tests to Jest (Option A for decision 5) — consistency with the rest of the AI plugin ecosystem.

---

## Risk Assessment

- **Complexity Risk**: Medium — the React component logic is straightforward; the complexity is in the Next.js migration and BAML setup, both of which have a working template (ai-description)
- **Integration Risk**: Low — the feature is purely additive; existing cart CRUD is untouched; the host SDK works identically in Next.js (same postMessage bridge)
- **Regression Risk**: Low — CartPage.tsx logic is not modified, only extended; existing tests remain valid; no shared state with other plugins
- **API Key Risk**: Mitigated — by keeping the AI call server-side, the ANTHROPIC_API_KEY never reaches the browser bundle
