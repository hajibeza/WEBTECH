# Entity-Relationship Diagram (ERD) — Fior Database

## Entities and Attributes

### USERS
| Attribute     | Type    | Constraint        |
|---------------|---------|-------------------|
| id            | INTEGER | PK, AUTOINCREMENT |
| firstName     | TEXT    | NOT NULL          |
| username      | TEXT    | NOT NULL, UNIQUE  |
| passwordHash  | TEXT    | NOT NULL          |
| registeredAt  | TEXT    | NOT NULL          |

> Stored in: data/users.json (managed by authService.js)

---

### PRODUCTS
| Attribute   | Type    | Constraint        |
|-------------|---------|-------------------|
| id          | INTEGER | PK, AUTOINCREMENT |
| name        | TEXT    | NOT NULL          |
| description | TEXT    | NOT NULL          |
| price       | INTEGER | NOT NULL          |
| image       | TEXT    | NOT NULL          |
| stock       | INTEGER | NOT NULL DEFAULT 0|
| created_at  | TEXT    | DEFAULT NOW       |

> Stored in: SQLite table `products` (fior.sqlite)

---

### ORDERS
| Attribute     | Type    | Constraint              |
|---------------|---------|-------------------------|
| id            | INTEGER | PK, AUTOINCREMENT       |
| user_id       | INTEGER | FK -> USERS(id), NULL   |
| customer_name | TEXT    | NOT NULL                |
| email         | TEXT    | NOT NULL                |
| phone         | TEXT    | NOT NULL                |
| address       | TEXT    | NOT NULL                |
| total         | INTEGER | NOT NULL                |
| status        | TEXT    | DEFAULT 'pending'       |
| created_at    | TEXT    | DEFAULT NOW             |

> Stored in: SQLite table `orders` (fior.sqlite)

---

### ORDER_ITEMS  *(junction table)*
| Attribute    | Type    | Constraint              |
|--------------|---------|-------------------------|
| id           | INTEGER | PK, AUTOINCREMENT       |
| order_id     | INTEGER | FK -> ORDERS(id)        |
| product_id   | INTEGER | FK -> PRODUCTS(id)      |
| product_name | TEXT    | NOT NULL                |
| price        | INTEGER | NOT NULL                |
| quantity     | INTEGER | NOT NULL                |

> Stored in: SQLite table `order_items` (fior.sqlite)

---

## Relationships

```
USERS ||--o{ ORDERS        : "User_ID"
ORDERS ||--|{ ORDER_ITEMS  : "order_id"
PRODUCTS ||--o{ ORDER_ITEMS : "product_id"
```

### Cardinality

| Left Entity | Relationship | Right Entity | Label      |
|-------------|-------------|--------------|------------|
| USERS       | 1 to 0..N   | ORDERS       | User_ID    |
| ORDERS      | 1 to 1..N   | ORDER_ITEMS  | order_id   |
| PRODUCTS    | 1 to 0..N   | ORDER_ITEMS  | product_id |

### In plain English
- 1 User can place **many Orders** (one-to-many)
- 1 Order contains **one or more Order Items** (one-to-many)
- 1 Product can appear in **many Order Items** (one-to-many)
- `user_id` in ORDERS links back to `id` in USERS ← **Critical Connection**

---

## ASCII Box Diagram (draw boxes from this)

```
+------------------+          +---------------------+
|      USERS       |          |       ORDERS        |
+------------------+          +---------------------+
| PK  id           |1        N| PK  id              |
|     firstName    |----------| FK  user_id ------->|--- User_ID
|     username     |          |     customer_name   |
|     passwordHash |          |     email           |
|     registeredAt |          |     phone           |
+------------------+          |     address         |
                              |     total           |
                              |     status          |
                              |     created_at      |
                              +---------------------+
                                        | 1
                                        |
                                        | N
                              +---------------------+
                              |    ORDER_ITEMS      |
                              +---------------------+
                              | PK  id              |
                              | FK  order_id        |
                              | FK  product_id -----|------+
                              |     product_name    |      |
                              |     price           |      |
                              |     quantity        |      |
                              +---------------------+      |
                                                           | N
                                                  +--------+--------+
                                                  |    PRODUCTS     |
                                                  +-----------------+
                                                  | PK  id          |
                                                  |     name        |
                                                  |     description |
                                                  |     price       |
                                                  |     image       |
                                                  |     stock       |
                                                  |     created_at  |
                                                  +-----------------+
```
