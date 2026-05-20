# Implementation Plan: Cart Recommend Button with AI-Powered Product Recommendations

## Overview

Total Steps: 26
Task Groups: 4
Expected Tests: 19-24 (9 migrated + 5 API + 5 CartPage recommend = 19 baseline; up to 5 additional in testing group)

## Implementation Steps

### Task Group 1: Next.js Migration (Infrastructure)
**Dependencies:** None
**Estimated Steps:** 7

- [x] 1.0 Complete Next.js migration of koszyk plugin
  - [x] 1.1 Write 3 smoke tests covering the migrated Next.js entry point
    - Test: `pages/index.tsx` renders `CartPage` without crashing (import smoke test via Jest + jsdom)
    - Test: `jest.config.js` resolves TypeScript and TSX files correctly (run `jest --listTests` as part of step)
    - Test: `src/test/setup.ts` imports `@testing-library/jest-dom` (not the vitest variant) without error
  - [x] 1.2 Replace `package.json` with Next.js-ready version
    - Remove: `vite`, `vitest`, `@vitejs/plugin-react`, `@vitest/coverage-v8` from devDependencies
    - Add dependencies: `next ^15.3.3`, `@boundaryml/baml ^0.220.0`
    - Add devDependencies: `jest ^29.7.0`, `ts-jest ^29.3.0`, `node-mocks-http ^1.16.0`, `@jest/globals ^29.7.0`
    - Update scripts: `"dev": "next dev -p 3012"`, `"build": "next build"`, `"start": "next start -p 3012"`, `"test": "node --experimental-vm-modules node_modules/.bin/jest"`, `"generate": "npx baml-cli generate"`
    - Remove `"type": "module"` (Next.js uses CJS config)
    - Reuse: ai-description `package.json` as the exact template (adjust name and port)
  - [x] 1.3 Add `next.config.js` at plugin root
    - Copy ai-description `next.config.js` verbatim: `experimental.externalDir: true` to allow importing from `plugins/sdk.ts`
  - [x] 1.4 Add `jest.config.js` at plugin root
    - Copy ai-description `jest.config.js` verbatim: `preset: "ts-jest"`, `testEnvironment: "node"`, `roots: ["<rootDir>/src"]`
    - Note: CartPage tests need jsdom; add `testEnvironmentOptions` override per test file via docblock (`@jest-environment jsdom`) OR split jest configs. Use the docblock approach to keep a single config.
  - [x] 1.5 Create `src/pages/_document.tsx`
    - Copy ai-description `src/pages/_document.tsx` verbatim: loads `plugin-sdk.js` and `plugin-ui.css` from `http://localhost:8080`
  - [x] 1.6 Create `src/pages/index.tsx`
    - Import and render `CartPage` directly (no `BrowserRouter` — not needed in Next.js Pages Router)
    - Content: `import { CartPage } from "./CartPage"; export default function IndexPage() { return <CartPage />; }`
  - [x] 1.7 Update `src/test/setup.ts`
    - Replace `import "@testing-library/jest-dom/vitest"` with `import "@testing-library/jest-dom"`
    - Added TextEncoder/TextDecoder and crypto.randomUUID polyfills for jsdom
  - [x] 1.8 Delete Vite-specific files
    - Delete `vite.config.ts` (no longer used)
    - Delete `src/main.tsx` (replaced by `src/pages/index.tsx`)
  - [x] 1.n Ensure migration smoke tests pass
    - All 23 tests pass (4 suites: migration-smoke, CartPage, domain, scaffold)

**Acceptance Criteria:**
- `npm run dev` starts on port 3012 using Next.js
- `npm test` executes via Jest (not Vitest)
- `src/pages/index.tsx` and `src/pages/_document.tsx` exist
- `vite.config.ts` and `src/main.tsx` are deleted

---

### Task Group 2: Test Migration — Vitest to Jest
**Dependencies:** Group 1
**Estimated Steps:** 5

