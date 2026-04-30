/**
 * Shop catalog add-to-cart: event delegation on #catalog for .add-to-cart [data-id].
 * Persists via FiorCartCore (localStorage fiorCart).
 */
(function initShopCartDelegation() {
  var CART_STORAGE_KEY = "fiorCart";
  var root = document.querySelector("#catalog");

  function loadCartFromStorage() {
    try {
      return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function persistCartToStorage(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }

  function addToCart(productID) {
    var C = window.FiorCartCore;
    var catalog = window.FIOR_CATALOG || [];
    if (C) {
      var cart = C.loadCart();
      return C.addToCart(catalog, cart, productID);
    }

    var cartFallback = loadCartFromStorage();
    var idNum = Number(productID);
    var line = cartFallback.find(function (l) {
      return l.productId === idNum;
    });
    if (line) {
      line.quantity += 1;
    } else {
      cartFallback.push({ productId: idNum, quantity: 1 });
    }
    persistCartToStorage(cartFallback);
    return { ok: true };
  }

  function updateCartBadge() {
    var el = document.getElementById("cartCount");
    var C = window.FiorCartCore;
    if (el && C) {
      el.textContent = String(C.rawCartQuantitySum());
    } else if (el) {
      var sum = loadCartFromStorage().reduce(function (s, l) {
        return s + Number(l.quantity || 0);
      }, 0);
      el.textContent = String(sum);
    }
  }

  if (!root) {
    return;
  }

  if (window.FiorCartCore) {
    window.FiorCartCore.loadCart();
  } else {
    loadCartFromStorage();
  }

  root.addEventListener("click", function (event) {
    var btn = event.target.closest(".add-to-cart");
    if (!btn || !root.contains(btn)) {
      return;
    }
    var id = btn.getAttribute("data-id");
    if (id == null || id === "") {
      return;
    }

    var result = addToCart(id);
    var hint = document.getElementById("orderMessage");

    if (!result.ok) {
      if (hint) {
        hint.textContent = result.message || "Could not add to cart.";
        hint.className = "message";
      }
      return;
    }

    if (hint) {
      hint.textContent = "";
    }
    updateCartBadge();
  });

  updateCartBadge();
})();
