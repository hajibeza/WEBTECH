/**
 * Standalone product grid — same sequence as a typical diagram:
 *
 *   requestProducts(path?)
 *        │
 *        ├─► fetchJsonFile(path)  — HTTP GET (e.g. /api/products) + JSON parse
 *        │
 *        └─► renderUI(products)   — maps data to HTML inside #product-container
 *
 * Data flow:  API → HTTP Response → JS array → template strings → DOM (innerHTML)
 */

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : text;
  return div.innerHTML;
}

const DEFAULT_PRODUCTS_URL = "/api/products";

/**
 * Step 3: Push product objects into the page as card markup.
 * @param {Array<Object>} products - Items with id, name, price, image_url (per your schema).
 */
function renderUI(products) {
  const container = document.querySelector("#product-container");

  if (!container) {
    console.error("renderUI: #product-container not found.");
    return;
  }

  const priceFormatter = new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  });

  if (!Array.isArray(products) || products.length === 0) {
    container.innerHTML = "<p>No products to display.</p>";
    return;
  }

  container.innerHTML = products
    .map((item) => {
      const { id, name, price, image_url: imageUrl } = item;
      const safeName = escapeHtml(name);
      return `
        <article class="product-card" data-product-id="${id}">
          <img src="${imageUrl}" alt="${safeName}" loading="lazy" width="900" height="600">
          <div class="product-body">
            <h3>${safeName}</h3>
            <div class="product-meta">
              <span class="price">${priceFormatter.format(price)}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

/**
 * Step 2: fetch(url) — GET product list and parse JSON array.
 * @param {string} url
 * @returns {Promise<Array>}
 */
async function fetchJsonFile(pathToJsonFile) {
  const response = await fetch(pathToJsonFile);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Invalid JSON: expected an array of products.");
  }

  return data;
}

/**
 * Step 1: requestProducts() — ties fetch + render together and handles errors at the UI.
 * @param {string} [pathToJsonFile=DEFAULT_PRODUCTS_URL]
 */
async function requestProducts(pathToJsonFile = DEFAULT_PRODUCTS_URL) {
  const container = document.querySelector("#product-container");

  if (!container) {
    console.error("requestProducts: #product-container not found.");
    return;
  }

  container.innerHTML = "<p>Loading products…</p>";

  try {
    const products = await fetchJsonFile(pathToJsonFile);
    renderUI(products);
  } catch (error) {
    console.error("requestProducts:", error);
    container.innerHTML =
      '<p class="product-load-error" role="alert">Unable to load products. Run the backend (<code>npm start</code>) and open the site from <code>http://localhost:3000</code>.</p>';
  }
}

/** @deprecated Use requestProducts() — kept for older includes. */
async function populateProductGrid(jsonUrl = DEFAULT_PRODUCTS_URL) {
  return requestProducts(jsonUrl);
}
