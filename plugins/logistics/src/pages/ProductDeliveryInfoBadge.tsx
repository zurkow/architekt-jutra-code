import { useEffect, useState } from "react";
import { getSDK } from "../../../sdk";
import { toDeliveryMethod } from "../domain";
import type { ProductDeliveryData } from "../domain";

export function ProductDeliveryInfoBadge() {
  const [label, setLabel] = useState<string | null>(null);
  const [badgeClass, setBadgeClass] = useState("tc-badge--success");
  const [loading, setLoading] = useState(true);

  const sdk = getSDK();
  const productId = sdk.thisPlugin.productId ?? "";

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const [methodObjects, rawData] = await Promise.all([
          sdk.thisPlugin.objects.list("delivery-method"),
          sdk.thisPlugin.getData(productId),
        ]);

        const activeMethods = methodObjects.map(toDeliveryMethod).filter((m) => m.enabled);

        if (activeMethods.length === 0) {
          return;
        }

        const data = rawData as ProductDeliveryData | null;
        const disabledSet = new Set(activeMethods.map((m) => m.objectId));
        const disabledForProduct = data?.disabledMethods?.filter((id) => disabledSet.has(id)).length ?? 0;
        const available = activeMethods.length - disabledForProduct;
        const total = activeMethods.length;

        setLabel(`${available}/${total} metod dostępnych`);
        setBadgeClass(available === total ? "tc-badge--success" : "tc-badge--danger");
      } catch {
        // no data yet — leave label null
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [productId]);

  if (loading || !label) return null;

  return <span className={`tc-badge ${badgeClass}`}>{label}</span>;
}
