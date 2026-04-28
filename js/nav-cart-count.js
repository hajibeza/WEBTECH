(function refreshNavCartCount() {
  const badge = document.querySelector("#cartCount");
  if (!badge || !window.FiorCartCore) {
    return;
  }

  const cart = window.FiorCartCore.loadCart();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = String(totalItems);
})();
