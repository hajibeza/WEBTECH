# Contract Table — Filter Products by Category

## Endpoint Contract

| Field              | Value                                                   |
|--------------------|---------------------------------------------------------|
| **Endpoint**       | `GET /api/products`                                     |
| **Query Param**    | `category` (string, optional)                           |
| **Example**        | `GET /api/products?category=Hat`                        |
| **Trigger**        | User clicks a category chip (e.g. "Hat") on the Frontend|
| **Gatekeeper**     | If `category` param exists → filter array; else return all |
| **Success Status** | `200 OK`                                                |
| **Success Body**   | JSON array of product objects matching the category     |
| **Fail Status**    | `500 Internal Server Error`                             |
| **Fail Body**      | `{ "message": "Unable to load products." }`             |

## Product Object Shape (Package)

| Field         | Type    | Description                        |
|---------------|---------|------------------------------------|
| `id`          | number  | Unique product identifier          |
| `name`        | string  | Product name                       |
| `description` | string  | Short product description          |
| `category`    | string  | Product category (e.g. Bouquets)   |
| `price`       | number  | Price in THB                       |
| `image_url`   | string  | URL to product image               |
| `stock`       | number  | Available quantity                 |

## Gatekeeper Logic

```
IF category query param is present AND not empty
  → filter products where product.category === category (case-insensitive)
ELSE
  → return all products
IF result array is empty
  → return 200 with empty array []
```
