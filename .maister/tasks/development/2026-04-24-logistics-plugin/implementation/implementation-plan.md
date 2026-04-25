# Implementation Plan: Logistics Plugin

## Overview

Total Steps: 24
Task Groups: 4
Expected Tests: 16–28

---

## Implementation Steps

### Task Group 1: Project Scaffold
**Dependencies:** None
**Estimated Steps:** 6

- [x] 1.0 Complete project scaffold
  - [x] 1.1 Write 2 smoke tests for the entry point
    - Test that `LogisticsPage` renders without crashing (renders inside MemoryRouter)
    - Test that `src/main.tsx` routes `/` to `LogisticsPage` (route resolution smoke)
    - Mock `getSDK()` via `vi.mock("../../../sdk")` returning an objects stub
    - Place test file at `src/test/main.test.tsx`
  - [x] 1.2 Create `plugins/logistics/package.json`
    - Name: `"logistics-plugin"`, port via `dev` script, same React 19 + react-router-dom versions as warehouse
    - Add test devDependencies: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
    - Add `"test": "vitest run"` script
    - Reuse: warehouse `package.json` structure with name + test deps added
  - [x] 1.3 Create `plugins/logistics/tsconfig.json`
    - Reuse: warehouse `tsconfig.json` verbatim (same compiler options)
  - [x] 1.4 Create `plugins/logistics/vite.config.ts`
    - Port `3010`, `strictPort: true`
    - Reuse: warehouse `vite.config.ts` with port changed
    - Add vitest config block: `environment: "jsdom"`, `globals: true`, `setupFiles: ["./src/test/setup.ts"]`
  - [x] 1.5 Create `plugins/logistics/index.html`
    - Load `http://localhost:8080/assets/plugin-sdk.js` in `<head>`
    - Load `http://localhost:8080/assets/plugin-ui.css` in `<head>`
    - Title: `Logistyka`
    - Reuse: warehouse `index.html` with title changed
  - [x] 1.6 Create `plugins/logistics/src/test/setup.ts`
    - Import `@testing-library/jest-dom` for extended matchers
  - [x] 1.7 Create `plugins/logistics/manifest.json`
    - Plugin ID: `"logistics"`, URL: `"http://localhost:3010"`
    - Three extension points as defined in spec:
      - `menu.main` — label: `"Logistyka"`, path: `"/"`, priority: 110, icon: `"truck"`
      - `product.detail.tabs` — label: `"Dostawa"`, path: `"/product-delivery"`, priority: 55
      - `product.detail.info` — label: `"Dostawa"`, path: `"/product-delivery-info"`, priority: 15
  - [x] 1.8 Create `plugins/logistics/src/main.tsx`
    - Three routes: `"/" → <LogisticsPage>`, `"/product-delivery" → <ProductDeliveryTab>`, `"/product-delivery-info" → <ProductDeliveryInfoBadge>`
    - Reuse: warehouse `main.tsx` routing pattern
  - [x] 1.9 Ensure Group 1 tests pass
    - Run ONLY `src/test/main.test.tsx`
    - Both smoke tests green

**Acceptance Criteria:**
- The 2 smoke tests pass
- `npm run dev` starts on port 3010 without error (manual check)
- `manifest.json` registers all three extension points

---

### Task Group 2: Domain Layer + LogisticsPage
**Dependencies:** Group 1
**Estimated Steps:** 7

- [x] 2.0 Complete domain layer and CRUD page
  - [x] 2.1 Write 5 focused tests for `LogisticsPage`
  - [x] 2.2 Create `plugins/logistics/src/domain.ts`
  - [x] 2.3 Create `plugins/logistics/src/pages/LogisticsPage.tsx`
  - [x] 2.4 Ensure Group 2 tests pass — 5/5 green

**Acceptance Criteria:**
- All 5 tests pass
- `domain.ts` has exactly 2 interfaces and 1 mapper — no extra helpers
- Error and loading states render without crashing

---

### Task Group 3: ProductDeliveryTab
**Dependencies:** Group 2
**Estimated Steps:** 6

