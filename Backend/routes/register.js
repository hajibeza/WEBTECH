const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

/**
 * POST /api/register
 *
 * Envelope (Route) — defines the URL and HTTP method for user registration.
 *
 * Request body expected:
 *   { firstName: string, email: string, password: string }
 *
 * Delegates to authController.register for processing.
 * The controller handles validation and responds with:
 *   201 + { token, user }  on success
 *   400                    if fields are missing or invalid
 *   409                    if email is already registered
 */
router.post("/", authController.register);

module.exports = router;
