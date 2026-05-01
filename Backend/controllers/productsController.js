const productsService = require("../services/productsService");

async function getProducts(_req, res) {
  try {
    const products = await productsService.getAllProducts();
    res.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).json({ message: "Unable to load products." });
  }
}

module.exports = {
  getProducts
};
