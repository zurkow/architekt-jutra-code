# Gap Analysis: Shopping Cart (Koszyk) Plugin

**Date**: 2026-05-18
**Risk Level**: Low
**Effort**: Medium

---

## Summary

Greenfield feature. Zero cart-related code exists in the codebase. All infrastructure (plugin framework, templates, Maven deps) is in place. Port 3012 is free.

Three structural decisions must be resolved before backend modeling begins:
1. Backend storage strategy (JPA entities vs plugin_objects SDK)
2. CartItem product reference type
3. CartItem quantity field

---

## Task Characteristics

| Characteristic | Value | Evidence |
|---|---|---|
| has_reproducible_defect | false | Greenfield feature |
| modifies_existing_code | false | No cart code exists anywhere |
| creates_new_entities | true | Cart, CartItem, CartStatus are new |
| involves_data_operations | true | Full CRUD on carts and items |
| ui_heavy | true | New Vite/React plugin on port 3012 with menu.main |

---

## Gaps Identified

### Backend (pl.devstyle.aj.cart) — 0% complete

- Cart.java, CartItem.java, CartStatus.java — MISSING
- CartRepository, CartItemRepository — MISSING
- CartService, CartController — MISSING
- Request/Response records — MISSING
- Liquibase migration (011-create-carts-table.yaml) — MISSING
- SecurityConfiguration rules for /api/carts/** — MISSING
- Integration tests (CartTests.java) — MISSING

### Frontend (plugins/koszyk/) — 0% complete

- manifest.json, package.json, vite.config.ts, tsconfig.json, index.html — MISSING
- src/main.tsx, src/domain.ts, src/pages/CartPage.tsx — MISSING

---

## Integration Points

1. New CartController at `/api/carts/**` in pl.devstyle.aj.cart
2. SecurityConfiguration.java — add READ/EDIT rules for `/api/carts/**`
3. Liquibase `011-create-carts-table.yaml` (auto-included via `includeAll`)
4. Plugin manifest registration: `PUT /api/plugins/koszyk/manifest`
5. application.properties: verify `http://localhost:3012` in `app.cors.allowed-origins`

---

## Templates to Follow

- Backend entity: `Product.java` + `BaseEntity`
- Backend controller: `ProductController.java`
- Database migration: `002-create-products-table.yaml`
- Frontend scaffold: `plugins/customers/` (copy + adapt)
- Domain types: `plugins/customers/src/domain.ts`
- Tests: `ProductIntegrationTests.java` pattern

---

## Decisions Needed

### Critical

**backend-storage-strategy**: Cart data as JPA host entities OR as plugin_objects via SDK?
- JPA entities (Cart + CartItem + CartController + Liquibase) — type-safe, real queries, ~10 files
- Plugin objects via SDK — no Java code, reuses plugin_objects table
- Recommendation: JPA entities (typed fields benefit from entity modeling)

**cart-item-product-reference**: What does CartItem reference?
- CartItem.productId as Long FK to products table — referential integrity, JOIN capability
- CartItem.productId as String (no FK, like customerId) — loose coupling
- CartItem with name+unitPrice only — no product reference
- Recommendation: Long FK (Product is a host entity, not a plugin_object)

### Important

**cart-item-quantity**: Should CartItem include quantity? Task only mentions unitPrice.
- Default: Yes, add quantity (Integer)

**security-rules-carts**: Add READ/EDIT permission split for /api/carts/**?
- Default: Yes, standard GET=READ / mutations=EDIT pattern (matches all other domain routes)

**cart-page-ui-structure**: CartPage layout?
- Two-section (cart list top, selected cart items bottom) — matches WarehousePage pattern
- Inline expansion per cart row
- Cart list only
- Default: Two-section layout

---

## Risk Assessment

| Area | Level | Detail |
|---|---|---|
| Overall | Low | Greenfield, all patterns established |
| Security | Low | SecurityConfiguration must be updated explicitly |
| CORS | Low | Port 3012 must be in allowed-origins |
| Schema | Low | Liquibase auto-include handles new file |
