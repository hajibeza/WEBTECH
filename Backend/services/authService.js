const fs = require("fs/promises");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Secret key for signing JWT — in production use process.env.JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || "fior-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";

// Path to the user database JSON file
const USERS_PATH = path.join(__dirname, "..", "..", "data", "users.json");

/**
 * Load all users from the JSON file (acts as our database).
 * @returns {Promise<object[]>}
 */
async function loadUsers() {
  const raw = await fs.readFile(USERS_PATH, "utf8");
  return JSON.parse(raw);
}

/**
 * GATEKEEPER — Authenticate a user by email and password.
 *
 * Step 1: Find the user in the database by email (username).
 *         If not found → throw 401 Unauthorized.
 *
 * Step 2: Use bcrypt.compare() to check submitted password
 *         against the stored hash.
 *         If no match → throw 401 Unauthorized.
 *
 * Step 3: Sign a JWT containing the user's ID and firstName.
 *         Return the token + basic user info.
 *
 * @param {string} email       - Submitted email (username)
 * @param {string} password    - Submitted plain-text password
 * @returns {Promise<{ token: string, user: object }>}
 */
async function loginUser(email, password) {
  const users = await loadUsers();

  // Step 1 — Look up user by email (case-insensitive)
  const user = users.find(
    (u) => u.username.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    // Email not found in database → 401
    const err = new Error("Invalid email or password.");
    err.status = 401;
    throw err;
  }

  // Step 2 — bcrypt.compare: hash the submitted password and compare with stored hash
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    // Password does not match → 401
    const err = new Error("Invalid email or password.");
    err.status = 401;
    throw err;
  }

  // Step 3 — Sign JWT with user's ID (never include sensitive data in token)
  const token = jwt.sign(
    { userId: user.id, firstName: user.firstName },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      username: user.username
    }
  };
}

module.exports = { loginUser };
