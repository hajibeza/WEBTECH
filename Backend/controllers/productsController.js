const productsService = require("../services/productsService");

/**
 * GET /api/products
 * GET /api/products?category=Bouquets
 *
 * TRIGGER  : User clicks a category chip on the Frontend.
 * REQUEST  : Browser sends this route with an optional `category` query param.
 * PROCESSING: Delegate to productsService (Gatekeeper) to fetch + filter.
 * RESPONSE : Send the filtered JSON array (Package) back with status 200,
 *            or status 500 on failure.
 */
async function getProducts(req, res) {
  // Read the "envelope" — extract the category from the query string
  // e.g. GET /api/products?category=Hat  →  req.query.category === "Hat"
  const { category } = req.query;

  try {
    // Hand off to the service layer (Gatekeeper logic lives there)
    const products = await productsService.getProductsByCategory(category);

    // Send the Package (JSON array) back to the browser
    res.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    // Failure response — status + message
    res.status(500).json({ message: "Unable to load products." });
  }
}

module.exports = {
  getProducts
};
