(function refreshNavCartCount() {
  const badge = document.querySelector("#cartCount");
  if (!badge || !window.FiorCartCore) {
    return;
  }

  const cart = window.FiorCartCore.loadCart();
  const totalItems = window.FiorCartCore.rawCartQuantitySum
    ? window.FiorCartCore.rawCartQuantitySum()
    : cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = String(totalItems);
})();
