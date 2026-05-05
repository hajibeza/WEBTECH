# Sequence Diagram — User Registration

## Actors / Systems

- User (Browser)
- register.js (Frontend script)
- Express Server (POST /api/register)
- authController.register
- authService.registerUser
- users.json (Data Store)

## Message Sequence

```
User              register.js          Express /api/register    authController    authService    users.json
 |                    |                        |                      |                |              |
 |-- fill form ------>|                        |                      |                |              |
 |-- click submit --> |                        |                      |                |              |
 |                    |                        |                      |                |              |
 |              [client validate]              |                      |                |              |
 |              all fields ok?                 |                      |                |              |
 |              NO -> show error               |                      |                |              |
 |              YES ->                         |                      |                |              |
 |                    |-- POST /api/register ->|                      |                |              |
 |                    |   { firstName,         |                      |                |              |
 |                    |     email, password }  |                      |                |              |
 |                    |                        |-- route match ------->|                |              |
 |                    |                        |                      |                |              |
 |                    |                        |             [validate fields exist?]  |              |
 |                    |                        |             NO -> 400 response        |              |
 |                    |                        |             YES ->                    |              |
 |                    |                        |                      |-- registerUser(firstName, email, password) ->|
 |                    |                        |                      |                |              |
 |                    |                        |                      |           [validate firstName]|
 |                    |                        |                      |           [validate email regex]
 |                    |                        |                      |           [validate password length]
 |                    |                        |                      |           any fail -> throw 400
 |                    |                        |                      |                |              |
 |                    |                        |                      |                |-- loadUsers ->|
 |                    |                        |                      |                |<-- users[] ---|
 |                    |                        |                      |                |              |
 |                    |                        |                      |           [check duplicate email]
 |                    |                        |                      |           exists -> throw 409
 |                    |                        |                      |                |              |
 |                    |                        |                      |           [bcrypt.hash(password)]
 |                    |                        |                      |           [create newUser object]
 |                    |                        |                      |                |-- saveUsers ->|
 |                    |                        |                      |                |<-- saved -----|
 |                    |                        |                      |                |              |
 |                    |                        |                      |           [jwt.sign(userId, firstName)]
 |                    |                        |                      |<-- { token, user } ---------- |
 |                    |                        |<-- 201 { token, user }|                |              |
 |                    |<-- response ok --------|                      |                |              |
 |                    |                        |                      |                |              |
 |              [saveSession to localStorage]  |                      |                |              |
 |              fiorToken, fiorUser            |                      |                |              |
 |                    |                        |                      |                |              |
 |<-- redirect shop.html                       |                      |                |              |
 |                    |                        |                      |                |              |
```

## Error Paths Summary

| Step                  | Error thrown       | HTTP Status | Message                              |
|-----------------------|--------------------|-------------|--------------------------------------|
| Client field check    | (client-side)      | —           | "Please complete all fields"         |
| firstName missing     | authService        | 400         | "First name is required."            |
| Bad email format      | authService        | 400         | "Email format is invalid."           |
| Password too short    | authService        | 400         | "Password must be at least 6 characters." |
| Duplicate email       | authService        | 409         | "This email is already registered."  |
| File I/O fail         | authService        | 500         | "Register failed."                   |
