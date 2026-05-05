const fs = require("fs/promises");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Secret key for signing JWT — in production use process.env.JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || "fior-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

async function saveUsers(users) {
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
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
 * Register a new user into users.json.
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

  const users = await loadUsers();
  const exists = users.some((u) => String(u.username).toLowerCase() === cleanEmail);
  if (exists) {
    const err = new Error("This email is already registered.");
    err.status = 409;
    throw err;
  }

  const nextId = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1;
  const passwordHash = await bcrypt.hash(cleanPassword, 10);
  const newUser = {
    id: nextId,
    firstName: cleanFirstName,
    username: cleanEmail,
    passwordHash,
    registeredAt: new Date().toISOString()
  };

  users.push(newUser);
  await saveUsers(users);

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
