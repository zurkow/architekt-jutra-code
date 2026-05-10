# Specification Audit: Customers Plugin

**Overall verdict**: Mostly Compliant — specific issues require resolution before implementation

---

## Finding 1 — Import Path Depth Ambiguity (Low)
Import path in spec (`"../../../sdk"`) is correct for `src/pages/` depth but contradicts CLAUDE.md example which shows the `src/` depth. Spec is actually correct — no code change needed, documentation note only.

## Finding 2 — Tests Required But File Structure Excludes Test Infrastructure (HIGH)
Spec mandates Vitest tests but the file structure lists only 8 files and instructs to copy package.json verbatim (no testing dependencies). Missing: `vitest.config.ts`, `src/test/setup.ts`, `src/test/CustomersPage.test.tsx`, and devDependencies (vitest, @testing-library/react, @testing-library/jest-dom, jsdom). Acceptance criterion 13 ("All tests pass") cannot be met.

## Finding 3 — Empty State Text Not Specified (Medium)
FR-1 mandates an empty state but does not provide the message text. Implementer must invent copy.

## Finding 4 — Loading State Render Pattern Unspecified (Low)
FR-1 requires a loading state but does not specify how it renders. Warehouse pattern (early return `<p>Loading...</p>`) should be the default.

## Finding 5 — Error Clearing on Initial Load (Low)
Not specified whether `loadCustomers()` clears error before fetching or only action handlers do.

## Finding 6 — Silent Validation Return Has No UX Feedback (Low)
Spec says `if (!firstName.trim() || !lastName.trim()) return` — no visible feedback when required fields are blank. Intentional but undocumented.

## Finding 9 — Form Wrapper: tc-section or tc-card (Low)
Spec offers both as options without choosing one. Warehouse uses `tc-section`.

## Finding 10 — Priority 90 Described Incorrectly (MEDIUM)
Spec says "below warehouse at 100 places it higher" — confusing. Lower priority number = higher position in sidebar. Priority 90 renders customers ABOVE warehouse, not below. Clarify intent.

## Finding 11 — renderWithProviders Uses ChakraProvider But Plugin Has No Chakra (Medium)
Frontend testing standard wraps in ChakraProvider, but customers plugin has no Chakra dependency. Tests would fail without clarifying this.

---

## Summary

| Severity | Count |
|----------|-------|
| High | 1 (Finding 2 — test infrastructure) |
| Medium | 3 (Finding 3, 10, 11) |
| Low | 5 (Findings 1, 4, 5, 6, 9) |

---

## Pre-Implementation Decisions Needed

1. **Are tests in scope?** If yes: add vitest config, setup, test file, update package.json deps. If no: remove testing acceptance criterion.
2. **Sidebar priority**: Should Customers appear above or below Warehouse? (Priority 90 = above, priority > 100 = below)
3. **renderWithProviders**: Confirm plugin-level version wraps only in MemoryRouter (no Chakra).
