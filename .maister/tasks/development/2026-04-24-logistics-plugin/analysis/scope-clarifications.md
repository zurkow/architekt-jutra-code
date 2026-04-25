# Scope Clarifications

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Object ID strategy | UUID | Matches warehouse pattern; user adds carriers via form |
| Reset button in ProductDeliveryTab | Yes — "Włącz wszystkie" button | Consistent with box-size pattern, calls removeData |
| product.detail.info badge | Yes — add badge | Shows e.g. "3/4 metod dostępnych" inline below product card |
| Phase 4 (UI mockups) | Skipped | User chose to proceed directly to specification |

## Scope Impact

Adding `product.detail.info` badge **expands scope** — requires:
- Third extension point in manifest.json: `product.detail.info`, path `/product-delivery-info`, priority 15
- Third route in src/main.tsx: `/product-delivery-info → <ProductDeliveryInfoBadge />`
- Third page component: `src/pages/ProductDeliveryInfoBadge.tsx`
  - Compact (~60px), loads `getData(productId)` + `objects.list("delivery-method")`
  - Shows e.g. `<span className="tc-badge tc-badge--success">3/4 metod dostępnych</span>`
  - Or `<span className="tc-badge tc-badge--danger">1/4 metod dostępnych</span>` if many disabled

## Final Extension Points

| Type | Label | Path | Priority | Icon |
|------|-------|------|----------|------|
| menu.main | Logistyka | / | 110 | truck |
| product.detail.tabs | Dostawa | /product-delivery | 55 | — |
| product.detail.info | Dostawa | /product-delivery-info | 15 | — |

## Final File List (10 files)

| File | Notes |
|------|-------|
| plugins/logistics/index.html | |
| plugins/logistics/manifest.json | 3 extension points |
| plugins/logistics/package.json | |
| plugins/logistics/tsconfig.json | |
| plugins/logistics/vite.config.ts | port 3010 |
| plugins/logistics/src/main.tsx | 3 routes |
| plugins/logistics/src/domain.ts | DeliveryMethod, ProductDeliveryData |
| plugins/logistics/src/pages/LogisticsPage.tsx | CRUD delivery methods |
| plugins/logistics/src/pages/ProductDeliveryTab.tsx | Toggle per-product + Reset button |
| plugins/logistics/src/pages/ProductDeliveryInfoBadge.tsx | Compact badge |