- [x] 2.0 Migrate all existing Vitest tests to Jest
  - [x] 2.1 Write 2 regression guard tests using Jest API to confirm migration completeness
    - Test: no test file references `vi.` (Vitest API calls)
    - Test: CartPage.test.tsx has ≥9 test cases
  - [x] 2.2 Migrate `src/test/CartPage.test.tsx`
    - Done in Group 1: all vi.* → jest.*, @jest-environment jsdom docblock added
  - [x] 2.3 Migrate `src/test/domain.test.ts` and `src/test/scaffold.test.ts`
    - Verified: neither file used vi.* APIs
  - [x] 2.4 Run `npm install` to install new dependencies
    - Done in Group 1
  - [x] 2.n All 25 tests pass (5 suites)

**Acceptance Criteria:**
- All 9 existing CartPage tests pass under Jest
- No `vi.` references remain in any test file
- `npm test` exits 0 for domain and scaffold tests

---

### Task Group 3: BAML + API Route (Backend Layer)
**Dependencies:** Group 1
**Estimated Steps:** 7

- [x] 3.0 Complete BAML integration and API route
  - [x] 3.1 Write 5 tests for `src/test/recommend.test.ts` using Jest + node-mocks-http
    - Test: missingCartItems_returns400 ✓
    - Test: emptyCartItemsArray_returns400 ✓
    - Test: validRequest_callsGetProductsAndFiltersCartItems ✓
    - Test: bamlSuccess_returns3Recommendations ✓
    - Test: bamlFailure_returns500WithoutInternalDetails ✓
  - [x] 3.2 Create `baml_src/clients.baml` — copied from ai-description verbatim
  - [x] 3.3 Create `baml_src/main.baml` with `RecommendCartProducts` function
  - [x] 3.4 Run `npm run generate` — `baml_client/` generated (14 files)
  - [x] 3.5 Add `ProductRecommendation` interface to `src/domain.ts`
  - [x] 3.6 Create `src/pages/api/recommend.ts` with full data flow
  - [x] 3.n All 5 API route tests pass

**Acceptance Criteria:**
- `baml_src/clients.baml` and `baml_src/main.baml` exist
- `baml_client/` directory generated with `b.RecommendCartProducts` export
- `src/pages/api/recommend.ts` exists with correct data flow
- `ProductRecommendation` interface added to `src/domain.ts`
- 5 API route tests pass

---

### Task Group 4: Frontend Recommend Feature (UI Layer)
**Dependencies:** Groups 2 and 3
**Estimated Steps:** 7

- [x] 4.0 Complete the Recommend button and results panel in CartPage
  - [x] 4.1 Write 5 recommendation UI tests — all 5 pass (recommendButton_disabledWhenNoItemsInCart, disabledWhenNoCartSelected, triggersCorrectPayload, rendersAfterSuccess, resetWhenCartChanges)
  - [x] 4.2 Add `recommendations` and `recommending` state to CartPage
  - [x] 4.3 Reset `recommendations` in both useEffect branches
  - [x] 4.4 Extract `addProductToCart` helper; add `handleRecommend` function
  - [x] 4.5 Add "Rekomenduj" button to cart items section header; extract `currentCartItems`
  - [x] 4.6 Add recommendations panel with tc-card per recommendation + Dodaj do koszyka button
  - [x] 4.n All 17 CartPage tests pass (12 original + 5 new)

**Acceptance Criteria:**
- "Rekomenduj" button visible in cart items section header when a cart is selected
- Button disabled when cart has no items or recommendation is in progress
- Clicking button with a non-empty cart calls `/api/recommend` and displays 3 recommendation cards
- Each card shows name, description, price, and reasoning
- "Dodaj do koszyka" on a card adds the product to the selected cart
- Changing selected cart clears the recommendations panel
- All 14 CartPage tests pass (9 migrated + 5 new)

---

### Task Group 5: Test Review and Gap Analysis
**Dependencies:** All previous groups

- [x] 5.0 Review and fill critical gaps
  - [x] 5.1 Review tests from all previous groups (35 tests across 6 suites)
  - [x] 5.2 Analyzed gaps: found 3 missing tests, ANTHROPIC_API_KEY security check clean
  - [x] 5.3 Added 3 strategic tests: nonPostMethod_returns405, getProductsFailure_returns500, errorMessage_shownOnFetchFailure
  - [x] 5.4 All 38 tests pass across 6 suites — 0 failures

