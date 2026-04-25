import { useEffect, useState } from "react";
import { getSDK } from "../../../sdk";
import { toDeliveryMethod } from "../domain";
import type { DeliveryMethod } from "../domain";

export function LogisticsPage() {
  const [methods, setMethods] = useState<DeliveryMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  async function loadMethods() {
    try {
      const sdk = getSDK();
      const objects = await sdk.thisPlugin.objects.list("delivery-method");
      setMethods(objects.map(toDeliveryMethod));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load delivery methods");
    }
  }

  useEffect(() => {
    void loadMethods().finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!newName.trim()) return;
    setError(null);
    try {
      const sdk = getSDK();
      const id = crypto.randomUUID();
      await sdk.thisPlugin.objects.save("delivery-method", id, { name: newName, enabled: true });
      setNewName("");
      await loadMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add delivery method");
    }
  }

  async function handleToggle(method: DeliveryMethod) {
    setError(null);
    try {
      const sdk = getSDK();
      await sdk.thisPlugin.objects.save("delivery-method", method.objectId, { name: method.name, enabled: !method.enabled });
      await loadMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update delivery method");
    }
  }

  async function handleDelete(objectId: string) {
    setError(null);
    try {
      const sdk = getSDK();
      await sdk.thisPlugin.objects.delete("delivery-method", objectId);
      await loadMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete delivery method");
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div className="tc-plugin">
      {error && <p className="tc-error">{error}</p>}

      <div className="tc-flex">
        <input
          className="tc-input"
          placeholder="Nazwa"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="tc-primary-button" onClick={() => void handleAdd()}>Dodaj</button>
      </div>

      {methods.length === 0 ? (
        <p>Brak metod dostawy. Dodaj pierwszą metodę.</p>
      ) : (
        <table className="tc-table">
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {methods.map((method) => (
              <tr key={method.objectId}>
                <td>{method.name}</td>
                <td>
                  <span className={`tc-badge ${method.enabled ? "tc-badge--success" : "tc-badge--danger"}`}>
                    {method.enabled ? "Aktywna" : "Nieaktywna"}
                  </span>
                </td>
                <td>
                  <button
                    className="tc-ghost-button"
                    onClick={() => void handleToggle(method)}
                  >
                    {method.enabled ? "Wyłącz" : "Włącz"}
                  </button>
                  <button
                    className="tc-ghost-button tc-ghost-button--danger"
                    onClick={() => void handleDelete(method.objectId)}
                  >
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
