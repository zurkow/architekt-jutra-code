# Requirements

**Task**: Add Recommend button to cart page with AI-powered product recommendations

---

## Initial Description
"Na stronie koszyka dodaj przycisk Rekomenduj, który na podstawie listy pozycji zarekomenduje produkty z bazy. Użyj do tego AI i MCP - jak plugin ai description"

Translation: On the cart page, add a Recommend button that, based on the list of items, will recommend products from the database. Use AI and MCP for this — like the ai-description plugin.

---

## Q&A from Requirements Gathering

**Q: Who is the primary user?**
A: Pracownik obsługi zamówień / sprzedaży (order/sales employee) — selects a customer's cart, views items, clicks Recommend — AI suggests products worth proposing to the customer (upsell/cross-sell scenario).

**Q: What should be displayed as recommendation result?**
A: All of the following:
- Product name and description
- Product price
- "Add to Cart" button next to each recommended product
- AI reasoning (why this product is recommended)

**Q: How many recommendations should AI return?**
A: Exactly 3 products.

---

## Similar Features / Reusability

- **`plugins/ai-description`**: Direct template — same BAML+Next.js+API route pattern
  - `src/pages/api/generate.ts` → template for `/api/recommend`
  - `src/pages/product-tab.tsx` → template for Recommend button + results display
  - `baml_src/main.baml` → template for `RecommendCartProducts` BAML function
  - `baml_src/clients.baml` → copy as-is (Anthropic → LiteLLM fallback)
- **`plugins/koszyk/src/pages/CartPage.tsx`**: Already loads products and cart items into state
  - `sdk.hostApp.getProducts()` already called in `loadProducts()`
  - Cart items per cart already in state when cart selected

---

## Functional Requirements

1. **Recommend button** appears in the cart items section of CartPage
2. Button is **disabled** when: no cart selected, cart has no items, or recommendation is loading
3. On click: collects current cart items, calls `/api/recommend` POST with Bearer token
4. API route: receives cart items, fetches all products, filters out products already in cart, calls BAML `RecommendCartProducts`, returns top 3 recommendations
5. Each recommendation includes: product name, description, price, reasoning, and product ID
6. **Add to Cart** button next to each recommendation adds the product to the current selected cart
7. Results are **ephemeral** — not persisted, reset on cart change
8. Show loading state while AI is processing
9. Show error message if AI call fails

---

## Architecture Decisions (from Scope Clarification)

- **Backend runtime**: Migrate koszyk to Next.js (same as ai-description)
- **AI integration**: BAML function `RecommendCartProducts` with Anthropic primary → LiteLLM fallback
- **Persistence**: Ephemeral (React state only)
- **Product filtering**: Exclude products already in current cart from recommendation candidates
- **Tests**: Migrate to Jest (consistent with ai-description)

---

## Scope Boundaries

**In scope**:
- Migrate plugins/koszyk from Vite to Next.js
- Recommend button with loading/disabled states
- New BAML function `RecommendCartProducts`
- New Next.js API route `/api/recommend`
- Recommendation display: name, description, price, reasoning, Add to Cart button
- Filter already-in-cart products from candidates

**Out of scope**:
- Saving/persisting recommendations
- Recommendation history
- Separate MCP server tool for recommendations
- Changes to Spring Boot host or other plugins
- User-facing documentation for end customers

---

## Technical Considerations

- Koszyk currently on port 3012 — Next.js migration must preserve this port (`next dev -p 3012`)
- Existing tests in koszyk use Vitest; migrate to Jest for consistency with ai-description
- CartPage already fetches products via `sdk.hostApp.getProducts()` — reuse this data
- BAML prompt needs: cart item names+quantities+prices as context, available product catalog (filtered)
- Auth: `sdk.hostApp.getToken()` → Bearer token forwarded to `/api/recommend` → `createServerSDK` on backend
- "Add to Cart" from recommendation panel: reuse existing `handleAddItem()` pattern in CartPage
