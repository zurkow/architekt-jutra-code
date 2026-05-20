import { useEffect, useState, useCallback } from "react";
import { getSDK } from "../../../sdk";
import { toCart, toCartItem, toCustomerSummary } from "../domain";
import type { Cart, CartItem, CustomerSummary, Product, ProductRecommendation } from "../domain";

export function CartPage() {
  // Step 3.3 — state declarations
  const [carts, setCarts] = useState<Cart[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");

  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newProductId, setNewProductId] = useState("");
  const [newQuantity, setNewQuantity] = useState(1);
  const [newUnitPrice, setNewUnitPrice] = useState(0);

  const [recommendations, setRecommendations] = useState<ProductRecommendation[] | null>(null);
  const [recommending, setRecommending] = useState(false);

  // Step 3.4 — data-loading callbacks
  const loadCarts = useCallback(async () => {
    try {
      const sdk = getSDK();
      const objects = await sdk.thisPlugin.objects.list("cart");
      setCarts(objects.map(toCart));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load carts");
    }
  }, []);

  const loadCartItems = useCallback(async (cartId: string) => {
    try {
      const sdk = getSDK();
      const objects = await sdk.thisPlugin.objects.list("cartItem", {
        filter: "cartId:eq:" + cartId,
      });
      setCartItems(objects.map(toCartItem));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cart items");
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const sdk = getSDK();
      const response = await sdk.hostApp.fetch("/api/plugins/customers/objects/customer");
      const raw = JSON.parse(response.body) as Array<{
        objectId: string;
        data: { firstName: string; lastName: string };
      }>;
      setCustomers(raw.map(toCustomerSummary));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const sdk = getSDK();
      const data = (await sdk.hostApp.getProducts()) as Product[];
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    }
  }, []);

  useEffect(() => {
    Promise.all([loadCarts(), loadCustomers(), loadProducts()]).finally(() =>
      setLoading(false),
    );
  }, [loadCarts, loadCustomers, loadProducts]);

  useEffect(() => {
    if (selectedCartId) {
      setRecommendations(null);
      void loadCartItems(selectedCartId);
    } else {
      setRecommendations(null);
      setCartItems([]);
    }
  }, [selectedCartId, loadCartItems]);

  // Step 3.5 — cart mutation handlers
  async function handleCreateCart() {
    if (!newCustomerId) {
      setError("Wybierz klienta.");
      return;
    }
    setError(null);
    try {
      const sdk = getSDK();
      await sdk.thisPlugin.objects.save("cart", crypto.randomUUID(), {
        customerId: newCustomerId,
        customerName: newCustomerName,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      });
      setShowCreateForm(false);
      setNewCustomerId("");
      setNewCustomerName("");
      await loadCarts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create cart");
    }
  }

  async function handleUpdateStatus(cart: Cart, newStatus: Cart["status"]) {
    setError(null);
    try {
      const sdk = getSDK();
      await sdk.thisPlugin.objects.save("cart", cart.objectId, {
        customerId: cart.customerId,
        customerName: cart.customerName,
        status: newStatus,
        createdAt: cart.createdAt,
      });
      await loadCarts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update cart status");
    }
  }

  async function handleDeleteCart(cartId: string) {
    if (!window.confirm("Usunąć koszyk?")) return;
    setError(null);
    try {
      const sdk = getSDK();
      const items = await sdk.thisPlugin.objects.list("cartItem", {
        filter: "cartId:eq:" + cartId,
      });
      await Promise.all(
        items.map((item) => sdk.thisPlugin.objects.delete("cartItem", item.objectId)),
      );
      await sdk.thisPlugin.objects.delete("cart", cartId);
      if (selectedCartId === cartId) {
        setSelectedCartId(null);
      }
      await loadCarts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete cart");
    }
  }

  // Step 3.6 — cart item mutation handlers
  async function addProductToCart(productId: number, productName: string, unitPrice: number) {
    if (!selectedCartId) return;
    const sdk = getSDK();
    await sdk.thisPlugin.objects.save(
      "cartItem",
      `${selectedCartId}-${productId}`,
      {
        cartId: selectedCartId,
        productId,
        productName,
        quantity: 1,
        unitPrice,
      },
    );
    await loadCartItems(selectedCartId);
  }

  async function handleAddItem() {
    if (!selectedCartId || !newProductId || newQuantity < 1) return;
    setError(null);
    const selectedProduct = products.find((p) => String(p.id) === newProductId);
    try {
      const sdk = getSDK();
      await sdk.thisPlugin.objects.save(
        "cartItem",
        `${selectedCartId}-${newProductId}`,
        {
          cartId: selectedCartId,
          productId: Number(newProductId),
          productName: selectedProduct?.name ?? newProductId,
          quantity: newQuantity,
          unitPrice: newUnitPrice,
        },
      );
      setShowAddItemForm(false);
      setNewProductId("");
      setNewQuantity(1);
      setNewUnitPrice(0);
      await loadCartItems(selectedCartId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    }
  }

  async function handleRecommend() {
    const currentCartItems = cartItems.filter((i) => i.cartId === selectedCartId);
    if (!selectedCartId || currentCartItems.length === 0) return;
    setError(null);
    setRecommending(true);
    try {
      const sdk = getSDK();
      const token = await sdk.hostApp.getToken();
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cartItems: currentCartItems }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to get recommendations.");
        return;
      }
      const result = (await response.json()) as ProductRecommendation[];
      setRecommendations(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get recommendations.");
    } finally {
      setRecommending(false);
    }
  }

  async function handleRemoveItem(item: CartItem) {
    setError(null);
    try {
      const sdk = getSDK();
      await sdk.thisPlugin.objects.delete("cartItem", item.objectId);
      await loadCartItems(selectedCartId!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove item");
    }
  }

  function handleProductChange(productId: string) {
    setNewProductId(productId);
    const product = products.find((p) => String(p.id) === productId);
    setNewUnitPrice(product?.price ?? 0);
  }

  if (loading) return <p>Loading...</p>;

  const selectedCart = carts.find((c) => c.objectId === selectedCartId);
  const currentCartItems = cartItems.filter((i) => i.cartId === selectedCartId);

  return (
    <div className="tc-plugin" style={{ padding: "1rem", maxWidth: 800 }}>
      <h1>Koszyki</h1>
      {error && <p className="tc-error">{error}</p>}

      {/* Step 3.7 — cart list section */}
      <section className="tc-section">
        <div className="tc-flex" style={{ marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, flexGrow: 1 }}>Koszyki</h2>
          <button
            className="tc-primary-button"
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            Nowy koszyk
          </button>
        </div>

        {/* Step 3.8 — inline create cart form */}
        {showCreateForm && (
          <div className="tc-card" style={{ marginBottom: "1rem", padding: "1rem" }}>
            <div className="tc-flex">
              <select
                className="tc-select"
                value={newCustomerId}
                onChange={(e) => {
                  const option = e.target.options[e.target.selectedIndex];
                  setNewCustomerId(e.target.value);
                  setNewCustomerName(option.text);
                }}
              >
                <option value="">-- Wybierz klienta --</option>
                {customers.map((c) => (
                  <option key={c.objectId} value={c.objectId}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
              <button
                className="tc-primary-button"
                onClick={() => void handleCreateCart()}
                disabled={!newCustomerId}
              >
                Utwórz
              </button>
            </div>
            {!newCustomerId && showCreateForm && (
              <p className="tc-error" style={{ marginTop: "0.5rem" }}>
                Wybierz klienta, aby utworzyć koszyk.
              </p>
            )}
          </div>
        )}

        {carts.length === 0 ? (
          <p>Brak koszyków.</p>
        ) : (
          <table className="tc-table">
            <thead>
              <tr>
                <th>Klient</th>
                <th>Status</th>
                <th>Pozycje</th>
                <th>Utworzono</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {carts.map((cart) => {
                const itemCount = cartItems.filter(
                  (i) => i.cartId === cart.objectId,
                ).length;
                const isSelected = selectedCartId === cart.objectId;
                const badgeClass =
                  cart.status === "ACTIVE"
                    ? "tc-badge tc-badge--success"
                    : cart.status === "ABANDONED"
                      ? "tc-badge tc-badge--danger"
                      : "tc-badge";
                return (
                  <tr
                    key={cart.objectId}
                    onClick={() =>
                      setSelectedCartId(isSelected ? null : cart.objectId)
                    }
                    style={{
                      cursor: "pointer",
                      backgroundColor: isSelected ? "#e8f0fe" : undefined,
                    }}
                  >
                    <td>{cart.customerName}</td>
                    <td>
                      <span className={badgeClass}>{cart.status}</span>
                    </td>
                    <td>{itemCount}</td>
                    <td>{cart.createdAt}</td>
                    <td>
                      <button
                        className="tc-ghost-button tc-ghost-button--danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteCart(cart.objectId);
                        }}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Step 3.9 — cart items section */}
      {selectedCartId !== null && (
        <section className="tc-section">
          <div className="tc-flex" style={{ marginBottom: "1rem" }}>
            <h2 style={{ margin: 0, flexGrow: 1 }}>
              Pozycje — {selectedCart?.customerName ?? selectedCartId}
            </h2>
            <select
              className="tc-select"
              value={selectedCart?.status ?? ""}
              onChange={(e) =>
                selectedCart &&
                void handleUpdateStatus(selectedCart, e.target.value as Cart["status"])
              }
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="ABANDONED">ABANDONED</option>
            </select>
            <button
              className="tc-primary-button"
              onClick={() => setShowAddItemForm((prev) => !prev)}
            >
              Dodaj produkt
            </button>
            <button
              className="tc-primary-button"
              onClick={() => void handleRecommend()}
              disabled={!selectedCartId || currentCartItems.length === 0 || recommending}
            >
              {recommending ? "Generowanie..." : "Rekomenduj"}
            </button>
          </div>

          {/* Step 3.10 — inline add item form */}
          {showAddItemForm && (
            <div className="tc-card" style={{ marginBottom: "1rem", padding: "1rem" }}>
              <div className="tc-flex">
                <select
                  className="tc-select"
                  value={newProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                >
                  <option value="">-- Wybierz produkt --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  className="tc-input"
                  type="number"
                  min={1}
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(Number(e.target.value))}
                />
                <input
                  className="tc-input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={newUnitPrice}
                  onChange={(e) => setNewUnitPrice(Number(e.target.value))}
                />
                <button
                  className="tc-primary-button"
                  onClick={() => void handleAddItem()}
                >
                  Dodaj
                </button>
              </div>
            </div>
          )}

          {currentCartItems.length === 0 ? (
            <p>Brak pozycji w koszyku.</p>
          ) : (
            <table className="tc-table">
              <thead>
                <tr>
                  <th>Produkt</th>
                  <th align="right">Ilość</th>
                  <th align="right">Cena jedn.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {currentCartItems.map((item) => (
                  <tr key={item.objectId}>
                    <td>{item.productName}</td>
                    <td align="right">{item.quantity}</td>
                    <td align="right">{item.unitPrice}</td>
                    <td>
                      <button
                        className="tc-ghost-button tc-ghost-button--danger"
                        onClick={() => void handleRemoveItem(item)}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {recommendations !== null && (
        <section className="tc-section">
          <h3>Rekomendacje AI</h3>
          {recommendations.map((rec) => (
            <div key={rec.productId} className="tc-card" style={{ padding: "1rem", marginBottom: "0.5rem" }}>
              <strong>{rec.productName}</strong>
              <p>{rec.productDescription}</p>
              <p>Cena: {rec.productPrice}</p>
              <p><em>{rec.reasoning}</em></p>
              <button
                className="tc-ghost-button"
                onClick={() => void addProductToCart(rec.productId, rec.productName, rec.productPrice)}
              >
                Dodaj do koszyka
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
