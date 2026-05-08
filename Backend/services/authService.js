/**
 * authService.js — Business logic for Identity (login + register).
 *
 * Separation of Concerns:
 *   This layer owns RULES:
 *     - Password must match (bcrypt)
 *     - Email must be unique
 *     - JWT must be signed with the right secret
 *
 *   It does NOT own DATA ACCESS.
 *   All SQL is delegated to userRepository.
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");

const JWT_SECRET = process.env.JWT_SECRET || "fior-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 * Step 1: Ask Repository to find user by email.
 *         If not found → throw 401 Unauthorized.
 * Step 2: Use bcrypt.compare() to verify password against stored hash.
 *         If no match → throw 401 Unauthorized.
 * Step 3: Sign a JWT containing userId + firstName.
 */
async function loginUser(email, password) {
  // Step 1 — delegate DB lookup to Repository
  const user = await userRepository.findByEmail(email);

  if (!user) {
    const err = new Error("Invalid email or password.");
    err.status = 401;
    throw err;
  }

  // Step 2 — business rule: verify password (bcrypt lives in Service, not Repository)
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    const err = new Error("Invalid email or password.");
    err.status = 401;
    throw err;
  }

  // Step 3 — business rule: sign JWT
  const token = signUserToken(user);
  return {
    token,
    user: { id: user.id, firstName: user.firstName, username: user.username }
  };
}

/**
 * Register a new user.
 *
 * Business rules (all live here in Service):
 *   - firstName must be non-empty
 *   - email must match regex
 *   - password must be >= 6 chars
 *   - email must not already exist (409 Conflict)
 * Data persistence is delegated to Repository.
 */
async function registerUser(firstName, email, password) {
  const cleanFirstName = String(firstName || "").trim();
  const cleanEmail     = String(email    || "").trim().toLowerCase();
  const cleanPassword  = String(password || "");

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

  // Delegate duplicate-check to Repository
  const exists = await userRepository.existsByEmail(cleanEmail);
  if (exists) {
    const err = new Error("This email is already registered.");
    err.status = 409;
    throw err;
  }

  // Business rule: hash password (bcrypt lives here, not in Repository)
  const passwordHash = await bcrypt.hash(cleanPassword, 10);
  const registeredAt = new Date().toISOString();

  // Delegate INSERT to Repository
  const newUser = await userRepository.createUser({
    firstName: cleanFirstName,
    username: cleanEmail,
    passwordHash,
    registeredAt
  });

  const token = signUserToken(newUser);
  return {
    token,
    user: { id: newUser.id, firstName: newUser.firstName, username: newUser.username }
  };
}

module.exports = { loginUser, registerUser };
