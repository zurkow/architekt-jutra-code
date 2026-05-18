# Specification: Shopping Cart (Koszyk) Plugin

## Goal

Create a frontend-only Vite/React plugin on port 3012 that allows employees to manage shopping carts for customers — creating carts, assigning customers, adding product line items, and managing cart status — with all data stored via the plugin_objects SDK.

## User Stories

- As an employee, I want to create a cart for a customer so that I can track what they intend to purchase.
- As an employee, I want to add products to a cart with quantity and price so that the cart reflects the customer's order.
- As an employee, I want to change the cart status (ACTIVE / COMPLETED / ABANDONED) so that I can track its lifecycle.
- As an employee, I want to delete a cart and have its items automatically removed so that stale data is not left behind.
- As an employee, I want to remove individual items from a cart so that I can correct mistakes.

## Core Requirements

1. Cart plugin_object (type: "cart") with fields: `customerId` (string UUID), `customerName` (string snapshot), `status` ("ACTIVE" | "COMPLETED" | "ABANDONED"). objectId is auto-generated UUID via `crypto.randomUUID()`.
2. CartItem plugin_object (type: "cartItem") with fields: `cartId` (string), `productId` (number), `productName` (string snapshot), `quantity` (number), `unitPrice` (number). objectId is composite key `${cartId}-${productId}`.
3. CartPage two-section layout: top section shows the full cart list; bottom section shows the selected cart's items.
4. Create cart via a form/modal: customer dropdown (loaded from customers plugin), stores `customerId` + `customerName` snapshot, initial status is ACTIVE.
5. Status update inline: select dropdown per cart row with values ACTIVE / COMPLETED / ABANDONED; saves immediately on change.
6. Delete cart: confirmation required; cascades — deletes all cartItem objects with matching `cartId` before deleting the cart itself.
7. Add item to cart: product dropdown from `hostApp.getProducts()`, quantity input (integer, min 1), unitPrice input (auto-filled from product price, editable by user). Stores `productId` + `productName` snapshot.
8. Remove item from cart: single delete button per row, no confirmation required (matches warehouse stock pattern).
9. Cart list table columns: Customer Name, Status (badge), Item count (derived from loaded cartItems), Created date, Actions (Delete).
10. Cart items table columns: Product Name, Quantity, Unit Price, Actions (Remove).
11. Plugin configuration: port 3012, menu.main only, icon "shopping-cart", label "Koszyk".

## Visual Design

No mockups provided. Follow the WarehousePage layout from `plugins/warehouse/src/pages/WarehousePage.tsx` exactly:
- `tc-plugin` root wrapper with `padding: "1rem"` and `maxWidth: 800`
- Top `tc-section` for cart list — `tc-table` with action buttons
- Bottom `tc-section` for selected cart's items — shown only when a cart row is clicked/selected
- `tc-primary-button` for create/add actions
- `tc-ghost-button tc-ghost-button--danger` for delete/remove actions
- `tc-badge tc-badge--success` for ACTIVE status, `tc-badge` (neutral) for COMPLETED, `tc-badge tc-badge--danger` for ABANDONED
- `tc-select` for status dropdown and all select inputs
- `tc-input` for quantity and unit price inputs
- `tc-error` for error display
- `tc-card` for the create cart form (inline, below the table, same pattern as CustomersPage form)

## Reusable Components

### Existing Code to Leverage

- `plugins/warehouse/src/pages/WarehousePage.tsx` — exact UI layout pattern: two-section structure, `tc-table`, inline form below table, `tc-primary-button`, `tc-ghost-button`, error handling with `setError`, `useCallback` + `useEffect` data loading, `loading` state guard
- `plugins/warehouse/src/domain.ts` — mapper function pattern (`toWarehouse`, `toStockEntry`), composite objectId key (`${cartId}-${productId}` mirrors `${productId}-${warehouseId}`)
- `plugins/customers/src/domain.ts` — `Customer` interface and `toCustomer` mapper; the koszyk plugin reuses the `Customer` type for the customer dropdown (cross-plugin read)
- `plugins/customers/vite.config.ts` — copy verbatim, change port from 3011 to 3012
- `plugins/customers/manifest.json` — copy as base, update name/url/description/icon/label
- `plugins/sdk.ts` — `PluginObject`, `getSDK()`, `hostApp.fetch()`, `thisPlugin.objects.*` — imported as `import { getSDK } from "../../sdk"` and `import type { PluginObject } from "../../sdk"`
- `plugins/warehouse/src/main.tsx` — single-route BrowserRouter pattern to copy; koszyk only needs `<Route path="/" element={<CartPage />} />`
- Host CSS classes via `http://localhost:8080/assets/plugin-ui.css` — no custom styles needed

### New Components Required

- `plugins/koszyk/src/domain.ts` — `Cart` and `CartItem` interfaces + `toCart` and `toCartItem` mapper functions. New file required because these are koszyk-specific domain types not present in any existing plugin.
- `plugins/koszyk/src/pages/CartPage.tsx` — The two-section cart management page. New file required; WarehousePage is the UI template but CartPage has different domain logic (status management, cascade delete, cross-plugin customer fetch).
- `plugins/koszyk/manifest.json` — New manifest required; koszyk is a new plugin with unique pluginId, port, label, and icon.
- `plugins/koszyk/package.json`, `plugins/koszyk/index.html`, `plugins/koszyk/tsconfig.json` — Standard plugin scaffold files. New files required for a new plugin directory; content copied from customers plugin with name/port updated.

