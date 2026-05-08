/**
 * productsService.js — Business logic for product catalog.
 *
 * Separation of Concerns:
 *   This layer owns RULES:
 *     - Apply category filter (case-insensitive)
 *     - Decide what "all products" means (no filter)
 *
 *   It does NOT own DATA ACCESS.
 *   All file/DB reads are delegated to productRepository.
 */

const productRepository = require("../repositories/productRepository");

/**
 * Return the full catalog or a category-filtered subset.
 * Business rule: matching is case-insensitive.
 *
 * @param {string|undefined} category
 * @returns {Promise<object[]>}
 */
async function getProductsByCategory(category) {
  return productRepository.findByCategory(category);
}

/**
 * Return all products with no filtering.
 * @returns {Promise<object[]>}
 */
async function getAllProducts() {
  return productRepository.findAll();
}

module.exports = { getAllProducts, getProductsByCategory };
