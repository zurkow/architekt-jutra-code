# Specification: Cart Recommend Button with AI-Powered Product Recommendations

## Goal

Add a Recommend button to the koszyk cart page that, when clicked, calls a server-side AI endpoint to suggest 3 products from the catalog that are not already in the selected cart, displaying each recommendation with its name, description, price, AI reasoning, and an Add to Cart button.

## User Stories

- As a sales/order employee, I want to click a Recommend button while viewing a customer's cart so that I can see AI-generated upsell/cross-sell product suggestions to propose to the customer.
- As a sales/order employee, I want each recommendation to include the product's name, description, price, and reasoning so that I can quickly evaluate whether to add it.
- As a sales/order employee, I want an Add to Cart button next to each recommendation so that I can add a suggested product to the customer's cart in one click.

## Core Requirements

1. A "Rekomenduj" (Recommend) button appears in the cart items section header when a cart is selected, alongside the existing "Dodaj produkt" button.
2. The button is disabled when: no cart is selected, the selected cart has no items, or a recommendation request is in progress.
3. Clicking the button fetches an auth token via `sdk.hostApp.getToken()`, then POSTs to `/api/recommend` with the cart items payload and a Bearer token header.
4. The API route receives the cart items, fetches all products from the host via `sdk.hostApp.getProducts()`, filters out products already present in the cart (matched by product ID), and calls the BAML function `RecommendCartProducts` with the cart context and filtered catalog.
5. The BAML function returns exactly 3 recommendations. Each recommendation contains: `productId`, `productName`, `productDescription`, `productPrice`, and `reasoning`.
6. Recommendations are displayed in a `tc-card` section below the cart items table, showing all five fields per recommendation.
7. Each recommendation card includes an "Dodaj do koszyka" button that calls the existing `handleAddItem` logic to add the product to the selected cart.
8. Recommendation state is ephemeral: it is reset to `null` when the selected cart changes.
9. A loading state ("Generowanie...") is shown on the button while the AI request is in progress.
10. If the API call fails, an error message is shown using the existing `tc-error` CSS class pattern.
11. The koszyk plugin is migrated from Vite to Next.js (Pages Router, port 3012) to enable the server-side API route.
12. Existing tests are migrated from Vitest to Jest, consistent with the ai-description plugin.

## Reusable Components

### Existing Code to Leverage

- `plugins/ai-description/src/pages/api/generate.ts` — Direct template for `pages/api/recommend.ts`: same structure (method guard, body validation, `createServerSDK` call, BAML invocation, error handling). The new route differs in that it calls `sdk.hostApp.getProducts()` instead of `sdk.hostApp.getProduct()` and does not persist results.
- `plugins/ai-description/baml_src/clients.baml` — Copy as-is into `plugins/koszyk/baml_src/clients.baml`. Defines `AnthropicProvider` (primary) and `LiteLlmProvider` (fallback) clients — no changes needed.
- `plugins/ai-description/src/pages/product-tab.tsx` — Template for the frontend fetch pattern: `sdk.hostApp.getToken()`, Bearer token header construction, `generating` boolean state, error boundary, and conditional render of results. The pattern at lines 51-100 applies directly.
- `plugins/koszyk/src/pages/CartPage.tsx` — The `handleAddItem` function (lines 148-173) is reused as-is for the "Dodaj do koszyka" button in the recommendation panel. The `selectedCartId`, `products`, and `cartItems` state are already in scope and available for recommendation logic.
- `plugins/koszyk/src/domain.ts` — The existing `Product` interface (`id`, `name`, `price`) is used as input type for the product catalog passed to the API. A new `ProductRecommendation` interface is added to this file.
- `plugins/server-sdk.ts` — Used in the API route via `createServerSDK("koszyk")`. The `hostApp.getProducts()` method is already implemented.
- `plugins/ai-description/package.json` — Dependency template: `next ^15.3.3`, `@boundaryml/baml ^0.220.0`, `jest ^29.7.0`, `ts-jest ^29.3.0`, `node-mocks-http ^1.16.0`. The koszyk `package.json` is restructured to match.
- `plugins/koszyk/src/test/CartPage.test.tsx` — All 9 existing tests transfer to Jest with minimal changes (replace `vi.mock` with `jest.mock`, `vi.fn()` with `jest.fn()`, `vi.resetAllMocks()` with `jest.resetAllMocks()`).

