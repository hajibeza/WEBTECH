# Component Diagram — Fior (Current Monolith + Cut Lines)

## Components (boxes)

### [SERVER] Express Entry Point
- File: Backend/server.js
- Role: Single HTTP listener, mounts all routers, initializes DBs

---

### IDENTITY SERVICE (User management)
| Component          | File                                      | Responsibility                          |
|--------------------|-------------------------------------------|-----------------------------------------|
| AuthController     | Backend/controllers/authController.js    | Handle HTTP req/res for login, register |
| AuthService        | Backend/services/authService.js          | Validate credentials, bcrypt, sign JWT  |
| LoginRoute         | Backend/routes/auth.js                   | POST /api/login                         |
| RegisterRoute      | Backend/routes/register.js               | POST /api/register                      |
| users table        | Backend/store-db.js → store.db           | Persist user records                    |

---

### CATALOG SERVICE (Product listing)
| Component           | File                                      | Responsibility                          |
|---------------------|-------------------------------------------|-----------------------------------------|
| ProductsController  | Backend/controllers/productsController.js| Handle HTTP req/res for products        |
| ProductsService     | Backend/services/productsService.js      | Read products.json, apply category filter |
| ProductsRoute       | Backend/routes/products.js               | GET /api/products?category=             |
| products table      | Backend/store-db.js → store.db           | Persist product records                 |

---

### ORDERS SERVICE (Checkout + order history)
| Component           | File                                      | Responsibility                          |
|---------------------|-------------------------------------------|-----------------------------------------|
| CheckoutController  | Backend/controllers/checkoutController.js| Handle HTTP req/res for checkout        |
| CheckoutService     | Backend/services/checkoutService.js      | Validate, calculate total, save order   |
| CheckoutRoute       | Backend/routes/checkout.js               | POST /api/checkout                      |
| StoreOrdersRoute    | Backend/routes/store-orders.js           | POST /api/store/orders (direct insert)  |
| orders table        | Backend/store-db.js → store.db           | Order headers                           |
| order_items table   | Backend/store-db.js → store.db           | Per-line product rows                   |

---

### [SHARED] Database Connector
| Component   | File                  | Used by                          |
|-------------|-----------------------|----------------------------------|
| store-db.js | Backend/store-db.js   | authService, checkoutService, store-orders |
| database.js | Backend/database.js   | (legacy fior.sqlite — still wired via fior.sqlite) |

---

### [FRONTEND] Static Files (served by same Express process)
| Page             | Script                  | Calls                       |
|------------------|-------------------------|-----------------------------|
| login.html       | js/login.js             | POST /api/login             |
| register.html    | js/register.js          | POST /api/register          |
| shop.html        | js/shop.js, js/cart.js  | GET  /api/products          |
| cart.html        | js/cart-page.js         | GET  /api/products          |
| checkout.html    | js/checkout-page.js     | POST /api/checkout          |

---

## Relationships (dependencies between components)

```
Frontend Pages
    |
    | HTTP (fetch)
    v
[server.js] ---- mounts ---> LoginRoute --> AuthController --> AuthService --> store.db (users)
                         |-> RegisterRoute -> AuthController --> AuthService --> store.db (users)
                         |-> ProductsRoute -> ProductsController -> ProductsService -> products.json
                                                                                    -> store.db (products)
                         |-> CheckoutRoute -> CheckoutController -> CheckoutService -> store.db (orders + order_items)
                         |-> StoreOrdersRoute ----------------------------------------> store.db (orders + order_items)
```

---

## The "Cut" Lines — Split into 3 Microservices

```
+---------------------------------------------------+
|  MACHINE A: IDENTITY SERVICE                      |
|  Runtime: Node.js     Port: 3001                  |
|  - AuthController                                 |
|  - AuthService                                    |
|  - LoginRoute  (POST /api/login)                  |
|  - RegisterRoute (POST /api/register)             |
|  - DB: identity.db (users table)                  |
+---------------------------------------------------+
                |
     . . . . . CUT LINE (Identity / Catalog) . . . .
                |
+---------------------------------------------------+
|  MACHINE B: CATALOG SERVICE                       |
|  Runtime: Python (FastAPI) or Node.js  Port: 3002 |
|  - ProductsController / Router                    |
|  - ProductsService                                |
|  - Route: GET /api/products                       |
|  - DB: catalog.db (products table) or JSON        |
+---------------------------------------------------+
                |
     . . . . . CUT LINE (Catalog / Orders) . . . . .
                |
+---------------------------------------------------+
|  MACHINE C: ORDERS SERVICE                        |
|  Runtime: Node.js     Port: 3003                  |
|  - CheckoutController                             |
|  - CheckoutService                                |
|  - CheckoutRoute (POST /api/checkout)             |
|  - StoreOrdersRoute (POST /api/store/orders)      |
|  - DB: orders.db (orders + order_items)           |
|                                                   |
|  NOTE: No direct access to catalog.db.            |
|  Gets product price via HTTP call to Catalog API  |
|  (GET /api/products/:id) at checkout time.        |
+---------------------------------------------------+
```

---

## Critical Thinking Answer (สำหรับ Peer Evaluation)

**Q: If OrderService moves to a new server, does it still have access to Product database?**

A: NO — after the cut, OrderService cannot directly query catalog.db.

**Solution options:**
1. OrderService calls `GET /api/products/:id` on Catalog Service at checkout time to get price
2. OrderService caches product snapshot in order_items (product_name, price already stored — this is what the current code does)
3. Publish a Product Price event via message queue (Kafka/RabbitMQ) to keep Orders in sync

Current code already uses option 2 — `order_items` stores `product_name` and `price` at the moment of purchase, so Orders DB stays self-contained after the cut.
