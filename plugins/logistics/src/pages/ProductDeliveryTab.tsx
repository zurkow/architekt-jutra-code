import { useEffect, useState } from "react";
import { getSDK } from "../../../sdk";
import type { DeliveryMethod, ProductDeliveryData } from "../domain";
import { toDeliveryMethod } from "../domain";

export function ProductDeliveryTab() {
  const sdk = getSDK();
  const productId = sdk.thisPlugin.productId ?? "";

  const [methods, setMethods] = useState<DeliveryMethod[]>([]);
  const [disabledMethods, setDisabledMethods] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const [objects, data] = await Promise.all([
          sdk.thisPlugin.objects.list("delivery-method"),
          sdk.thisPlugin.getData(productId),
        ]);
        setMethods(objects.map(toDeliveryMethod));
        const delivery = data as ProductDeliveryData | null;
        setDisabledMethods(delivery?.disabledMethods ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Błąd ładowania danych.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [productId]);

  function handleToggle(methodId: string, currentlyDisabled: boolean) {
    let updated: string[];
    if (currentlyDisabled) {
      // Checkbox was unchecked (method disabled) → now checking: remove from disabled list
      updated = disabledMethods.filter((id) => id !== methodId);
    } else {
      // Checkbox was checked (method enabled) → now unchecking: add to disabled list
      updated = [...disabledMethods, methodId];
    }
    setDisabledMethods(updated);
    // Full overwrite — setData always receives the complete disabledMethods array
    void sdk.thisPlugin.setData(productId, { disabledMethods: updated });
  }

  function handleReset() {
    void sdk.thisPlugin.removeData(productId);
    setDisabledMethods([]);
  }

  if (!productId) {
    return (
      <div className="tc-plugin">
        <p className="tc-error">Brak kontekstu produktu.</p>
      </div>
    );
  }

  if (loading) return <div className="tc-plugin" style={{ padding: "1rem" }}>Ładowanie...</div>;

  const activeMethods = methods.filter((m) => m.enabled);

  return (
    <div className="tc-plugin" style={{ padding: "1rem" }}>
      <div className="tc-flex" style={{ marginBottom: "1rem" }}>
        <button className="tc-ghost-button" onClick={handleReset}>
          Włącz wszystkie
        </button>
      </div>
      {error && <p className="tc-error">{error}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {activeMethods.map((method) => {
          const isDisabled = disabledMethods.includes(method.objectId);
          return (
            <label key={method.objectId} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={!isDisabled}
                onChange={() => handleToggle(method.objectId, isDisabled)}
              />
              {method.name}
            </label>
          );
        })}
      </div>
    </div>
  );
}
