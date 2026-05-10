# Gap Analysis: Create Customers Plugin

**Risk Level**: Low
**Effort Estimate**: Low
**Change Type**: Additive (greenfield new directory)

## Task Characteristics
- has_reproducible_defect: false
- modifies_existing_code: false
- creates_new_entities: true
- involves_data_operations: true
- ui_heavy: true

## Summary

No plugins/customers/ directory exists. The entire plugin must be created from scratch. All customer CRUD operations (list, create, edit, delete) must be built. This is purely additive — zero changes to the host application or any existing plugin. Warehouse plugin is the authoritative template.

## Gaps

| File | Purpose |
|------|---------|
| manifest.json | Plugin identity, port 3011, menu.main extension point |
| index.html | Loads SDK + plugin-ui.css from host |
| package.json | Dependencies mirroring warehouse plugin |
| vite.config.ts | Port 3011, strictPort: true |
| tsconfig.json | Identical to warehouse tsconfig |
| src/main.tsx | BrowserRouter, single Route path="/" |
| src/domain.ts | Customer interface + toCustomer mapper |
| src/pages/CustomersPage.tsx | Full CRUD UI |

## Data Lifecycle

| Operation | SDK Call | Status |
|-----------|---------|--------|
| CREATE | objects.save("customer", uuid, data) | Must be built |
| READ | objects.list("customer") | Must be built |
| UPDATE | objects.save("customer", existingId, data) | Must be built |
| DELETE | objects.delete("customer", id) | Must be built |

## Domain Model — Standard Fields

- Personal: firstName, lastName, email, phone
- Company: companyName, taxId (NIP), website
- Address: street, city, postalCode, country

## Decisions Needed

### Important: Edit UX Pattern
No established edit pattern in plugin codebase; 9-field form too large for inline row editing.
- Option A (default): Edit section below table — uses only host CSS classes
- Option B: Modal overlay — requires custom CSS

### Important: Optional Fields
- Option A: All fields optional
- Option B (default): Personal data (firstName + lastName) required, company/address optional

## Integration Points
- menu.main extension point via manifest.json
- PUT /api/plugins/customers/manifest registration endpoint
- SDK objects.list/save/delete for "customer" object type

## Risk
- Regression risk: None (purely additive)
- Integration risk: Low
- Complexity risk: Low