- [x] 3.0 Complete product delivery tab
  - [x] 3.1 Write 4 focused tests for `ProductDeliveryTab` — 4/4 green
    - `renders_error_whenNoProductId`: when `productId` is absent, shows error message instead of list
    - `renders_onlyEnabledMethods_asCheckboxes`: renders checkboxes only for methods where `enabled === true`; disabled-globally methods not shown
    - `handleToggle_addsUUID_toDisabledMethods_andCallsSetData`: unchecking a checkbox calls `setData(productId, { disabledMethods: [uuid] })`
    - `handleReset_callsRemoveData_andClearsState`: clicking "Włącz wszystkie" calls `removeData(productId)` and all checkboxes become checked
    - Mock both `objects.list("delivery-method")` and `getData(productId)` in the SDK mock
    - Place test file at `src/test/ProductDeliveryTab.test.tsx`
  - [x] 3.2 Create `plugins/logistics/src/pages/ProductDeliveryTab.tsx`
    - Read `productId` from `sdk.thisPlugin.productId ?? ""`
    - Guard: if `!productId`, render `<div className="tc-plugin"><p className="tc-error">Brak kontekstu produktu.</p></div>` and return
    - State: `methods: DeliveryMethod[]`, `disabledMethods: string[]`, `loading`, `error`
    - `useEffect` loads both in parallel: `objects.list("delivery-method")` mapped with `toDeliveryMethod`, and `getData(productId)` cast to `ProductDeliveryData | null`
    - Filter active methods for rendering: `methods.filter(m => m.enabled)`
    - `handleToggle(methodId: string, currentlyEnabled: boolean)`:
      - If `currentlyEnabled` (checkbox was checked → now unchecking): append `methodId` to `disabledMethods`
      - If not `currentlyEnabled` (checkbox was unchecked → now checking): remove `methodId` from `disabledMethods`
      - Build complete updated array, call `setData(productId, { disabledMethods: updatedArray })` — full overwrite
    - `handleReset()`: call `removeData(productId)`, set `disabledMethods` to `[]`
    - All SDK calls in try/catch; errors via `tc-error`
    - `void` all floating promises in JSX onClick
    - Early return `<div className="tc-plugin" style={{ padding: "1rem" }}>Loading...</div>` when loading
    - Reuse: box-size tab `getData`/`setData`/`removeData` lifecycle pattern
  - [x] 3.3 Ensure Group 3 tests pass — 4/4 green

**Acceptance Criteria:**
- All 4 tests pass
- Missing `productId` renders error not crash
- `setData` is always called with the complete `disabledMethods` array (never partial)
- "Włącz wszystkie" calls `removeData` and resets all checkboxes to checked

---

### Task Group 4: ProductDeliveryInfoBadge
**Dependencies:** Group 3
**Estimated Steps:** 5

- [x] 4.0 Complete the delivery info badge
  - [x] 4.1 Write 4 focused tests for `ProductDeliveryInfoBadge` — 4/4 green
    - `returns_null_whenNoProductId`: renders nothing when `productId` is absent
    - `returns_null_whenNoActiveMethods`: renders nothing when all methods have `enabled === false`
    - `renders_successBadge_whenAllMethodsAvailable`: renders `"3/3 metod dostępnych"` with `tc-badge--success` when `disabledMethods` is empty
    - `renders_dangerBadge_whenSomeMethodsDisabled`: renders `"2/3 metod dostępnych"` with `tc-badge--danger` when one UUID is in `disabledMethods`
    - (4 assertions, staying within the 2–8 test budget)
    - Place test file at `src/test/ProductDeliveryInfoBadge.test.tsx`
  - [x] 4.2 Create `plugins/logistics/src/pages/ProductDeliveryInfoBadge.tsx`
    - Read `productId` from `sdk.thisPlugin.productId ?? ""`
    - State: `label: string | null`, `badgeClass: string`, `loading`
    - Guard in `useEffect`: if `!productId`, set `loading = false` and return (renders null)
    - Load in `useEffect`: parallel `objects.list("delivery-method")` + `getData(productId)`
    - Compute:
      - `activeMethods` = methods filtered by `enabled === true`
      - If `activeMethods.length === 0`, keep `label = null` (renders nothing)
      - `disabledForProduct` = UUIDs in `getData` result that are also in `activeMethods` map
      - `available` = `activeMethods.length - disabledForProduct.length`
      - `total` = `activeMethods.length`
      - `label` = `"${available}/${total} metod dostępnych"`
      - `badgeClass` = `available === total ? "tc-badge--success" : "tc-badge--danger"`
    - Render: `if (loading || !label) return null`
    - Return: `<span className={\`tc-badge ${badgeClass}\`}>{label}</span>`
    - Reuse: box-size badge `useEffect` load + null-on-no-data pattern
  - [x] 4.3 Ensure Group 4 tests pass — 4/4 green

