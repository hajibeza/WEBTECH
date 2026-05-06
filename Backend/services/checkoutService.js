const { run } = require("../store-db");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CREDIT_CARD_16_REGEX = /^\d{16}$/;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function validateCheckoutInput(payload) {
  const errors = {};

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.items = "Cart items are required.";
  } else {
    const invalidItem = payload.items.find((item) => {
      const productId = toNumber(item.productId);
      const price = toNumber(item.price);
      const quantity = toNumber(item.quantity);
      return !Number.isInteger(productId) || !Number.isFinite(price) || !Number.isInteger(quantity) || quantity < 1;
    });
    if (invalidItem) {
      errors.items = "Each cart item must include valid productId, price, and quantity.";
    }
  }

  if (!payload.email || !EMAIL_REGEX.test(String(payload.email).trim())) {
    errors.email = "Email must be a valid address (example@domain.com).";
  }

  const normalizedCard = String(payload.creditCard || "").replace(/\D/g, "");
  if (!CREDIT_CARD_16_REGEX.test(normalizedCard)) {
    errors.creditCard = "Credit card number must be exactly 16 digits.";
  }

  return { errors, normalizedCard };
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
}

async function saveCheckoutOrder(payload) {
  const total = calculateTotal(payload.items);
  const userIdParsed = Number(payload.userId);
  const safeUserId = Number.isInteger(userIdParsed) && userIdParsed > 0 ? userIdParsed : null;

  await run("BEGIN TRANSACTION");
  try {
    // Normalized ERD: one orders row + many order_items rows (FK to products.order_id chain)
    const orderRow = await run(
      `INSERT INTO orders (user_id, customer_name, email, phone, address, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        safeUserId,
        String(payload.customerName || "").trim(),
        String(payload.email || "").trim(),
        String(payload.phone || "").trim(),
        String(payload.address || "").trim(),
        total,
        "pending"
      ]
    );

    for (const item of payload.items) {
      await run(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [
          orderRow.id,
          Number(item.productId),
          String(item.productName || "Unknown"),
          Number(item.price),
          Number(item.quantity)
        ]
      );
    }

    await run("COMMIT");
    return { order: { id: orderRow.id }, total };
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }
}

module.exports = {
  validateCheckoutInput,
  saveCheckoutOrder,
  calculateTotal
};
