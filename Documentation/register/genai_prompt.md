# GenAI Prompt — User Registration Feature

## Prompt (Express.js Route)

```
Act as a Backend Engineer.
Using Node.js and Express, write a POST route for /api/register.

The route must follow the Controller-Route-Service pattern:
- routes/register.js        defines POST / and delegates to authController.register
- controllers/authController.js  reads req.body, calls authService.registerUser, responds with JSON
- services/authService.js   contains all business logic

The service (authService.registerUser) must:
1. Validate that firstName is non-empty.
2. Validate the email with this regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
3. Validate that password has at least 6 characters.
4. Load existing users from data/users.json using fs/promises.
5. Reject the request with HTTP 409 if the email already exists (case-insensitive).
6. Hash the password using bcryptjs with SALT_ROUNDS = 10.
7. Create a new user object { id, firstName, username, passwordHash, registeredAt }.
8. Append the new user to users.json using fs/promises.writeFile.
9. Sign a JWT token using jsonwebtoken with { userId, firstName } and expiresIn: "7d".
10. Return { token, user: { id, firstName, username } } to the controller.

Use throw to propagate errors. Each thrown error should have a .status property (400, 409, 500).
The controller should catch the error and return res.status(err.status).json({ message: err.message }).
On success the controller responds with res.status(201).json({ message, token, user }).
```

## Prompt (Frontend register.js)

```
Act as a Frontend Developer.
Write a browser JavaScript file (no framework) called register.js for a registration page.

The page has a form with id="registerForm" and three inputs:
  #registerFirstName, #registerEmail, #registerPassword
There is also a message element #registerMessage.

The script must:
1. Prevent the default form submit.
2. Read values from all three inputs.
3. Client-side check: if any field is empty, show "Please complete first name, email and password." in #registerMessage and stop.
4. Call POST /api/register with Content-Type: application/json and body { firstName, email, password }.
5. If response is not ok, show data.message (from JSON) in #registerMessage, do not redirect.
6. If response is 201 ok, save the returned token to localStorage as "fiorToken" and user JSON as "fiorUser", then redirect to shop.html after 600ms.
7. Wrap the fetch in try/catch; on network error show "Cannot connect to server. Make sure backend is running."

Add clear comments explaining each step.
```

## What the AI Produced

### Routes / Backend
- `Backend/routes/register.js` — single `router.post("/", authController.register)` with JSDoc
- `Backend/controllers/authController.js` — `register()` function reads body, delegates to service, returns 201 or error
- `Backend/services/authService.js` — `registerUser()` validates, hashes, saves, signs JWT

### Frontend
- `js/register.js` — form submit handler with client-side guard, fetch to `/api/register`, localStorage save, redirect

### Key Design Decisions
- Passwords are **never** stored in plain text; only bcrypt hashes are written to `users.json`
- JWT token allows immediate login after registration (no second login step)
- `err.status` pattern keeps error handling consistent across all services
- Duplicate email check is case-insensitive to avoid `user@Email.com` / `user@email.com` conflicts