**Acceptance Criteria:**
- All 4 tests pass
- Badge returns null when `productId` absent or zero active methods
- Badge color is `tc-badge--success` only when `available === total`

---

### Task Group 5: Test Review & Gap Analysis
**Dependencies:** All previous groups (1, 2, 3, 4)
**Estimated Steps:** 4

- [x] 5.0 Review and fill critical gaps
  - [x] 5.1 Review all tests — vi.resetAllMocks() present, mocks correct, waitFor used
  - [x] 5.2 Gap analysis — error states and empty-name guard confirmed covered
  - [x] 5.3 Gap tests present: showsError_whenSDKThrows (×2), doesNotSave_whenNameEmpty (×2)
  - [x] 5.4 All 19 tests pass — `npm test` green

**Acceptance Criteria:**
- All logistics plugin tests pass (~16–22 total)
- No more than 8 additional tests added in this group
- Zero tests rely on implementation details (no spying on internal state)

---

## Execution Order

1. Group 1: Project Scaffold (9 steps, no dependencies)
2. Group 2: Domain Layer + LogisticsPage (4 steps, depends on 1)
3. Group 3: ProductDeliveryTab (3 steps, depends on 2)
4. Group 4: ProductDeliveryInfoBadge (3 steps, depends on 3)
5. Group 5: Test Review & Gap Analysis (4 steps, depends on 1–4)

---

## Standards Compliance

Follow standards from `.maister/docs/standards/`:

- `global/minimal-implementation.md` — No speculative helpers; every function in `domain.ts` must have a direct caller. Delete any exploration artifacts after implementation.
- `global/coding-style.md` — Handler naming: `handleAdd`, `handleToggle`, `handleDelete`, `handleReset`. No dead code or unused imports.
- `global/error-handling.md` — All SDK calls in try/catch. Errors surfaced via `tc-error`-classed element. Never swallow silently.
- `global/commenting.md` — No change-log comments. Comment only non-obvious logic (e.g., the full-overwrite constraint on `setData`).
- `testing/frontend-testing.md` — Vitest + jsdom, `@testing-library/react`, per-file `renderWithProviders`, `vi.mock()` factory pattern, `vi.resetAllMocks()` in `beforeEach`.
- `plugins/CLAUDE.md` — `tc-plugin` root wrapper on all components; no redefining host CSS classes inline; SDK import always from `../../sdk`; `void` all floating promises.

---

## Notes

- Test-Driven: Each group starts with 2–5 tests before any implementation
- Run Incrementally: Only the new group's test file after each group — do NOT run `npm test` from the repo root
- Mark Progress: Check off steps as completed in this file
- Reuse First: All project files copy from warehouse/box-size; domain types follow warehouse `domain.ts` shape; tab lifecycle follows box-size `ProductBoxTab`; badge lifecycle follows `ProductBoxBadge`
- Full Overwrite Constraint: `setData(productId, { disabledMethods })` must always receive the complete array — document this with a one-line comment in `ProductDeliveryTab.tsx`
- Install deps once: `cd plugins/logistics && npm install` before running any tests
