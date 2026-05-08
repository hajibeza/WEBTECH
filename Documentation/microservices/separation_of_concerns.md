# Separation of Concerns — Repository Pattern Refactor

## Prompt Applied
"Extract Database queries into a Repository pattern.
Move business logic into a Service layer.
Keep Express routes in a separate Controller."

---

## What Changed

### New files added

| File | Layer | Responsibility |
|---|---|---|
| `Backend/repositories/userRepository.js`    | Repository | All SQL for `users` table |
| `Backend/repositories/orderRepository.js`   | Repository | All SQL for `orders` + `order_items` tables |
| `Backend/repositories/productRepository.js` | Repository | All file reads for `products.json` |

---

### Files modified

#### `Backend/services/authService.js`

| Before | After |
|---|---|
| Called `get()` and `run()` directly with raw SQL | Calls `userRepository.findByEmail()`, `existsByEmail()`, `createUser()` |
| SQL column names (`first_name`, `password_hash`) mixed into business logic | Column mapping isolated in Repository's `mapRow()` |
| Service knew about database schema | Service only knows about user objects |

#### `Backend/services/checkoutService.js`

| Before | After |
|---|---|
| Called `run("BEGIN TRANSACTION")`, `run("INSERT INTO orders...")` directly | Calls `orderRepository.createOrderWithItems()` |
| Transaction management mixed with price validation logic | Transaction lives entirely in Repository |
| Service knew about table names and column order | Service only knows about order objects |

#### `Backend/services/productsService.js`

| Before | After |
|---|---|
| Called `fs.readFile(PRODUCTS_JSON_PATH)` and `JSON.parse()` directly | Calls `productRepository.findByCategory()` / `findAll()` |
| File path constant lived in Service | File path now isolated in Repository |
| Swapping to SQLite would require changing Service | Swapping data source only changes Repository |

---

## Layer Responsibilities (After Refactor)

```
HTTP Request
     |
     v
[Controller]  — parse req.body, call Service, send res.json()
     |           No SQL. No business rules.
     v
[Service]     — validate inputs, apply business rules, orchestrate
     |           No SQL. No file paths. No HTTP details.
     v
[Repository]  — run SQL / read file, map raw rows to objects
                 No validation. No JWT. No HTTP.
```

---

## Why This Makes the App Easier to Scale Horizontally

### 1. Swap data source without touching business logic
If you move from `products.json` to a PostgreSQL cluster:
- Change only `productRepository.js`
- `productsService.js` and `productsController.js` stay the same

### 2. Test each layer independently
- Unit-test Service by mocking Repository — no database needed
- Unit-test Repository with a test DB — no business logic involved
- Running 10 parallel test workers is safe because each can use its own DB

### 3. Add a second database replica easily
When you add a read replica for scaling:
```js
// productRepository.js — one line change
const db = isReadQuery ? readReplicaDb : primaryDb;
```
The Service and Controller never know this happened.

### 4. Deploy Services independently
Since Services no longer import `store-db` directly, you can:
- Move `orderRepository` + its DB connection to the Orders microservice
- Move `userRepository` to the Identity microservice
- No shared code needed between machines

### 5. Horizontal scaling of the Orders Service
The Orders Service only needs its own `orders.db`.
It calls Identity and Catalog via HTTP — those services can each scale independently.
Adding more Order Service instances just needs a load balancer in front — no shared state.

---

## Before vs After (folder structure)

```
Backend/
  controllers/           <- unchanged (HTTP layer)
  routes/                <- unchanged (route definitions)

  services/              <- now contains ONLY business rules
    authService.js       <- no SQL
    checkoutService.js   <- no SQL
    productsService.js   <- no SQL / no fs calls

  repositories/          <- NEW layer: all data access
    userRepository.js    <- all users SQL
    orderRepository.js   <- all orders SQL
    productRepository.js <- all products file reads

  store-db.js            <- unchanged (DB connector)
```