### New Components Required

**`plugins/koszyk/baml_src/main.baml` — `RecommendCartProducts` BAML function**

New because no cart-based recommendation BAML function exists anywhere in the codebase. The existing `GenerateProductDescription` in ai-description operates on a single product (name + description). The new function requires structured list inputs (cart items with quantities/prices and a product catalog) and returns a typed list of 3 recommendations. The return type schema (`productId`, `productName`, `productDescription`, `productPrice`, `reasoning`) has no analogue in the existing function.

**`plugins/koszyk/pages/api/recommend.ts` — Next.js API route**

New because koszyk has no server-side runtime today. Cannot reuse ai-description's `generate.ts` without modification: the logic differs (multi-product catalog fetch, cart filtering, no persistence, different BAML function signature). Created as a new file following the generate.ts structural pattern.

**`ProductRecommendation` interface and domain addition in `plugins/koszyk/src/domain.ts`**

New interface added to the existing domain file. Not a separate file — added inline per the plugin's existing domain pattern. Contains: `productId: number`, `productName: string`, `productDescription: string`, `productPrice: number`, `reasoning: string`.

**Recommendation panel JSX in `CartPage.tsx`**

New state variables (`recommendations`, `recommending`, cleared on cart change), new `handleRecommend` async function, new button in the cart items section header, and a new results section rendered below the cart items table. These additions are to the existing CartPage component — no new file.

**Next.js migration files**

`next.config.js`, updated `package.json`, updated `tsconfig.json`, `pages/_app.tsx` (replacing `src/main.tsx`), `pages/index.tsx` (wrapping CartPage), `jest.config.js` — all new because koszyk is currently a Vite SPA. These are infrastructure files, not new product logic.

## Technical Approach

### Next.js Migration

The koszyk plugin is converted from a Vite SPA to a Next.js 15 Pages Router app. The `CartPage` React component is preserved verbatim and wrapped by a Next.js page at `pages/index.tsx`. The `BrowserRouter` from react-router-dom is removed (not needed in Next.js Pages Router). Port 3012 is preserved via `next dev -p 3012` in the `dev` script. The `vite.config.ts` and `src/main.tsx` entry point are replaced by `next.config.js` and `pages/_app.tsx`.

The SDK browser bridge (`getSDK()`) continues to work identically — it uses `window.postMessage` which is available in Next.js client components. The `pages/index.tsx` page renders CartPage with no SSR concerns since it relies on browser APIs; `getSDK()` is called inside `useEffect`/`useCallback` hooks already, consistent with the ai-description `useMemo(() => getSDK(), [])` pattern.

### BAML Integration

`plugins/koszyk/baml_src/` contains two files:
- `clients.baml` — copied from ai-description, unchanged
- `main.baml` — defines `RecommendCartProducts` function

The BAML function receives:
- `cartItems` — a string describing cart items (formatted as "name x quantity @ unitPrice")
- `availableProducts` — a string listing products not in the cart (formatted as "id: name — description — price")

It returns a class `CartRecommendation` with fields: `productId int`, `productName string`, `productDescription string`, `productPrice float`, `reasoning string`. The function returns `CartRecommendation[]` with a fixed count of 3. The prompt instructs the model to act as a sales assistant recommending upsell/cross-sell products.

The `baml_client/` directory is generated by `npx baml-cli generate` (run via `postinstall` script). The generated `b.RecommendCartProducts()` function is imported in the API route.

### API Route Data Flow

`POST /api/recommend` receives:
```
{ cartItems: Array<{ productId: number, productName: string, quantity: number, unitPrice: number }> }
```

Validation: `cartItems` must be a non-empty array. Returns 400 with details if missing or empty.

Processing:
1. `createServerSDK("koszyk", undefined, req)` — forwards the Bearer token from the request header
2. `sdk.hostApp.getProducts()` — fetches full catalog
3. Filter: exclude products whose `id` matches any `productId` in `cartItems`
4. Format cart context string and available products string for BAML
5. Call `b.RecommendCartProducts(cartItemsContext, availableProductsContext)`
6. Return the 3-element array as JSON; no persistence

Error handling follows generate.ts: catch-all returns 500 with a generic user-facing message, no internal details leaked.

### Frontend Recommend Flow

