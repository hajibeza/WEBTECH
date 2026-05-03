const fs = require("fs/promises");
const path = require("path");

// Path to the product catalog JSON file (one level above Backend/)
const PRODUCTS_JSON_PATH = path.join(__dirname, "..", "data", "products.json");

/**
 * Loads all products from the local JSON catalog file.
 * @returns {Promise<object[]>} Full product array
 */
async function getAllProducts() {
  const raw = await fs.readFile(PRODUCTS_JSON_PATH, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error("products.json must contain a JSON array");
  }
  return data;
}

/**
 * GATEKEEPER — Fetches products and filters by category if provided.
 *
 * Logic:
 *   - Read the full product list from JSON (Data Source)
 *   - If `category` is given: keep only products where
 *     product.category matches (case-insensitive)
 *   - If `category` is omitted / empty: return all products
 *
 * @param {string|undefined} category - Category name from query param (e.g. "Bouquets")
 * @returns {Promise<object[]>} Filtered (or full) product array
 */
async function getProductsByCategory(category) {
  const all = await getAllProducts();

  // No filter requested — return the full catalog
  if (!category || category.trim() === "") {
    return all;
  }

  // Gatekeeper: filter where category matches (case-insensitive)
  const normalized = category.trim().toLowerCase();
  return all.filter(
    (product) => (product.category || "").toLowerCase() === normalized
  );
}

module.exports = {
  getAllProducts,
  getProductsByCategory
};
