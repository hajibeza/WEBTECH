const express = require("express");
const checkoutController = require("../controllers/checkoutController");

const router = express.Router();

/** POST /api/checkout */
router.post("/", checkoutController.checkout);

module.exports = router;
