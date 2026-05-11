/**
 * checkoutService.js — Business logic for checkout.
 *
 * Separation of Concerns:
 *   This layer owns RULES:
 *     - Validate email / credit card / cart items
 *     - Resolve prices via simulated Catalog Service call
 *     - Resolve userId via simulated Identity Service call
 *     - Calculate order total
 *
 *   It does NOT own DATA ACCESS.
 *   All SQL is delegated to orderRepository.
 */

const orderRepository = require("../repositories/orderRepository");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CREDIT_CARD_16_REGEX = /^\d{16}$/;

// ---------------------------------------------------------------------------
// Simulated Microservice Calls
// In production: swap these URLs to real service hosts via env vars.
// ---------------------------------------------------------------------------
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || "http://localhost:3000";
const CATALOG_SERVICE_URL  = process.env.CATALOG_SERVICE_URL  || "http://localhost:3000";

async function verifyTokenFromIdentityService(token) {
  if (!token) return null;
  try {
    const res = await fetch(`${IDENTITY_SERVICE_URL}/api/auth/verify`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null; // Identity down → guest checkout
  }
}

async function getProductFromCatalogService(productId) {
  try {
    const res = await fetch(`${CATALOG_SERVICE_URL}/api/products`);
    if (!res.ok) return null;
    const list = await res.json();
    return Array.isArray(list)
      ? list.find((p) => Number(p.id) === Number(productId)) || null
      : null;
  } catch (_) {
    return null; // Catalog down → fall back to frontend price
  }
}

// ---------------------------------------------------------------------------
// Validation (business rule — stays in Service)
// ---------------------------------------------------------------------------
function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function validateCheckoutInput(payload) {
  const errors = {};

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.items = "Cart items are required.";
  } else {
    const bad = payload.items.find((item) => {
      return (
        !Number.isInteger(toNumber(item.productId)) ||
        !Number.isFinite(toNumber(item.price)) ||
        !Number.isInteger(toNumber(item.quantity)) ||
        Number(item.quantity) < 1
      );
    });
    if (bad) errors.items = "Each cart item must include valid productId, price, and quantity.";
  }

  if (!payload.email || !EMAIL_REGEX.test(String(payload.email).trim())) {
    errors.email = "Email must be a valid address (example@domain.com).";
  }

  const normalizedCard = String(payload.creditCard || "").replace(/\D/g, "");
  if (!CREDIT_CARD_16_REGEX.test(normalizedCard)) {
    errors.creditCard = "Credit card number must be exactly 16 digits.";
  }

  // Fix #2 — Validate fields that were previously unchecked (audit finding)
  const customerName = String(payload.customerName || "").trim();
  if (!customerName || customerName.length > 100) {
    errors.customerName = "Customer name is required and must be under 100 characters.";
  }

  const phone = String(payload.phone || "").replace(/\D/g, "");
  if (phone.length < 9 || phone.length > 15) {
    errors.phone = "Phone must be 9–15 digits.";
  }

  const address = String(payload.address || "").trim();
  if (!address || address.length > 300) {
    errors.address = "Address is required and must be under 300 characters.";
  }

  return { errors, normalizedCard };
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
}

// ---------------------------------------------------------------------------
// Save order — orchestrate service calls then delegate DB write to Repository
// ---------------------------------------------------------------------------
async function saveCheckoutOrder(payload) {
  // Business rule: resolve userId from Identity Service
  const identityResult = await verifyTokenFromIdentityService(payload._authToken || null);
  const userId = identityResult ? Number(identityResult.userId) || null : null;

  // Fix #1 — Reject order if Catalog is down (never fall back to client-supplied price)
  const resolvedItems = await Promise.all(
    payload.items.map(async (item) => {
      const catalogProduct = await getProductFromCatalogService(item.productId);

      if (!catalogProduct) {
        const err = new Error("Product catalog is unavailable. Please try again shortly.");
        err.status = 503;
        throw err;
      }

      return {
        productId:   Number(item.productId),
        productName: catalogProduct.name,
        price:       Number(catalogProduct.price),  // server-verified price only
        quantity:    Number(item.quantity)
      };
    })
  );

  const total = calculateTotal(resolvedItems);

  // Delegate all SQL to Repository
  const { orderId } = await orderRepository.createOrderWithItems({
    userId,
    customerName: payload.customerName,
    email:        payload.email,
    phone:        payload.phone,
    address:      payload.address,
    total,
    items:        resolvedItems
  });

  return { order: { id: orderId }, total };
}

module.exports = { validateCheckoutInput, saveCheckoutOrder, calculateTotal };
