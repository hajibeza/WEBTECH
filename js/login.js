/**
 * login.js — Frontend login handler
 *
 * Flow:
 *   1. User submits the login form (email + password)
 *   2. Browser sends POST /api/login with JSON body
 *   3. Server responds with { token, user } on success
 *   4. Token is saved to localStorage ("fiorToken")
 *   5. User info is saved to localStorage ("fiorUser")
 *   6. Redirect to shop.html
 */

const API_LOGIN_URL = "http://localhost:3000/api/login";
const TOKEN_KEY = "fiorToken";
const USER_KEY  = "fiorUser";

/**
 * Save the JWT token and user info to localStorage.
 * @param {string} token
 * @param {object} user
 */
function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Read the stored token (used by other pages to attach Authorization header).
 * @returns {string|null}
 */
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Remove token + user info from localStorage (logout).
 */
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Submit handler — called when the login form is submitted.
 * @param {SubmitEvent} event
 */
async function handleLoginSubmit(event) {
  event.preventDefault();

  const form        = event.target;
  const email       = form.querySelector("#loginEmail").value.trim();
  const password    = form.querySelector("#loginPassword").value;
  const messageEl   = document.querySelector("#loginMessage");

  if (!email || !password) {
    if (messageEl) messageEl.textContent = "Please enter your email and password.";
    return;
  }

  if (messageEl) messageEl.textContent = "Signing in…";

  try {
    // 2. REQUEST — POST to /api/login with { email, password }
    const response = await fetch(API_LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      // 401 or 400 — show error from server
      if (messageEl) messageEl.textContent = data.message || "Login failed.";
      return;
    }

    // 3. RESPONSE — save token and user info to localStorage
    saveSession(data.token, data.user);

    if (messageEl) messageEl.textContent = "Login successful! Redirecting…";

    // 5. Redirect to shop after short delay
    setTimeout(() => {
      window.location.href = "shop.html";
    }, 800);

  } catch (error) {
    console.error("Login error:", error);
    if (messageEl) messageEl.textContent = "Cannot connect to server. Make sure the server is running.";
  }
}

// Attach handler to the login form
const loginForm = document.querySelector("#loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", handleLoginSubmit);
}

// Expose helpers for other scripts (e.g. to attach Authorization header on API calls)
window.FiorAuth = { getToken, clearSession };
