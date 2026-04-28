(function initFiorCartCore(global) {
  const CART_KEY = "fiorCart";
  const ORDERS_KEY = "fiorOrders";

  const money = new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  });

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function loadOrders() {
    try {
      return JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  async function fetchCatalog(path = "data/products.json") {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error("Product request failed");
    }
    return response.json();
  }

  function getProduct(catalog, productId) {
    return catalog.find((product) => product.id === Number(productId));
  }

  function stockOf(product) {
    const value = Number(product.stock);
    return Number.isFinite(value) ? value : 9999;
  }

  function cartLineItems(catalog, cart) {
    return cart
      .map((item) => {
        const product = getProduct(catalog, item.productId);
        return product ? { ...item, product } : null;
      })
      .filter(Boolean);
  }

  function cartCount(lines) {
    return lines.reduce((sum, line) => sum + line.quantity, 0);
  }

  function cartMoneyTotal(lines) {
    return lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  }

  function cartListMarkup(lines) {
    if (lines.length === 0) {
      return '<div class="cart-empty">Your cart is empty. Add flowers to start an order.</div>';
    }

    return lines
      .map(
        (item) => `
        <div class="cart-item">
          <div>
            <h4>${item.product.name}</h4>
            <small>${money.format(item.product.price)} × ${item.quantity}</small>
          </div>
          <div class="qty-controls" aria-label="Quantity controls">
            <button type="button" data-decrease="${item.productId}">-</button>
            <strong>${item.quantity}</strong>
            <button type="button" data-increase="${item.productId}">+</button>
          </div>
        </div>
      `
      )
      .join("");
  }

  function addToCart(catalog, cart, productId) {
    const product = getProduct(catalog, productId);
    if (!product) {
      return { ok: false, message: "Product not found." };
    }

    const max = stockOf(product);
    const existing = cart.find((line) => line.productId === Number(productId));
    const currentQuantity = existing ? existing.quantity : 0;

    if (currentQuantity >= max) {
      return { ok: false, message: "This item is out of stock." };
    }

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ productId: Number(productId), quantity: 1 });
    }

    saveCart(cart);
    return { ok: true };
  }

  function applyQuantityDelta(catalog, cart, productId, delta) {
    const product = getProduct(catalog, productId);
    const item = cart.find((line) => line.productId === Number(productId));

    if (!item || !product) {
      return cart;
    }

    item.quantity += delta;
    const max = stockOf(product);
    if (item.quantity > max) {
      item.quantity = max;
    }

    const next = cart.filter((line) => line.quantity > 0);
    saveCart(next);
    return next;
  }

  function buildOrderPayload(catalog, cart, formData) {
    const lineItemsRaw = cart
      .map((item) => {
        const product = getProduct(catalog, item.productId);
        if (!product) {
          return null;
        }
        return {
          productId: item.productId,
          productName: product.name,
          price: product.price,
          quantity: item.quantity
        };
      })
      .filter(Boolean);

    if (lineItemsRaw.length !== cart.length) {
      return {
        ok: false,
        message: "Some cart items are invalid. Clear the cart or refresh the page."
      };
    }

    const total = lineItemsRaw.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const order = {
      id: Date.now(),
      customerName: formData.get("customerName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      items: lineItemsRaw,
      total,
      status: "mock",
      createdAt: new Date().toISOString()
    };

    return { ok: true, order };
  }

  function persistOrder(order) {
    const orders = loadOrders();
    orders.push(order);
    saveOrders(orders);
  }

  global.FiorCartCore = {
    money,
    loadCart,
    saveCart,
    loadOrders,
    saveOrders,
    fetchCatalog,
    getProduct,
    stockOf,
    cartLineItems,
    cartCount,
    cartMoneyTotal,
    cartListMarkup,
    addToCart,
    applyQuantityDelta,
    buildOrderPayload,
    persistOrder
  };
})(window);
