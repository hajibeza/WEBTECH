# Pre-Deployment Checklist — Fior E-Commerce (Node.js / Express / SQLite)
## Reviewed by: Senior DevOps Engineer perspective
## Based on: actual code audit of this project

---

## SECURITY (Items 1–4)

---

### ✅ #1 — Secrets in Environment Variables

**Status: DONE**

`.env` is configured and `.gitignore` excludes it.

Code-level check in `authService.js`:
```js
// GOOD — reads from env, never hardcoded in committed code
const JWT_SECRET = process.env.JWT_SECRET || "fior-dev-secret-change-in-production";
```

**Before deploying:** Replace the fallback default with a startup guard:
```js
// BETTER for production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set.");
  process.exit(1);
}
```
This forces the server to refuse to start if a secret is missing, rather than silently using a weak default.

---

### ⚠️ #2 — CORS Policy is Too Open for Production

**Status: NEEDS FIX before deploying**

Current `server.js` allows ANY localhost/127.0.0.1 origin:
```js
// CURRENT — fine for development, dangerous in production
if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
```

**Fix for production:**
```js
// In .env
ALLOWED_ORIGIN=https://your-production-domain.com

// In server.js
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
if (origin === ALLOWED_ORIGIN) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
}
```

---

### ✅ #3 — Passwords Hashed, Credit Card NOT Stored

**Status: DONE**

`authService.js` uses bcrypt (10 rounds) — correct.
`checkoutService.js` never saves card number — only validates format.
`orderRepository.js` INSERT does not include creditCard column — correct.

**Confirm with:**
```js
// checkoutService.js — card is validated but never passed to repository ✅
const normalizedCard = String(payload.creditCard || "").replace(/\D/g, "");
if (!CREDIT_CARD_16_REGEX.test(normalizedCard)) { ... }
// normalizedCard is NOT passed to orderRepository.createOrderWithItems()
```

---

### ⚠️ #4 — No Rate Limiting on Auth Routes

**Status: MISSING — add before deploying**

Currently anyone can call `POST /api/login` unlimited times (brute-force attack).

**Fix — install express-rate-limit:**
```bash
npm install express-rate-limit
```

```js
// server.js
const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 attempts per IP
  message: { message: "Too many login attempts. Please try again later." }
});

app.use("/api/login", authLimiter, authRouter);
app.use("/api/register", authLimiter, registerRouter);
```

---

## PERFORMANCE (Items 5–7)

---

### ⚠️ #5 — express.json() Has No Body Size Limit

**Status: NEEDS FIX**

A client can send a huge JSON payload and crash the server.

Current code:
```js
app.use(express.json()); // no limit
```

**Fix:**
```js
app.use(express.json({ limit: "10kb" })); // reject payloads > 10 KB
```

---

### ⚠️ #6 — No HTTP Security Headers (helmet)

**Status: MISSING**

Without security headers, browsers expose the app to XSS, clickjacking, MIME sniffing attacks.

**Fix — install helmet:**
```bash
npm install helmet
```

```js
// server.js — add BEFORE routes
const helmet = require("helmet");
app.use(helmet());
```

Helmet automatically sets: `X-Content-Type-Options`, `X-Frame-Options`,
`Strict-Transport-Security`, `X-XSS-Protection`, and more.

---

### ✅ #7 — SQLite Transactions Used for Order Writes

**Status: DONE**

`orderRepository.js` wraps INSERT into a proper transaction:
```js
await run("BEGIN TRANSACTION");
// ... inserts ...
await run("COMMIT");
// on error:
await run("ROLLBACK");
```
This prevents partial orders (header written but no items) in case of crash.

---

## ERROR HANDLING (Items 8–10)

---

### ⚠️ #8 — checkoutController Swallows the Real Error

**Status: NEEDS FIX**

Current `checkoutController.js` catches errors but never logs them:
```js
// CURRENT — real error is lost silently
} catch (error) {
  return res.status(400).json({ message: "Save Order failed." });
}
```

**Fix:**
```js
} catch (error) {
  console.error("[checkoutController] saveCheckoutOrder failed:", error); // ADD THIS
  return res.status(500).json({
    message: "Save Order failed.",
    errors: { saveOrder: "Unable to save order. Please retry checkout." }
  });
}
```
Also note: a DB write failure should be **500** (server error), not **400** (client error).

---

### ⚠️ #9 — No Global Error Handler (Unhandled Crashes)

**Status: MISSING**

If any middleware throws an unexpected error, Express returns an HTML error page instead of JSON. This leaks internal stack traces to the client.

**Fix — add at the BOTTOM of server.js (after all routes):**
```js
// Global error handler — must have 4 parameters (err, req, res, next)
app.use((err, req, res, next) => {
  console.error("[Unhandled Error]", err);
  res.status(500).json({ message: "An unexpected error occurred." });
});

// Handle 404 — route not found
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
});
```

---

### ⚠️ #10 — No Process-Level Crash Guard

**Status: MISSING**

If a Promise rejects with no `.catch()` (anywhere in the app), Node.js will crash silently in production.

**Fix — add to server.js after dotenv line:**
```js
process.on("unhandledRejection", (reason, promise) => {
  console.error("[unhandledRejection]", reason);
  // In production: send alert, then graceful shutdown
});

process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
  process.exit(1); // Restart via PM2 / Docker restart policy
});
```

---

## Summary Scorecard

| # | Category | Check | Status |
|---|---|---|---|
| 1 | Security | Secrets in .env | ✅ Done |
| 2 | Security | CORS locked to production domain | ⚠️ Fix before deploy |
| 3 | Security | Passwords hashed, card not stored | ✅ Done |
| 4 | Security | Rate limiting on auth routes | ⚠️ Missing |
| 5 | Performance | express.json() body size limit | ⚠️ Missing |
| 6 | Performance | HTTP security headers (helmet) | ⚠️ Missing |
| 7 | Performance | SQLite transactions for writes | ✅ Done |
| 8 | Error Handling | Controllers log + correct status codes | ⚠️ Fix checkout |
| 9 | Error Handling | Global error handler + 404 handler | ⚠️ Missing |
| 10 | Error Handling | Process-level crash guard | ⚠️ Missing |

**✅ 3 / 10 fully done — ⚠️ 7 items to fix before production deploy**
