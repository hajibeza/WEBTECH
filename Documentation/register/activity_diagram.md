# Activity Diagram — User Registration

## Nodes / Steps

```
START
  |
  v
[User opens register.html]
  |
  v
[Fill in: firstName, email, password]
  |
  v
[Click "Register" button]
  |
  v
[Client validates: all fields non-empty?]
  |-- NO --> [Show error: "Please complete all fields"] --> STOP (form stays open)
  |
  YES
  v
[Send POST /api/register to server]
  |
  v
[Server: validate firstName present?]
  |-- NO --> [400 "First name is required."] --> [Show error on form] --> STOP
  |
  YES
  v
[Server: validate email format (regex)]
  |-- FAIL --> [400 "Email format is invalid."] --> [Show error on form] --> STOP
  |
  PASS
  v
[Server: validate password >= 6 chars]
  |-- FAIL --> [400 "Password must be at least 6 characters."] --> [Show error on form] --> STOP
  |
  PASS
  v
[Server: check email duplicate in users.json]
  |-- EXISTS --> [409 "This email is already registered."] --> [Show error on form] --> STOP
  |
  NOT EXISTS
  v
[Server: bcrypt.hash(password, 10)]
  |
  v
[Server: create newUser object {id, firstName, username, passwordHash, registeredAt}]
  |
  v
[Server: append newUser to users.json (saveUsers)]
  |-- FAIL (I/O error) --> [ROLLBACK / throw error] --> [500 "Register failed."] --> STOP
  |
  SUCCESS
  v
[Server: jwt.sign({ userId, firstName }, secret, { expiresIn: "7d" })]
  |
  v
[Server: respond 201 { message, token, user }]
  |
  v
[Client: saveSession(token, user) -> localStorage]
  |
  v
[Client: redirect to shop.html]
  |
  v
END (user is logged in)
```

## Decision Points Summary

| Decision                         | YES path         | NO path                  |
|----------------------------------|------------------|--------------------------|
| All form fields filled?          | Continue         | Show client error, stop  |
| firstName present?               | Continue         | 400 error                |
| Email format valid?              | Continue         | 400 error                |
| Password >= 6 chars?             | Continue         | 400 error                |
| Email already exists?            | 409 error        | Continue                 |
| Save to users.json success?      | Continue         | 500 error                |
