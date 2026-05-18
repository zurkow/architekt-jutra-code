import { vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CartPage } from "../pages/CartPage";

const mockSave = vi.fn();
const mockDelete = vi.fn();
const mockList = vi.fn();
const mockFetch = vi.fn();
const mockGetProducts = vi.fn();

vi.mock("../../../sdk", () => ({
  getSDK: () => ({
    thisPlugin: {
      objects: {
        list: mockList,
        save: mockSave,
        delete: mockDelete,
      },
    },
    hostApp: {
      fetch: mockFetch,
      getProducts: mockGetProducts,
    },
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

beforeEach(() => {
  vi.resetAllMocks();
  mockList.mockResolvedValue([]);
  mockFetch.mockResolvedValue({ body: JSON.stringify([]) });
  mockGetProducts.mockResolvedValue([]);
});

describe("CartPage", () => {
  it("renders loading state on mount before SDK resolves", () => {
    // Do not resolve promises — keep them pending
    mockList.mockReturnValue(new Promise(() => {}));
    mockFetch.mockReturnValue(new Promise(() => {}));
    mockGetProducts.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<CartPage />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders empty cart list message when no carts exist", async () => {
    renderWithProviders(<CartPage />);

    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    expect(screen.getByText("Brak koszyków.")).toBeInTheDocument();
  });

  it("renders cart rows with Customer Name, Status badge, Item count, Created columns", async () => {
    mockList.mockImplementation((objectType: string) => {
      if (objectType === "cart") {
        return Promise.resolve([
          {
            objectId: "cart-1",
            objectType: "cart",
            data: {
              customerId: "cust-1",
              customerName: "Jan Kowalski",
              status: "ACTIVE",
              createdAt: "2026-05-01T10:00:00Z",
            },
          },
        ]);
      }
      return Promise.resolve([]);
    });

    renderWithProviders(<CartPage />);

    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    expect(screen.getByText("Jan Kowalski")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("2026-05-01T10:00:00Z")).toBeInTheDocument();
  });

  it("handleCreateCart calls thisPlugin.objects.save with correct shape", async () => {
    mockFetch.mockResolvedValue({
      body: JSON.stringify([
        {
          objectId: "cust-1",
          data: { firstName: "Anna", lastName: "Nowak" },
        },
      ]),
    });
    mockSave.mockResolvedValue(undefined);

    renderWithProviders(<CartPage />);

    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    // Open create form
    fireEvent.click(screen.getByText("Nowy koszyk"));

    // Select a customer
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "cust-1" } });

    // Submit
    fireEvent.click(screen.getByText("Utwórz"));

    await waitFor(() => expect(mockSave).toHaveBeenCalled());

    const [objectType, , data] = mockSave.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(objectType).toBe("cart");
    expect(data.customerId).toBe("cust-1");
    expect(data.customerName).toBe("Anna Nowak");
    expect(data.status).toBe("ACTIVE");
    expect(typeof data.createdAt).toBe("string");
  });

  it("handleDeleteCart calls delete on cartItems first then the cart", async () => {
    mockList.mockImplementation((objectType: string, options?: { filter?: string }) => {
      if (objectType === "cart") {
        return Promise.resolve([
          {
            objectId: "cart-1",
            objectType: "cart",
            data: {
              customerId: "cust-1",
              customerName: "Jan Kowalski",
              status: "ACTIVE",
              createdAt: "2026-05-01T10:00:00Z",
            },
          },
        ]);
      }
      if (objectType === "cartItem" && options?.filter === "cartId:eq:cart-1") {
        return Promise.resolve([
          {
            objectId: "cart-1-42",
            objectType: "cartItem",
            data: {
              cartId: "cart-1",
              productId: 42,
              productName: "Widget",
              quantity: 1,
              unitPrice: 9.99,
            },
          },
        ]);
      }
      return Promise.resolve([]);
    });
    mockDelete.mockResolvedValue(undefined);

    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithProviders(<CartPage />);

    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    fireEvent.click(screen.getByText("Usuń"));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(2));

    expect(mockDelete).toHaveBeenCalledWith("cartItem", "cart-1-42");
    expect(mockDelete).toHaveBeenCalledWith("cart", "cart-1");
  });

  it("handleAddItem calls save with composite key cartId-productId", async () => {
    mockList.mockImplementation((objectType: string) => {
      if (objectType === "cart") {
        return Promise.resolve([
          {
            objectId: "cart-1",
            objectType: "cart",
            data: {
              customerId: "cust-1",
              customerName: "Jan Kowalski",
              status: "ACTIVE",
              createdAt: "2026-05-01T10:00:00Z",
            },
          },
        ]);
      }
      return Promise.resolve([]);
    });
    mockGetProducts.mockResolvedValue([
      { id: 42, name: "Widget Pro", price: 19.99 },
    ]);
    mockSave.mockResolvedValue(undefined);

    renderWithProviders(<CartPage />);

    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    // Select a cart row to activate items section
    fireEvent.click(screen.getByText("Jan Kowalski"));

    await waitFor(() => expect(screen.getByText("Dodaj produkt")).toBeInTheDocument());

    // Open add item form
    fireEvent.click(screen.getByText("Dodaj produkt"));

    // Find the product select specifically (last combobox = the one inside item form)
    const allSelects = screen.getAllByRole("combobox");
    const productDropdown = allSelects[allSelects.length - 1];
    fireEvent.change(productDropdown, { target: { value: "42" } });

    fireEvent.click(screen.getByText("Dodaj"));

    await waitFor(() => expect(mockSave).toHaveBeenCalled());

    const [objectType, objectId, data] = mockSave.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(objectType).toBe("cartItem");
    expect(objectId).toBe("cart-1-42");
    expect(data.cartId).toBe("cart-1");
    expect(data.productId).toBe(42);
    expect(data.productName).toBe("Widget Pro");
  });

  it("handleUpdateStatus calls save with new status spread over existing cart data", async () => {
    mockList.mockImplementation((objectType: string) => {
      if (objectType === "cart") {
        return Promise.resolve([
          {
            objectId: "cart-1",
            objectType: "cart",
            data: {
              customerId: "cust-1",
              customerName: "Jan Kowalski",
              status: "ACTIVE",
              createdAt: "2026-05-01T10:00:00Z",
            },
          },
        ]);
      }
      return Promise.resolve([]);
    });
    mockSave.mockResolvedValue(undefined);

    renderWithProviders(<CartPage />);

    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    // Select cart row to show items section with status dropdown
    fireEvent.click(screen.getByText("Jan Kowalski"));

    await waitFor(() => expect(screen.getByText("Dodaj produkt")).toBeInTheDocument());

    // Change status dropdown in the items section header
    const statusSelect = screen.getAllByRole("combobox").find(
      (el) => (el as HTMLSelectElement).value === "ACTIVE",
    ) as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: "COMPLETED" } });

    await waitFor(() => expect(mockSave).toHaveBeenCalled());

    const [objectType, objectId, data] = mockSave.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(objectType).toBe("cart");
    expect(objectId).toBe("cart-1");
    expect(data.status).toBe("COMPLETED");
    expect(data.customerId).toBe("cust-1");
    expect(data.customerName).toBe("Jan Kowalski");
    expect(data.createdAt).toBe("2026-05-01T10:00:00Z");
  });

  it("loadCustomers parses hostApp.fetch response body and populates customer dropdown", async () => {
    mockFetch.mockResolvedValue({
      body: JSON.stringify([
        { objectId: "cust-42", data: { firstName: "Maria", lastName: "Wiśniewska" } },
        { objectId: "cust-43", data: { firstName: "Piotr", lastName: "Zając" } },
      ]),
    });

    renderWithProviders(<CartPage />);

    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    // Open create form to expose the customer dropdown
    fireEvent.click(screen.getByText("Nowy koszyk"));

    expect(screen.getByText("Maria Wiśniewska")).toBeInTheDocument();
    expect(screen.getByText("Piotr Zając")).toBeInTheDocument();
  });

  it("product selection in add-item form auto-fills unitPrice from product price", async () => {
    mockList.mockImplementation((objectType: string) => {
      if (objectType === "cart") {
        return Promise.resolve([
          {
            objectId: "cart-1",
            objectType: "cart",
            data: {
              customerId: "cust-1",
              customerName: "Jan Kowalski",
              status: "ACTIVE",
              createdAt: "2026-05-01T10:00:00Z",
            },
          },
        ]);
      }
      return Promise.resolve([]);
    });
    mockGetProducts.mockResolvedValue([
      { id: 7, name: "Super Widget", price: 49.99 },
    ]);

    renderWithProviders(<CartPage />);

    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    // Select cart to show items section
    fireEvent.click(screen.getByText("Jan Kowalski"));

    await waitFor(() => expect(screen.getByText("Dodaj produkt")).toBeInTheDocument());

    // Open add item form
    fireEvent.click(screen.getByText("Dodaj produkt"));

    // Select a product from the dropdown
    const allSelects = screen.getAllByRole("combobox");
    const productDropdown = allSelects[allSelects.length - 1];
    fireEvent.change(productDropdown, { target: { value: "7" } });

    // Unit price input should now reflect the product's price
    const priceInputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    const unitPriceInput = priceInputs[priceInputs.length - 1];
    expect(unitPriceInput.value).toBe("49.99");
  });

  it("SDK error in loadCarts renders tc-error element with message", async () => {
    mockList.mockRejectedValue(new Error("Network failure"));

    renderWithProviders(<CartPage />);

    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    const errorEl = document.querySelector(".tc-error");
    expect(errorEl).toBeInTheDocument();
    expect(errorEl!.textContent).toBe("Network failure");
  });

  it("handleRemoveItem calls delete on cartItem without window.confirm", async () => {
    mockList.mockImplementation((objectType: string, options?: { filter?: string }) => {
      if (objectType === "cart") {
        return Promise.resolve([
          {
            objectId: "cart-1",
            objectType: "cart",
            data: {
              customerId: "cust-1",
              customerName: "Jan Kowalski",
              status: "ACTIVE",
              createdAt: "2026-05-01T10:00:00Z",
            },
          },
        ]);
      }
      if (objectType === "cartItem" && options?.filter === "cartId:eq:cart-1") {
        return Promise.resolve([
          {
            objectId: "cart-1-5",
            objectType: "cartItem",
            data: {
              cartId: "cart-1",
              productId: 5,
              productName: "Gadget",
              quantity: 2,
              unitPrice: 5.0,
            },
          },
        ]);
      }
      return Promise.resolve([]);
    });
    mockDelete.mockResolvedValue(undefined);

    const confirmSpy = vi.spyOn(window, "confirm");

    renderWithProviders(<CartPage />);

    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    // Select cart row to load items
    fireEvent.click(screen.getByText("Jan Kowalski"));

    await waitFor(() => expect(screen.getByText("Gadget")).toBeInTheDocument());

    // Click "Usuń" button in the cart items table
    const removeButtons = screen.getAllByText("Usuń");
    // The last "Usuń" is the one in the items table (cart row also has "Usuń")
    fireEvent.click(removeButtons[removeButtons.length - 1]);

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("cartItem", "cart-1-5"));

    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("handleAddItem saves productName string when product id from API is a number", async () => {
    // Java Long serializes as a JSON number — p.id is 42, not "42"
    mockGetProducts.mockResolvedValue([
      { id: 42, name: "Widget", price: 9.99 },
    ]);
    mockList.mockImplementation((objectType: string) => {
      if (objectType === "cart") {
        return Promise.resolve([
          {
            objectId: "cart-1",
            objectType: "cart",
            data: {
              customerId: "cust-1",
              customerName: "Jan Kowalski",
              status: "ACTIVE",
              createdAt: "2026-05-01T10:00:00Z",
            },
          },
        ]);
      }
      return Promise.resolve([]);
    });
    mockSave.mockResolvedValue(undefined);

    renderWithProviders(<CartPage />);
    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    fireEvent.click(screen.getByText("Jan Kowalski"));
    await waitFor(() => expect(screen.getByText("Dodaj produkt")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Dodaj produkt"));

    const allSelects = screen.getAllByRole("combobox");
    fireEvent.change(allSelects[allSelects.length - 1], { target: { value: "42" } });
    fireEvent.click(screen.getByText("Dodaj"));

    await waitFor(() => expect(mockSave).toHaveBeenCalled());

    const [, , data] = mockSave.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(data.productName).toBe("Widget");
  });
});
