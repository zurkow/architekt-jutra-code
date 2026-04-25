# Code Review Report

**Date**: 2026-04-23
**Path**: plugins/logistics/src
**Scope**: all
**Status**: Issues Found

## Summary
- **Critical**: 0 issues
- **Warnings**: 5 issues
- **Info**: 6 issues

---

## Critical Issues

None.

---

## Warnings

### W1 — Rules of Hooks violation: early return before useEffect
**Location**: `plugins/logistics/src/pages/ProductDeliveryTab.tsx:15-40`

`ProductDeliveryTab` reads `productId` (line 8), then performs an early return at line 15–21 (rendering an error div when `productId` is falsy), and only after that declares the `useEffect` (line 23). This violates the Rules of Hooks — hooks must be called unconditionally in the same order on every render. React will throw a hook-order warning in development and produce undefined behavior in production.

**Recommendation**: Move the `useEffect` (and all `useState` calls) before any conditional `return`. Guard the async `load()` body with `if (!productId) { setLoading(false); return; }` instead of guarding at the component level.

---

### W2 — `handleToggle` and `handleReset` in ProductDeliveryTab fire-and-forget SDK calls with no error handling
**Location**: `plugins/logistics/src/pages/ProductDeliveryTab.tsx:42-58`

`handleToggle` calls `sdk.thisPlugin.setData(...)` as a bare `void` expression with no try/catch. `handleReset` calls `sdk.thisPlugin.removeData(...)` the same way. If the SDK call fails the UI state has already been updated optimistically (disabledMethods is set before the network call completes for toggle, and cleared synchronously for reset) while the backend remains inconsistent. The user gets no feedback.

**Recommendation**: Wrap both SDK calls in try/catch. Show the existing `tc-error` element on failure. For `handleToggle` consider rolling back the optimistic UI update on error to keep client and server in sync.

---

### W3 — `getSDK()` called at component render time (module scope inside function body) in two components
**Location**: `plugins/logistics/src/pages/ProductDeliveryTab.tsx:7`, `plugins/logistics/src/pages/ProductDeliveryInfoBadge.tsx:11`

Both `ProductDeliveryTab` and `ProductDeliveryInfoBadge` call `getSDK()` at the top level of their render functions (not inside a callback or `useEffect`). `getSDK()` reads `window.PluginSDK` synchronously. If the host SDK script has not yet finished loading when React renders the component (e.g., in tests without the mock set up, or in a very early render pass), this throws a runtime error instead of returning a usable SDK. `LogisticsPage` correctly delays the call to inside async handlers and the `useEffect` body.

**Recommendation**: Either call `getSDK()` inside `useEffect` and callbacks only (as LogisticsPage does), or memoize with `useMemo`/`useRef` so it runs once after mount. This also makes the components easier to test without the SDK being globally available.

---

### W4 — `disabledSet` in ProductDeliveryInfoBadge is built from active method IDs, not disabled method IDs
**Location**: `plugins/logistics/src/pages/ProductDeliveryInfoBadge.tsx:34-36`

```typescript
const disabledSet = new Set(activeMethods.map((m) => m.objectId));
const disabledForProduct = data?.disabledMethods?.filter((id) => disabledSet.has(id)).length ?? 0;
```

The variable is named `disabledSet` but it actually holds the set of **active method IDs**. It is used to filter `data.disabledMethods` by checking whether a disabled-method ID appears in the active-methods set — this filters out stale disabled-method references that no longer correspond to a globally active method. The logic is correct but the naming is actively misleading and contradicts its purpose.

**Recommendation**: Rename to `activeMethodIds` (or `activeMethodIdSet`) to match its actual content and to clarify what the filter is doing.

---

### W5 — Test naming convention inconsistency across test files
**Location**: `plugins/logistics/src/test/LogisticsPage.test.tsx`, `ProductDeliveryTab.test.tsx`, `ProductDeliveryInfoBadge.test.tsx`, `main.test.tsx`

Three test files (`LogisticsPage`, `ProductDeliveryTab`, `ProductDeliveryInfoBadge`) use `snake_case` test names (e.g., `"renders_emptyState_whenNoMethods"`, `"handleToggle_addsUUID_toDisabledMethods_andCallsSetData"`), while `main.test.tsx` uses sentence-style names (`"renders without crashing inside MemoryRouter"`, `"routes / to LogisticsPage"`). The project frontend-testing standard specifies the `action_condition_expectedResult` pattern but does not prescribe separators. The inconsistency between `main.test.tsx` and the other three files creates confusion.

**Recommendation**: Adopt the `action_condition_expectedResult` naming style (with underscore separators as used in the three dedicated test files) in `main.test.tsx` as well for consistency.

---

## Informational

### I1 — `main.test.tsx` duplicates the `LogisticsPage` empty-state assertion already covered in `LogisticsPage.test.tsx`
**Location**: `plugins/logistics/src/test/main.test.tsx:44-53`

The first test in `main.test.tsx` ("renders without crashing inside MemoryRouter") asserts `"Brak metod dostawy. Dodaj pierwszą metodę."`, which is exactly what `LogisticsPage.test.tsx:48-53` ("renders_emptyState_whenNoMethods") tests. The route-mounting test in `main.test.tsx:57-73` likewise re-renders `LogisticsPage` with the same assertion. The routing test for `/` is the only unique value; the first test adds nothing beyond the dedicated test file.

