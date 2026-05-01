const C = window.FiorCartCore;
const cartSummaryEl = document.querySelector("#checkoutCartSummary");
const cartTotalEl = document.querySelector("#cartTotal");
const cartCountEl = document.querySelector("#cartCount");
const checkoutForm = document.querySelector("#checkoutForm");
const orderMessageEl = document.querySelector("#orderMessage");

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
  checkoutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    cart = C.loadCart();

    if (cart.length === 0) {
      orderMessageEl.textContent = "Please add at least one product to the cart.";
      orderMessageEl.className = "message";
      return;
    }

    const result = C.buildOrderPayload(catalog, cart, new FormData(checkoutForm));
    if (!result.ok) {
      orderMessageEl.textContent = result.message;
      orderMessageEl.className = "message";
      return;
    }

    C.persistOrder(result.order);
    C.saveCart([]);
    checkoutForm.reset();
    renderSummary();

    orderMessageEl.textContent = `Mock order #${result.order.id} created successfully. Total ${C.money.format(result.order.total)}.`;
    orderMessageEl.className = "message success";
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
