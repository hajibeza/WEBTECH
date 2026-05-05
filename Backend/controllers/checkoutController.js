const checkoutService = require("../services/checkoutService");

/**
 * POST /api/checkout
 * Validates cart + email + credit card, calculates total, then saves the order.
 * If save fails, returns 400 and leaves cart-clearing decision to frontend.
 */
async function checkout(req, res) {
  const payload = req.body || {};

  const { errors } = checkoutService.validateCheckoutInput(payload);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      message: "Checkout validation failed.",
      errors
    });
  }

  try {
    const { order, total } = await checkoutService.saveCheckoutOrder(payload);
    return res.status(200).json({
      message: "Checkout successful.",
      orderId: order.id,
      total
    });
  } catch (error) {
    return res.status(400).json({
      message: "Save Order failed.",
      errors: {
        saveOrder: "Unable to save order. Please retry checkout."
      }
    });
  }
}

module.exports = { checkout };
