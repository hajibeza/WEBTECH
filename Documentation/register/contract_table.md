# Contract Table — User Registration

## Endpoint Contract

| Field           | Value                                              |
|-----------------|----------------------------------------------------|
| Endpoint        | POST /api/register                                 |
| Content-Type    | application/json                                   |
| Files           | Backend/routes/register.js, Backend/controllers/authController.js, Backend/services/authService.js, js/register.js |

## Request Body

| Field       | Type   | Required | Rule                              |
|-------------|--------|----------|-----------------------------------|
| firstName   | string | Yes      | Non-empty string                  |
| email       | string | Yes      | Valid email format (regex)        |
| password    | string | Yes      | Minimum 6 characters              |

## Success Response — 201 Created

| Field   | Type   | Description                            |
|---------|--------|----------------------------------------|
| message | string | "Register successful."                 |
| token   | string | JWT signed with userId + firstName     |
| user.id | number | New user's auto-incremented ID         |
| user.firstName | string | First name                      |
| user.username  | string | Email (used as username)        |

## Error Responses

| Status | Condition                         | Message                                |
|--------|-----------------------------------|----------------------------------------|
| 400    | Missing firstName                 | "First name is required."              |
| 400    | Invalid email format              | "Email format is invalid."             |
| 400    | Password shorter than 6 chars     | "Password must be at least 6 characters." |
| 400    | Any required field empty          | "First name, email and password are required." |
| 409    | Email already registered          | "This email is already registered."    |
| 500    | Unexpected server error           | "Register failed."                     |

## Post-Condition (After Success)

- New user object appended to data/users.json
- Password stored as bcrypt hash (never plain text)
- JWT token returned — frontend saves to localStorage (fiorToken, fiorUser)
- User is immediately logged in (no separate login step required)
