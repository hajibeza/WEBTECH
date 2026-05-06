const C = window.FiorCartCore;
const cartSummaryEl = document.querySelector("#checkoutCartSummary");
const cartTotalEl = document.querySelector("#cartTotal");
const cartCountEl = document.querySelector("#cartCount");
const checkoutForm = document.querySelector("#checkoutForm");
const orderMessageEl = document.querySelector("#orderMessage");

function resolveCheckoutApiUrl(path) {
  // Match login/register: if not served from :3000, point at backend origin.
  if (window.location.port !== "3000") {
    return `http://localhost:3000${path}`;
  }
  return path;
}

const CHECKOUT_API_URL = resolveCheckoutApiUrl("/api/checkout");

const USER_KEY = "fiorUser";

/** If user logged in via login/register, fiorUser has { id, firstName, username } */
function getLoggedInUserId() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return undefined;
    const user = JSON.parse(raw);
    const id = Number(user && user.id);
    return Number.isInteger(id) && id > 0 ? id : undefined;
  } catch (_) {
    return undefined;
  }
}

let catalog = [];
let cart = [];

function renderSummary() {
  if (!C || !cartSummaryEl || !cartTotalEl) {
    return;
  }

  cart = C.loadCart();
  const lines = C.cartLineItems(catalog, cart);

  if (cart.length > 0 && lines.length === 0) {
    cartSummaryEl.innerHTML =
      '<div class="product-load-error" role="alert">Saved cart items cannot be displayed. Start the server and use the same origin for shop and checkout so <code>/api/products</code> loads, or re-add items from the shop.</div>';
    cartTotalEl.textContent = C.money.format(0);
    if (cartCountEl) {
      cartCountEl.textContent = String(C.rawCartQuantitySum());
    }
    return;
  }

  cartSummaryEl.innerHTML = C.cartListMarkup(lines);
  cartTotalEl.textContent = C.money.format(C.cartMoneyTotal(lines));

  if (cartCountEl) {
    cartCountEl.textContent = String(C.rawCartQuantitySum());
  }
}

async function init() {
  if (!C || !checkoutForm || !orderMessageEl || !cartSummaryEl) {
    console.warn("checkout-page.js: missing markup or cart-core");
    return;
  }

  cartSummaryEl.innerHTML = "<p>Loading…</p>";

  try {
    catalog = await C.fetchCatalog();
    C.backfillCartSnapshots(catalog);
  } catch (error) {
    console.error(error);
    catalog = [];
  }

  renderSummary();

  if (C.loadCart().length === 0) {
    orderMessageEl.textContent = "Your cart is empty. Add items before checkout.";
    orderMessageEl.className = "message";
  }
}

if (checkoutForm && C) {
  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    cart = C.loadCart();

    if (cart.length === 0) {
      orderMessageEl.textContent = "Please add at least one product to the cart.";
      orderMessageEl.className = "message";
      return;
    }

    const formData = new FormData(checkoutForm);
    const lines = C.cartLineItems(catalog, cart);
    const items = lines.map((line) => ({
      productId: line.productId,
      productName: line.product.name,
      price: line.product.price,
      quantity: line.quantity
    }));

    const userId = getLoggedInUserId();
    const payload = {
      customerName: formData.get("customerName"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      creditCard: formData.get("creditCard"),
      address: formData.get("address"),
      items,
      ...(userId !== undefined ? { userId } : {})
    };

    try {
      const response = await fetch(CHECKOUT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        const firstError = data.errors ? Object.values(data.errors)[0] : data.message;
        orderMessageEl.textContent = firstError || "Checkout failed.";
        orderMessageEl.className = "message";
        // IMPORTANT: do NOT clear cart on failed checkout
        return;
      }

      C.saveCart([]);
      checkoutForm.reset();
      renderSummary();

      orderMessageEl.textContent = `Order #${data.orderId} created successfully. Total ${C.money.format(data.total)}.`;
      orderMessageEl.className = "message success";
    } catch (error) {
      console.error(error);
      orderMessageEl.textContent = "Cannot reach checkout API. Please ensure server is running.";
      orderMessageEl.className = "message";
      // IMPORTANT: do NOT clear cart on network errors
    }
  });
}

if (cartSummaryEl && C) {
  cartSummaryEl.addEventListener("click", (event) => {
    const decreaseButton = event.target.closest("[data-decrease]");
    const increaseButton = event.target.closest("[data-increase]");

    if (decreaseButton) {
      C.applyQuantityDelta(catalog, C.loadCart(), decreaseButton.dataset.decrease, -1);
      renderSummary();
    }

    if (increaseButton) {
      C.applyQuantityDelta(catalog, C.loadCart(), increaseButton.dataset.increase, 1);
      renderSummary();
    }
  });
}

init();
