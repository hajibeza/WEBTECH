const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

/**
 * POST /api/login
 * Body: { email: string, password: string }
 *
 * Envelope definition — forwards the request to the controller.
 */
router.post("/", authController.login);

module.exports = router;
