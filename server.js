const express = require("express");
const { all, get, run, initializeDatabase } = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/products", async (req, res) => {
  try {
    const products = await all("SELECT * FROM products ORDER BY id ASC");
    res.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).json({ message: "Unable to load products." });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const orders = await all("SELECT * FROM orders ORDER BY created_at DESC");
    res.json(orders);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    res.status(500).json({ message: "Unable to load orders." });
  }
});

app.post("/api/orders", async (req, res) => {
  const { customerName, email, phone, address, items } = req.body;

  if (!customerName || !email || !phone || !address || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: "Please complete customer details and cart items." });
    return;
  }

  try {
    const productIds = items.map((item) => Number(item.productId));
    const products = await all(
      `SELECT * FROM products WHERE id IN (${productIds.map(() => "?").join(",")})`,
      productIds
    );
    const productById = new Map(products.map((product) => [product.id, product]));

    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      const product = productById.get(productId);

      if (!product || !Number.isInteger(quantity) || quantity < 1) {
        res.status(400).json({ message: "Cart contains an invalid product." });
        return;
      }

      if (quantity > product.stock) {
        res.status(400).json({ message: `${product.name} has only ${product.stock} items left.` });
        return;
      }

      total += product.price * quantity;
      orderItems.push({
        productId,
        productName: product.name,
        price: product.price,
        quantity
      });
    }

    await run("BEGIN TRANSACTION");

    try {
      const order = await run(
        "INSERT INTO orders (customer_name, email, phone, address, total) VALUES (?, ?, ?, ?, ?)",
        [customerName.trim(), email.trim(), phone.trim(), address.trim(), total]
      );

      for (const item of orderItems) {
        await run(
          "INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)",
          [order.id, item.productId, item.productName, item.price, item.quantity]
        );
        await run("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.productId]);
      }

      await run("COMMIT");

      const createdOrder = await get("SELECT * FROM orders WHERE id = ?", [order.id]);
      res.status(201).json({ order: createdOrder, items: orderItems });
    } catch (error) {
      await run("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ message: "Unable to create order." });
  }
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Fior shop is running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
