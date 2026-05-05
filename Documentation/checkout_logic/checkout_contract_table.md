# Checkout Contract Table

## Endpoint Contract

| Field | Value |
|---|---|
| Endpoint | `POST /api/checkout` |
| Content-Type | `application/json` |
| Purpose | Validate checkout payload and save order |

## Request Body

| Field | Type | Required | Rule |
|---|---|---|---|
| `customerName` | string | Yes | Non-empty recommended |
| `phone` | string | Yes | Non-empty recommended |
| `email` | string | Yes | Must match email regex |
| `creditCard` | string | Yes | Must be exactly 16 digits |
| `address` | string | Yes | Non-empty recommended |
| `items` | array | Yes | Must contain at least 1 valid item |

Item shape:

| Field | Type | Required | Rule |
|---|---|---|---|
| `productId` | number | Yes | Integer |
| `productName` | string | Optional | Used in order_items |
| `price` | number | Yes | Numeric |
| `quantity` | number | Yes | Integer >= 1 |

## Responses

### 200 OK

```json
{
  "message": "Checkout successful.",
  "orderId": 123,
  "total": 2580
}
```

### 400 Bad Request (Validation)

```json
{
  "message": "Checkout validation failed.",
  "errors": {
    "items": "...",
    "email": "...",
    "creditCard": "..."
  }
}
```

### 400 Bad Request (Save Order Failed)

```json
{
  "message": "Save Order failed.",
  "errors": {
    "saveOrder": "Unable to save order. Please retry checkout."
  }
}
```

## Frontend Cart Safety Rule

- Do **not** clear cart on 400 errors.
- Do **not** clear cart on network failures.
- Clear cart only after successful 200 response.
