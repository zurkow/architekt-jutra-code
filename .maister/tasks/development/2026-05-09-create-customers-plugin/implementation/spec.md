# Specification: Customers Plugin

## Goal

Create a standalone frontend-only plugin at `plugins/customers/` that gives the sales and admin team a full CRUD directory of business clients, registered via the `menu.main` extension point and running on port 3011.

## User Stories

- As a sales team member, I want to browse the full client list in one place so I can quickly look up contact and company details.
- As an admin, I want to add new customers with personal, company, and address data so records are captured at onboarding.
- As a sales team member, I want to edit an existing customer's details so records stay accurate over time.
- As an admin, I want to delete a customer record so outdated entries do not clutter the list.
- As a sales team member, I want to search by name or email so I can find a specific client without scrolling.

## Core Requirements

1. (FR-1) Display all customers in a `tc-table` with columns: Name (firstName + lastName combined), Email, Company, City, Actions — loaded via `sdk.thisPlugin.objects.list("customer")` on mount; show loading state while fetching and empty state when zero records exist.
2. (FR-2) Provide a text search input above the table that filters rows client-side by firstName, lastName, and email (case-insensitive); filter applies in real-time as the user types.
3. (FR-3) "New Customer" button above the table; clicking it reveals a form section below the table with fields grouped into Personal Data, Company Data, and Address Data sections; firstName and lastName are required, all other fields optional; save via `sdk.thisPlugin.objects.save("customer", crypto.randomUUID(), data)`; Cancel hides the form without saving.
4. (FR-4) "Edit" button per table row; clicking it reveals the same form section pre-filled with that customer's data; save via `sdk.thisPlugin.objects.save("customer", existingObjectId, data)` (upsert semantics); Cancel hides the form.
5. (FR-5) "Delete" button per table row; no confirmation dialog; delete via `sdk.thisPlugin.objects.delete("customer", objectId)`; the row is removed from the list after successful deletion.
6. (FR-6) All SDK calls wrapped in try/catch; display a `tc-error` message on any failure.

## Visual Design

No mockups provided. Lay out the page following the warehouse plugin visual pattern: page title at top, search + action bar below it, customer table, then the create/edit form section conditionally rendered below the table. Use only `tc-*` host CSS classes for all UI elements — no custom CSS files, no inline style for standard UI concerns (only inline `style` for layout padding/max-width as warehouse does).

## Reusable Components

### Existing Code to Leverage

| Asset | Location | How to Reuse |
|---|---|---|
| Plugin manifest structure | `plugins/warehouse/manifest.json` | Copy and change name, url (port 3011), description, extensionPoints (menu.main only) |
| index.html shell | `plugins/warehouse/index.html` | Copy verbatim, change `<title>` to "Customers Plugin" |
| package.json | `plugins/warehouse/package.json` | Copy verbatim, change `"name"` to `"customers-plugin"` |
| tsconfig.json | `plugins/warehouse/tsconfig.json` | Copy verbatim — settings are identical across plugins |
| vite.config.ts | `plugins/warehouse/vite.config.ts` | Copy, change port to 3011 |
| main.tsx router pattern | `plugins/warehouse/src/main.tsx` | Copy structure; replace all route/page references with single `<Route path="/" element={<CustomersPage />} />` |
| domain.ts mapper pattern | `plugins/warehouse/src/domain.ts` | Use as structural template — see "New Components Required" for Customer-specific interface |
| CRUD page pattern (state, useCallback, useEffect, handlers) | `plugins/warehouse/src/pages/WarehousePage.tsx` | Use as structural template — adapt state shape, form fields, table columns |
| Shared SDK types | `plugins/sdk.ts` | Import `getSDK` and `PluginObject` exactly as warehouse does; never copy or redefine |
| tc-* CSS classes | host `plugin-ui.css` (loaded via index.html) | tc-plugin, tc-section, tc-flex, tc-table, tc-input, tc-primary-button, tc-ghost-button, tc-ghost-button--danger, tc-error, tc-card |

### New Components Required

| File | Justification |
|---|---|
| `src/domain.ts` — `Customer` interface and `toCustomer` mapper | Customer has 9 domain fields across 3 groups; warehouse domain types cannot be reused (different shape) |
| `src/pages/CustomersPage.tsx` | Customer-specific state (9-field form, 3 grouped sections, search filter state); warehouse page cannot be reused directly |

