# Implementation Plan: Shopping Cart (Koszyk) Plugin

## Overview

Total Steps: 28
Task Groups: 4
Expected Tests: 16–26

All files are new under `plugins/koszyk/`. No existing Java or backend files are modified.
The CORS wildcard `http://localhost:*` already covers port 3012 — no `application.properties` change needed.

---

## Implementation Steps

### Task Group 1: Plugin Scaffold
**Dependencies:** None
**Estimated Steps:** 7

- [x] 1.0 Complete plugin scaffold — all boilerplate files for `plugins/koszyk/`
  - [x] 1.1 Write 3 focused tests for scaffold correctness
    - Test: `index.html` loads SDK script from `http://localhost:8080/assets/plugin-sdk.js`
    - Test: `index.html` loads stylesheet from `http://localhost:8080/assets/plugin-ui.css`
    - Test: `vite.config.ts` declares port 3012 with `strictPort: true`
    - Place tests in `plugins/koszyk/src/test/scaffold.test.ts` (file-presence + string-content checks using `fs.readFileSync`)
  - [x] 1.2 Create `plugins/koszyk/package.json`
    - Copy from `plugins/logistics/package.json`
    - Change `name` to `"koszyk-plugin"`
    - Retain all devDependencies including vitest, jsdom, @testing-library/react, @testing-library/jest-dom
    - Retain `"test": "vitest run"` script
  - [x] 1.3 Create `plugins/koszyk/index.html`
    - Copy from `plugins/customers/index.html`
    - Change `<title>` to `"Koszyk Plugin"`
    - Keep SDK script and plugin-ui.css link pointing to `http://localhost:8080`
  - [x] 1.4 Create `plugins/koszyk/tsconfig.json`
    - Copy verbatim from `plugins/customers/tsconfig.json`
    - No changes needed (same compiler options)
  - [x] 1.5 Create `plugins/koszyk/vite.config.ts`
    - Copy from `plugins/logistics/vite.config.ts` (includes vitest test block)
    - Change port to `3012`
    - Keep `test.environment: "jsdom"`, `test.globals: true`, `test.setupFiles: ["./src/test/setup.ts"]`
  - [x] 1.6 Create `plugins/koszyk/manifest.json`
    - `name`: `"Shopping Cart"`, `version`: `"1.0.0"`, `url`: `"http://localhost:3012"`
    - `description`: `"Manages shopping carts for customers"`
    - Single extension point: `menu.main`, `label`: `"Koszyk"`, `icon`: `"shopping-cart"`, `path`: `"/"`, `priority`: `120`
  - [x] 1.7 Create `plugins/koszyk/src/test/setup.ts`
    - Single line: `import "@testing-library/jest-dom/vitest";`
    - Mirrors `plugins/logistics/src/test/setup.ts` exactly
  - [x] 1.n Ensure scaffold tests pass
    - Run only the 3 tests written in 1.1
    - `cd plugins/koszyk && npm install && npx vitest run src/test/scaffold.test.ts`

**Acceptance Criteria:**
- All 3 scaffold tests pass
- `npm run dev` launches on port 3012 without errors
- `manifest.json` registers a single `menu.main` extension point

---

### Task Group 2: Domain Types
**Dependencies:** Group 1
**Estimated Steps:** 6

- [x] 2.0 Complete domain layer — `plugins/koszyk/src/domain.ts`
  - [x] 2.1 Write 4 focused tests for domain mappers (5 written: 4 required + toCustomerSummary)
    - Test: `toCart` maps `PluginObject` fields to `Cart` interface (objectId, customerId, customerName, status, createdAt)
    - Test: `toCart` defaults missing optional fields gracefully (no throw on sparse data)
    - Test: `toCartItem` maps `PluginObject` fields to `CartItem` interface (objectId, cartId, productId, productName, quantity, unitPrice)
    - Test: `toCartItem` composite objectId `${cartId}-${productId}` round-trips through mapper
    - Place tests in `plugins/koszyk/src/test/domain.test.ts`
    - Mock `PluginObject` directly as plain objects — no SDK mock needed for pure mapper tests
  - [x] 2.2 Create `plugins/koszyk/src/domain.ts` — interfaces
    - `Cart` interface: `objectId: string`, `customerId: string`, `customerName: string`, `status: "ACTIVE" | "COMPLETED" | "ABANDONED"`, `createdAt: string`
    - `CartItem` interface: `objectId: string`, `cartId: string`, `productId: number`, `productName: string`, `quantity: number`, `unitPrice: number`
    - `Product` interface: `id: string`, `name: string`, `price: number` (minimal, typed for `hostApp.getProducts()`)
    - `CustomerSummary` interface: `objectId: string`, `firstName: string`, `lastName: string` (minimal, typed for cross-plugin fetch)
    - Import: `import type { PluginObject } from "../../sdk";`
  - [x] 2.3 Implement `toCart` mapper in `domain.ts`
  - [x] 2.4 Implement `toCartItem` mapper in `domain.ts`
  - [x] 2.5 Implement `toCustomerSummary` inline mapper (can be a function in `domain.ts`)
  - [x] 2.n Ensure domain tests pass — 5/5 passed