**Acceptance Criteria:**
- All feature tests pass (22-27 total)
- No more than 5 additional tests added
- No regressions in any test file

---

## Execution Order

1. Group 1: Next.js Migration (7 steps) — no dependencies, sets up the runtime
2. Group 2: Test Migration — Vitest to Jest (5 steps, depends on Group 1)
3. Group 3: BAML + API Route (7 steps, depends on Group 1)
4. Group 4: Frontend Recommend Feature (7 steps, depends on Groups 2 and 3)
5. Group 5: Test Review and Gap Analysis (4 steps, depends on all previous groups)

Groups 2 and 3 can proceed in parallel after Group 1 completes.

---

## Key File Mapping

| Action | File |
|--------|------|
| Replace | `plugins/koszyk/package.json` |
| Add | `plugins/koszyk/next.config.js` |
| Add | `plugins/koszyk/jest.config.js` |
| Add | `plugins/koszyk/src/pages/_document.tsx` |
| Add | `plugins/koszyk/src/pages/index.tsx` |
| Add | `plugins/koszyk/src/pages/api/recommend.ts` |
| Add | `plugins/koszyk/baml_src/clients.baml` |
| Add | `plugins/koszyk/baml_src/main.baml` |
| Add (generated) | `plugins/koszyk/baml_client/` |
| Modify | `plugins/koszyk/src/domain.ts` (add `ProductRecommendation`) |
| Modify | `plugins/koszyk/src/pages/CartPage.tsx` (add state, handler, button, panel) |
| Modify | `plugins/koszyk/src/test/CartPage.test.tsx` (vi→jest + 5 new tests) |
| Modify | `plugins/koszyk/src/test/setup.ts` (jest-dom import) |
| Modify | `plugins/koszyk/src/test/domain.test.ts` (vi→jest if needed) |
| Modify | `plugins/koszyk/src/test/scaffold.test.ts` (vi→jest if needed) |
| Delete | `plugins/koszyk/vite.config.ts` |
| Delete | `plugins/koszyk/src/main.tsx` |

---

## Standards Compliance

Follow standards from `.maister/docs/standards/`:

- `global/minimal-implementation.md` — No persistence for recommendations. `addProductToCart` helper extracted only because it has two callers. No speculative abstractions.
- `global/error-handling.md` — API route catches all errors, returns generic 500 message. Frontend renders `tc-error` paragraph. No internal paths or stack traces leaked.
- `global/validation.md` — API route validates `cartItems` presence and non-empty before BAML invocation.
- `global/conventions.md` — Port preserved at 3012. `ANTHROPIC_API_KEY` stays server-side only (Next.js API route, never in browser bundle).
- `testing/backend-testing.md` — Jest + node-mocks-http for API route tests. Test method naming: `action_condition_expectedResult`. 2-8 tests per group.
- `testing/frontend-testing.md` — Jest replaces Vitest; same `@testing-library/react` + `@testing-library/jest-dom` + `renderWithProviders` pattern. `jest.resetAllMocks()` in `beforeEach`.
- `backend/api.md` — POST `/api/recommend` follows RESTful resource naming. Input/output types explicitly typed in TypeScript interfaces.

---

## Notes

- Test-Driven: Each group starts with 2-8 focused tests before implementation
- Run Incrementally: Run only the new tests after each group, not the entire suite, until Group 5
- Mark Progress: Check off steps as completed
- Reuse First: Template files from ai-description are the primary reference for Next.js config, BAML clients, API route structure, and fetch pattern
- Jest Environment: CartPage tests require `/** @jest-environment jsdom */` docblock; API route tests use the default `node` environment from `jest.config.js`
- BAML Generation: `baml_client/` is auto-generated by `postinstall`; do not edit generated files
- Parallel Execution: Groups 2 and 3 are independent after Group 1 and may be implemented concurrently
