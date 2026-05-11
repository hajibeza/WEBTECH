/**
 * orderRepository.js — Repository layer for `orders` and `order_items` tables.
 *
 * Responsibility: ALL SQL for orders lives here.
 * CheckoutService calls these functions; it never writes SQL directly.
 */

const { run } = require("../store-db");

/**
 * Fix #3 — Sanitize and type-guard each item at the Repository boundary.
 * Prevents SQL injection if a future dev switches to string interpolation.
 */
function sanitizeOrderItem(item) {
  const productId = Number(item.productId);
  const price     = Number(item.price);
  const quantity  = Number(item.quantity);

  if (!Number.isInteger(productId) || productId <= 0) throw new Error("Invalid productId");
  if (!Number.isFinite(price)      || price < 0)      throw new Error("Invalid price");
  if (!Number.isInteger(quantity)  || quantity < 1)   throw new Error("Invalid quantity");

  return {
    productId,
    productName: String(item.productName || "Unknown").slice(0, 200),
    price,
    quantity
  };
}

/**
 * Persist one order header + its line items inside a single transaction.
 *
 * @param {{ userId, customerName, email, phone, address, total, items[] }} orderData
 * @returns {Promise<{ orderId: number }>}
 */
async function createOrderWithItems(orderData) {
  const {
    userId,
    customerName,
    email,
    phone,
    address,
    total,
    items
  } = orderData;

  await run("BEGIN TRANSACTION");
  try {
    // Insert order header row
    const orderRow = await run(
      `INSERT INTO orders (user_id, customer_name, email, phone, address, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        String(customerName || "").trim(),
        String(email || "").trim(),
        String(phone || "").trim(),
        String(address || "").trim(),
        total,
        "pending"
      ]
    );

    // Insert one order_items row per cart line (sanitized at boundary)
    for (const raw of items) {
      const item = sanitizeOrderItem(raw);
      await run(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [orderRow.id, item.productId, item.productName, item.price, item.quantity]
      );
    }

    await run("COMMIT");
    return { orderId: orderRow.id };
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }
}

module.exports = { createOrderWithItems };
