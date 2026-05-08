/**
 * productRepository.js — Repository layer for product data.
 *
 * Responsibility: ALL data-access for products lives here.
 * Currently reads from a JSON file; can be swapped to SQLite or an
 * external API without touching ProductsService at all.
 */

const fs = require("fs/promises");
const path = require("path");

const PRODUCTS_JSON_PATH = path.join(__dirname, "..", "..", "data", "products.json");

/**
 * Load the full product list from the JSON data source.
 * @returns {Promise<object[]>}
 */
async function findAll() {
  const raw = await fs.readFile(PRODUCTS_JSON_PATH, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error("products.json must contain a JSON array");
  }
  return data;
}

/**
 * Load products filtered by category (case-insensitive).
 * An empty/missing category returns the full list.
 * @param {string|undefined} category
 * @returns {Promise<object[]>}
 */
async function findByCategory(category) {
  const all = await findAll();
  if (!category || category.trim() === "") {
    return all;
  }
  const normalized = category.trim().toLowerCase();
  return all.filter(
    (product) => (product.category || "").toLowerCase() === normalized
  );
}

module.exports = { findAll, findByCategory };
