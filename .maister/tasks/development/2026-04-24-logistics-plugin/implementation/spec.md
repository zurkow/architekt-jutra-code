# Specification: Logistics Plugin

## Goal

Create a standalone logistics plugin (Vite + React + TypeScript) at `plugins/logistics/` on port 3010 that manages delivery methods globally and allows per-product disabling of specific methods via a product detail tab and an inline info badge.

## User Stories

- As an admin, I want to add and manage delivery methods (DHL, DPD, InPost, Poczta Polska) globally so I can control which carriers are available in the system.
- As an admin, I want to enable or disable individual delivery methods so I can activate or deactivate carriers without deleting them.
- As an admin, I want to disable specific delivery methods for a given product so I can restrict which carriers are available for that product.
- As an admin, I want a "Włącz wszystkie" button on the product delivery tab so I can reset per-product restrictions with one click.
- As an admin, I want a compact delivery availability badge below a product's detail card so I can see at a glance how many delivery methods are available for that product.

## Core Requirements

1. Display a table of all delivery methods with columns: Name | Status badge | Actions (toggle + delete).
2. Status badge uses `tc-badge--success` for active methods and `tc-badge--danger` for inactive ones.
3. An add form with a single "Nazwa" input and "Dodaj" button creates a new delivery method (UUID objectId, `enabled: true` by default).
4. A toggle button per table row calls `objects.save` to flip the `enabled` flag.
5. A delete button per table row calls `objects.delete` to remove the method.
6. Empty state renders: "Brak metod dostawy. Dodaj pierwszą metodę."
7. All views handle loading and error states — loading returns an early render, errors display via `tc-error` class.
8. The product detail tab (`ProductDeliveryTab`) loads all delivery methods via `objects.list("delivery-method")` and per-product disabled methods via `getData(productId)`.
9. The tab renders a checkbox list of **globally active methods only** (filter by `enabled: true`). Unchecking a method adds its UUID to `disabledMethods`; checking it removes the UUID.
10. Every checkbox change calls `setData(productId, { disabledMethods: [...] })` with the complete updated array (full overwrite — never partial).
11. A "Włącz wszystkie" button calls `removeData(productId)` and clears local `disabledMethods` state.
12. If no `productId` is present in context, the tab shows an error message instead of the list.
13. The info badge (`ProductDeliveryInfoBadge`) loads both the global methods list and per-product data, then renders `"X/Y metod dostępnych"`.
14. Badge color: `tc-badge--success` when all active methods are available for the product; `tc-badge--danger` when one or more active methods are disabled for the product.
15. The badge returns `null` when `productId` is absent or when no delivery methods have `enabled: true` globally (active count = 0).

## Reusable Components

### Existing Code to Leverage

| Asset | Path | Usage |
|-------|------|-------|
| Shared SDK types and `getSDK()` helper | `plugins/sdk.ts` | Import `getSDK`, `PluginObject`, `PluginSDKType` — never copy into plugin |
| CRUD page pattern (state, handlers, table, form) | `plugins/warehouse/src/pages/WarehousePage.tsx` | Direct structural template for `LogisticsPage` — same `objects.list/save/delete` lifecycle, same empty-state / error / loading pattern |
| Domain interface + mapper pattern | `plugins/warehouse/src/domain.ts` | Template for `domain.ts` — defines the `interface + toX(obj: PluginObject)` shape |
| `getData/setData/removeData` pattern | `plugins/box-size/src/pages/ProductBoxTab.tsx` | Template for `ProductDeliveryTab` loading, saving, and reset flow |
| Compact info badge pattern | `plugins/box-size/src/pages/ProductBoxBadge.tsx` | Template for `ProductDeliveryInfoBadge` — `useEffect` load, null-on-no-data return, single `tc-badge` render |
| Vite config (port + strictPort) | `plugins/warehouse/vite.config.ts` | Copy with `port: 3010` |
| Project files (index.html, package.json, tsconfig.json) | `plugins/warehouse/` root | Copy with name/title changes — structure is identical |
| Host UI stylesheet classes | `plugin-ui.css` (host-served) | `tc-plugin`, `tc-table`, `tc-primary-button`, `tc-ghost-button--danger`, `tc-badge--success/danger`, `tc-error`, `tc-input`, `tc-flex`, `tc-section` |

### New Components Required

| Component | Why new code is needed |
|-----------|----------------------|
| `src/domain.ts` (`DeliveryMethod`, `ProductDeliveryData`, `toDeliveryMethod`) | Domain types are plugin-specific; no existing plugin has a delivery-method entity. The shape (`name`, `enabled`, `disabledMethods`) is unique to this plugin. |
| `src/pages/LogisticsPage.tsx` | Warehouse page manages warehouses + stock (two object types, product selector, quantity inputs). Logistics page manages a single object type with a boolean toggle — close enough to template from but sufficiently different to be a new file. |
| `src/pages/ProductDeliveryTab.tsx` | Box-size tab manages numeric form fields with validation. This tab renders a checkbox list driven by two async data sources (global methods + per-product data). New component that follows the tab pattern. |
| `src/pages/ProductDeliveryInfoBadge.tsx` | Box-size badge renders a single pre-formatted string. This badge requires computing a ratio from two data sources. New component that follows the badge pattern. |
| `src/main.tsx` | Entry point with 3 routes matching the 3 manifest extension points — specific to this plugin. |
| `manifest.json` | Plugin-specific identity, URL (port 3010), and 3 extension point registrations. |

