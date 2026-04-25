# Requirements: Logistics Plugin

## Initial Description

Stwórz plugin do obsługi logistyki w katalogu plugins/logistics/ na porcie 3010.

Wymagania funkcjonalne:
1. Globalna konfiguracja: zarządzanie listą metod dostawy (DHL, DPD, InPost, Poczta Polska)
   - Dodawanie nowych metod (formularz: nazwa)
   - Włączanie/wyłączanie metody (aktywna/nieaktywna)
   - Usuwanie metody
2. Dostępność metod dla produktów: zakładka w szczegółach produktu
   - Lista wszystkich aktywnych metod dostawy z możliwością wyłączenia per-produkt
   - Przycisk "Włącz wszystkie" (reset do domyślnych)
3. Badge product.detail.info: kompaktowy widok poniżej karty produktu

## Confirmed Decisions

- **ID strategy**: UUID (jak w warehouse pluginie)
- **Reset button**: Tak, "Włącz wszystkie" (removeData)
- **Info badge**: Tak — shows "X/Y metod dostępnych"
- **Port**: 3010, strictPort: true
- **Plugin ID**: "logistics"

## Functional Requirements

### FR-1: Global Delivery Methods Management (LogisticsPage)
- Display table: Name | Status badge | Actions
- Status badge: `tc-badge--success` (aktywna) / `tc-badge--danger` (nieaktywna)
- Add form: single "Nazwa" input + "Dodaj" button
- Toggle button per row: enable/disable (updates `enabled` flag in objects API)
- Delete button per row: removes from objects API (with confirmation or instant)
- Empty state: "Brak metod dostawy. Dodaj pierwszą metodę."
- Loading/error states handled

### FR-2: Per-Product Delivery Tab (ProductDeliveryTab)
- Load: `objects.list("delivery-method")` (global) + `getData(productId)` (per-product)
- Show checkbox list of all delivery methods (name + enabled/disabled checkbox)
- Disabled method = in disabledMethods array
- On toggle: update disabledMethods array, call setData(productId, { disabledMethods })
- "Włącz wszystkie" button: calls removeData(productId), clears all restrictions
- If no productId: show error message
- Loading/error states handled

### FR-3: Info Badge (ProductDeliveryInfoBadge)
- Compact, ~60px height max
- Load: `objects.list("delivery-method")` + `getData(productId)`
- Count active methods: total active - disabled for this product
- Show: `"X/Y metod dostępnych"` in appropriate badge color
- tc-badge--success if all enabled, tc-badge--danger if any disabled
- Returns null if no productId or no methods configured

## Technical Requirements

### TR-1: Plugin Architecture
- Vite + React 19 + TypeScript, port 3010, strictPort: true
- Plugin SDK loaded from http://localhost:8080/assets/plugin-sdk.js
- Plugin UI CSS loaded from http://localhost:8080/assets/plugin-ui.css
- SDK import: `import { getSDK } from "../../sdk"` (shared, never duplicate)
- All root elements: `<div className="tc-plugin">`

### TR-2: Data Storage
- Global methods: `thisPlugin.objects.save/list/delete("delivery-method", uuid, { name, enabled })`
- Per-product restrictions: `thisPlugin.setData(productId, { disabledMethods: string[] })`
- Reset: `thisPlugin.removeData(productId)`
- setData is full overwrite — always write complete disabledMethods array

### TR-3: Extension Points
- menu.main: label "Logistyka", icon "truck", path "/", priority 110
- product.detail.tabs: label "Dostawa", path "/product-delivery", priority 55
- product.detail.info: label "Dostawa", path "/product-delivery-info", priority 15

### TR-4: Manifest Registration
- PUT http://localhost:8080/api/plugins/logistics/manifest
- Plugin ID: "logistics"

## Scope Boundaries

**In scope:**
- CRUD for delivery methods (add/enable-disable/delete)
- Per-product disable/enable toggles
- Compact badge info
- Polish language UI labels

**Out of scope:**
- Authentication / role-based access
- Delivery pricing / zones / estimated delivery time
- Product.list.filters (not requested)
- Import/export of delivery methods
- Ordering/sorting of delivery methods

## Reusability

- Template: plugins/warehouse/ (primary — CRUD pattern)
- Template: plugins/box-size/ (secondary — getData/setData pattern)
- Shared: plugins/sdk.ts (types)
- Shared: plugin-ui.css (tc-* classes)
