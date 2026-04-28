const C = window.FiorCartCore;
const cartItemsEl = document.querySelector("#cartItems");
const cartTotalEl = document.querySelector("#cartTotal");
const cartCountEl = document.querySelector("#cartCount");

let catalog = [];
let cart = C ? C.loadCart() : [];

function render() {
  if (!C || !cartItemsEl || !cartTotalEl) {
    return;
  }

  cart = C.loadCart();
  const lines = C.cartLineItems(catalog, cart);
  cartItemsEl.innerHTML = C.cartListMarkup(lines);
  cartTotalEl.textContent = C.money.format(C.cartMoneyTotal(lines));

  if (cartCountEl) {
    cartCountEl.textContent = C.cartCount(lines);
  }
}

async function init() {
  if (!C || !cartItemsEl) {
    console.warn("cart-page.js: missing cart-core or #cartItems");
    return;
  }

  cartItemsEl.innerHTML = "<p>Loading cart…</p>";

  try {
    catalog = await C.fetchCatalog();
    render();
  } catch (error) {
    console.error(error);
    cartItemsEl.innerHTML =
      '<p class="product-load-error" role="alert">Unable to load product data. Use a local server and try again.</p>';
  }
}

if (cartItemsEl && C) {
  cartItemsEl.addEventListener("click", (event) => {
    const decreaseButton = event.target.closest("[data-decrease]");
    const increaseButton = event.target.closest("[data-increase]");

    if (decreaseButton) {
      cart = C.applyQuantityDelta(catalog, C.loadCart(), decreaseButton.dataset.decrease, -1);
      render();
    }

    if (increaseButton) {
      cart = C.applyQuantityDelta(catalog, C.loadCart(), increaseButton.dataset.increase, 1);
      render();
    }
  });
}

init();
