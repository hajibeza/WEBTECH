# Fior — Flower Shop E-Commerce Platform

A full-stack e-commerce web application built with **Node.js / Express** (backend) and vanilla **HTML / CSS / JavaScript** (frontend), using **SQLite** for persistent storage.

---

## Live Demo

> Run locally — see [Getting Started](#getting-started) below.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  HTML + CSS + Vanilla JS  (shop, cart, checkout, auth)      │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP / fetch()
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Express Server  (Backend/server.js)            │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │   │
│  │/products │  │/login    │  │/register │  │/checkout │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
│  ┌────▼─────────────────────────────────────────▼─────┐    │
│  │                  Controllers                        │    │
│  │  ProductsController  AuthController  CheckoutCtrl  │    │
│  └────┬──────────────────────────┬───────────────┬────┘    │
│       │                          │               │          │
│  ┌────▼──────┐  ┌────────────────▼──┐  ┌─────────▼──────┐  │
│  │ Products  │  │   Auth Service    │  │Checkout Service│  │
│  │ Service   │  │ bcrypt · JWT      │  │validate · total│  │
│  └────┬──────┘  └────────┬──────────┘  └────────┬───────┘  │
│       │                  │                       │          │
│  ┌────▼──────┐  ┌─────────▼─────────┐  ┌─────────▼──────┐  │
│  │ Product   │  │  User Repository  │  │Order Repository│  │
│  │Repository │  │  (SQL: users)     │  │(SQL: orders +  │  │
│  │(JSON file)│  └─────────┬─────────┘  │  order_items)  │  │
│  └───────────┘            │            └────────┬───────┘  │
│                           ▼                     ▼           │
│                    ┌────────────────────────────────┐       │
│                    │     store.db  (SQLite)          │       │
│                    │  users · products · orders      │       │
│                    │  order_items                    │       │
│                    └────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Design Patterns Used

| Pattern | Where | Why |
|---|---|---|
| **Controller – Route – Service** | All API endpoints | Separates HTTP, business rules, and data |
| **Repository Pattern** | `Backend/repositories/` | Isolates all SQL — swap DB without touching Services |
| **Separation of Concerns** | Entire backend | Each file has one job |
| **Simulated Microservices** | `checkoutService.js` | `fetch()` to Identity + Catalog services, ready for real split |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6) |
| Backend | Node.js, Express.js |
| Database | SQLite3 (`store.db`) |
| Auth | bcryptjs (password hashing), jsonwebtoken (JWT) |
| Config | dotenv |

---

## Project Structure

```
Fior/
├── Backend/
│   ├── server.js                   # Express entry point, loads .env
│   ├── store-db.js                 # SQLite connector + schema init + seed
│   ├── database.js                 # Legacy fior.sqlite connector
│   │
│   ├── routes/
│   │   ├── products.js             # GET  /api/products
│   │   ├── auth.js                 # POST /api/login, GET /api/auth/verify
│   │   ├── register.js             # POST /api/register
│   │   ├── checkout.js             # POST /api/checkout
│   │   └── store-orders.js         # POST /api/store/orders
│   │
│   ├── controllers/
│   │   ├── productsController.js
│   │   ├── authController.js
│   │   └── checkoutController.js
│   │
│   ├── services/
│   │   ├── productsService.js      # Filter logic only
│   │   ├── authService.js          # bcrypt + JWT logic only
│   │   └── checkoutService.js      # Validate + orchestrate only
│   │
│   └── repositories/               # All SQL lives here
│       ├── productRepository.js
│       ├── userRepository.js
│       └── orderRepository.js
│
├── js/                             # Frontend scripts
│   ├── shop.js, cart.js, cart-core.js
│   ├── cart-page.js, checkout-page.js
│   ├── login.js, register.js, auth-nav.js
│   └── product-grid-fetch.js
│
├── css/                            # Stylesheets
├── data/                           # Seed data (products.json, users.json)
│
├── Documentation/
│   ├── schema/erd.md               # Entity-Relationship Diagram
│   ├── register/                   # Register API contract + diagrams
│   ├── microservices/              # Component diagram + Micro-Surgery docs
│   └── checkout_logic/             # Checkout decision tree + contract table
│
├── .env                            # Secrets (NOT committed to Git)
├── .env.example                    # Template — safe to commit
├── .gitignore
└── package.json
```

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/products` | List all products | — |
| GET | `/api/products?category=X` | Filter by category | — |
| POST | `/api/login` | Login, returns JWT | — |
| POST | `/api/register` | Register new user | — |
| GET | `/api/auth/verify` | Verify JWT token | Bearer token |
| POST | `/api/checkout` | Place order | Optional token |
| POST | `/api/store/orders` | Insert order (ERD demo) | — |

---

## Getting Started

### Prerequisites
- Node.js 18+ ([nodejs.org](https://nodejs.org))

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-username/fior.git
cd fior

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and set JWT_SECRET to a long random string

# 4. Start the server
npm start
```

Open **http://localhost:3000** in your browser.

### Generate a secure JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `JWT_SECRET` | *(required)* | Secret for signing JWT tokens |
| `IDENTITY_SERVICE_URL` | `http://localhost:3000` | Identity microservice URL |
| `CATALOG_SERVICE_URL` | `http://localhost:3000` | Catalog microservice URL |
| `DB_PATH` | `./store.db` | Path to SQLite database |

> Copy `.env.example` → `.env` and never commit `.env` to Git.

---

## Database Schema

```
users        (id, first_name, username, password_hash, registered_at)
products     (id, name, description, price, image, stock, created_at)
orders       (id, user_id FK, customer_name, email, phone, address, total, status, created_at)
order_items  (id, order_id FK, product_id FK, product_name, price, quantity)
```

See full ERD at `Documentation/schema/erd.md`.

---

## Security Notes

- Passwords hashed with **bcrypt** (10 salt rounds) — never stored as plain text
- JWT tokens expire after **7 days**
- Credit card numbers are **never stored** — only used for validation format check
- `.env` is excluded from Git via `.gitignore`

---

## What I Learned / Architecture Decisions

1. **Repository Pattern** — Extracted all SQL into `repositories/` so Services contain zero database code. This means swapping SQLite for PostgreSQL only requires changing Repository files.

2. **Simulated Microservices** — `checkoutService` uses `fetch()` to call Identity and Catalog services instead of importing them directly. When the app grows, only two URL constants need to change.

3. **Separation of Concerns** — Three distinct layers (Route → Controller → Service → Repository) means each file has one job and can be tested independently.

4. **Graceful Degradation** — If Identity service is down, checkout still works as a guest order (`user_id = NULL`). Products remain accessible even when Auth routes are offline.

---

## Author

> Your Name — [GitHub](https://github.com/your-username) · [LinkedIn](https://linkedin.com/in/your-profile)
