import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { getSDK } from "../../../sdk";
import { LogisticsPage } from "../pages/LogisticsPage";
import { ProductDeliveryTab } from "../pages/ProductDeliveryTab";
import { ProductDeliveryInfoBadge } from "../pages/ProductDeliveryInfoBadge";

vi.mock("../../../sdk", () => ({
  getSDK: vi.fn(),
}));

const mockObjects = {
  list: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
  listByEntity: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getSDK).mockReturnValue({
    hostApp: {
      getProducts: vi.fn(),
      getProduct: vi.fn(),
      getPlugins: vi.fn(),
      fetch: vi.fn(),
    },
    thisPlugin: {
      objects: mockObjects,
      getContext: vi.fn(),
      pluginId: "logistics",
      pluginName: "Logistics",
      productId: undefined,
      getData: vi.fn(),
      setData: vi.fn(),
      removeData: vi.fn(),
    },
  } as ReturnType<typeof getSDK>);
  mockObjects.list.mockResolvedValue([]);
});

describe("LogisticsPage", () => {
  it("renders without crashing inside MemoryRouter", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <LogisticsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("Brak metod dostawy. Dodaj pierwszą metodę.")).toBeInTheDocument();
    });
  });
});

describe("main.tsx routes", () => {
  it("routes / to LogisticsPage", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<LogisticsPage />} />
          <Route path="/product-delivery" element={<ProductDeliveryTab />} />
          <Route
            path="/product-delivery-info"
            element={<ProductDeliveryInfoBadge />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("Brak metod dostawy. Dodaj pierwszą metodę.")).toBeInTheDocument();
    });
  });
});
