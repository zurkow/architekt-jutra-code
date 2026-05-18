# Research Brief

## Research Question

How does authentication work in this codebase?

## Research Type

**Internal** — the question targets codebase implementation only. No external sources needed.

## Classification Self-Check

- Mentions competitors/market/external products? No
- Requires web research? No
- Requires internal codebase analysis? Yes
- Final classification: `internal` ✓

## Scope

### Included
- Authentication configuration and setup (SecurityFilterChain, SecurityConfig)
- JWT token handling: creation, validation, parsing, claims structure
- Security filters and middleware (token extraction from requests)
- Login/logout endpoints and their request/response contracts
- Permission and authorization checks (how roles/permissions are enforced)
- Plugin authentication mechanisms (browser SDK auth, server-side SDK auth)
- Custom security annotations and test helpers

### Excluded
- External OAuth/OIDC providers not used in this project
- Future planned authentication changes (unless documented in current code)

### Constraints
- Focus on current implementation state only
- No synthesis — raw findings only

## Success Criteria

1. Clear picture of how a request is authenticated end-to-end
2. JWT structure documented (claims, signing, validation)
3. Authorization model understood (how permissions are checked)
4. Plugin auth flow documented (if different from host app)
5. All relevant files identified with line-level citations

## Date

2026-05-14
