# Specification Audit: Logistics Plugin

**Status**: Pass with concerns (5 findings: 1 High, 2 Medium, 2 Low)

## Summary

Spec is well-structured and internally consistent. No critical issues. Two ambiguities need resolving before implementation.

## Findings

### High: Testing infrastructure missing from template plugins
- Template plugins (warehouse, box-size) have NO vitest, @testing-library, or test files
- Spec prescribes tests but doesn't list the extra devDependencies needed
- Fix: Add testing devDependencies to the implementation spec

### Medium: renderWithProviders — no ChakraProvider in plugins
- Plugins don't use Chakra UI — only host-served CSS classes
- Plugin tests should use MemoryRouter only (no ChakraProvider)

### Medium: SDK mock path explanation needed
- `vi.mock("../../../sdk")` from src/test/ is correct but differs from component's `../../sdk` import
- Needs a clarifying comment in the spec

### Low: Badge null condition is contradictory
- Requirement 15: null when "no delivery methods exist globally"
- Success Criteria: null when "no active methods exist"
- Resolution: null when no ACTIVE methods (enabled=true), not when all are inactive

### Low: Checkbox list scope ambiguous (all vs active-only methods)
- Spec loads all methods via objects.list but doesn't say whether to filter by enabled=true
- Badge uses only active methods — tab should consistently show active-only

## Clarifications to Resolve

**Q1**: Badge null — no methods globally vs no active methods?
**Q2**: Checkbox list — all delivery methods or only active ones?

## Platform Validations (All Pass)

- SDK API surface (objects, getData/setData/removeData) ✅
- Port 3010, strictPort ✅
- Three extension point types ✅
- tc-badge class usage ✅
- void pattern for floating promises ✅
- SDK import path ../../sdk ✅
- manifest.json without pluginId field ✅
