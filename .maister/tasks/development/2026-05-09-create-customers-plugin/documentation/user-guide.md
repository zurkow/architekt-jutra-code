# Customers Plugin — User Guide

_Last updated: 2026-05-09 | Version 1.0_

---

## Table of Contents

1. [What is the Customers Plugin?](#1-what-is-the-customers-plugin)
2. [Who Should Use This?](#2-who-should-use-this)
3. [Getting Started — Opening the Plugin](#3-getting-started--opening-the-plugin)
4. [Browsing Your Customer List](#4-browsing-your-customer-list)
5. [Searching for a Customer](#5-searching-for-a-customer)
6. [Adding a New Customer](#6-adding-a-new-customer)
7. [Editing a Customer](#7-editing-a-customer)
8. [Deleting a Customer](#8-deleting-a-customer)
9. [Field Reference](#9-field-reference)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. What is the Customers Plugin?

The Customers plugin is a directory of your business clients — all in one place. It lets you store each client's contact information, company details, and address so your team always has the right data at hand, without digging through spreadsheets or emails.

You can:

- See every customer at a glance in a tidy table
- Search by name or email to find anyone in seconds
- Add new customers when you onboard a client
- Update a customer's details whenever something changes
- Remove outdated records to keep the list clean

---

## 2. Who Should Use This?

The Customers plugin is built for the **sales team** and **administrators** who manage business client relationships.

You will find it useful when you:

- Need to look up a client's phone number or email quickly
- Are onboarding a new client and want their details saved centrally
- Need to update a client's address or company name after it changes
- Want to remove a client who is no longer active

No technical knowledge is required. If you can fill in a form and click a button, you can use this plugin.

---

## 3. Getting Started — Opening the Plugin

The Customers plugin lives in the **main sidebar** of the application, the navigation panel on the left side of the screen.

**Steps:**

1. **Look at the left sidebar.** You will see a list of navigation items with icons.

2. **Find and click "Customers".** It has a small people (users) icon next to the label. It appears just below the Warehouse entry in the menu.

3. **The Customers page opens.** The page loads your full customer list automatically. If you have no customers yet, you will see the message "No customers found." — that is normal for a fresh start.

> Note: If the page shows "Loading..." for a moment when you open it, that is expected. The plugin is retrieving your customer records from the system. It usually takes less than a second.

---

## 4. Browsing Your Customer List

Once the page loads, your customers are shown in a table with the following columns:

| Column | What it shows |
|--------|--------------|
| Name | The customer's first and last name |
| Email | Their email address |
| Company | The company they represent |
| City | The city from their address |
| (Actions) | Edit and Delete buttons for each row |

Each customer takes up one row. If you have many customers, scroll down to see them all.

**Empty state:** If no customers exist yet, or if your search returns no matches, you will see the message "No customers found." instead of the table.

---

## 5. Searching for a Customer

Above the customer table, there is a search bar that lets you filter the list instantly as you type.

**Steps:**

1. **Click inside the search box** labeled "Search by name or email..."

2. **Start typing** a name or email address — for example, type "anna" or "acme" or "gmail".

3. **The table updates immediately** to show only the rows that match what you typed. You do not need to press Enter.

4. **To see all customers again,** clear the search box (select all the text and delete it, or press Backspace until the box is empty).

**What the search checks:** First name, last name, and email address. It is not case-sensitive — "SMITH" and "smith" both work the same way. Company name and city are not searched, so use a name or email to narrow the list.

---

## 6. Adding a New Customer

**Steps:**

1. **Click the "New Customer" button.** It is the blue button to the right of the search bar.

2. **A form appears below the table** with the heading "New Customer". It is divided into three sections.

3. **Fill in the form.** Work through each section from top to bottom:

   **Personal Data** (first section)

   | Field | Notes |
   |-------|-------|
   | First name | Required — the form will not save without this |
   | Last name | Required — the form will not save without this |
   | Email | Optional |
   | Phone | Optional |

   **Company Data** (second section)

   | Field | Notes |
   |-------|-------|
   | Company name | Optional |
   | Tax ID | Optional — VAT number or other tax identifier |
   | Website | Optional — e.g. https://example.com |

   **Address Data** (third section)

   | Field | Notes |
   |-------|-------|
   | Street | Optional |
   | City | Optional |
   | Postal code | Optional |
   | Country | Optional |

4. **Click "Save"** (the blue button at the bottom of the form).

   - While saving, the button shows "Saving..." and cannot be clicked again. Wait a moment.
   - When saving is complete, the form closes and the new customer appears in the table.

5. **If you change your mind,** click "Cancel" (the grey button next to Save). The form closes without saving anything.

**Important:** First name and last name are the only required fields. The form will not save if either of them is blank. You will see an error message in red at the top of the page — fill in both names and click Save again.

---

## 7. Editing a Customer

You can update any customer's details at any time.

**Steps:**

1. **Find the customer** in the table — use the search bar if needed.

2. **Click the "Edit" button** in that customer's row (on the right side of the row).

3. **The form opens below the table** with the heading "Edit Customer". All the fields are already filled in with the customer's current information.

4. **Make your changes.** Click into any field and type the new value. You can update as many fields as you need in one go.

5. **Click "Save"** to apply your changes.

   - The form closes and the table refreshes to show the updated information.

6. **Click "Cancel"** if you want to discard your changes and go back to the list.

> Note: While the edit form is open, the Edit and Delete buttons in the table are disabled (greyed out). Close or save the current form first before editing a different customer.

---

## 8. Deleting a Customer

Deleting a customer permanently removes their record from the system.

**Steps:**

1. **Find the customer** you want to remove.

2. **Click the red "Delete" button** in that customer's row.

3. **A confirmation dialog appears** asking "Delete this customer?" Click **OK** to confirm, or **Cancel** to go back without deleting.

4. **If you click OK,** the customer is removed and disappears from the table immediately.

**This action cannot be undone.** Once you confirm the deletion, the record is gone. If you are unsure, click Cancel in the confirmation dialog instead.

---

## 9. Field Reference

This table lists every field available in the customer form, which section it belongs to, and whether it is required.

| Field | Section | Required | Description |
|-------|---------|----------|-------------|
| First name | Personal Data | Yes | Customer's given name |
| Last name | Personal Data | Yes | Customer's family name |
| Email | Personal Data | No | Email address for contact |
| Phone | Personal Data | No | Phone number |
| Company name | Company Data | No | Name of the business the customer represents |
| Tax ID | Company Data | No | VAT number or other tax registration identifier |
| Website | Company Data | No | Company or personal website URL |
| Street | Address Data | No | Street address including house or office number |
| City | Address Data | No | City or town |
| Postal code | Address Data | No | ZIP or postal code |
| Country | Address Data | No | Country name |

The table columns displayed in the customer list (Name, Email, Company, City) come directly from these fields. Fields you leave blank simply appear empty in the table.

---

## 10. Troubleshooting

**The page shows "Loading..." and does not go away.**

The plugin is waiting to connect to the system. Wait a few seconds. If it stays stuck, refresh the page in your browser. If the problem continues, ask your administrator to check whether the application server is running.

**I see a red error message at the top of the page.**

Something went wrong with a recent action (loading, saving, or deleting). The message will tell you what failed. Try the action again. If the error keeps appearing, note the exact message and contact your administrator.

**I tried to save a new customer but nothing happened.**

Check that both First name and Last name are filled in. The form will not save if either field is empty, and a red error message will appear at the top explaining this. Fill in both fields and click Save again.

**A customer I just saved does not appear in the table.**

Make sure you do not have an active search that is filtering them out. Clear the search box and look for the new customer in the full list.

**The Edit and Delete buttons are greyed out.**

This happens when the form is already open for another customer. Close the open form first (click Cancel or Save), and then use the Edit or Delete button you wanted.

**I deleted a customer by mistake.**

Unfortunately, deletions cannot be undone through the plugin. Contact your administrator — they may be able to restore the record from a database backup.
