const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { get, run } = require("../store-db");

// Secret key for signing JWT — in production use process.env.JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || "fior-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapRowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    username: row.username,
    passwordHash: row.password_hash,
    registeredAt: row.registered_at
  };
}

function signUserToken(user) {
  return jwt.sign(
    { userId: user.id, firstName: user.firstName },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
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
  // Step 1 — Look up user by email (case-insensitive)
  const row = await get(
    "SELECT id, first_name, username, password_hash, registered_at FROM users WHERE lower(username) = lower(?) LIMIT 1",
    [String(email || "").trim()]
  );
  const user = mapRowToUser(row);

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
  const token = signUserToken(user);

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      username: user.username
    }
  };
}

/**
 * Register a new user into SQLite users table.
 * - Reject duplicate email
 * - Hash password with bcrypt
 * - Return JWT token for immediate signed-in state
 */
async function registerUser(firstName, email, password) {
  const cleanFirstName = String(firstName || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");

  if (!cleanFirstName) {
    const err = new Error("First name is required.");
    err.status = 400;
    throw err;
  }
  if (!EMAIL_REGEX.test(cleanEmail)) {
    const err = new Error("Email format is invalid.");
    err.status = 400;
    throw err;
  }
  if (cleanPassword.length < 6) {
    const err = new Error("Password must be at least 6 characters.");
    err.status = 400;
    throw err;
  }

  const exists = await get("SELECT id FROM users WHERE lower(username) = lower(?) LIMIT 1", [cleanEmail]);
  if (exists) {
    const err = new Error("This email is already registered.");
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(cleanPassword, 10);
  const registeredAt = new Date().toISOString();
  const inserted = await run(
    "INSERT INTO users (first_name, username, password_hash, registered_at) VALUES (?, ?, ?, ?)",
    [cleanFirstName, cleanEmail, passwordHash, registeredAt]
  );

  const newUser = {
    id: inserted.id,
    firstName: cleanFirstName,
    username: cleanEmail
  };

  const token = signUserToken(newUser);
  return {
    token,
    user: {
      id: newUser.id,
      firstName: newUser.firstName,
      username: newUser.username
    }
  };
}

module.exports = { loginUser, registerUser };