No additional abstractions are needed. The two-file domain + page pattern matches the warehouse plugin exactly. No shared component library, no custom hooks file, no utility modules.

## Technical Approach

### Plugin Registration

The plugin registers itself via `PUT /api/plugins/customers/manifest` using the `manifest.json` at the plugin root. The `pluginId` in the URL path is `customers`. The host reads the manifest and adds the "Customers" item to the sidebar via the `menu.main` extension point.

### Data Storage

Customer records are stored as plugin objects in the host's `plugin_objects` table under `objectType = "customer"`. No entity binding is needed (customers are not tied to products or categories). The `objectId` is a `crypto.randomUUID()` on create and the pre-existing objectId on update. The `data` field holds all 9 customer fields as a flat `Record<string, unknown>`.

### State Model

`CustomersPage` manages these state variables:
- `customers: Customer[]` — full list loaded from SDK
- `search: string` — current filter input value
- `loading: boolean` — true while initial fetch is in flight
- `error: string | null` — last error message
- `editingCustomer: Customer | null` — non-null when editing an existing record
- `showForm: boolean` — true when the form section is visible (create or edit)
- Form field state: one `useState` per field (firstName, lastName, email, phone, companyName, taxId, website, street, city, postalCode, country)

### Form UX Flow

- "New Customer" sets `showForm = true`, `editingCustomer = null`, clears all field state.
- "Edit" on a row sets `showForm = true`, `editingCustomer = customer`, populates all field state from that customer.
- "Cancel" sets `showForm = false`, `editingCustomer = null`, clears field state.
- "Save" validates firstName and lastName are non-empty, calls SDK save, reloads the list, then closes the form.
- Only one form instance exists in the DOM; it is conditionally rendered, not toggled per-row.

### Search / Filter

The displayed rows are derived by filtering `customers` against `search` on every render — no separate filtered state array. Comparison: `field.toLowerCase().includes(search.toLowerCase())`. The filter checks `firstName`, `lastName`, and `email`.

### Error Handling

Each async handler clears `error` to null before the SDK call, then sets `error` in the catch block using `err instanceof Error ? err.message : "Failed to ..."`. The `tc-error` paragraph renders above the table when `error` is non-null.

### Import Conventions

Follow the pattern established in `plugins/CLAUDE.md` without deviation:

```
import { getSDK } from "../../../sdk";
import type { PluginObject } from "../../../sdk";
import { toCustomer } from "../domain";
import type { Customer } from "../domain";
```

## File Structure to Create

```
plugins/customers/
  manifest.json          — plugin identity, port 3011, menu.main only
  index.html             — loads plugin-sdk.js + plugin-ui.css from host
  package.json           — name: customers-plugin, same deps as warehouse
  vite.config.ts         — port 3011, strictPort: true
  tsconfig.json          — identical to warehouse tsconfig
  src/
    main.tsx             — StrictMode + BrowserRouter, single Route path="/"
    domain.ts            — Customer interface + toCustomer(PluginObject) mapper
    pages/
      CustomersPage.tsx  — full CRUD UI (list, search, create form, edit form, delete)
```

Total: 8 files. Zero files modified outside this directory.

## Data Model

### Customer Interface (`src/domain.ts`)

| Field | Type | Group | Required |
|---|---|---|---|
| objectId | string | (SDK identity) | yes (auto-generated) |
| firstName | string | Personal Data | yes |
| lastName | string | Personal Data | yes |
| email | string | Personal Data | no |
| phone | string | Personal Data | no |
| companyName | string | Company Data | no |
| taxId | string | Company Data | no |
| website | string | Company Data | no |
| street | string | Address Data | no |
| city | string | Address Data | no |
| postalCode | string | Address Data | no |
| country | string | Address Data | no |

`toCustomer(obj: PluginObject): Customer` maps `obj.objectId` and casts all `obj.data.*` fields to string using `(obj.data.field as string) ?? ""` to handle absent optional fields safely.

### Object Persistence

