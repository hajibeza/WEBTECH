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

  async function fetchCatalog(path = "/api/products") {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error("Product request failed");
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Product request failed: expected a JSON array");
    }
    return data;
  }

  function getProduct(catalog, productId) {
    return catalog.find((product) => product.id === Number(productId));
  }

  function stockOf(product) {
    const value = Number(product.stock);
    return Number.isFinite(value) ? value : 9999;
  }

  /** Save name/price on each line so the cart page can render even if catalog fetch fails later. */
  function copySnapshotFromProduct(line, product) {
    line.name = product.name;
    line.price = Number(product.price);
    line.image_url = product.image_url || product.image || "";
    line.stockSnapshot = stockOf(product);
  }

  /**
   * Resolve a product for display and stock checks: prefer live catalog, else use snapshot on the line.
   */
  function lineProduct(item, catalog) {
    const fromCatalog = catalog && catalog.length ? getProduct(catalog, item.productId) : null;
    if (fromCatalog) {
      return fromCatalog;
    }
    if (item.name != null && item.price != null) {
      return {
        id: item.productId,
        name: item.name,
        price: Number(item.price),
        image_url: item.image_url || "",
        stock: item.stockSnapshot != null ? Number(item.stockSnapshot) : 9999
      };
    }
    return null;
  }

  /** After loading the catalog, fill missing snapshot fields for older cart rows (productId-only). */
  function backfillCartSnapshots(catalog) {
    if (!catalog || !catalog.length) {
      return;
    }
    const cart = loadCart();
    let changed = false;
    for (const item of cart) {
      if (item.name != null && item.price != null) {
        continue;
      }
      const p = getProduct(catalog, item.productId);
      if (p) {
        copySnapshotFromProduct(item, p);
        changed = true;
      }
    }
    if (changed) {
      saveCart(cart);
    }
  }

  function cartLineItems(catalog, cart) {
    return cart
      .map((item) => {
        const product = lineProduct(item, catalog);
        return product ? { ...item, product } : null;
      })
      .filter(Boolean);
  }

  function cartCount(lines) {
    return lines.reduce((sum, line) => sum + line.quantity, 0);
  }

  /** Total quantity in raw cart (for badges) even if some lines cannot be rendered yet. */
  function rawCartQuantitySum() {
    return loadCart().reduce((sum, line) => sum + Number(line.quantity || 0), 0);
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
      copySnapshotFromProduct(existing, product);
    } else {
      const line = { productId: Number(productId), quantity: 1 };
      copySnapshotFromProduct(line, product);
      cart.push(line);
    }

    saveCart(cart);
    return { ok: true };
  }

  function applyQuantityDelta(catalog, cart, productId, delta) {
    const item = cart.find((line) => line.productId === Number(productId));
    if (!item) {
      return cart;
    }

    const product = lineProduct(item, catalog);
    if (!product) {
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
        const product = lineProduct(item, catalog);
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
    persistOrder,
    backfillCartSnapshots,
    rawCartQuantitySum
  };
})(window);
