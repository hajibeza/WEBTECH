const authService = require("../services/authService");

/**
 * POST /api/login
 *
 * REQUEST  — Receives { email, password } in the JSON body.
 * PROCESSING — Delegates to authService (Gatekeeper):
 *               1. Find user by email → 401 if not found
 *               2. bcrypt.compare password → 401 if mismatch
 *               3. Sign JWT with userId
 * RESPONSE — 200 + { token, user } on success
 *            401 + { message } if credentials are invalid
 *            400 + { message } if fields are missing
 *            500 + { message } on unexpected error
 */
async function login(req, res) {
  const { email, password } = req.body;

  // Basic validation — both fields are required
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const { token, user } = await authService.loginUser(email, password);

    // 200 OK — send the JWT token and public user info back to the client
    return res.status(200).json({
      message: "Login successful.",
      token,
      user
    });
  } catch (error) {
    // authService throws with a .status of 401 for bad credentials
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Login failed." });
  }
}

module.exports = { login };
