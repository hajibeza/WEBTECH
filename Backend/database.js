const fs = require("fs/promises");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "fior.sqlite");
const db = new sqlite3.Database(dbPath);
const USERS_JSON_PATH = path.join(__dirname, "..", "data", "users.json");

const seedProducts = [
  {
    name: "Rose Romance Bouquet",
    description: "Premium red roses wrapped for anniversaries and special dates.",
    price: 1290,
    image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=900&q=80",
    stock: 18
  },
  {
    name: "Sunshine Tulip Box",
    description: "Bright tulips in a modern gift box for cheerful moments.",
    price: 990,
    image: "https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=900&q=80",
    stock: 14
  },
  {
    name: "Pastel Garden Basket",
    description: "Soft pastel mixed flowers arranged in a reusable basket.",
    price: 1590,
    image: "https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=900&q=80",
    stock: 10
  },
  {
    name: "Minimal White Bouquet",
    description: "Elegant white flowers for weddings, congratulations, or sympathy.",
    price: 1190,
    image: "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=900&q=80",
    stock: 12
  },
  {
    name: "Mini Lavender Jar",
    description: "A compact lavender arrangement for desks and small gifts.",
    price: 690,
    image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80",
    stock: 24
  },
  {
    name: "Signature Fior Deluxe",
    description: "Our largest seasonal arrangement with roses, lilies, and greens.",
    price: 2490,
    image: "https://images.unsplash.com/photo-1487070183336-b863922373d4?auto=format&fit=crop&w=900&q=80",
    stock: 7
  }
];

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
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
    db.all(sql, params, (error, rows) => {
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
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

async function initializeDatabase() {
  await run("PRAGMA foreign_keys = ON");

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      registered_at TEXT NOT NULL
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

  const productCount = await get("SELECT COUNT(*) AS count FROM products");
  if (productCount.count === 0) {
    for (const product of seedProducts) {
      await run(
        "INSERT INTO products (name, description, price, image, stock) VALUES (?, ?, ?, ?, ?)",
        [product.name, product.description, product.price, product.image, product.stock]
      );
    }
  }

  // One-time seed to move existing JSON users into SQLite.
  const userCount = await get("SELECT COUNT(*) AS count FROM users");
  if (userCount.count === 0) {
    try {
      const usersRaw = await fs.readFile(USERS_JSON_PATH, "utf8");
      const users = JSON.parse(usersRaw);
      if (Array.isArray(users)) {
        for (const user of users) {
          await run(
            "INSERT INTO users (id, first_name, username, password_hash, registered_at) VALUES (?, ?, ?, ?, ?)",
            [
              Number(user.id) || null,
              String(user.firstName || "").trim() || "User",
              String(user.username || "").trim().toLowerCase(),
              String(user.passwordHash || ""),
              String(user.registeredAt || new Date().toISOString())
            ]
          );
        }
      }
    } catch (error) {
      // Keep startup resilient if legacy users.json is missing or malformed.
      console.warn("Skipping users seed from JSON:", error.message);
    }
  }
}

module.exports = {
  db,
  run,
  all,
  get,
  initializeDatabase
};
