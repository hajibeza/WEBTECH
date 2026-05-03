# GenAI Prompt — Filter Products by Category

## Prompt Used

```
Act as a Backend Architect. Using Node.js and Express,
following the Controller-Route-Service pattern and this Contract:

  Endpoint : GET /api/products
  Query Param : category (string, optional, case-insensitive)
  Success Response : 200 JSON array of products filtered by category
  Error Response : 500 { message: "Unable to load products." }
  Data Source : local JSON file (data/products.json)

And this Sequence:
  1. TRIGGER   — User clicks a category (e.g. "Hat") on the Frontend.
  2. REQUEST   — Browser sends GET /api/products?category=Hat to the server.
  3. PROCESSING — Server (Gatekeeper) reads query param, fetches all products
                  from JSON file, filters where product.category matches (case-insensitive).
  4. RESPONSE  — Server sends back a JSON array (Package) with status 200,
                  or status 500 on failure.

Write:
  - Backend/routes/products.js      (Express Router, GET /)
  - Backend/controllers/productsController.js  (read req.query.category, call service)
  - Backend/services/productsService.js        (read JSON, filter by category)

Rules:
  - Add comments explaining the Gatekeeper logic.
  - Accept a query parameter for 'category'.
  - If category is omitted, return all products.
  - Matching is case-insensitive.
  - Ensure the code has comments explaining how it works.
```

## Result Summary

The prompt produced the three-layer structure below:

| File | Role |
|------|------|
| `routes/products.js` | Defines `GET /` route → delegates to controller |
| `controllers/productsController.js` | Reads `req.query.category`, calls service, sends JSON |
| `services/productsService.js` | Reads `products.json`, applies category filter (Gatekeeper) |