**Recommendation**: Remove the first `LogisticsPage` describe block from `main.test.tsx` or collapse it into the routing test. Add routing tests for `/product-delivery` and `/product-delivery-info` to give the routing test file unique coverage.

---

### I2 — `mockObjects` declared redundantly in three separate test files with identical shape
**Location**: `plugins/logistics/src/test/LogisticsPage.test.tsx:14-20`, `ProductDeliveryTab.test.tsx:14-20`, `ProductDeliveryInfoBadge.test.tsx:14-20`, `main.test.tsx:12-18`

All four test files declare the same `mockObjects` object with the same five `vi.fn()` members. The frontend testing standard says to keep `renderWithProviders` per-file, but shared mock factories are a different concern. The duplication is copy-paste boilerplate and will drift if the SDK objects API gains methods.

**Recommendation**: Extract a `createMockSDK(productId?)` factory to a shared test helper (e.g., `src/test/sdkMock.ts`). Each test file imports and configures it. This keeps setup DRY without violating the per-file `renderWithProviders` convention.

---

### I3 — `loading` state not reset in `LogisticsPage` on subsequent `loadMethods()` calls
**Location**: `plugins/logistics/src/pages/LogisticsPage.tsx:12-24`

`loadMethods()` is called both on mount (inside `useEffect`) and after every mutating operation (add, toggle, delete). The initial `useEffect` call correctly clears `loading` in `.finally()`. However, the `handleAdd`, `handleToggle`, and `handleDelete` handlers call `loadMethods()` after their own SDK call without resetting `loading` to `true` beforehand. This means there is no loading indicator during the reload triggered by mutations. While this is not a bug (the table remains visible during reload), it can cause a brief flash where stale data is shown alongside the new result.

**Recommendation**: Set `setLoading(true)` at the start of each mutation handler, or extract the reload-after-mutation into a shared helper that manages the loading state.

---

### I4 — `vite.config.ts` missing `plugins` declaration for test config (no `react()` under `test`)
**Location**: `plugins/logistics/vite.config.ts:1-15`

The `test` block does not reference the `react()` plugin explicitly. Vite merges the top-level `plugins` into test runs by default, so this works. However, the frontend testing standard example shows `plugins: [react()]` inside the test config for explicit clarity. This is cosmetic but deviates from the project's documented example.

**Recommendation**: Not required to fix; current config works. Optionally add `plugins: [react()]` inside the `test` block as shown in the standard.

---

### I5 — `manifest.json` hardcodes `localhost` URL
**Location**: `plugins/logistics/manifest.json:4`

`"url": "http://localhost:3010"` will need to change for staging and production deployments. This is a known limitation of the current plugin manifest model and is acceptable for a pre-alpha plugin, but should be noted.

**Recommendation**: Document that the manifest URL must be updated per environment. If a build-time substitution mechanism exists or is planned, use it here.

---

### I6 — No `aria-label` on the toggle/delete buttons in LogisticsPage table rows
**Location**: `plugins/logistics/src/pages/LogisticsPage.tsx:99-110`

The toggle button text alternates between "Wyłącz" and "Włącz" and the delete button says "Usuń". Without an `aria-label` that includes the method name, screen readers cannot distinguish which method each button operates on. The accessibility standard requires meaningful labels for interactive controls.

**Recommendation**: Add `aria-label` attributes:
```tsx
<button aria-label={`${method.enabled ? "Wyłącz" : "Włącz"} ${method.name}`} ...>
<button aria-label={`Usuń ${method.name}`} ...>
```

---

## Metrics
- Files analyzed: 9 (domain.ts, LogisticsPage.tsx, ProductDeliveryTab.tsx, ProductDeliveryInfoBadge.tsx, main.tsx, manifest.json, vite.config.ts, 4 test files)
- Max function/component length: ~119 lines (LogisticsPage.tsx)
- Max nesting depth: 3 levels
- Security vulnerabilities: 0
- N+1 query risks: 0
- Rules of Hooks violations: 1 (W1)

---

## Prioritized Recommendations

1. **[W1] Fix Rules of Hooks violation in ProductDeliveryTab** — This is a correctness bug that React will warn about in strict mode and may cause unpredictable behavior. Move all hook calls above the early return at line 15.
2. **[W2] Add error handling to handleToggle and handleReset** — Fire-and-forget SDK mutations leave the UI in an inconsistent state on failure. Wrap in try/catch and show error feedback.
3. **[W4] Rename `disabledSet` to `activeMethodIds`** — The current name contradicts the variable's content and makes the badge logic hard to reason about.
4. **[W3] Move `getSDK()` calls inside useEffect/callbacks** — Calling at render time is fragile and inconsistent with LogisticsPage's approach.
5. **[I6] Add aria-label to row action buttons** — Required by the accessibility standard for screen reader users.
6. **[I2] Extract shared SDK mock factory** — Reduces copy-paste drift across four test files.
7. **[I1] Remove duplicate LogisticsPage test from main.test.tsx** — Add routing tests for the other two routes instead.
