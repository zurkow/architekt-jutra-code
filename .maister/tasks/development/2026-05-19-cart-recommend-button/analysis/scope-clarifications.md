# Scope Clarifications

**Date**: 2026-05-19

## Critical Decisions

### Backend Runtime
**Decision**: Migrate koszyk plugin to Next.js
**Rationale**: Follows the ai-description pattern exactly — same BAML toolchain, Next.js API routes, LiteLLM client config, server-sdk integration. Lowest risk, proven pattern.

**File structure after migration**:
```
plugins/koszyk/
├── src/pages/
│   ├── index.tsx          (CartPage — same component)
│   ├── _document.tsx      (load SDK + CSS, like ai-description)
│   └── api/
│       └── recommend.ts   (POST — BAML call)
├── baml_src/
│   ├── main.baml          (RecommendCartProducts function)
│   └── clients.baml       (Anthropic → LiteLLM fallback)
└── package.json           (next, baml deps)
```

### BAML Location
**Decision**: Copy clients.baml into plugins/koszyk/baml_src/ (self-contained)
**Rationale**: Each plugin is standalone. No shared convention needed. Matches existing precedent.

## Important Decisions

### Recommendation Persistence
**Decision**: Ephemeral — results shown only in current session, not saved
**Rationale**: Cart items change frequently; saved results go stale quickly. Simpler implementation, no misleading cached recommendations.

### Product Scope for Recommendations
**Decision**: Filter out products already in the cart
**Rationale**: Recommending items already in cart is pointless. Filtered input improves AI output quality.

### Test Strategy
**Decision**: Migrate tests to Jest (consistent with ai-description)
**Rationale**: Consistency across plugins using Next.js + BAML. Existing test logic transfers with minimal changes.

## Scope Boundaries

**In scope**:
- Migrate plugins/koszyk from Vite to Next.js
- Add Recommend button to CartPage (enabled when cart selected with items)
- New BAML function RecommendCartProducts
- New Next.js API route /api/recommend
- Display ephemeral recommendations below cart items
- Filter products already in cart from candidates

**Out of scope**:
- Persistent recommendation storage
- Recommendation history/caching
- Separate MCP server tool for recommendations
- Changes to the Spring Boot host or other plugins
