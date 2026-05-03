const express = require("express");
const productsController = require("../controllers/productsController");

const router = express.Router();

/**
 * GET /api/products
 * GET /api/products?category=<name>
 *
 * Route (Envelope definition):
 *   - Matches GET requests to /api/products (mounted in server.js)
 *   - Accepts an optional `category` query parameter
 *   - Forwards the request to the Controller for processing
 */
router.get("/", productsController.getProducts);

module.exports = router;
