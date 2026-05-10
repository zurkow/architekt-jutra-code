# Requirements: Customers Plugin

## Initial Description
Create plugin customers in directory: plugins/customers/. Use port 3011.
Customer should have personal data, company data, address data. For now do not use any orders.

## Q&A — Phase 1 Clarifications
- **Backend?** Frontend-only — SDK objects API (plugin_objects table via host)
- **Extension points?** menu.main only — standalone Customers list page from sidebar
- **Fields?** Standard: Personal (firstName, lastName, email, phone), Company (companyName, taxId/NIP, website), Address (street, city, postalCode, country)

## Q&A — Phase 2 Scope Decisions
- **Edit UX?** Edit section below the table (host CSS only, no custom styles)
- **Required fields?** firstName + lastName required; all other fields optional

## Q&A — Phase 5 Requirements
- **User journey?** Sales / admin team managing client records. Maintain a directory of business clients — look up contact details, add new clients, update company info.
- **Search?** Yes — a text search/filter field above the table (client-side filtering by name/email)
- **Visuals?** None provided

## Similar Features to Reference
- `plugins/warehouse/src/pages/WarehousePage.tsx` — CRUD pattern with SDK objects API
- `plugins/warehouse/src/domain.ts` — domain type + toX() mapper pattern
- `plugins/warehouse/manifest.json` — manifest structure
- `plugins/sdk.ts` — shared SDK types and API

## Functional Requirements Summary

### FR-1: Customer List
- Display all customers in a tc-table with columns: Name (firstName + lastName), Email, Company, City, Actions
- Load via sdk.thisPlugin.objects.list("customer") on mount
- Show loading state while fetching
- Show empty state when no customers exist

### FR-2: Search / Filter
- Text input above the table
- Client-side filtering on firstName, lastName, email fields (case-insensitive)
- Filter updates the displayed rows in real-time

### FR-3: Create Customer
- "New Customer" button above the table
- Shows a form section (below or above the table) with all fields grouped into three sections: Personal Data, Company Data, Address Data
- Required: firstName, lastName
- Optional: all other fields
- Save via sdk.thisPlugin.objects.save("customer", crypto.randomUUID(), data)
- Cancel closes the form without saving

### FR-4: Edit Customer
- "Edit" button per row
- Clicking Edit shows the same form section (below the table) pre-filled with the customer's data
- Save via sdk.thisPlugin.objects.save("customer", existingObjectId, data) (upsert)
- Cancel closes the form

### FR-5: Delete Customer
- "Delete" button per row
- No confirmation dialog (consistent with warehouse plugin pattern)
- Delete via sdk.thisPlugin.objects.delete("customer", objectId)
- Row is removed from the list after successful deletion

### FR-6: Error Handling
- All SDK calls wrapped in try/catch
- Show tc-error message on failure

## Scope Boundaries
- **In scope**: CRUD for customers, client-side search, menu.main extension point, port 3011
- **Out of scope**: Orders (explicit exclusion), product linking, backend JPA entity, product.detail.tabs, any other extension points

## Technical Considerations
- Use warehouse plugin as file-by-file template
- Import PluginObject type from ../../sdk (never redefined)
- Use tc-* host CSS classes exclusively (no inline styles, no custom CSS)
- All SDK calls must be async/await with try/catch
- TypeScript strict mode
- objectId: crypto.randomUUID() on create, existing objectId on update
- Object type string: "customer"