**Acceptance Criteria:**
- All 4 domain tests pass
- TypeScript compiles without errors (`npx tsc --noEmit`)
- All interfaces are exported and cover every field used in CartPage

---

### Task Group 3: CartPage UI
**Dependencies:** Groups 1, 2
**Estimated Steps:** 11

- [x] 3.0 Complete CartPage — all cart management UI and SDK integration
  - [x] 3.1 Write 6 focused tests for CartPage component
  - [x] 3.2 Create `plugins/koszyk/src/main.tsx`
  - [x] 3.3 Create CartPage with state declarations
  - [x] 3.4 Implement data-loading callbacks
  - [x] 3.5 Implement cart mutation handlers
  - [x] 3.6 Implement cart item mutation handlers
  - [x] 3.7 Implement cart list section (top tc-section)
  - [x] 3.8 Implement inline create cart form
  - [x] 3.9 Implement cart items section (bottom tc-section)
  - [x] 3.10 Implement inline add item form
  - [x] 3.n All 6 CartPage tests pass

**Acceptance Criteria:**
- All 6 CartPage tests pass
- TypeScript compiles without errors (`npx tsc --noEmit`)
- Two-section layout renders (cart list top, cart items bottom)
- Status select saves immediately on change
- Delete cart cascades to cartItems before deleting the cart

---

### Task Group 4: Test Review & Gap Analysis
**Dependencies:** All previous groups

- [x] 4.0 Review and fill critical gaps
  - [x] 4.1 Review existing tests from Groups 1–3 (14 existing: 3 scaffold + 5 domain + 6 CartPage)
  - [x] 4.2 Analyze gaps: handleUpdateStatus, loadCustomers parsing, product price auto-fill, SDK error display, handleRemoveItem without confirm
  - [x] 4.3 Write 5 strategic gap tests added to CartPage.test.tsx (within 10 limit)
  - [x] 4.4 All 19 tests pass: 3 scaffold + 5 domain + 11 CartPage

**Acceptance Criteria:**
- All koszyk tests pass (16–23 total)
- No more than 10 additional tests added
- `npm run build` completes without TypeScript errors

---

## Execution Order

1. Group 1: Plugin Scaffold (7 steps) — no dependencies
2. Group 2: Domain Types (6 steps, depends on Group 1)
3. Group 3: CartPage UI (11 steps, depends on Groups 1 and 2)
4. Group 4: Test Review & Gap Analysis (4 steps, depends on Groups 1, 2, and 3)

---

## Post-Implementation Registration

After `npm run dev` starts successfully on port 3012, register the manifest once:

```
curl -X PUT http://localhost:8080/api/plugins/koszyk/manifest \
  -H "Content-Type: application/json" \
  -d @plugins/koszyk/manifest.json
```

CORS: `app.cors.allowed-origins=http://localhost:*` already covers port 3012. No `application.properties` change required.

---

## Standards Compliance

Follow standards from `.maister/docs/standards/`:

- `global/minimal-implementation.md` — No cart total, no checkout flow, no product.detail.info extension
- `global/error-handling.md` — All SDK calls in try/catch, errors shown via `tc-error`, never silently swallowed
- `global/coding-style.md` — TypeScript interfaces for all domain types, descriptive handler names (`loadCarts`, `handleDeleteCart`, `handleAddItem`)
- `global/commenting.md` — No redundant comments; let descriptive names speak
- `frontend/components.md` — Single CartPage component; domain types isolated in `domain.ts`
- `frontend/css.md` — Use `plugin-ui.css` classes exclusively; no custom CSS definitions

---

## Notes

- Test-Driven: Each group starts with tests (1.1, 2.1, 3.1) before implementation
- Run Incrementally: Only new tests after each group — do NOT run the full suite until Group 4
- Mark Progress: Check off steps as completed using the checkboxes above
- Reuse First: Scaffold files copied from logistics/customers plugins; domain mapper pattern from warehouse; UI pattern from WarehousePage
- Template mapping:
  - `plugins/logistics/` — package.json (with vitest), vite.config.ts (with test block), test/setup.ts
  - `plugins/customers/` — index.html, tsconfig.json, manifest.json (base shape)
  - `plugins/warehouse/src/` — WarehousePage.tsx (layout), domain.ts (mapper pattern), main.tsx (router pattern)
