# Sequence Diagram — Filter Products by Category

## Request / Response Map

```
Frontend (Browser)          Express Server           Service Layer          Data Source
        │                         │                        │                     │
        │  User clicks "Hat"       │                        │                     │
        │─────────────────────────►│                        │                     │
        │                         │                        │                     │
        │  1. TRIGGER             │                        │                     │
        │  Click event fires       │                        │                     │
        │                         │                        │                     │
        │  2. REQUEST             │                        │                     │
        │  GET /api/products       │                        │                     │
        │  ?category=Hat           │                        │                     │
        │─────────────────────────►│                        │                     │
        │  (Envelope: HTTP Request)│                        │                     │
        │                         │                        │                     │
        │                         │  3. PROCESSING         │                     │
        │                         │  Route receives req     │                     │
        │                         │  Controller reads       │                     │
        │                         │  req.query.category     │                     │
        │                         │─────────────────────────►│                     │
        │                         │  getProductsByCategory  │                     │
        │                         │  ("Hat")                │                     │
        │                         │                        │──────────────────────►│
        │                         │                        │  Read products.json  │
        │                         │                        │◄──────────────────────│
        │                         │                        │  Return full array   │
        │                         │                        │                     │
        │                         │                        │  GATEKEEPER:         │
        │                         │                        │  filter where        │
        │                         │                        │  category === "Hat"  │
        │                         │◄─────────────────────────│                     │
        │                         │  filtered array         │                     │
        │                         │                        │                     │
        │  4. RESPONSE            │                        │                     │
        │  Package: JSON array     │                        │                     │
        │  Status: 200 OK          │                        │                     │
        │◄─────────────────────────│                        │                     │
        │                         │                        │                     │
        │  Render product cards    │                        │                     │
        │                         │                        │                     │


        ── On Error ──────────────────────────────────────────────────────────────
        │                         │  File read fails        │                     │
        │                         │◄─────────────────────────│                     │
        │  Status: 500             │                        │                     │
        │  { message: "Unable     │                        │                     │
        │    to load products." } │                        │                     │
        │◄─────────────────────────│                        │                     │
```

## Summary Table

| Step | Actor             | Action                                               |
|------|-------------------|------------------------------------------------------|
| 1    | User (Browser)    | Clicks "Hat" category chip on Shop page              |
| 2    | Browser           | Sends `GET /api/products?category=Hat` to Express    |
| 3    | Express Router    | Matches route, passes `req` to Controller            |
| 3    | Controller        | Reads `req.query.category`, calls Service            |
| 3    | Service           | Reads `products.json`, filters by category (Gatekeeper) |
| 4    | Express           | Responds `200 OK` with JSON array (Package)          |
| 4    | Browser           | Renders filtered product cards on the page           |
