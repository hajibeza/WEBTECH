const fs = require("fs/promises");
const path = require("path");

/** Catalog at repo root: ../data/products.json (sibling of Backend/) */
const PRODUCTS_JSON_PATH = path.join(__dirname, "..", "data", "products.json");

/**
 * Loads all products from the local JSON catalog file.
 * @returns {Promise<object[]>}
 */
async function getAllProducts() {
  const raw = await fs.readFile(PRODUCTS_JSON_PATH, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error("products.json must contain a JSON array");
  }
  return data;
}

module.exports = {
  getAllProducts
};
