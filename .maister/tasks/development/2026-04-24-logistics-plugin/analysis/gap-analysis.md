# Gap Analysis: Logistics Plugin

**Risk Level**: Low | **Effort**: Low

## Summary

Net-new plugin — zero existing code to modify. All required SDK operations exist and are proven in reference plugins. Two data entities: global delivery methods (objects API) and per-product disabled methods (getData/setData).

## Task Characteristics

- has_reproducible_defect: false
- modifies_existing_code: false
- creates_new_entities: true
- involves_data_operations: true
- ui_heavy: true

## Files to Create (9 total)

| File | Template | Notes |
|------|----------|-------|
| `plugins/logistics/index.html` | warehouse/index.html | Change title |
| `plugins/logistics/manifest.json` | warehouse/manifest.json | 2 ext points, port 3010 |
| `plugins/logistics/package.json` | warehouse/package.json | name: "logistics-plugin" |
| `plugins/logistics/tsconfig.json` | warehouse/tsconfig.json | Identical |
| `plugins/logistics/vite.config.ts` | warehouse/vite.config.ts | port: 3010 |
| `plugins/logistics/src/main.tsx` | box-size/src/main.tsx | 2 routes |
| `plugins/logistics/src/domain.ts` | warehouse/src/domain.ts | DeliveryMethod + mapper |
| `plugins/logistics/src/pages/LogisticsPage.tsx` | WarehousePage.tsx | Global delivery methods CRUD |
| `plugins/logistics/src/pages/ProductDeliveryTab.tsx` | ProductBoxTab.tsx | Per-product toggles |

## Data Lifecycle

### DeliveryMethod (global)
- CREATE/READ/UPDATE/DELETE via `thisPlugin.objects.save/list/delete("delivery-method", id, data)`
- objectId strategy: UUID (matches warehouse) or slug ("dhl", "inpost")

### Per-Product Disabled Methods
- READ: `thisPlugin.getData(productId)` → `{ disabledMethods: string[] }`
- WRITE: `thisPlugin.setData(productId, { disabledMethods: [...] })` — full overwrite!
- RESET: `thisPlugin.removeData(productId)`

**Critical constraint**: setData is full overwrite — tab must always load global methods list before saving.

## Integration Points

- `menu.main`: label "Logistics", icon "truck", path "/", priority 110
- `product.detail.tabs`: label "Delivery", path "/product-delivery", priority 55

## Decisions Needed

### Important (to confirm before implementation)

1. **Object ID strategy**: UUID (warehouse pattern) vs slug ("dhl", "inpost")
   - Default: UUID

2. **Reset button in ProductDeliveryTab**: Include "Enable all" button (calls removeData) vs omit
   - Default: Include (matches box-size pattern)

3. **product.detail.info badge**: Add compact inline summary badge vs tab only
   - Default: Tab only (task description doesn't mention badge)
