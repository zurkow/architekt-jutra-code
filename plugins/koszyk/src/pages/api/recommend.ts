import type { NextApiRequest, NextApiResponse } from "next";
import { b } from "../../../baml_client";
import { createServerSDK } from "../../../../server-sdk";
import type { ProductRecommendation } from "../../domain";

interface RecommendRequest {
  cartItems: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

interface ErrorResponse {
  error: string;
  details?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProductRecommendation[] | ErrorResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as Partial<RecommendRequest>;
  const cartItems = body.cartItems;

  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({
      error: "Missing required fields",
      details: ["cartItems"],
    });
  }

  const sdk = createServerSDK("koszyk", undefined, req);

  try {
    const allProducts = await sdk.hostApp.getProducts() as Array<{ id: number; name: string; price: number; description?: string }>;

    const cartProductIds = new Set(cartItems.map((i) => Number(i.productId)));
    const availableProducts = allProducts.filter((p) => !cartProductIds.has(Number(p.id)));

    const cartItemsContext = cartItems
      .map((i) => `${i.productName} x${i.quantity} @ ${i.unitPrice}`)
      .join("\n");

    const availableProductsContext = availableProducts
      .map((p) => `${p.id}: ${p.name} — ${p.description ?? ""} — ${p.price}`)
      .join("\n");

    const result = await b.RecommendCartProducts(cartItemsContext, availableProductsContext);

    return res.status(200).json(result as ProductRecommendation[]);
  } catch (err) {
    console.error("Recommend failed:", err);
    return res.status(500).json({ error: "Failed to generate recommendations." });
  }
}
