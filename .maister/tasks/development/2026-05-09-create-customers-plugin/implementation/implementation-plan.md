# Implementation Plan: Customers Plugin

## Overview

Total Steps: 18
Task Groups: 3
Expected Tests: None (tests explicitly out of scope per spec section "Testing Approach")

## Implementation Steps

### Task Group 1: Plugin Scaffold (Config & Entry Files)
**Dependencies:** None
**Estimated Steps:** 7

Create all configuration and entry-point files. These are direct copies or minimal
adaptations of the warehouse plugin. No domain logic lives here.

- [x] 1.0 Complete plugin scaffold
  - [x] 1.1 Create `plugins/customers/manifest.json`
    - Copy structure from `plugins/warehouse/manifest.json`
    - Set `"name": "Warehouse Management"` → `"Customers"`
    - Set `"url": "http://localhost:3001"` → `"http://localhost:3011"`
    - Set `"description"` to `"Manages business client records"`
    - Keep only the `menu.main` extension point; remove all product.* entries
    - Set `menu.main` fields: `"label": "Customers"`, `"icon": "users"`, `"path": "/"`, `"priority": 110`
  - [x] 1.2 Create `plugins/customers/index.html`
    - Copy verbatim from `plugins/warehouse/index.html`
    - Change `<title>Warehouse Plugin</title>` → `<title>Customers Plugin</title>`
    - Keep SDK script tag: `<script src="http://localhost:8080/assets/plugin-sdk.js"></script>`
    - Keep stylesheet link: `<link rel="stylesheet" href="http://localhost:8080/assets/plugin-ui.css" />`
    - Keep `<div id="root"></div>` and `<script type="module" src="/src/main.tsx"></script>`
  - [x] 1.3 Create `plugins/customers/package.json`
    - Copy verbatim from `plugins/warehouse/package.json`
    - Change `"name": "warehouse-plugin"` → `"customers-plugin"`
    - Keep all dependency versions identical (react ^19.2.4, react-dom ^19.2.4, react-router-dom ^7.13.2)
    - Keep all devDependency versions identical (@types/react, @types/react-dom, @vitejs/plugin-react, typescript, vite)
    - No test dependencies added (tests are out of scope)
  - [x] 1.4 Create `plugins/customers/vite.config.ts`
    - Copy from `plugins/warehouse/vite.config.ts`
    - Change `port: 3001` → `port: 3011`
    - Keep `strictPort: true`
  - [x] 1.5 Create `plugins/customers/tsconfig.json`
    - Copy verbatim from `plugins/warehouse/tsconfig.json`
    - All compiler options are identical: `target: "ES2023"`, `strict: true`, `noUnusedLocals: true`,
      `noUnusedParameters: true`, `jsx: "react-jsx"`, `include: ["src"]`
  - [x] 1.6 Create `plugins/customers/src/main.tsx`
    - Copy structure from `plugins/warehouse/src/main.tsx`
    - Remove all warehouse-specific imports and routes
    - Single import: `import { CustomersPage } from "./pages/CustomersPage"`
    - Single route: `<Route path="/" element={<CustomersPage />} />`
    - Keep StrictMode, BrowserRouter, Routes wrapper identical to warehouse
  - [x] 1.7 Verify scaffold compiles without errors
    - Run `npm install` in `plugins/customers/`
    - Run `npx tsc --noEmit` — expect errors only about missing `CustomersPage` and `domain.ts`
      (those files do not exist yet; the scaffold itself must be error-free once they exist)

**Acceptance Criteria:**
- All 6 scaffold files exist at the correct paths
- `manifest.json` has exactly one extension point of type `menu.main` with priority 110, port 3011, icon "users"
- `index.html` title is "Customers Plugin", SDK and CSS links point to localhost:8080
- `package.json` name is "customers-plugin" with identical dependency versions to warehouse
- `vite.config.ts` uses port 3011 with strictPort: true
- `tsconfig.json` is byte-for-byte identical to warehouse version
- `src/main.tsx` has a single route path="/" pointing to CustomersPage

