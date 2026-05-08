/**
 * userRepository.js — Repository layer for the `users` table.
 *
 * Responsibility: ALL SQL for users lives here and nowhere else.
 * Services call these functions; they never write SQL directly.
 *
 * Separation of Concerns:
 *   Repository  → "how to read/write users in the database"
 *   Service     → "what the business rules are"
 *   Controller  → "what HTTP verbs/routes expose"
 */

const { get, run } = require("../store-db");

/**
 * Map a raw SQLite row to a clean JS object.
 * Keeps column-name details (snake_case) inside the repository only.
 */
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    username: row.username,
    passwordHash: row.password_hash,
    registeredAt: row.registered_at
  };
}

/**
 * Find a user by email (case-insensitive).
 * @returns {Promise<object|null>}
 */
async function findByEmail(email) {
  const row = await get(
    `SELECT id, first_name, username, password_hash, registered_at
     FROM users WHERE lower(username) = lower(?) LIMIT 1`,
    [String(email || "").trim()]
  );
  return mapRow(row);
}

/**
 * Check whether an email address is already taken.
 * @returns {Promise<boolean>}
 */
async function existsByEmail(email) {
  const row = await get(
    "SELECT id FROM users WHERE lower(username) = lower(?) LIMIT 1",
    [String(email || "").trim()]
  );
  return !!row;
}

/**
 * Insert a new user row.
 * @returns {Promise<{ id: number, firstName: string, username: string }>}
 */
async function createUser({ firstName, username, passwordHash, registeredAt }) {
  const result = await run(
    `INSERT INTO users (first_name, username, password_hash, registered_at)
     VALUES (?, ?, ?, ?)`,
    [firstName, username, passwordHash, registeredAt]
  );
  return { id: result.id, firstName, username };
}

module.exports = { findByEmail, existsByEmail, createUser };
