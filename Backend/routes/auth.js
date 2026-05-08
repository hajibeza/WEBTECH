const express = require("express");
const jwt = require("jsonwebtoken");
const authController = require("../controllers/authController");

const router = express.Router();

/**
 * POST /api/login
 * Body: { email: string, password: string }
 */
router.post("/", authController.login);

/**
 * GET /api/auth/verify
 * Header: Authorization: Bearer <token>
 *
 * Simulated Identity Service endpoint (Step 5 — Micro-Surgery).
 * Verifies a JWT and returns the decoded payload.
 * Used by OrderService to authenticate without sharing code.
 *
 * 200 { userId, firstName }  — token valid
 * 401 { message }            — token missing or invalid
 */
router.get("/verify", (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No token provided." });
  }

  try {
    const secret = process.env.JWT_SECRET || "fior-dev-secret-change-in-production";
    const decoded = jwt.verify(token, secret);
    return res.status(200).json({ userId: decoded.userId, firstName: decoded.firstName });
  } catch (_) {
    return res.status(401).json({ message: "Token invalid or expired." });
  }
});

module.exports = router;
