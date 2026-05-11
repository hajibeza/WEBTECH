# Security Audit — Checkout (Controller + Route + Service)
## Auditor role: Senior Security Engineer
## Files reviewed:
## - Backend/routes/checkout.js
## - Backend/controllers/checkoutController.js
## - Backend/services/checkoutService.js
## - Backend/repositories/orderRepository.js

---

## Vulnerability #1 — Parameter Tampering: Price Sent by Client (HIGH RISK)

### Where it is

`checkoutService.js` lines 68–77 and 110:
```js
// validateCheckoutInput — only checks TYPE, never checks value against real price
!Number.isFinite(toNumber(item.price))   // accepts price = 0.01 ✅ passes validation

// saveCheckoutOrder line 110 — fallback when Catalog is down
price: catalogProduct ? Number(catalogProduct.price) : Number(item.price),
//                                                      ^^^^^^^^^^^^^^^^^^
//                                    ATTACKER CONTROLS THIS VALUE
```

### Attack scenario

Catalog Service is down (or attacker blocks the internal fetch).
Service falls back to `item.price` from the request body.

```json
POST /api/checkout
{
  "items": [{ "productId": 1, "productName": "Rose", "price": 0.01, "quantity": 100 }],
  "email": "attacker@evil.com",
  "creditCard": "1234567890123456",
  "customerName": "X", "phone": "000", "address": "X"
}
```

Result: 100 × 0.01 = **total: 1** saved in the database. Attacker buys 100 roses for ฿1.

### Fix

Never use client-supplied price in total calculation.
If Catalog is unreachable, **reject the order** instead of falling back.

```js
// checkoutService.js — FIXED saveCheckoutOrder
const resolvedItems = await Promise.all(
  payload.items.map(async (item) => {
    const catalogProduct = await getProductFromCatalogService(item.productId);

    if (!catalogProduct) {
      // Catalog down → REJECT, do not fall back to client price
      const err = new Error("Product catalog unavailable. Please try again.");
      err.status = 503;
      throw err;
    }

    return {
      productId:   Number(item.productId),
      productName: catalogProduct.name,
      price:       Number(catalogProduct.price),   // server-verified price only
      quantity:    Number(item.quantity)
    };
  })
);
```

---

## Vulnerability #2 — Missing Input Validation: customerName / phone / address (MEDIUM RISK)

### Where it is

`checkoutService.js` `validateCheckoutInput()` validates:
- ✅ `items` — format checked
- ✅ `email` — regex checked
- ✅ `creditCard` — 16-digit regex checked
- ❌ `customerName` — NOT validated
- ❌ `phone` — NOT validated
- ❌ `address` — NOT validated

`orderRepository.js` lines 35–38:
```js
String(customerName || "").trim(),  // empty string allowed → stored as ""
String(phone        || "").trim(),  // empty string allowed → stored as ""
String(address      || "").trim(),  // empty string allowed → stored as ""
```

### Attack scenario A — Stored XSS

Attacker submits:
```json
{ "customerName": "<script>alert('xss')</script>", ... }
```
This string is stored in the database. If an admin dashboard renders it without escaping → **XSS fires**.

### Attack scenario B — Oversized input (DoS)

```json
{ "address": "A".repeat(100000) }
```
No length check → 100 KB string written to SQLite on every checkout call.

### Fix

Add validation for all string fields in `checkoutService.js`:

```js
function validateCheckoutInput(payload) {
  const errors = {};

  // ... existing checks ...

  // NEW: customerName
  const name = String(payload.customerName || "").trim();
  if (!name || name.length > 100) {
    errors.customerName = "Customer name is required and must be under 100 characters.";
  }

  // NEW: phone (digits only, 9–15 chars)
  const phone = String(payload.phone || "").replace(/\D/g, "");
  if (phone.length < 9 || phone.length > 15) {
    errors.phone = "Phone must be 9–15 digits.";
  }

  // NEW: address
  const address = String(payload.address || "").trim();
  if (!address || address.length > 300) {
    errors.address = "Address is required and must be under 300 characters.";
  }

  return { errors, normalizedCard };
}
```

---

## Vulnerability #3 — SQL Injection Risk via items Array (LOW RISK — currently mitigated, but fragile)

### Where it is

`orderRepository.js` uses parameterized queries (?) correctly — **currently safe**.

```js
// SAFE — parameterized
await run(
  "INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)",
  [orderRow.id, Number(item.productId), String(item.productName), Number(item.price), Number(item.quantity)]
);
```

### Why it is still a risk

The safety depends entirely on `String(item.productName)` being used in parameterized form.
If a future developer changes the query to string interpolation (common mistake):

```js
// DANGEROUS — if someone "refactors" to this:
await run(
  `INSERT INTO order_items (...) VALUES (${orderRow.id}, ${item.productId}, '${item.productName}', ...)`
  //                                                                          ^^^^^^^^^^^^^^^^^^
  //  attacker sends: "'); DROP TABLE order_items; --"
);
```

### Fix — enforce at Repository layer with an explicit type guard

```js
// orderRepository.js — add sanitization at the boundary
function sanitizeOrderItem(item) {
  const productId = Number(item.productId);
  const price     = Number(item.price);
  const quantity  = Number(item.quantity);

  if (!Number.isInteger(productId) || productId <= 0)  throw new Error("Invalid productId");
  if (!Number.isFinite(price)      || price < 0)       throw new Error("Invalid price");
  if (!Number.isInteger(quantity)  || quantity < 1)    throw new Error("Invalid quantity");

  return {
    productId,
    productName: String(item.productName || "Unknown").slice(0, 200), // max length
    price,
    quantity
  };
}

// Use it before INSERT:
for (const raw of items) {
  const item = sanitizeOrderItem(raw);
  await run("INSERT INTO order_items (...) VALUES (?, ?, ?, ?, ?)", [...]);
}
```

---

## Summary Table

| # | Vulnerability | Type | Risk | Status |
|---|---|---|---|---|
| 1 | Price sent by client, used in total when Catalog down | Parameter Tampering | 🔴 HIGH | **Must fix** |
| 2 | customerName / phone / address not validated | Missing Validation | 🟡 MEDIUM | **Must fix** |
| 3 | Future SQL injection if parameterized queries are changed | SQL Injection (latent) | 🟢 LOW | **Harden now** |

---

## What is Already Safe (Credit to the Developer)

| Item | Why it is safe |
|---|---|
| SQL queries | All use `?` parameterized placeholders — no string concatenation |
| Credit card | Validated format-only, never stored in DB |
| Password | bcrypt hashed, never stored plain text |
| JWT secret | Loaded from `.env`, not hardcoded |
| Transaction | `BEGIN / COMMIT / ROLLBACK` prevents partial orders |
