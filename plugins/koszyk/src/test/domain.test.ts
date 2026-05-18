import { toCart, toCartItem, toCustomerSummary } from "../domain";

describe("domain mappers", () => {
  describe("toCart", () => {
    it("maps PluginObject fields to Cart interface", () => {
      const obj = {
        objectId: "cart-abc",
        objectType: "cart",
        data: {
          customerId: "customer-123",
          customerName: "Jan Kowalski",
          status: "ACTIVE",
          createdAt: "2026-01-15T10:00:00Z",
        },
      };

      const cart = toCart(obj as never);

      expect(cart.objectId).toBe("cart-abc");
      expect(cart.customerId).toBe("customer-123");
      expect(cart.customerName).toBe("Jan Kowalski");
      expect(cart.status).toBe("ACTIVE");
      expect(cart.createdAt).toBe("2026-01-15T10:00:00Z");
    });

    it("defaults missing optional fields gracefully without throwing", () => {
      const sparseObj = {
        objectId: "cart-sparse",
        objectType: "cart",
        data: {},
      };

      expect(() => toCart(sparseObj as never)).not.toThrow();
    });
  });

  describe("toCartItem", () => {
    it("maps PluginObject fields to CartItem interface", () => {
      const obj = {
        objectId: "cart-abc-42",
        objectType: "cart-item",
        data: {
          cartId: "cart-abc",
          productId: 42,
          productName: "Widget Pro",
          quantity: 3,
          unitPrice: 19.99,
        },
      };

      const item = toCartItem(obj as never);

      expect(item.objectId).toBe("cart-abc-42");
      expect(item.cartId).toBe("cart-abc");
      expect(item.productId).toBe(42);
      expect(item.productName).toBe("Widget Pro");
      expect(item.quantity).toBe(3);
      expect(item.unitPrice).toBe(19.99);
    });

    it("composite objectId ${cartId}-${productId} round-trips through mapper", () => {
      const cartId = "cart-xyz";
      const productId = 7;
      const compositeId = `${cartId}-${productId}`;

      const obj = {
        objectId: compositeId,
        objectType: "cart-item",
        data: {
          cartId,
          productId,
          productName: "Sprocket",
          quantity: 1,
          unitPrice: 5.5,
        },
      };

      const item = toCartItem(obj as never);

      expect(item.objectId).toBe(compositeId);
      expect(item.cartId).toBe(cartId);
      expect(item.productId).toBe(productId);
    });
  });

  describe("toCustomerSummary", () => {
    it("maps raw fetch response shape to CustomerSummary", () => {
      const raw = {
        objectId: "cust-99",
        data: {
          firstName: "Anna",
          lastName: "Nowak",
        },
      };

      const summary = toCustomerSummary(raw);

      expect(summary.objectId).toBe("cust-99");
      expect(summary.firstName).toBe("Anna");
      expect(summary.lastName).toBe("Nowak");
    });
  });
});
