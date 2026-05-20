import { createMocks } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";

const mockRecommendCartProducts = jest.fn();

jest.mock("../../baml_client", () => ({
  b: {
    RecommendCartProducts: (...args: unknown[]) =>
      mockRecommendCartProducts(...args),
  },
}));

const mockGetProducts = jest.fn();

jest.mock("../../../server-sdk", () => ({
  createServerSDK: () => ({
    hostApp: {
      getProducts: (...args: unknown[]) => mockGetProducts(...args),
    },
  }),
}));

import handler from "../pages/api/recommend";

describe("POST /api/recommend", () => {
  beforeEach(() => {
    mockRecommendCartProducts.mockReset();
    mockGetProducts.mockReset();
  });

  test("missingCartItems_returns400", async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: "POST",
      body: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const body = JSON.parse(res._getData());
    expect(body.error).toBe("Missing required fields");
    expect(body.details).toContain("cartItems");
  });

  test("emptyCartItemsArray_returns400", async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: "POST",
      body: { cartItems: [] },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const body = JSON.parse(res._getData());
    expect(body.error).toBe("Missing required fields");
    expect(body.details).toContain("cartItems");
  });

  test("validRequest_callsGetProductsAndFiltersCartItems", async () => {
    const cartItems = [
      { productId: 42, productName: "Widget A", quantity: 2, unitPrice: 10.0 },
    ];
    const allProducts = [
      { id: 42, name: "Widget A", price: 10.0, description: "A widget" },
      { id: 99, name: "Widget B", price: 20.0, description: "Another widget" },
    ];
    mockGetProducts.mockResolvedValue(allProducts);
    mockRecommendCartProducts.mockResolvedValue([]);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: "POST",
      body: { cartItems },
    });

    await handler(req, res);

    expect(mockGetProducts).toHaveBeenCalled();
    const bamlCall = mockRecommendCartProducts.mock.calls[0];
    // cartItemsContext string
    expect(bamlCall[0]).toContain("Widget A");
    // availableProductsContext should only contain product 99, not 42
    const availableContext: string = bamlCall[1];
    expect(availableContext).toContain("Widget B");
    expect(availableContext).not.toContain("Widget A");
  });

  test("bamlSuccess_returns3Recommendations", async () => {
    const cartItems = [
      { productId: 1, productName: "Existing Item", quantity: 1, unitPrice: 5.0 },
    ];
    const allProducts = [
      { id: 2, name: "Product Two", price: 15.0, description: "Desc two" },
      { id: 3, name: "Product Three", price: 25.0, description: "Desc three" },
      { id: 4, name: "Product Four", price: 35.0, description: "Desc four" },
    ];
    const recommendations = [
      { productId: 2, productName: "Product Two", productDescription: "Desc two", productPrice: 15.0, reasoning: "Good match" },
      { productId: 3, productName: "Product Three", productDescription: "Desc three", productPrice: 25.0, reasoning: "Complementary" },
      { productId: 4, productName: "Product Four", productDescription: "Desc four", productPrice: 35.0, reasoning: "Upsell opportunity" },
    ];
    mockGetProducts.mockResolvedValue(allProducts);
    mockRecommendCartProducts.mockResolvedValue(recommendations);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: "POST",
      body: { cartItems },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body).toHaveLength(3);
    expect(body[0]).toMatchObject({
      productId: 2,
      productName: "Product Two",
      productDescription: "Desc two",
      productPrice: 15.0,
      reasoning: "Good match",
    });
  });

  test("bamlFailure_returns500WithoutInternalDetails", async () => {
    const cartItems = [
      { productId: 1, productName: "Existing Item", quantity: 1, unitPrice: 5.0 },
    ];
    mockGetProducts.mockResolvedValue([
      { id: 2, name: "Other Product", price: 10.0, description: "Other" },
    ]);
    mockRecommendCartProducts.mockRejectedValue(
      new Error("LLM provider timeout at /internal/baml/path")
    );

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: "POST",
      body: { cartItems },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const body = JSON.parse(res._getData());
    expect(body.error).toBeDefined();
    expect(body.error).not.toContain("LLM provider timeout");
    expect(body.error).not.toContain("/internal/baml/path");
  });

  test("nonPostMethod_returns405", async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: "GET",
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const body = JSON.parse(res._getData());
    expect(body.error).toBeDefined();
  });

  test("getProductsFailure_returns500", async () => {
    const cartItems = [
      { productId: 1, productName: "Existing Item", quantity: 1, unitPrice: 5.0 },
    ];
    mockGetProducts.mockRejectedValue(new Error("Host API unavailable"));

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: "POST",
      body: { cartItems },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const body = JSON.parse(res._getData());
    expect(body.error).toBeDefined();
    expect(body.error).not.toContain("Host API unavailable");
  });
});