## Technical Approach

### Plugin Architecture

- Standalone Vite + React 19 + TypeScript app at `plugins/logistics/`, port 3010, `strictPort: true`.
- Plugin SDK loaded via `<script src="http://localhost:8080/assets/plugin-sdk.js">` in `index.html`.
- Host UI CSS loaded via `<link rel="stylesheet" href="http://localhost:8080/assets/plugin-ui.css">` in `index.html`.
- SDK imported exclusively as `import { getSDK } from "../../sdk"` — `plugins/sdk.ts` is shared, never duplicated.
- All component roots wrapped in `<div className="tc-plugin">`.

### Data Flow

- **Global delivery methods**: stored as plugin objects with `objectType = "delivery-method"`, `objectId = UUID`, `data = { name: string, enabled: boolean }`.
- **Per-product restrictions**: stored via `thisPlugin.setData(productId, { disabledMethods: string[] })` where the array contains UUIDs of disabled methods. A product with no restrictions has no data entry (or the entry is removed by `removeData`).
- **Critical constraint**: `setData` is a full overwrite. `ProductDeliveryTab` must always hold the current complete `disabledMethods` array in state and write it entirely on every toggle.

### Routing

Three routes in `main.tsx` map 1:1 to manifest `path` values:

| Path | Component | Extension Point |
|------|-----------|----------------|
| `/` | `LogisticsPage` | `menu.main` |
| `/product-delivery` | `ProductDeliveryTab` | `product.detail.tabs` |
| `/product-delivery-info` | `ProductDeliveryInfoBadge` | `product.detail.info` |

### Manifest Registration

- Plugin ID: `"logistics"`
- URL: `"http://localhost:3010"`
- Registration: `PUT http://localhost:8080/api/plugins/logistics/manifest`
- Three extension points:

| type | label | path | priority | icon |
|------|-------|------|----------|------|
| `menu.main` | Logistyka | `/` | 110 | `truck` |
| `product.detail.tabs` | Dostawa | `/product-delivery` | 55 | — |
| `product.detail.info` | Dostawa | `/product-delivery-info` | 15 | — |

### Badge Calculation

Available count = (total active methods) − (active methods whose UUID is in `disabledMethods`). Total = count of all active methods (enabled = true). Badge is `tc-badge--success` when available count equals total, `tc-badge--danger` otherwise.

## Implementation Guidance

### Testing Approach

- 2–8 focused tests per implementation step group.
- Tests cover: LogisticsPage renders method list, add form creates entry, toggle updates enabled flag, delete removes entry, empty state shown when no methods, ProductDeliveryTab disables/enables per-product, "Włącz wszystkie" resets restrictions, badge displays correct ratio and badge color.
- Mock `getSDK()` at the module level using `vi.mock("../../../sdk")` with `vi.resetAllMocks()` in `beforeEach`.
- Use `renderWithProviders()` per test file wrapping with `MemoryRouter`.
- Test files in `src/test/` directory.
- Run only logistics plugin tests during development — do not run the full suite per change.

### Standards Compliance

- **Minimal Implementation** (`standards/global/minimal-implementation.md`): No speculative methods, no future stubs. Every function in `domain.ts` must have a direct caller in a page component. Delete any helpers created during development that remain uncalled after implementation.
- **Coding Style** (`standards/global/coding-style.md`): Follow warehouse/box-size naming patterns. Descriptive names for handlers (`handleAdd`, `handleToggle`, `handleDelete`, `handleReset`). No dead code or unused imports.
- **Error Handling** (`standards/global/error-handling.md`): All SDK calls wrapped in try/catch. Errors surfaced to user via `tc-error`-classed element. Never swallow errors silently.
- **Frontend Testing** (`standards/testing/frontend-testing.md`): Vitest + jsdom, `@testing-library/react`, per-file `renderWithProviders`, `vi.mock()` factory pattern.
- **Plugin Dev Guide** (`plugins/CLAUDE.md`): Always use `tc-plugin` root wrapper; never redefine host CSS classes inline; only inline `style` for layout (padding, max-width); SDK import always from `../../sdk`; `void` all floating promises in event handlers.

## Out of Scope

- Authentication or role-based access control.
- Delivery pricing, zones, or estimated delivery time fields.
- `product.list.filters` extension point (not requested).
- Import/export of delivery methods.
- Ordering or sorting of delivery methods in the table.
- Edit of a delivery method's name after creation.

## Success Criteria

- Plugin starts on port 3010 (`strictPort: true`) and registers successfully via `PUT /api/plugins/logistics/manifest`.
- LogisticsPage renders the delivery methods table with add, toggle, and delete working against the objects API.
- ProductDeliveryTab loads both global methods and per-product disabled methods and persists changes with a full `disabledMethods` array overwrite.
- "Włącz wszystkie" button calls `removeData` and resets all checkboxes to enabled.
- ProductDeliveryInfoBadge shows `"X/Y metod dostępnych"` with correct count and badge color.
- Badge returns `null` (renders nothing) when `productId` is absent or no active methods exist.
- All three views handle loading and error states without crashing.
- No `sdk.ts` copy exists inside `plugins/logistics/`.
