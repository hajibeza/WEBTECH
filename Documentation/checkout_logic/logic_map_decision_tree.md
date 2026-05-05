# Checkout Logic Map (Decision Tree)

Endpoint: `POST /api/checkout`

## UML-Style Decision Tree

```text
START
  |
  v
[Receive request body]
  |
  v
[Check cart items]
  |-- NO (empty / invalid items) --> [400 Bad Request]
  |                                   errors.items = "Cart items are required."
  |
  |-- YES
  v
[Check email format with regex]
  |-- NO --> [400 Bad Request]
  |          errors.email = "Email must be a valid address (example@domain.com)."
  |
  |-- YES
  v
[Check credit card is exactly 16 digits]
  |-- NO --> [400 Bad Request]
  |          errors.creditCard = "Credit card number must be exactly 16 digits."
  |
  |-- YES
  v
[Calculate total from items]
  |
  v
[Try Save Order]
  |-- FAIL (catch) --> [400 Bad Request]
  |                    errors.saveOrder = "Unable to save order. Please retry checkout."
  |                    NOTE: Frontend must NOT clear cart.
  |
  |-- SUCCESS
  v
[200 OK]
  response = { message, orderId, total }
  |
  v
END
```

## Critical Path Summary

1. Is cart empty? -> Reject (400)
2. Is email valid? -> If no, send error (400)
3. Is credit card 16 digits? -> If no, send error (400)
4. If all "Yes" -> Calculate total -> Create Order ID and save -> Return 200

## Frontend Rule (Important)

- Clear cart only when API response is success (`response.ok === true`).
- If API returns 400 or network fails, keep cart untouched.
