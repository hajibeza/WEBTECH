const fs = require("fs/promises");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

// Single SQLite file for storefront data model (aligned with Documentation/schema/erd.md)
const dbPath = path.join(__dirname, "store.db");
const storeDb = new sqlite3.Database(dbPath);

const USERS_JSON = path.join(__dirname, "..", "data", "users.json");
const PRODUCTS_JSON = path.join(__dirname, "..", "data", "products.json");

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    storeDb.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    storeDb.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    storeDb.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

async function renameLegacyOrdersIfNeeded() {
  const tbl = await get(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='orders'`
  ).catch(() => null);
  if (!tbl || !tbl.name) {
    return;
  }
  const cols = await all("PRAGMA table_info(orders)");
  const hasCustomerName = cols.some((c) => c.name === "customer_name");
  if (hasCustomerName) {
    return;
  }
  // Preserve old flat checkout rows alongside the normalized ERD model
  await run("DROP TABLE IF EXISTS orders_flat_legacy");
  await run("ALTER TABLE orders RENAME TO orders_flat_legacy");
}

async function seedUsersIfEmpty() {
  const row = await get("SELECT COUNT(*) AS count FROM users");
  const c = row ? Number(row.count) : 0;
  if (Number.isFinite(c) && c > 0) {
    return;
  }

  try {
    const raw = await fs.readFile(USERS_JSON, "utf8");
    const users = JSON.parse(raw);
    if (!Array.isArray(users)) {
      return;
    }
    const stmt =
      `INSERT INTO users (id, first_name, username, password_hash, registered_at)
       VALUES (?, ?, ?, ?, ?)`;
    for (const u of users) {
      await run(stmt, [
        Number(u.id) || null,
        String(u.firstName || "").trim() || "User",
        String(u.username || "").trim().toLowerCase(),
        String(u.passwordHash || ""),
        String(u.registeredAt || new Date().toISOString())
      ]);
    }
  } catch (error) {
    console.warn("store.db seed users skipped:", error.message);
  }
}

async function seedProductsIfEmpty() {
  const row = await get("SELECT COUNT(*) AS count FROM products");
  const c = row ? Number(row.count) : 0;
  if (Number.isFinite(c) && c > 0) {
    return;
  }

  try {
    const raw = await fs.readFile(PRODUCTS_JSON, "utf8");
    const products = JSON.parse(raw);
    if (!Array.isArray(products)) {
      return;
    }
    const stmt =
      `INSERT INTO products (id, name, description, price, image, stock)
       VALUES (?, ?, ?, ?, ?, ?)`;
    for (const p of products) {
      await run(stmt, [
        Number(p.id) || null,
        String(p.name || "").trim(),
        String(p.description || "").trim(),
        Number(p.price) || 0,
        String(p.image || p.image_url || "").trim(),
        Number(p.stock) || 0
      ]);
    }
  } catch (error) {
    console.warn("store.db seed products skipped:", error.message);
  }
}

/**
 * Builds tables that match Documentation/schema/erd.md:
 * users, products, orders (header), order_items (lines).
 */
async function initializeStoreDatabase() {
  await run("PRAGMA foreign_keys = ON");

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL,
      image TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await renameLegacyOrdersIfNeeded();

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  await seedUsersIfEmpty();
  await seedProductsIfEmpty();
}

module.exports = {
  storeDb,
  run,
  all,
  get,
  initializeStoreDatabase
};
