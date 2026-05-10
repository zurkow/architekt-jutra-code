import { useEffect, useState, useCallback } from "react";
import { getSDK } from "../../../sdk";
import { toCustomer } from "../domain";
import type { Customer } from "../domain";

export function CustomersPage() {
  const sdk = getSDK();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form field states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [website, setWebsite] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  const loadCustomers = useCallback(async () => {
    try {
      const objects = await sdk.thisPlugin.objects.list("customer");
      setCustomers(objects.map(toCustomer));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    }
  }, [sdk]);

  useEffect(() => {
    loadCustomers().finally(() => setLoading(false));
  }, [loadCustomers]);

  function clearForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setCompanyName("");
    setTaxId("");
    setWebsite("");
    setStreet("");
    setCity("");
    setPostalCode("");
    setCountry("");
  }

  function handleNewCustomer() {
    setShowForm(true);
    setEditingCustomer(null);
    clearForm();
  }

  function handleEdit(customer: Customer) {
    setShowForm(true);
    setEditingCustomer(customer);
    setFirstName(customer.firstName);
    setLastName(customer.lastName);
    setEmail(customer.email);
    setPhone(customer.phone);
    setCompanyName(customer.companyName);
    setTaxId(customer.taxId);
    setWebsite(customer.website);
    setStreet(customer.street);
    setCity(customer.city);
    setPostalCode(customer.postalCode);
    setCountry(customer.country);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingCustomer(null);
    clearForm();
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("First name, last name, and email are required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const objectId = editingCustomer ? editingCustomer.objectId : crypto.randomUUID();
      await sdk.thisPlugin.objects.save("customer", objectId, {
        firstName,
        lastName,
        email,
        phone,
        companyName,
        taxId,
        website,
        street,
        city,
        postalCode,
        country,
      });
      await loadCustomers();
      handleCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save customer");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(objectId: string) {
    if (!window.confirm("Delete this customer?")) return;
    setError(null);
    setSaving(true);
    try {
      await sdk.thisPlugin.objects.delete("customer", objectId);
      await loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete customer");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  const filtered = customers.filter((c) =>
    [c.firstName, c.lastName, c.email].some((f) =>
      f.toLowerCase().includes(search.toLowerCase()),
    ),
  );

  return (
    <div className="tc-plugin" style={{ padding: "1rem", maxWidth: 900 }}>
      <h1>Customers</h1>

      {error && <p className="tc-error">{error}</p>}

      <div className="tc-flex">
        <input
          className="tc-input"
          placeholder="Search by name or email..."
          aria-label="Search customers"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="tc-primary-button" onClick={() => handleNewCustomer()}>
          New Customer
        </button>
      </div>

      <section className="tc-section">
        {filtered.length === 0 && !showForm && <p>No customers found.</p>}
        {filtered.length > 0 && (
          <table className="tc-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>City</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.objectId}>
                  <td>
                    {c.firstName} {c.lastName}
                  </td>
                  <td>{c.email}</td>
                  <td>{c.companyName}</td>
                  <td>{c.city}</td>
                  <td>
                    <button
                      className="tc-ghost-button"
                      onClick={() => handleEdit(c)}
                      disabled={saving}
                    >
                      Edit
                    </button>{" "}
                    <button
                      className="tc-ghost-button tc-ghost-button--danger"
                      onClick={() => void handleDelete(c.objectId)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showForm && (
        <div className="tc-card" style={{ marginTop: "1rem" }}>
          <h2>{editingCustomer ? "Edit Customer" : "New Customer"}</h2>

          <section className="tc-section">
            <h3>Personal Data</h3>
            <input
              className="tc-input"
              placeholder="First name *"
              aria-label="First name (required)"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              className="tc-input"
              placeholder="Last name *"
              aria-label="Last name (required)"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <input
              className="tc-input"
              placeholder="Email *"
              aria-label="Email (required)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="tc-input"
              placeholder="Phone"
              aria-label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </section>

          <section className="tc-section">
            <h3>Company Data</h3>
            <input
              className="tc-input"
              placeholder="Company name"
              aria-label="Company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <input
              className="tc-input"
              placeholder="Tax ID"
              aria-label="Tax ID"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
            <input
              className="tc-input"
              placeholder="Website"
              aria-label="Website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </section>

          <section className="tc-section">
            <h3>Address Data</h3>
            <input
              className="tc-input"
              placeholder="Street"
              aria-label="Street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
            <input
              className="tc-input"
              placeholder="City"
              aria-label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <input
              className="tc-input"
              placeholder="Postal code"
              aria-label="Postal code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
            <input
              className="tc-input"
              placeholder="Country"
              aria-label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </section>

          <div className="tc-flex">
            <button
              className="tc-primary-button"
              onClick={() => void handleSave()}
              disabled={saving || !firstName.trim() || !lastName.trim() || !email.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button className="tc-ghost-button" onClick={() => handleCancel()}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
