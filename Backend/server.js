const express = require("express");
const path = require("path");
const { all, get, run, initializeDatabase } = require("./database");
const productsRouter = require("./routes/products");

const app = express();
const PORT = process.env.PORT || 3000;

/** Static site lives in repo root (HTML, css, js, data) */
const publicRoot = path.join(__dirname, "..");

/**
 * Live Server (e.g. http://127.0.0.1:5500) and the API (http://localhost:3000) are different
 * origins — browsers require Access-Control-Allow-Origin on API responses.
 */
function allowLocalDevCors(req, res, next) {
  const origin = req.headers.origin;
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
}

app.use(allowLocalDevCors);
app.use(express.json());
// app.use(express.static(publicRoot));

app.use("/api/products", productsRouter);

// app.get("/api/orders", async (req, res) => {
//   try {
//     const orders = await all("SELECT * FROM orders ORDER BY created_at DESC");
//     res.json(orders);
//   } catch (error) {
//     console.error("Failed to fetch orders:", error);
//     res.status(500).json({ message: "Unable to load orders." });
//   }
// });

// app.post("/api/orders", async (req, res) => {
//   const { customerName, email, phone, address, items } = req.body;

//   if (!customerName || !email || !phone || !address || !Array.isArray(items) || items.length === 0) {
//     res.status(400).json({ message: "Please complete customer details and cart items." });
//     return;
//   }

//   try {
//     const productIds = items.map((item) => Number(item.productId));
//     const products = await all(
//       `SELECT * FROM products WHERE id IN (${productIds.map(() => "?").join(",")})`,
//       productIds
//     );
//     const productById = new Map(products.map((product) => [product.id, product]));

//     let total = 0;
//     const orderItems = [];

//     for (const item of items) {
//       const productId = Number(item.productId);
//       const quantity = Number(item.quantity);
//       const product = productById.get(productId);

//       if (!product || !Number.isInteger(quantity) || quantity < 1) {
//         res.status(400).json({ message: "Cart contains an invalid product." });
//         return;
//       }

//       if (quantity > product.stock) {
//         res.status(400).json({ message: `${product.name} has only ${product.stock} items left.` });
//         return;
//       }

//       total += product.price * quantity;
//       orderItems.push({
//         productId,
//         productName: product.name,
//         price: product.price,
//         quantity
//       });
//     }

//     await run("BEGIN TRANSACTION");

//     try {
//       const order = await run(
//         "INSERT INTO orders (customer_name, email, phone, address, total) VALUES (?, ?, ?, ?, ?)",
//         [customerName.trim(), email.trim(), phone.trim(), address.trim(), total]
//       );

//       for (const item of orderItems) {
//         await run(
//           "INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)",
//           [order.id, item.productId, item.productName, item.price, item.quantity]
//         );
//         await run("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.productId]);
//       }

//       await run("COMMIT");

//       const createdOrder = await get("SELECT * FROM orders WHERE id = ?", [order.id]);
//       res.status(201).json({ order: createdOrder, items: orderItems });
//     } catch (error) {
//       await run("ROLLBACK");
//       throw error;
//     }
//   } catch (error) {
//     console.error("Failed to create order:", error);
//     res.status(500).json({ message: "Unable to create order." });
//   }
// });

// initializeDatabase()
//   .then(() => {
//     app.listen(PORT, () => {
//       console.log(`Fior shop is running at http://localhost:${PORT}`);
//     });
//   })
//   .catch((error) => {
//     console.error("Failed to initialize database:", error);
//     process.exit(1);
//   });

app.listen(PORT, () => {
  console.log(`Fior API at http://localhost:${PORT} (CORS enabled for localhost / 127.0.0.1)`);
});