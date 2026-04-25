import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { getSDK } from "../../../sdk";
import { ProductDeliveryInfoBadge } from "../pages/ProductDeliveryInfoBadge";

vi.mock("../../../sdk", () => ({
  getSDK: vi.fn(),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const mockObjects = {
  list: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
  listByEntity: vi.fn(),
};

const mockGetData = vi.fn();

function setupSdk(productId: string | undefined) {
  vi.mocked(getSDK).mockReturnValue({
    thisPlugin: {
      objects: mockObjects,
      getContext: vi.fn(),
      pluginId: "logistics",
      pluginName: "Logistics",
      productId,
      getData: mockGetData,
      setData: vi.fn(),
      removeData: vi.fn(),
    },
    hostApp: {
      getProducts: vi.fn(),
      getProduct: vi.fn(),
      getPlugins: vi.fn(),
      fetch: vi.fn(),
    },
  } as ReturnType<typeof getSDK>);
}

beforeEach(() => {
  vi.resetAllMocks();
  mockObjects.list.mockResolvedValue([]);
  mockGetData.mockResolvedValue(null);
});

describe("ProductDeliveryInfoBadge", () => {
  it("returns_null_whenNoProductId", async () => {
    setupSdk(undefined);
    const { container } = renderWithProviders(<ProductDeliveryInfoBadge />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
    expect(mockObjects.list).not.toHaveBeenCalled();
    expect(mockGetData).not.toHaveBeenCalled();
  });

  it("returns_null_whenNoActiveMethods", async () => {
    setupSdk("prod-1");
    mockObjects.list.mockResolvedValue([
      { id: "1", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-1", data: { name: "Kurier", enabled: false } },
      { id: "2", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-2", data: { name: "Paczkomat", enabled: false } },
    ]);
    mockGetData.mockResolvedValue({ disabledMethods: [] });

    const { container } = renderWithProviders(<ProductDeliveryInfoBadge />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("renders_successBadge_whenAllMethodsAvailable", async () => {
    setupSdk("prod-1");
    mockObjects.list.mockResolvedValue([
      { id: "1", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-1", data: { name: "Kurier", enabled: true } },
      { id: "2", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-2", data: { name: "Paczkomat", enabled: true } },
      { id: "3", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-3", data: { name: "Odbiór osobisty", enabled: true } },
    ]);
    mockGetData.mockResolvedValue({ disabledMethods: [] });

    const { container } = renderWithProviders(<ProductDeliveryInfoBadge />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });

    const badge = container.firstChild as HTMLElement;
    expect(badge.textContent).toBe("3/3 metod dostępnych");
    expect(badge.className).toContain("tc-badge--success");
  });

  it("renders_dangerBadge_whenSomeMethodsDisabled", async () => {
    setupSdk("prod-1");
    mockObjects.list.mockResolvedValue([
      { id: "1", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-1", data: { name: "Kurier", enabled: true } },
      { id: "2", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-2", data: { name: "Paczkomat", enabled: true } },
      { id: "3", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-3", data: { name: "Odbiór osobisty", enabled: true } },
    ]);
    mockGetData.mockResolvedValue({ disabledMethods: ["uuid-1"] });

    const { container } = renderWithProviders(<ProductDeliveryInfoBadge />);
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });

    const badge = container.firstChild as HTMLElement;
    expect(badge.textContent).toBe("2/3 metod dostępnych");
    expect(badge.className).toContain("tc-badge--danger");
  });
});
