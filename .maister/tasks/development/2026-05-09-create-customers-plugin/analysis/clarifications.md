# Phase 1 Clarifications

## Q&A

**Q: Frontend-only or Frontend + Backend?**
A: Frontend only — plugin stores customer data via SDK in plugin_objects table. No backend changes.

**Q: Which extension points?**
A: menu.main only — standalone Customers list page from the sidebar (CRUD).

**Q: Required fields?**
A: Standard fields:
- Personal: firstName, lastName, email, phone
- Company: companyName, taxId (NIP), website
- Address: street, city, postalCode, country