## Technical Approach

### Cross-Plugin Customer Access

`thisPlugin.objects.list()` is scoped to the current plugin's `pluginId` — it cannot read another plugin's objects. The customers plugin stores customer data under pluginId "customers". The host exposes this via REST at `/api/plugins/customers/objects/customer`.

The koszyk plugin loads the customer list using `hostApp.fetch("/api/plugins/customers/objects/customer")` and parses the JSON body to extract `objectId`, `data.firstName`, `data.lastName`. This is the correct cross-plugin access pattern — no Java changes required.

The `Customer` type from `plugins/customers/src/domain.ts` can be imported directly in `CartPage.tsx` to type the fetched customer list. The `toCustomer` mapper from that file works on `PluginObject` shape; the raw fetch returns the same `PluginObjectResponse` JSON structure, so a lightweight inline mapper suffices (or import `toCustomer` cross-plugin).

### Data Flow

1. On mount: load all "cart" objects via `thisPlugin.objects.list("cart")`, load customer list via `hostApp.fetch`, load products via `hostApp.getProducts()`.
2. On cart row click: load "cartItem" objects filtered by `cartId` using `thisPlugin.objects.list("cartItem", { filter: "cartId:eq:" + cart.objectId })`.
3. Create cart: `thisPlugin.objects.save("cart", crypto.randomUUID(), { customerId, customerName, status: "ACTIVE" })`.
4. Update status: `thisPlugin.objects.save("cart", cart.objectId, { ...cart data, status: newStatus })` — upsert replaces data.
5. Add item: `thisPlugin.objects.save("cartItem", \`${cartId}-${productId}\`, { cartId, productId, productName, quantity, unitPrice })`.
6. Remove item: `thisPlugin.objects.delete("cartItem", cartItem.objectId)`.
7. Delete cart (cascade): list all cartItems with `filter: "cartId:eq:" + cartId`, delete each, then delete the cart.

### State Management

Single `CartPage.tsx` component with local React state — no external state library. Matches the warehouse pattern: `useState` for data arrays, `useCallback` for load functions, `useEffect` for initial load and when selectedCartId changes.

### Product Interface (local)

Define a minimal `Product` interface in `domain.ts` (id, name, price fields) to type `hostApp.getProducts()` results — same pattern as warehouse `domain.ts` which defines its own `Product` interface.

### Item Count

Derived at render time from the loaded `cartItems` array filtered by the current cart's objectId — no separate count field stored on the cart object.

### Plugin Registration

After first run: `curl -X PUT http://localhost:8080/api/plugins/koszyk/manifest -H "Content-Type: application/json" -d @manifest.json`

CORS: port 3012 must be present in `app.cors.allowed-origins` in `application.properties`. This is a deployment/environment check, not a code change.

## Implementation Guidance

### Testing Approach

Frontend-only plugin. Testing follows `plugins/` testing pattern (if any tests exist) or minimal smoke testing. For this plugin, 2-4 focused tests per implementation step group cover:
- Cart CRUD operations (create, status update, delete with cascade)
- CartItem operations (add item, remove item)
- Customer fetch integration (cross-plugin fetch parses correctly)
- CartPage render (loading state, empty state, populated state)

Tests should use Vitest with `@testing-library/react`, mock `getSDK()` via `vi.mock("../../sdk")`, and use a per-file `renderWithProviders()` helper per the frontend testing standard. Test files live in `plugins/koszyk/src/test/`.

### Standards Compliance

- **Minimal Implementation** (`standards/global/minimal-implementation.md`): No cart total calculation field, no checkout flow, no product.detail.info extension — only what is required.
- **Error Handling** (`standards/global/error-handling.md`): All SDK calls wrapped in try/catch, errors displayed via `tc-error`, never swallowed silently.
- **Frontend Components** (`standards/frontend/components.md`): Single CartPage component with clear responsibility; domain types separated into `domain.ts`.
- **CSS** (`standards/frontend/css.md`): Use host `plugin-ui.css` classes exclusively; no custom CSS definitions.
- **Coding Style** (`standards/global/coding-style.md`): TypeScript interfaces for all domain types; descriptive function names (`loadCarts`, `handleDeleteCart`, `handleAddItem`).

## Out of Scope

- Java backend code, JPA entities, Liquibase migrations, SecurityConfiguration changes
- Checkout / payment / order processing
- Add-to-cart from product detail pages (product.detail.info extension point)
- Cart total price calculation display
- Cart item quantity update (add/remove only)
- Pagination of carts or items (plugin_objects list returns up to 1000 by default)

## Success Criteria

- Employee can create a cart, select a customer from dropdown, and see it in the cart list.
- Employee can add products to a selected cart; items appear in the bottom section.
- Status dropdown changes persist immediately.
- Deleting a cart removes it and all its cartItem objects (verified by checking plugin_objects table or re-loading).
- Plugin appears in the host sidebar as "Koszyk" with a shopping-cart icon.
- No Java files are created or modified.
- All SDK calls handle errors with visible user feedback.
