/**
 * register.js — Frontend registration handler
 *
 * Logic flow (matches the Sequence Diagram):
 *   1. User fills in the registration form (firstName, email, password)
 *   2. Client-side validation: all fields must be non-empty
 *   3. Browser sends POST /api/register with JSON body
 *   4. Server validates:
 *        - firstName present
 *        - email format correct (regex)
 *        - password >= 6 characters
 *        - email not already in use (409 if duplicate)
 *   5. Server hashes password with bcrypt, saves new user to SQLite users table
 *   6. Server signs a JWT token containing userId + firstName
 *   7. Server responds 201 { token, user }
 *   8. Frontend saves token + user to localStorage ("fiorToken", "fiorUser")
 *   9. Redirect to shop.html — user is now logged in immediately
 *
 * On error: show error message, do NOT redirect (keep form data intact)
 */

function resolveApiUrl(path) {
  // If page is opened on a non-API origin (e.g. Live Server :5500),
  // route requests directly to backend origin.
  if (window.location.port !== "3000") {
    return `http://localhost:3000${path}`;
  }
  return path;
}

const API_REGISTER_URL = resolveApiUrl("/api/register");
const TOKEN_KEY = "fiorToken";
const USER_KEY  = "fiorUser";

/** Save JWT token and user info to localStorage for session persistence */
function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Display a status message below the form */
function setMessage(el, text, isSuccess) {
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("success", !!isSuccess);
}

/**
 * handleRegisterSubmit — called when the register form is submitted.
 *
 * Step 1: Read values from the form
 * Step 2: Client-side guard — reject empty fields immediately
 * Step 3: POST to /api/register with JSON body { firstName, email, password }
 * Step 4: On success (201) — save session → redirect to shop.html
 * Step 5: On failure — show server error message, keep cart and form intact
 */
async function handleRegisterSubmit(event) {
  event.preventDefault();

  const form      = event.target;
  const firstName = form.querySelector("#registerFirstName").value.trim();
  const email     = form.querySelector("#registerEmail").value.trim();
  const password  = form.querySelector("#registerPassword").value;
  const messageEl = document.querySelector("#registerMessage");

  // Step 2 — client-side validation before hitting the network
  if (!firstName || !email || !password) {
    setMessage(messageEl, "Please complete first name, email and password.", false);
    return;
  }

  setMessage(messageEl, "Creating account…", false);

  try {
    // Step 3 — send registration request to the Express API
    const response = await fetch(API_REGISTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      // Step 5 — server returned 400 / 409: show the error, keep form
      setMessage(messageEl, data.message || "Register failed.", false);
      return;
    }

    // Step 4 — registration succeeded: persist session and redirect
    saveSession(data.token, data.user);
    setMessage(messageEl, "Register successful! Redirecting…", true);
    setTimeout(() => {
      window.location.href = "shop.html";
    }, 600);

  } catch (error) {
    // Network / server unreachable
    console.error("Register error:", error);
    setMessage(messageEl, "Cannot connect to server. Make sure backend is running.", false);
  }
}

// Attach handler to the register form on this page
const registerForm = document.querySelector("#registerForm");
if (registerForm) registerForm.addEventListener("submit", handleRegisterSubmit);