- Object type string: `"customer"` (consistent, lowercase)
- Create: `sdk.thisPlugin.objects.save("customer", crypto.randomUUID(), { firstName, lastName, email, ... })`
- Update: `sdk.thisPlugin.objects.save("customer", customer.objectId, { firstName, lastName, email, ... })`
- Delete: `sdk.thisPlugin.objects.delete("customer", customer.objectId)`
- List: `sdk.thisPlugin.objects.list("customer")`

## Implementation Guidance

### Manifest

`manifest.json` must include only the `menu.main` extension point. Suggested icon: `"users"` (Lucide kebab-case). Priority: 110 (customers appears below Warehouse at 100 in the sidebar). URL: `http://localhost:3011`.

### CSS Rules

- Wrap root div in `className="tc-plugin"` with `style={{ padding: "1rem", maxWidth: 900 }}`
- Search input: `className="tc-input"` with `placeholder="Search by name or email..."`
- "New Customer" button: `className="tc-primary-button"`
- Table: `className="tc-table"`
- "Edit" button: `className="tc-ghost-button"`
- "Delete" button: `className="tc-ghost-button tc-ghost-button--danger"`
- Form section: wrap in `<section className="tc-section">` or `<div className="tc-card">`
- Field groups inside form: each group uses `<section className="tc-section">` with an `<h3>` label
- Form inputs: `className="tc-input"` on every `<input>`
- "Save" in form: `className="tc-primary-button"`
- "Cancel" in form: `className="tc-ghost-button"`
- Error paragraph: `className="tc-error"`

### TypeScript Patterns

- All event handlers that call async functions use the `void` prefix: `onClick={() => void handleSave()}`
- Load function extracted as `useCallback` to be referenced in `useEffect` dependency array (mirrors warehouse pattern)
- Required field validation before SDK call: `if (!firstName.trim() || !lastName.trim()) return;`
- `strict: true` is enforced via tsconfig; no `any` types, no non-null assertions except `document.getElementById("root")!` in main.tsx

### Testing Approach

Tests are out of scope for this task. Acceptance criterion 13 is removed. Tests can be added in a follow-up task.

### Standards Compliance

- **Minimal Implementation** (`standards/global/minimal-implementation.md`): No utility files, no custom hooks, no shared component library beyond what the two-file pattern requires. Every function has an immediate caller.
- **Frontend Components** (`standards/frontend/components.md`): Single responsibility — CustomersPage owns all customer CRUD state; domain.ts owns type mapping only.
- **Frontend CSS** (`standards/frontend/css.md`): Use only host `tc-*` classes; no custom stylesheet; inline style only for layout padding and max-width.
- **Error Handling** (`standards/global/error-handling.md`): All SDK calls wrapped in try/catch; user-visible error message via `tc-error`; no silent swallowing.
- **Coding Style** (`standards/global/coding-style.md`): TypeScript strict mode throughout; descriptive handler names (`handleSave`, `handleDelete`, `handleEdit`, `handleCancel`).

## Out of Scope

- Orders — explicitly excluded; no order fields, no order extension points
- Backend JPA entity or Spring Boot controller — SDK objects API is sufficient
- Product linking — no `entityType`/`entityId` binding needed
- Additional extension points (`product.detail.tabs`, `product.list.filters`, `product.detail.info`)
- Confirmation dialog on delete — consistent with warehouse plugin pattern which also omits it
- Pagination — client-side search is sufficient at this scale
- Custom CSS file — all styling via host `tc-*` classes

## Acceptance Criteria

1. `plugins/customers/` directory is created with all 8 files; no files outside this directory are modified.
2. Plugin registers successfully via `PUT /api/plugins/customers/manifest` and appears in the host sidebar as "Customers".
3. Customer list loads on page mount; loading state visible while fetching.
4. Empty state message displayed when no customers exist.
5. Creating a customer with firstName + lastName saves correctly and the new row appears in the table.
6. Attempting to save with firstName or lastName blank does not call the SDK.
7. Editing a customer pre-fills the form and saves via upsert to the existing objectId.
8. Deleting a customer removes the row immediately after SDK confirmation.
9. Search input filters the visible rows in real-time by name and email.
10. Any SDK failure shows a `tc-error` message; the app remains functional.
11. No custom CSS file exists; no inline style used for standard UI elements (only padding/max-width).
12. TypeScript strict mode compilation passes with zero errors.
