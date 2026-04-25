import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { getSDK } from "../../../sdk";
import { LogisticsPage } from "../pages/LogisticsPage";

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

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getSDK).mockReturnValue({
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
    hostApp: {
      getProducts: vi.fn(),
      getProduct: vi.fn(),
      getPlugins: vi.fn(),
      fetch: vi.fn(),
    },
  } as ReturnType<typeof getSDK>);
  mockObjects.list.mockResolvedValue([]);
  mockObjects.save.mockResolvedValue({});
  mockObjects.delete.mockResolvedValue({});
});

describe("LogisticsPage", () => {
  it("renders_emptyState_whenNoMethods", async () => {
    mockObjects.list.mockResolvedValue([]);
    renderWithProviders(<LogisticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Brak metod dostawy. Dodaj pierwszą metodę.")).toBeInTheDocument();
    });
  });

  it("renders_methodList_withStatusBadges", async () => {
    mockObjects.list.mockResolvedValue([
      { id: "1", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-1", data: { name: "Kurier", enabled: true } },
      { id: "2", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-2", data: { name: "Paczkomat", enabled: false } },
    ]);
    renderWithProviders(<LogisticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Kurier")).toBeInTheDocument();
      expect(screen.getByText("Paczkomat")).toBeInTheDocument();
    });
    const badges = document.querySelectorAll(".tc-badge");
    const successBadge = document.querySelector(".tc-badge--success");
    const dangerBadge = document.querySelector(".tc-badge--danger");
    expect(successBadge).toBeInTheDocument();
    expect(dangerBadge).toBeInTheDocument();
  });

  it("handleAdd_createsMethod_withEnabledTrue", async () => {
    mockObjects.list.mockResolvedValue([]);
    renderWithProviders(<LogisticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Brak metod dostawy. Dodaj pierwszą metodę.")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Nazwa");
    fireEvent.change(input, { target: { value: "Kurier DHL" } });
    const addButton = screen.getByText("Dodaj");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockObjects.save).toHaveBeenCalledWith(
        "delivery-method",
        expect.any(String),
        { name: "Kurier DHL", enabled: true },
      );
    });
    expect(mockObjects.save.mock.calls[0][1]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("handleToggle_flipsEnabledFlag", async () => {
    mockObjects.list.mockResolvedValue([
      { id: "1", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-1", data: { name: "Kurier", enabled: true } },
    ]);
    renderWithProviders(<LogisticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Kurier")).toBeInTheDocument();
    });

    const toggleButton = screen.getByRole("button", { name: /wyłącz|włącz/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(mockObjects.save).toHaveBeenCalledWith(
        "delivery-method",
        "uuid-1",
        { name: "Kurier", enabled: false },
      );
    });
  });

  it("handleDelete_removesMethod", async () => {
    mockObjects.list.mockResolvedValue([
      { id: "1", pluginId: "logistics", objectType: "delivery-method", objectId: "uuid-1", data: { name: "Kurier", enabled: true } },
    ]);
    renderWithProviders(<LogisticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Kurier")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: /usuń/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockObjects.delete).toHaveBeenCalledWith("delivery-method", "uuid-1");
    });
  });

  it("showsError_whenSDKThrows", async () => {
    mockObjects.list.mockRejectedValue(new Error("Network failure"));
    renderWithProviders(<LogisticsPage />);
    await waitFor(() => {
      expect(document.querySelector(".tc-error")).toBeInTheDocument();
    });
    expect(document.querySelector(".tc-error")!.textContent).toBe("Network failure");
  });

  it("handleAdd_doesNotSave_whenNameEmpty", async () => {
    mockObjects.list.mockResolvedValue([]);
    renderWithProviders(<LogisticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Brak metod dostawy. Dodaj pierwszą metodę.")).toBeInTheDocument();
    });

    const addButton = screen.getByText("Dodaj");
    fireEvent.click(addButton);

    expect(mockObjects.save).not.toHaveBeenCalled();
  });

  it("handleAdd_doesNotSave_whenNameIsWhitespace", async () => {
    mockObjects.list.mockResolvedValue([]);
    renderWithProviders(<LogisticsPage />);
    await waitFor(() => {
      expect(screen.getByText("Brak metod dostawy. Dodaj pierwszą metodę.")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Nazwa");
    fireEvent.change(input, { target: { value: "   " } });
    const addButton = screen.getByText("Dodaj");
    fireEvent.click(addButton);

    expect(mockObjects.save).not.toHaveBeenCalled();
  });
});
