const API_LOGIN_URL = "/api/login";
const TOKEN_KEY = "fiorToken";
const USER_KEY = "fiorUser";

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function setMessage(el, text, isSuccess) {
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("success", !!isSuccess);
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.querySelector("#loginEmail").value.trim();
  const password = form.querySelector("#loginPassword").value;
  const messageEl = document.querySelector("#loginMessage");

  if (!email || !password) {
    setMessage(messageEl, "Please enter your email and password.", false);
    return;
  }

  setMessage(messageEl, "Signing in…", false);

  try {
    const response = await fetch(API_LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(messageEl, data.message || "Login failed.", false);
      return;
    }

    saveSession(data.token, data.user);
    setMessage(messageEl, "Login successful! Redirecting…", true);
    setTimeout(() => {
      window.location.href = "shop.html";
    }, 600);
  } catch (error) {
    console.error("Login error:", error);
    setMessage(messageEl, "Cannot connect to server. Make sure backend is running.", false);
  }
}

const loginForm = document.querySelector("#loginForm");
if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit);

window.FiorAuth = { getToken, clearSession, saveSession };
