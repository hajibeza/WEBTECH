/**
 * orderRepository.js — Repository layer for `orders` and `order_items` tables.
 *
 * Responsibility: ALL SQL for orders lives here.
 * CheckoutService calls these functions; it never writes SQL directly.
 */

const { run } = require("../store-db");

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

    // Insert one order_items row per cart line
    for (const item of items) {
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
    return { orderId: orderRow.id };
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }
}

module.exports = { createOrderWithItems };
