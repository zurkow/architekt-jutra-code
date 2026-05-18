# Phase 2 Scope Clarifications

## Architecture Decision

**Backend storage strategy**: Plugin objects via SDK (frontend-only)
- No JPA entities, no Java backend code, no Liquibase migrations
- Cart and CartItem stored as plugin_objects in the existing plugin_objects table (JSONB)
- Follows the same pattern as Warehouse and Customers plugins
- Frontend plugin communicates with host via `thisPlugin.objects.*` SDK API

## CartItem Product Reference

**productId stored as Long** (product's numeric ID from the host products table)
- Stored in plugin_object JSONB payload — no database FK constraint
- Logical reference only; enables frontend to call `hostApp.getProduct(productId)` to load product details

## CartItem Fields (Confirmed)

- `productId`: number (Long from products table)
- `quantity`: number (Integer) — default accepted
- `unitPrice`: number (BigDecimal snapshot at time of addition)

## UI Structure (Default Accepted)

- Two-section layout: cart list (top) + selected cart's items (bottom)
- Matches WarehousePage pattern from warehouse plugin

## Scope Summary

**Frontend-only plugin on port 3012:**

```
plugins/koszyk/
├── manifest.json          # menu.main, port 3012, icon "shopping-cart"
├── package.json
├── vite.config.ts         # port: 3012, strictPort: true
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx            # BrowserRouter, Route "/"
    ├── domain.ts           # Cart, CartItem interfaces + SDK mappers
    └── pages/
        └── CartPage.tsx    # Two-section: cart list + items
```

**No backend changes** — no Java, no migrations, no SecurityConfiguration update.

## What's In Scope

- Cart management page (menu.main)
- Create, view, delete carts
- Add items to cart (productId + quantity + unitPrice snapshot)
- Remove items from cart
- Cart status: ACTIVE, COMPLETED, ABANDONED

## What's Out of Scope

- JPA entities in Spring Boot host
- Add-to-cart from product detail pages (product.detail.info)
- Checkout/order processing
- Cart total calculation (nice-to-have, not required)