---

### Task Group 2: Domain Layer (`src/domain.ts`)
**Dependencies:** Group 1
**Estimated Steps:** 4

Create the Customer interface and `toCustomer` mapper. This file is entirely
self-contained — it only depends on the shared `plugins/sdk.ts` PluginObject type.

- [x] 2.0 Complete domain layer
  - [x] 2.1 Create `plugins/customers/src/domain.ts`
    - Import: `import type { PluginObject } from "../../sdk"`
    - Export `Customer` interface with these exact fields and types:
      ```
      objectId:    string  (SDK identity — not from data, from obj.objectId)
      firstName:   string  (Personal Data — required)
      lastName:    string  (Personal Data — required)
      email:       string  (Personal Data — optional, defaults to "")
      phone:       string  (Personal Data — optional, defaults to "")
      companyName: string  (Company Data — optional, defaults to "")
      taxId:       string  (Company Data — optional, defaults to "")
      website:     string  (Company Data — optional, defaults to "")
      street:      string  (Address Data — optional, defaults to "")
      city:        string  (Address Data — optional, defaults to "")
      postalCode:  string  (Address Data — optional, defaults to "")
      country:     string  (Address Data — optional, defaults to "")
      ```
    - Export `toCustomer(obj: PluginObject): Customer` mapper:
      - `objectId` maps from `obj.objectId` directly
      - All other fields use `(obj.data.fieldName as string) ?? ""` to handle absent optional fields safely
      - No `any` types; no non-null assertions beyond the pattern above
  - [x] 2.2 Verify TypeScript strict-mode compliance for domain.ts
    - Run `npx tsc --noEmit` in `plugins/customers/` after adding domain.ts
    - Expect errors only about missing CustomersPage (not about domain.ts itself)
  - [x] 2.3 Verify `toCustomer` maps all 11 domain fields correctly
    - Manually trace: given a PluginObject with `objectId: "abc"` and `data: { firstName: "Jan" }`,
      `toCustomer` must return `objectId: "abc"`, `firstName: "Jan"`, `lastName: ""`, all others `""`
    - This is a mental walkthrough — no test file is written

**Acceptance Criteria:**
- `src/domain.ts` exports exactly one interface (`Customer`) and one function (`toCustomer`)
- `Customer` has 12 fields: `objectId` + 11 domain fields across 3 groups
- `toCustomer` uses `(obj.data.field as string) ?? ""` for all optional fields — no `as any`
- File compiles under `strict: true` with zero TypeScript errors

---

### Task Group 3: CRUD Page (`src/pages/CustomersPage.tsx`)
**Dependencies:** Groups 1 and 2
**Estimated Steps:** 7

Implement the full CRUD UI. This is the largest and most complex file. Follow the
WarehousePage pattern (useCallback load function referenced in useEffect, async handlers
with void prefix, error cleared before each SDK call). The form section is conditionally
rendered below the table — one form instance shared for create and edit.

