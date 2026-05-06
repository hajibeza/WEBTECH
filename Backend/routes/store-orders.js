const express = require("express");
const { run, get } = require("../store-db");

const router = express.Router();

/**
 * Demo insert matching ERD: one orders header row + one order_items line.
 *
 * Minimum body still supports the homework fields:
 *   { user_id, product_id, quantity, total_price }
 * Optional overrides for realism:
 *   customer_name, email, phone, address, status
 */
router.post("/", async (req, res) => {
  const userIdParsed = Number(req.body.user_id);
  const productId = Number(req.body.product_id);
  const quantity = Number(req.body.quantity);
  const totalPriceLine = Number(req.body.total_price);

  if (
    !Number.isInteger(productId) ||
    productId <= 0 ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(totalPriceLine)
  ) {
    return res.status(400).json({
      message: "product_id, quantity, and total_price must be valid numbers."
    });
  }

  const fkUserId = Number.isInteger(userIdParsed) && userIdParsed > 0 ? userIdParsed : null;

  const customerName = String(req.body.customer_name || "").trim() || "Guest";
  const email =
    String(req.body.email || "").trim() ||
    (fkUserId ? `user${fkUserId}@fior.local` : "guest@fior.local");
  const phone = String(req.body.phone || "").trim() || "-";
  const address = String(req.body.address || "").trim() || "-";
  const status = String(req.body.status || "pending").trim() || "pending";

  try {
    const product = await get("SELECT id, name FROM products WHERE id = ?", [productId]);
    const productName = product && product.name ? String(product.name) : "Unknown product";

    // Derive stored unit price (integer cents/baht) from line total split by quantity (matches cart math)
    const unitPrice =
      quantity > 0 ? Math.round(Number(totalPriceLine) / Number(quantity)) : Number(totalPriceLine);

    await run("BEGIN TRANSACTION");
    const insertedOrder = await run(
      `INSERT INTO orders (user_id, customer_name, email, phone, address, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fkUserId, customerName, email, phone, address, Math.round(Number(totalPriceLine)), status]
    );

    await run(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
       VALUES (?, ?, ?, ?, ?)`,
      [insertedOrder.id, productId, productName, unitPrice, quantity]
    );

    await run("COMMIT");

    res.status(201).json({
      message: "Order saved successfully (orders + order_items).",
      orderId: insertedOrder.id
    });
  } catch (error) {
    await run("ROLLBACK").catch(() => {});
    console.error("Store order insert failed:", error);
    res.status(500).json({
      message: "Failed to save order.",
      detail: error && error.message ? error.message : String(error)
    });
  }
});

module.exports = router;
