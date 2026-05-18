# Requirements: Shopping Cart Plugin (Koszyk)

## Initial Description
"Utwórz funkcjonalność koszyka. Koszyk ma referencję na klienta. Koszyk może zawierać wiele pozycji. Zrób plugin z portem 3012."

---

## Q&A Session

**Q1: Customer entity type**
→ Customer is only a plugin_object from the customers frontend plugin (String UUID), NOT a JPA entity.

**Q2: Cart status?**
→ Yes — ACTIVE, COMPLETED, ABANDONED enum.

**Q3: CartItem price handling?**
→ Snapshot unitPrice at time of addition (BigDecimal).

**Q4: Frontend extension points?**
→ menu.main only (no product.detail.info).

**Q5: Backend storage strategy?**
→ Plugin objects via SDK (frontend-only, no Java backend code).

**Q6: CartItem product reference type?**
→ productId as Long (product's numeric ID from products table, stored in plugin_object JSONB).

**Q7: CartItem quantity?**
→ Yes, include quantity (Integer). Default accepted.

**Q8: UI structure?**
→ Two-section layout (default accepted). Cart list top + selected cart's items bottom.

**Q9: User journey?**
→ Employee manually creates a cart for a customer, adds products, manages status.

**Q10: CRUD operations needed?**
→ All: Create cart, Update status, Delete cart, Add/Remove items.

**Q11: Product selection method?**
→ Dropdown from hostApp.getProducts().

**Q12: Customer selection method?**
→ Dropdown from customers plugin objects list.

**Q13: Customer display in cart list?**
→ First name + last name (snapshot as customerName field).

**Q14: Snapshot product name in CartItem?**
→ Yes — store productName snapshot alongside productId.

**Q15: UI visual pattern?**
→ Warehouse plugin (two-section: warehouses list + stock entries).

---

## Functional Requirements Summary

### FR-01: Cart Entity (plugin_object type: "cart")
- Fields: `customerId` (String UUID), `customerName` (String snapshot), `status` (ACTIVE|COMPLETED|ABANDONED)
- Operations: Create, Read, Update status, Delete (with cascade delete of cart items)

### FR-02: CartItem Entity (plugin_object type: "cartItem")
- Fields: `cartId` (String, reference to parent cart), `productId` (number), `productName` (String snapshot), `quantity` (number), `unitPrice` (number)
- Operations: Add to cart, Remove from cart

### FR-03: CartPage (menu.main, path="/")
- Two-section layout matching WarehousePage:
  - Top: Cart list table [Customer Name, Status badge, Items count, Created, Actions]
  - Bottom: Selected cart's items table [Product Name, Quantity, Unit Price, Actions]
- Create cart button → modal with customer dropdown (from customers plugin objects)
- Status update (inline dropdown or button group)
- Delete cart (with confirmation)

### FR-04: Add Item Flow
- "Add item" button in the items section
- Form: product dropdown (from hostApp.getProducts()), quantity input, unit price (auto-filled from product price, editable)
- Save → creates cartItem plugin_object

### FR-05: Customer Dropdown
- Load customer list from customers plugin (via API endpoint: needs verification in implementation)
- Display: firstName + lastName
- Store: customerId (UUID) + customerName snapshot

### FR-06: Plugin Configuration
- Port: 3012
- Extension point: menu.main
- Icon: "shopping-cart" (Lucide)
- Label: "Koszyk"

---

## Similar Features Identified

- **Warehouse plugin**: Direct UI template — WarehousePage.tsx (two-section layout: warehouses + stock entries)
- **Customers plugin**: Scaffold template — manifest.json, vite.config.ts, package.json, index.html
- **Box-size plugin**: Simpler reference for single-entity plugins

---

## Visual Assets

No mockups provided. Follow Warehouse plugin UI pattern.

---

## Technical Considerations

1. **Customer data access**: The koszyk plugin needs customer list from the customers plugin. Needs investigation: does the host expose a cross-plugin objects API, or is there a `/api/customers` REST endpoint?
2. **plugin_object IDs**: Cart ID will be auto-generated UUID by the SDK. CartItem IDs will use composite key `${cartId}-${productId}` (warehouse pattern).
3. **Cart-to-items linking**: CartItems store `cartId` field. To load items for a cart: `thisPlugin.objects.list("cartItem", { filter: { cartId: cart.objectId } })` — OR store cartItems inline in the cart plugin_object.
4. **Cascade delete**: When deleting a cart, must also delete all its cartItems.

---

## Scope Boundaries

**In scope:**
- Frontend Vite/React plugin on port 3012
- Cart + CartItem plugin_objects
- CRUD operations for carts and items
- Customer dropdown integration
- Product dropdown integration
- Cart status management

**Out of scope:**
- Java backend code / JPA entities
- Checkout / payment processing
- Add-to-cart from product detail pages
- Cart total calculation display (optional enhancement)