- [x] 3.0 Complete CRUD page
  - [x] 3.1 Scaffold state and load function
    - Import: `import { useEffect, useState, useCallback } from "react"`
    - Import: `import { getSDK } from "../../../sdk"` and `import type { PluginObject } from "../../../sdk"`
    - Import: `import { toCustomer } from "../domain"` and `import type { Customer } from "../domain"`
    - Declare all state variables (mirrors the spec's "State Model" section exactly):
      - `customers: Customer[]` — initialized to `[]`
      - `search: string` — initialized to `""`
      - `loading: boolean` — initialized to `true`
      - `error: string | null` — initialized to `null`
      - `editingCustomer: Customer | null` — initialized to `null`
      - `showForm: boolean` — initialized to `false`
      - 11 form field states: `firstName`, `lastName`, `email`, `phone`, `companyName`, `taxId`,
        `website`, `street`, `city`, `postalCode`, `country` — all `string`, all initialized to `""`
    - Implement `loadCustomers` as a `useCallback` with empty dependency array:
      - Calls `sdk.thisPlugin.objects.list("customer")`
      - Maps results with `.map(toCustomer)`
      - Sets `customers` state
      - Catches errors with `err instanceof Error ? err.message : "Failed to load customers"`
    - Implement `useEffect` that calls `loadCustomers()` and sets `loading = false` in `.finally()`
      — mirrors the warehouse `Promise.all([...]).finally(() => setLoading(false))` pattern
      (single call here, not Promise.all since there is only one SDK call on mount)
  - [x] 3.2 Implement helper: `clearForm()`
    - A plain function (not useCallback) that resets all 11 form field states to `""`
    - Called by Cancel, New Customer click, and after successful save
  - [x] 3.3 Implement `handleNewCustomer`, `handleEdit`, `handleCancel`
    - `handleNewCustomer`: sets `showForm = true`, `editingCustomer = null`, calls `clearForm()`
    - `handleEdit(customer: Customer)`: sets `showForm = true`, `editingCustomer = customer`,
      populates all 11 form field states from the customer object
    - `handleCancel`: sets `showForm = false`, `editingCustomer = null`, calls `clearForm()`
    - All three are synchronous — no SDK calls, no async
  - [x] 3.4 Implement `handleSave` (async)
    - Guard: `if (!firstName.trim() || !lastName.trim()) return` — no SDK call made
    - Clear error: `setError(null)`
    - Determine objectId: `editingCustomer ? editingCustomer.objectId : crypto.randomUUID()`
    - Build data object with all 11 fields: `{ firstName, lastName, email, phone, companyName, taxId, website, street, city, postalCode, country }`
    - Call `sdk.thisPlugin.objects.save("customer", objectId, data)`
    - On success: call `await loadCustomers()`, then call `handleCancel()` to close form
    - Catch: `setError(err instanceof Error ? err.message : "Failed to save customer")`
  - [x] 3.5 Implement `handleDelete(objectId: string)` (async)
    - Clear error: `setError(null)`
    - Call `sdk.thisPlugin.objects.delete("customer", objectId)`
    - On success: call `await loadCustomers()`
    - Catch: `setError(err instanceof Error ? err.message : "Failed to delete customer")`
  - [x] 3.6 Implement render: loading state, error, search bar, action bar, table, form
    - Loading state (early return): `if (loading) return <p>Loading...</p>`
    - Root div: `className="tc-plugin"` with `style={{ padding: "1rem", maxWidth: 900 }}`
    - Page title: `<h1>Customers</h1>`
    - Error paragraph (conditional): `{error && <p className="tc-error">{error}</p>}` — renders above table
    - Action bar (tc-flex): search input + "New Customer" button
      - Search input: `className="tc-input"`, `placeholder="Search by name or email..."`,
        `value={search}`, `onChange={(e) => setSearch(e.target.value)}`
      - New Customer button: `className="tc-primary-button"`, `onClick={() => handleNewCustomer()}`
    - Derived filtered list (no separate state — computed inline):
      ```
      const filtered = customers.filter(c =>
        [c.firstName, c.lastName, c.email]
          .some(f => f.toLowerCase().includes(search.toLowerCase()))
      )
      ```
    - Table section (`<section className="tc-section">`):
      - Empty state: `{filtered.length === 0 && !showForm && <p>No customers found.</p>}`
      - Table: `className="tc-table"` with columns: Name, Email, Company, City, Actions
        - Name column: `{c.firstName} {c.lastName}`
        - Actions column: Edit button (`tc-ghost-button`) + Delete button
          (`tc-ghost-button tc-ghost-button--danger`)
        - All onClick handlers use void prefix:
          `onClick={() => handleEdit(c)}` (sync, no void needed)
          `onClick={() => void handleDelete(c.objectId)}`
    - Form section (conditional on `showForm`):
      - Outer wrapper: `<div className="tc-card" style={{ marginTop: "1rem" }}>`
      - Form title: `<h2>{editingCustomer ? "Edit Customer" : "New Customer"}</h2>`
      - Three grouped `<section className="tc-section">` sub-sections, each with `<h3>`:
        - "Personal Data": firstName (required), lastName (required), email, phone inputs
        - "Company Data": companyName, taxId, website inputs
        - "Address Data": street, city, postalCode, country inputs
      - All inputs: `className="tc-input"`, appropriate placeholder, value + onChange
      - Button row (tc-flex):
        - Save: `className="tc-primary-button"`, `onClick={() => void handleSave()}`
        - Cancel: `className="tc-ghost-button"`, `onClick={() => handleCancel()}`
  - [x] 3.7 Verify full TypeScript compilation passes
    - Run `npx tsc --noEmit` in `plugins/customers/`
    - Zero errors expected
    - If errors: fix before marking step complete — common issues:
      - `noUnusedLocals` flagging imported types — ensure all imports are used
      - `noUnusedParameters` — check handler signatures
      - Missing `void` on async onClick handlers

**Acceptance Criteria:**
- `src/pages/CustomersPage.tsx` compiles under `strict: true` with zero TypeScript errors
- Loading state returns early with `<p>Loading...</p>`
- Error renders as `<p className="tc-error">` above the table when non-null
- "New Customer" click shows form; form title shows "New Customer"
- "Edit" click shows form pre-filled; form title shows "Edit Customer"
- "Cancel" hides form and clears all field state
- Save with blank firstName or lastName does not call SDK (guard returns early)
- Save with valid data calls `objects.save` and reloads the list
- Delete calls `objects.delete` and reloads the list
- Search filters by firstName, lastName, email in real time (case-insensitive)
- No custom CSS file exists; only tc-* classes used for UI (inline style only on root div)
- All 12 acceptance criteria from the specification are satisfied

---

## Execution Order

1. Group 1: Plugin Scaffold (7 steps) — no dependencies
2. Group 2: Domain Layer (4 steps) — depends on Group 1 (needs tsconfig and package.json for tsc)
3. Group 3: CRUD Page (7 steps) — depends on Groups 1 and 2

## Standards Compliance

Follow standards from `.maister/docs/standards/`:

- `global/minimal-implementation.md` — No utility files, no custom hooks, no shared component library.
  Two files (domain.ts + CustomersPage.tsx) mirror the established warehouse two-file pattern exactly.
  Every function has an immediate caller.
- `global/error-handling.md` — All SDK calls (list, save, delete) wrapped in try/catch.
  Error set via `err instanceof Error ? err.message : "Failed to ..."`. Displayed via `tc-error`.
  Error cleared to null before each SDK call so stale errors do not persist.
- `global/coding-style.md` — TypeScript strict mode throughout. Descriptive handler names:
  `handleSave`, `handleDelete`, `handleEdit`, `handleCancel`, `handleNewCustomer`, `loadCustomers`.
  No abbreviations.
- `frontend/components.md` — Single responsibility: `CustomersPage` owns all CRUD state;
  `domain.ts` owns type mapping only.
- `frontend/css.md` — Use only host `tc-*` classes from `plugin-ui.css`. No custom stylesheet.
  Inline `style` only for layout concerns (padding, maxWidth, marginTop) not covered by shared classes.
- `global/conventions.md` — Import conventions from `plugins/CLAUDE.md` followed exactly:
  `getSDK` and `PluginObject` from `"../../../sdk"`, domain types from `"../domain"`.

## Notes

- Tests are explicitly out of scope per spec section "Testing Approach".
  A test task can be created as a follow-up.
- Run TypeScript compiler (`npx tsc --noEmit`) at the end of Groups 1, 2, and 3 as the
  verification gate — this replaces test execution for this task.
- Mark Progress: Check off steps as completed.
- Reuse First: All 6 scaffold files are direct copies or minimal adaptations of warehouse equivalents.
  CustomersPage.tsx uses warehouse CRUD patterns (useCallback, void prefix, clearError before SDK call).
- After completing all groups, register the plugin with the host:
  `curl -X PUT http://localhost:8080/api/plugins/customers/manifest -H "Content-Type: application/json" -d @manifest.json`
  (run from `plugins/customers/` directory)
