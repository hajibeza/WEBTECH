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

  if (cart.length > 0 && lines.length === 0) {
    cartItemsEl.innerHTML =
      '<div class="product-load-error" role="alert">Saved cart items cannot be displayed. Open the site via a local server (same address for Shop and Cart) so <code>data/products.json</code> can load, or add products again from the shop.</div>';
    cartTotalEl.textContent = C.money.format(0);
    if (cartCountEl) {
      cartCountEl.textContent = String(C.rawCartQuantitySum());
    }
    return;
  }

  cartItemsEl.innerHTML = C.cartListMarkup(lines);
  cartTotalEl.textContent = C.money.format(C.cartMoneyTotal(lines));

  if (cartCountEl) {
    cartCountEl.textContent = String(C.rawCartQuantitySum());
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
    C.backfillCartSnapshots(catalog);
  } catch (error) {
    console.error(error);
    catalog = [];
  }

  render();
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
