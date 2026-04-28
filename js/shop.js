/**
 * Shop page — product list flow (aligned with a typical sequence diagram):
 *
 *   requestProducts()
 *        │
 *        ├─► fetchJsonFile(path)  — HTTP GET, then body parsed as JSON
 *        │        │
 *        │        └─► returns Array<Product> in memory
 *        │
 *        └─► renderUI(products) — reads that array and writes HTML into #product-container
 *
 * Data flow summary:
 *   JSON file (disk) → HTTP response (bytes) → JS objects (array) → DOM (innerHTML strings)
 *
 * Cart logic (FiorCartCore) is separate: it reads/writes localStorage and uses the same
 * `catalog` array in memory for prices, names, and stock when you click "Add to cart".
 */

const C = window.FiorCartCore;
const productsEl = document.querySelector("#product-container");
const cartCountEl = document.querySelector("#cartCount");
const orderHintEl = document.querySelector("#orderMessage");

/** Path passed to fetch(...) — relative to the current HTML page (e.g. shop.html → data/products.json). */
const PRODUCTS_JSON_PATH = "data/products.json";

if (!C) {
  console.error("shop.js: load cart-core.js before shop.js");
}

/**
 * In-memory copy of the catalog. Filled when renderUI() runs after a successful fetch.
 * The cart code uses this to resolve productId → name, price, stock.
 */
let catalog = [];
let cart = C ? C.loadCart() : [];

/**
 * Step 3 (diagram): take the product array and paint the grid.
 * Data in → DOM out: each product object becomes one `.product-card` chunk of HTML.
 */
function renderUI(products) {
  if (!productsEl || !C) {
    return;
  }

  catalog = products;

  if (!catalog.length) {
    productsEl.innerHTML = "<p>No products to display.</p>";
    return;
  }

  productsEl.innerHTML = catalog
    .map(
      (product) => `
        <article class="product-card">
          <img src="${product.image_url || product.image || ""}" alt="${product.name}">
          <div class="product-body">
            <h3>${product.name}</h3>
            <p>${product.description || ""}</p>
            <div class="product-meta">
              <span class="price">${C.money.format(product.price)}</span>
              <span class="stock">Stock: ${product.stock != null ? product.stock : "—"}</span>
            </div>
            <button class="btn btn-primary" type="button" data-add="${product.id}" ${C.stockOf(product) < 1 ? "disabled" : ""}>
              Add to cart
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function updateHeaderCartCount() {
  if (!cartCountEl || !C) {
    return;
  }
  const lines = C.cartLineItems(catalog, cart);
  cartCountEl.textContent = C.cartCount(lines);
}

/**
 * Step 2 (diagram): fetch(path-to-json-file).
 * Browser sends GET → server returns text body → we parse it as JSON.
 * @param {string} pathToJsonFile - URL or path to the JSON resource.
 * @returns {Promise<Array>} Parsed array of product objects.
 */
async function fetchJsonFile(pathToJsonFile) {
  const response = await fetch(pathToJsonFile);

  if (!response.ok) {
    throw new Error(`Product request failed: ${response.status} ${response.statusText}`);
  }

  // Network layer gives a Response; .json() turns the body into native JS values.
  return response.json();
}

/**
 * Step 1 (diagram): requestProducts() — orchestrates loading and rendering.
 * Flow: loading state → fetchJsonFile → renderUI → sync cart badge from storage.
 */
async function requestProducts() {
  if (!productsEl || !C) {
    return;
  }

  productsEl.innerHTML = "<p>Loading products...</p>";

  try {
    const products = await fetchJsonFile(PRODUCTS_JSON_PATH);
    renderUI(products);
    cart = C.loadCart();
    updateHeaderCartCount();
  } catch (error) {
    console.error(error);
    productsEl.innerHTML =
      "<p>Unable to load products. Please run this project with a local web server and refresh this page.</p>";
  }
}

if (productsEl && C) {
  productsEl.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add]");
    if (!addButton) {
      return;
    }

    cart = C.loadCart();
    const result = C.addToCart(catalog, cart, addButton.dataset.add);
    cart = C.loadCart();

    if (!result.ok) {
      if (orderHintEl) {
        orderHintEl.textContent = result.message;
        orderHintEl.className = "message";
      }
      return;
    }

    if (orderHintEl) {
      orderHintEl.textContent = "";
    }

    updateHeaderCartCount();
  });
}

requestProducts();
