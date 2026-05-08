# OrderService — Dependency Analysis for Microservice Extraction

## Prompt Applied To
- `Backend/services/checkoutService.js`
- `Backend/controllers/checkoutController.js`
- `Backend/routes/checkout.js`

---

## 1. Current Dependencies (what OrderService uses right now)

### Direct Module Imports
| Import | From | Type |
|--------|------|------|
| `run()` | `../store-db` | DB connector (SQLite) |

### No direct import of:
- `authService` or `UserService`
- `productsService` or `ProductService`

---

## 2. What OrderService Needs FROM Other Modules

### From Product Module (Catalog Service)

| Data Needed | When Needed | How It Arrives Now | Problem After Cut |
|---|---|---|---|
| `productId` | At checkout | Frontend sends in request body | Frontend may send wrong/fake ID |
| `productName` | Stored in `order_items` | Frontend sends in request body | No server-side validation of name |
| `price` (unit price) | Used in `calculateTotal()` | **Frontend sends in request body** | ❌ Price is NOT verified against Catalog DB |

**Current behavior (line 17–22):**
```js
// checkoutService.js validates only TYPE and FORMAT
const productId = toNumber(item.productId);  // just checks it's a number
const price     = toNumber(item.price);       // trusts price from browser
const quantity  = toNumber(item.quantity);    // just checks it's a number
```

**Risk:** A user could manipulate the price in the browser before sending. OrderService never looks up the real price from ProductService.

**What it needs after the cut:**
- Call `GET http://catalog-service:3002/api/products/:productId` to get the real price and name before calculating total.

---

### From User Module (Identity Service)

| Data Needed | When Needed | How It Arrives Now | Problem After Cut |
|---|---|---|---|
| `userId` | Stored in `orders.user_id` | Frontend sends in request body | No server-side verification |
| User authentication | Authorize checkout | **Not checked at all** | ❌ Anyone can POST /api/checkout without a valid JWT |

**Current behavior (line 46–47):**
```js
// checkoutService.js trusts userId from frontend directly
const userIdParsed = Number(payload.userId);
const safeUserId   = Number.isInteger(userIdParsed) && userIdParsed > 0 ? userIdParsed : null;
```

**Risk:** No JWT verification — an unauthenticated user can place orders with any userId.

**What it needs after the cut:**
- Read JWT token from `Authorization: Bearer <token>` header.
- Call `GET http://identity-service:3001/api/auth/verify` or verify JWT locally using the shared secret.
- Use the `userId` from the verified token, not from the request body.

---

## 3. Data Contract OrderService Needs to Be Independent

For OrderService to run on its own machine with **no shared code or DB**, it needs:

### A. From Catalog Service (via HTTP)
```
GET /api/products/:productId
Response: { id, name, price, stock }
```
- Use this to verify price server-side at checkout
- Snapshot `product_name` and `price` into `order_items` (already done — good)

### B. From Identity Service (via JWT or HTTP)
```
Header: Authorization: Bearer <token>
OR
GET /api/auth/verify?token=<token>
Response: { userId, firstName, username }
```
- Decode userId from token to link `orders.user_id` correctly

### C. Own Database (orders.db)
```sql
-- Already self-contained after price snapshot
orders       (id, user_id, customer_name, email, phone, address, total, status, created_at)
order_items  (id, order_id, product_id, product_name, price, quantity)
```
- `product_name` and `price` are already copied at insert time — OrderService does NOT need Catalog DB again after the order is placed

---

## 4. Summary Table

| Dependency | Current Status | Needed for Independence |
|---|---|---|
| Product price validation | ❌ Trusts frontend | Call Catalog API to verify price |
| Product name lookup | ❌ Trusts frontend | Call Catalog API for name |
| User authentication | ❌ Not verified | Verify JWT (shared secret or Identity API) |
| User ID source | ❌ Trusts frontend | Read from verified JWT payload |
| DB connection | ✅ Own store.db | Keep own orders.db |
| Email validation | ✅ Done internally (regex) | No external dependency needed |
| Credit card validation | ✅ Done internally (regex) | No external dependency needed |
| Total calculation | ⚠️ Done internally but price unverified | Re-calculate using Catalog price |

---

## 5. What Changes in Code After Cut

### checkoutService.js (after extraction)

```js
// BEFORE: trusts price from browser
const price = toNumber(item.price);

// AFTER: fetch real price from Catalog Service
const productRes = await fetch(`http://catalog-service:3002/api/products/${item.productId}`);
const product = await productRes.json();
const price = product.price;  // server-verified price
```

```js
// BEFORE: reads userId from request body
const safeUserId = Number(payload.userId) > 0 ? Number(payload.userId) : null;

// AFTER: read from verified JWT
const token = req.headers.authorization?.split(" ")[1];
const decoded = jwt.verify(token, process.env.JWT_SECRET);
const safeUserId = decoded.userId;
```

---

## 6. The "Cut" Line — What Crosses the Boundary

```
[Identity Service :3001]            [Catalog Service :3002]
         |                                    |
         | JWT verify result                  | product price + name
         |                                    |
. . . . . . . . . . CUT LINE . . . . . . . . . .
         |
[Orders Service :3003]
   - POST /api/checkout
   - POST /api/store/orders
   - DB: orders + order_items (self-contained after snapshot)
```

**Data that crosses the cut (HTTP calls at checkout time):**
1. `userId` extracted from JWT → comes from Identity
2. `price`, `name` per product → comes from Catalog
3. After those are fetched and snapshotted into `order_items`, Orders is fully independent
