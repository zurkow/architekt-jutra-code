# Phase 1 Clarifications

## Task
Create shopping cart (koszyk) plugin on port 3012. Cart has customer reference, can contain many items.

## Clarifying Questions & Answers

1. **Customer entity type**: Customer is only a plugin_object (frontend).
   - `customerId` on Cart will be a `String` (UUID from the customers plugin_objects table), NOT a Long FK to a JPA entity.
   - No JPA cross-module relationship to Customer — just store the ID string.

2. **Cart status lifecycle**: Yes, simple enum status.
   - Values: ACTIVE / COMPLETED / ABANDONED.

3. **CartItem price**: Snapshot price at time of addition.
   - CartItem stores `unitPrice` (BigDecimal) — the price when the item was added to the cart.

4. **Frontend extension points**: Only `menu.main`.
   - Plugin shows in the main navigation as "Koszyk" with a cart management page.
   - No product.detail.info add-to-cart button needed.
