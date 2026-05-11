// Load .env variables FIRST — before any other require reads process.env
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

// Zero-Config Guard (Slide 6.2): crash fast with a helpful message if critical vars are missing
const REQUIRED_ENV = ["JWT_SECRET"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`\n[STARTUP ERROR] Missing required environment variables: ${missing.join(", ")}`);
  console.error("  → Create a .env file from .env.example and set the missing values.\n");
  process.exit(1);
}

const express = require("express");
const path = require("path");
const { initializeDatabase } = require("./database");
const { initializeStoreDatabase } = require("./store-db");
const productsRouter = require("./routes/products");
const authRouter = require("./routes/auth");
const registerRouter = require("./routes/register");
const checkoutRouter = require("./routes/checkout");
const storeOrdersRouter = require("./routes/store-orders");

const app = express();
const PORT = process.env.PORT || 3000;
// JWT_SECRET, IDENTITY_SERVICE_URL, CATALOG_SERVICE_URL are now read
// from .env by authService and checkoutService via process.env automatically.

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
app.use("/api/login", authRouter);
app.use("/api/auth", authRouter);
app.use("/api/register", registerRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/store/orders", storeOrdersRouter);

Promise.all([initializeDatabase(), initializeStoreDatabase()])
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Fior API at http://localhost:${PORT} (CORS enabled for localhost / 127.0.0.1)`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });