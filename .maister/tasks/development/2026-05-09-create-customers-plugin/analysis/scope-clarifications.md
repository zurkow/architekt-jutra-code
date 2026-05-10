# Scope Clarifications

## Edit UX Pattern
**Decision**: Edit section below the table
- Clicking Edit shows a pre-filled form section below the customer list
- Uses only host tc-* CSS classes — no custom styles needed

## Required Fields
**Decision**: firstName + lastName required, rest optional
- Personal name is mandatory
- Company data (companyName, taxId, website) are optional
- Address data (street, city, postalCode, country) are optional
