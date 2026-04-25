# Codebase Analysis Report

**Task**: Create logistics plugin in `plugins/logistics/` (port 3010)
**Complexity**: Simple | **Risk**: Low

## Summary
1
All patterns for the logistics plugin are fully established by two reference plugins (`warehouse` for global objects CRUD, `box-size` for per-product `getData/setData`). The task is net-new file creation with zero risk to existing code.

## Primary Reference Files

| File | Lines | Relevance |
|------|-------|-----------|
| `plugins/warehouse/src/pages/WarehousePage.tsx` | 239 | High — CRUD reference with objects API |
| `plugins/box-size/src/pages/ProductBoxTab.tsx` | 114 | High — per-product getData/setData pattern |
| `plugins/warehouse/src/domain.ts` | 35 | High — domain interface + mapper pattern |
| `plugins/sdk.ts` | ~100 | High — shared SDK types, import path: `../../sdk` |
| `plugins/warehouse/manifest.json` | 34 | High — all 4 extension points example |
| `plugins/warehouse/vite.config.ts` | 10 | High — port + strictPort pattern |
| `plugins/CLAUDE.md` | ~300 | High — authoritative plugin dev guide |

## Architecture Patterns

- **Global delivery methods**: `thisPlugin.objects.list/save/delete("delivery-method", slug, data)`
- **Per-product restrictions**: `thisPlugin.setData(productId, { disabledMethods: string[] })`
- **SDK import**: always `import { getSDK } from "../../sdk"` — never duplicate sdk.ts
- **Routing**: `BrowserRouter + Routes` with paths matching manifest exactly
- **Styling**: `tc-plugin` root wrapper + `tc-table`, `tc-primary-button`, `tc-ghost-button--danger`, `tc-badge--success/danger`
- **Error handling**: local `error` state string, shown with `className="tc-error"`
- **Loading**: boolean `loading` state with early return

## File Structure to Create

```
plugins/logistics/
├── index.html
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts          # port: 3010, strictPort: true
└── src/
    ├── main.tsx            # BrowserRouter + Routes
    ├── domain.ts           # DeliveryMethod interface + mappers
    └── pages/
        ├── LogisticsPage.tsx        # menu.main: global delivery methods management
        └── ProductDeliveryTab.tsx   # product.detail.tabs: per-product restrictions
```

## Key Design Decision

Delivery methods stored as `thisPlugin.objects` with objectId = slug (e.g., `"dhl"`, `"dpd"`, `"inpost"`, `"poczta-polska"`). This enables add/edit/disable globally. Per-product disabled methods stored via `setData(productId, { disabledMethods: string[] })`.

## Ports

- warehouse: 3001
- box-size: 3002
- **logistics: 3010** ✓ (no conflict)

## Anti-Patterns to Avoid

- Never copy `sdk.ts` into the plugin directory
- Never use inline styles for standard UI elements (only layout: padding, max-width)
- Never let promises float — always `void` or `await` in event handlers
- `setData` is full overwrite — always write the complete `disabledMethods` array

---

```yaml
status: success
complexity: simple
risk_level: low
files_found: 12
```
