# Code Review Report

**Date**: 2026-05-09
**Path**: plugins/customers/
**Scope**: all (quality, security, performance, best practices)
**Status**: Issues Found

## Summary

- **Critical**: 0 issues
- **Warnings**: 7 issues
- **Info**: 6 issues

Files analyzed: 8

---

## Critical Issues

None.

---

## Warnings

### W1 — Component violates Single Responsibility (god component)

**Location**: `plugins/customers/src/pages/CustomersPage.tsx:7`

**Description**: `CustomersPage` manages three separate concerns in one ~280-line component: (1) list display with search/filtering, (2) an inline create/edit form with 11 individual field `useState` hooks, and (3) all SDK calls. The component standards require single responsibility and warn against monoliths.

**Why it matters**: The 11 flat field states (`firstName`, `lastName`, `email`, …) at lines 17–27 are entirely disconnected from each other and from the customer list. Adding or removing a field requires changes in five separate places (state declaration, `clearForm`, `handleEdit`, `handleSave`'s `data` object, and JSX). This is a maintenance trap.

**Recommendation**: Extract form state into a single `formData` object managed with one `useState<FormData>`. Optionally extract `CustomerForm` into its own component. This also removes the need for `clearForm` touching 11 setters — a single `setFormData(emptyForm)` replaces it.

---

### W2 — `loadCustomers` called after every save and delete (sequential round-trips)

**Location**: `plugins/customers/src/pages/CustomersPage.tsx:104` and `115`

**Description**: After `objects.save` and `objects.delete` the code calls `await loadCustomers()` which issues another full `objects.list("customer")` RPC round-trip. In the warehouse reference plugin the same pattern is used — but there it involves ~10 warehouses. For customer data (potentially hundreds of records) this pattern re-fetches the entire collection after every mutation.

**Why it matters**: The SDK uses postMessage RPC with a 10-second timeout. Each mutation triggers two sequential network calls. Under slow conditions this doubles perceived latency and can leave the UI in a stale state if the second call times out while the first succeeded.

**Recommendation**: Apply an optimistic update — directly update `customers` state using `setCustomers(...)` after a successful save/delete and only fall back to a full reload on failure. This is the correct pattern when the full response is already available locally.

---

### W3 — Silent validation failure on save (no user feedback)

**Location**: `plugins/customers/src/pages/CustomersPage.tsx:85`

**Description**: `handleSave` returns early when `firstName` or `lastName` is empty, but does not set an error state or show any message to the user. The "Save" button click simply does nothing from the user's perspective.

**Why it matters**: The error-handling standard requires "clear user messages" and "fail-fast with actionable messages." A silent no-op violates both and creates confusion, especially since the `*` placeholder hints in the inputs are not associated with any visible rule or aria description.

**Recommendation**: Set `setError("First name and last name are required.")` on the early-return path, or use per-field validation state to highlight the offending inputs.

---

### W4 — Missing `loading` state during save and delete operations

**Location**: `plugins/customers/src/pages/CustomersPage.tsx:84` and `111`

**Description**: While `handleSave` and `handleDelete` are async and perform SDK calls, no loading/disabled state is set on the buttons during these operations. The reference warehouse plugin correctly sets `saving` state and disables the save button during `handleSaveStock` (line 99 of WarehousePage.tsx). The customers plugin has no equivalent guard.

**Why it matters**: Users can double-click "Save" or "Delete" and trigger concurrent mutations on the same object, leading to race conditions and duplicate or inconsistent data.

**Recommendation**: Add a `saving` boolean state; set it to `true` before SDK calls and back to `false` in a `finally` block. Disable the Save and Delete buttons while `saving` is `true`.

---

### W5 — `handleDelete` has no confirmation step

**Location**: `plugins/customers/src/pages/CustomersPage.tsx:111`

**Description**: Clicking "Delete" immediately and irreversibly calls `objects.delete`. Customer records are business-critical data. The warehouse plugin deletes warehouses without confirmation too, but warehouses are operational configuration — customer records represent distinct business entities.

**Why it matters**: An accidental click destroys a customer record with no recovery path.

**Recommendation**: Gate the delete with `window.confirm("Delete this customer? This cannot be undone.")` at minimum, or introduce an inline confirmation state in the row (e.g., "Confirm?" / "Cancel" buttons that replace the "Delete" button for one render cycle).

---

### W6 — Unused `PluginObject` import in `CustomersPage.tsx`

**Location**: `plugins/customers/src/pages/CustomersPage.tsx:3`

**Description**: `PluginObject` is imported from `../../../sdk` but never referenced in the file. TypeScript strict mode with `noUnusedLocals` should catch this at compile time, but because it is a `type`-only import (`import type`) it is used only in `loadCustomers`'s variable annotation on line 31 (`const objects: PluginObject[]`). Removing the explicit annotation and relying on inference would eliminate the import entirely and shorten the code.

**Note after re-reading**: The annotation `const objects: PluginObject[]` does use the import, so this is not technically unused. However the annotation itself is redundant — `sdk.thisPlugin.objects.list(...)` already returns `Promise<PluginObject[]>` per the SDK types, so the explicit cast adds noise without value.

**Recommendation**: Remove the `: PluginObject[]` type annotation on line 31; TypeScript infers it from the return type. The import can then also be removed.

---

### W7 — `getSDK()` called inside every event handler instead of once at module level

**Location**: `plugins/customers/src/pages/CustomersPage.tsx:30`, `88`, `114`

**Description**: `getSDK()` is called three separate times — inside `loadCustomers`, `handleSave`, and `handleDelete`. The function simply reads `window.PluginSDK`, which is a synchronous property access. The reference warehouse plugin follows the same pattern, but calling `getSDK()` once at the module level (or at component initialization) is cleaner and makes the dependency explicit.

**Why it matters**: Low risk functionally, but each call allocates a new function scope and reads a global. More importantly it scatters the SDK dependency across handlers, making it harder to mock or swap in tests.

**Recommendation**: Declare `const sdk = getSDK();` once at module scope (outside the component) or inside the component body (outside handlers). The warehouse plugin pattern is acceptable — flag this as a consistency improvement.

---

## Informational

### I1 — `clearForm` is a 11-setter helper that would disappear with a form object

**Location**: `plugins/customers/src/pages/CustomersPage.tsx:42–54`

**Description**: `clearForm` exists solely because form state is split across 11 separate `useState` hooks (see W1). It is not a reusable utility — it is a workaround for flat state. Per the minimal-implementation standard, methods that exist only to compensate for a structural issue should be resolved at the structural level.

**Recommendation**: Addressed by W1 — consolidating form state into a single object eliminates this function.

---

### I2 — Placeholder-only validation hints are not accessible

**Location**: `plugins/customers/src/pages/CustomersPage.tsx:195`, `200`

**Description**: Required fields are indicated only by `placeholder="First name *"` and `placeholder="Last name *"`. Placeholders disappear once the user starts typing, leaving no persistent indication of which fields are required. The accessibility standard requires labels and persistent, readable cues.

**Recommendation**: Add `<label>` elements for each field (even if visually compact), or add `aria-required="true"` and a visible asterisk outside the placeholder. At minimum ensure required fields are communicated via aria attributes.

---

### I3 — Search filter recomputes on every render without memoization

**Location**: `plugins/customers/src/pages/CustomersPage.tsx:124–128`

**Description**: The `filtered` constant is computed inline in the render body. When the user types in the search box, every keystroke triggers a re-render that re-filters the entire customer list from scratch.

**Why it matters**: For small datasets (< 200 customers) this is imperceptible. At larger scales (the plugin could realistically accumulate thousands of records) the `.filter` + nested `.some` + `.toLowerCase()` calls run synchronously on every keystroke without debouncing.

**Recommendation**: Wrap `filtered` in `useMemo(() => customers.filter(...), [customers, search])`. For larger scale, add a debounce to the search input.

---

### I4 — No `<label>` elements on any form input

**Location**: `plugins/customers/src/pages/CustomersPage.tsx:194–266`

**Description**: All 11 form inputs rely entirely on `placeholder` for labeling. Placeholders are not semantically equivalent to labels and are not read consistently by screen readers. The accessibility standard requires semantic HTML and screen reader support.

**Recommendation**: Wrap each input in a `<label>` or use `aria-label`/`aria-labelledby`. Even a visually compact layout (label + input on same line) satisfies the requirement.

---

### I5 — `index.html` hardcodes `localhost:8080`

**Location**: `plugins/customers/index.html:7–8`

**Description**: Both the SDK script and UI stylesheet are loaded from `http://localhost:8080`. This is intentional for local development (same as other plugins) but means the plugin cannot be deployed to any environment without modifying the HTML file. The warehouse plugin follows the same pattern.

**Note**: This is a project-wide convention — not a customers-plugin-specific defect. Flag it as a known limitation rather than a bug.

**Recommendation**: Track this as a known limitation. A future improvement would be to make the host origin configurable via an environment variable injected by Vite (`import.meta.env.VITE_HOST_ORIGIN`).

---

### I6 — `manifest.json` does not specify a `pluginId` field

**Location**: `plugins/customers/manifest.json:1`

**Description**: The manifest has `name`, `version`, `url`, `description`, and `extensionPoints` — but the plugin's REST-registered ID (used in the `PUT /api/plugins/{pluginId}/manifest` path) is not captured in the manifest file itself. If the dev forgets which URL segment they used during registration, there is no source of truth.

**Note**: The host does not require this field — it is derived from the URL path. This is a convention issue rather than a bug.

**Recommendation**: Add a comment in the manifest or a `"pluginId": "customers"` convention field so the registration URL is self-documenting. Alternatively document the pluginId in the plugin's README.

---

## Metrics

| Metric | Value |
|--------|-------|
| Largest component (lines) | 282 lines (CustomersPage.tsx) |
| Flat state variables in one component | 13 (`useState` calls) |
| Max nesting depth (JSX) | ~6 levels |
| Async handlers without loading guard | 2 (handleSave, handleDelete) |
| Potential XSS risks | 0 (no dangerouslySetInnerHTML, no innerHTML) |
| N+1 SDK call risks | 0 |
| Missing error handling | 1 (silent validation failure — W3) |
| TypeScript `any` usage | 0 |
| Non-null assertions (`!`) | 1 (`getElementById("root")!` in main.tsx — acceptable, standard React pattern) |

---

## Prioritized Recommendations

1. **Consolidate form state into a single object** (W1) — eliminates the 11 parallel `useState` hooks, the `clearForm` helper, and makes `handleEdit`/`handleSave` shorter and less error-prone. Medium effort, high quality return.

2. **Add loading guard on save and delete** (W4) — prevents double-submission race conditions. Low effort, correctness fix.

3. **Show validation error when required fields are empty** (W3) — single-line fix; currently the form silently does nothing on an invalid submit.

4. **Add delete confirmation** (W5) — one `window.confirm()` call prevents accidental data loss.

5. **Apply optimistic updates or at minimum understand the re-fetch cost** (W2) — for the current scale it works, but acknowledging the trade-off now prevents surprises later.

6. **Remove the redundant `: PluginObject[]` type annotation** (W6/W7) — trivial cleanup.

7. **Add `aria-required` or `<label>` to required fields** (I2, I4) — accessibility minimum.

8. **Memoize the filtered list** (I3) — `useMemo` one-liner; protects against performance degradation as data grows.