New state in CartPage:
- `recommendations: ProductRecommendation[] | null` — null = not yet generated or reset
- `recommending: boolean` — true while fetch is in-flight

`recommendations` is reset to `null` inside the `useEffect` that watches `selectedCartId`.

`handleRecommend` async function:
1. Guards: `selectedCartId` is not null and current cart has at least one item
2. Gets token via `sdk.hostApp.getToken()`
3. POSTs to `/api/recommend` with `cartItems` payload and `Authorization: Bearer <token>` header
4. On success: sets `recommendations` state
5. On failure: sets `error` state with user-facing message

The "Rekomenduj" button is placed in the `tc-flex` div of the cart items section header, after the "Dodaj produkt" button. It uses `tc-primary-button` class and is `disabled` when `!selectedCartId || currentCartItems.length === 0 || recommending`.

The results panel renders as a `tc-section` below the cart items table when `recommendations !== null`. Each recommendation renders as a `tc-card` with name, description, price, reasoning, and a "Dodaj do koszyka" `tc-ghost-button`. The Add to Cart handler directly calls the existing `handleAddItem` logic by setting `newProductId` and `newQuantity` then invoking `handleAddItem()`, or alternatively, a direct SDK save call matching `handleAddItem`'s pattern to avoid coupling to the form state.

The direct approach is preferred: extract a `addProductToCart(productId: number, productName: string, unitPrice: number)` helper from `handleAddItem` that takes parameters directly, then call it from both the existing form submit and the recommendation panel button. This avoids side-effects on the form state.

## Implementation Guidance

### Testing Approach

**API route tests** (`pages/api/recommend.test.ts`) using Jest + node-mocks-http, mirroring `generate.test.ts` structure:
- Missing/empty cartItems returns 400
- Valid request calls `getProducts()` and filters in-cart products before BAML call
- Successful call returns 3-element array with correct shape
- BAML failure returns 500 with generic message (no internal details)
- Non-POST method returns 405

**CartPage component tests** (migrated from Vitest to Jest):
- All 9 existing tests preserved with vi → jest API substitution
- Recommend button is disabled when no items in cart
- Recommend button triggers fetch with correct payload
- Recommendations panel renders after successful response
- Error message shown on fetch failure
- Recommendations reset when selectedCartId changes

Target: 5 tests for the API route, 5 tests for new CartPage recommendation behavior (2-8 per group).

### Standards Compliance

- `standards/global/minimal-implementation.md` — No persistence layer for recommendations (ephemeral). No abstraction layers beyond the direct pattern established by ai-description. The `addProductToCart` helper is extracted only because it has two callers; it is not speculative.
- `standards/global/error-handling.md` — API route catches all errors and returns a generic 500 message. Frontend shows `tc-error` paragraph. No internal paths or stack traces leaked to the client.
- `standards/global/validation.md` — API route validates `cartItems` presence and non-empty before BAML call.
- `standards/testing/frontend-testing.md` — Jest replaces Vitest; same `@testing-library/react` + `@testing-library/jest-dom` + `renderWithProviders` per-file pattern. `jest.resetAllMocks()` in `beforeEach`.
- `standards/backend/api.md` — POST `/api/recommend` follows RESTful resource naming. Input/output types are explicitly typed interfaces in TypeScript.

## Out of Scope

- Persisting recommendations to plugin objects (ephemeral React state only for MVP)
- Recommendation history or audit trail
- A separate MCP server tool for the recommendation function
- Changes to the Spring Boot host application or any other plugin
- User-facing documentation for end customers
- Product catalog size limiting beyond the cart-exclusion filter (can be added later if catalog is large)
- Re-recommendation on cart item changes (user must click the button again)

## Success Criteria

- Clicking "Rekomenduj" with a non-empty cart returns and displays exactly 3 product recommendations within a reasonable response time (dependent on LLM latency)
- Each recommendation displays: product name, product description, product price, and AI reasoning
- "Dodaj do koszyka" on a recommendation adds the product to the selected cart (saved to plugin objects, visible in the cart items table after reload)
- The button is disabled with an empty cart or no selected cart
- Changing the selected cart clears the recommendations panel
- All 9 existing CartPage tests continue to pass after Vitest-to-Jest migration
- The plugin runs on port 3012 with `npm run dev`
- `ANTHROPIC_API_KEY` is never sent to the browser bundle (verified by checking the Next.js build output)
