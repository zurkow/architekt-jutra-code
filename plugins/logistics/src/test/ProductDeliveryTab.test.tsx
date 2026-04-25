import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { getSDK } from "../../../sdk";
import { ProductDeliveryTab } from "../pages/ProductDeliveryTab";

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
const mockSetData = vi.fn();
const mockRemoveData = vi.fn();

function setupSdk(productId: string | undefined) {
  vi.mocked(getSDK).mockReturnValue({
    thisPlugin: {
      objects: mockObjects,
      getContext: vi.fn(),
      pluginId: "logistics",
      pluginName: "Logistics",
      productId,
      getData: mockGetData,
      setData: mockSetData,
      removeData: mockRemoveData,
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
  mockSetData.mockResolvedValue({});
  mockRemoveData.mockResolvedValue({});
});

describe("ProductDeliveryTab", () => {
  it("renders_error_whenNoProductId", async () => {
    setupSdk(undefined);
    renderWithProviders(<ProductDeliveryTab />);
    await waitFor(() => {
      expect(screen.getByText("Brak kontekstu produktu.")).toBeInTheDocument();
    });
    expect(mockObjects.list).not.toHaveBeenCalled();
    expect(mockGetData).not.toHaveBeenCalled();
  });

  it("renders_onlyEnabledMethods_asCheckboxes", async () => {
    setupSdk("prod-1");
    mockObjects.list.mockResolvedValue([
      { id: "1", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-1", data: { name: "Kurier", enabled: true } },
      { id: "2", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-2", data: { name: "Paczkomat", enabled: false } },
      { id: "3", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-3", data: { name: "Odbiór osobisty", enabled: true } },
    ]);
    mockGetData.mockResolvedValue({ disabledMethods: [] });

    renderWithProviders(<ProductDeliveryTab />);

    await waitFor(() => {
      expect(screen.getByLabelText("Kurier")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Odbiór osobisty")).toBeInTheDocument();
    expect(screen.queryByLabelText("Paczkomat")).not.toBeInTheDocument();
  });

  it("handleToggle_addsUUID_toDisabledMethods_andCallsSetData", async () => {
    setupSdk("prod-1");
    mockObjects.list.mockResolvedValue([
      { id: "1", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-1", data: { name: "Kurier", enabled: true } },
    ]);
    mockGetData.mockResolvedValue({ disabledMethods: [] });

    renderWithProviders(<ProductDeliveryTab />);

    await waitFor(() => {
      expect(screen.getByLabelText("Kurier")).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText("Kurier");
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockSetData).toHaveBeenCalledWith("prod-1", { disabledMethods: ["uuid-1"] });
    });
  });

  it("showsError_whenSDKThrows", async () => {
    setupSdk("prod-1");
    mockObjects.list.mockRejectedValue(new Error("Fetch error"));

    renderWithProviders(<ProductDeliveryTab />);

    await waitFor(() => {
      expect(document.querySelector(".tc-error")).toBeInTheDocument();
    });
    expect(document.querySelector(".tc-error")!.textContent).toBe("Fetch error");
  });

  it("handleReset_callsRemoveData_andClearsState", async () => {
    setupSdk("prod-1");
    mockObjects.list.mockResolvedValue([
      { id: "1", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-1", data: { name: "Kurier", enabled: true } },
    ]);
    mockGetData.mockResolvedValue({ disabledMethods: ["uuid-1"] });

    renderWithProviders(<ProductDeliveryTab />);

    await waitFor(() => {
      expect(screen.getByLabelText("Kurier")).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText("Kurier");
    expect(checkbox).not.toBeChecked();

    const resetButton = screen.getByText("Włącz wszystkie");
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockRemoveData).toHaveBeenCalledWith("prod-1");
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Kurier")).toBeChecked();
    });
  });
});
