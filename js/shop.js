/**
 * Shop page — load products, filter by category + search, render grid.
 * `fullCatalog` holds every product for cart lookups; the grid shows a filtered subset only.
 */

const C = window.FiorCartCore;
const productsEl = document.querySelector("#catalog");
const cartCountEl = document.querySelector("#cartCount");
const orderHintEl = document.querySelector("#orderMessage");
const searchInput = document.querySelector("#productSearch");
const categoryFiltersEl = document.querySelector("#categoryFilters");
const resultsHintEl = document.querySelector("#productResultsHint");

const PRODUCTS_API_URL = "http://localhost:3000/api/products";

if (!C) {
  console.error("shop.js: load cart-core.js before shop.js");
}

/** All products from the API — complete catalog for Add to cart lookups. */
let fullCatalog = [];
window.FIOR_CATALOG = [];
let activeCategory = "all";
let searchDebounceId = null;

function collectCategories(products) {
  var set = {};
  products.forEach(function (p) {
    var c = (p.category || "").trim();
    if (c) {
      set[c] = true;
    }
  });
  return Object.keys(set).sort();
}

function renderCategoryChips(categories) {
  if (!categoryFiltersEl) {
    return;
  }

  var chips = ['<button type="button" class="category-chip is-active" data-category="all" role="tab" aria-selected="true">All</button>'];
  categories.forEach(function (cat) {
    chips.push(
      '<button type="button" class="category-chip" data-category="' +
        escapeAttr(cat) +
        '" role="tab" aria-selected="false">' +
        escapeHtml(cat) +
        "</button>"
    );
  });
  categoryFiltersEl.innerHTML = chips.join("");
}

function escapeHtml(text) {
  var div = document.createElement("div");
  div.textContent = text == null ? "" : text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function getFilteredProducts() {
  var q = (searchInput && searchInput.value ? searchInput.value : "").trim().toLowerCase();
  var list = fullCatalog.slice();

  if (activeCategory !== "all") {
    list = list.filter(function (p) {
      return (p.category || "").trim() === activeCategory;
    });
  }

  if (q) {
    list = list.filter(function (p) {
      var name = (p.name || "").toLowerCase();
      var desc = (p.description || "").toLowerCase();
      var cat = (p.category || "").toLowerCase();
      return name.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }

  return list;
}

function updateCategoryTabState() {
  if (!categoryFiltersEl) {
    return;
  }
  categoryFiltersEl.querySelectorAll(".category-chip").forEach(function (btn) {
    var cat = btn.getAttribute("data-category");
    var on = cat === activeCategory;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
}

function renderProductGrid(products) {
  if (!productsEl || !C) {
    return;
  }

  if (!products.length) {
    productsEl.innerHTML = "<p class=\"shop-empty\">No products match — try another category or search term.</p>";
    if (resultsHintEl) {
      resultsHintEl.textContent = "0 products";
    }
    return;
  }

  productsEl.innerHTML = products
    .map(function (product) {
      var cat = product.category ? "<span class=\"product-category\">" + escapeHtml(product.category) + "</span>" : "";
      return (
        '<article class="product-card">' +
        '<img src="' +
        escapeAttr(product.image_url || product.image || "") +
        '" alt="' +
        escapeAttr(product.name) +
        '">' +
        '<div class="product-body">' +
        cat +
        "<h3>" +
        escapeHtml(product.name) +
        "</h3>" +
        "<p>" +
        escapeHtml(product.description || "") +
        "</p>" +
        '<div class="product-meta">' +
        '<span class="price">' +
        C.money.format(product.price) +
        "</span>" +
        '<span class="stock">Stock: ' +
        (product.stock != null ? product.stock : "—") +
        "</span>" +
        "</div>" +
        '<button class="btn btn-primary add-to-cart" type="button" data-id="' +
        product.id +
        '" ' +
        (C.stockOf(product) < 1 ? "disabled" : "") +
        ">Add to cart</button>" +
        "</div>" +
        "</article>"
      );
    })
    .join("");

  if (resultsHintEl) {
    resultsHintEl.textContent = products.length + " product" + (products.length === 1 ? "" : "s");
  }
}

function applyFiltersAndRender() {
  updateCategoryTabState();
  renderProductGrid(getFilteredProducts());
}

function updateHeaderCartCount() {
  if (!cartCountEl || !C) {
    return;
  }
  cartCountEl.textContent = String(C.rawCartQuantitySum());
}

async function requestProducts() {
  if (!productsEl || !C) {
    return;
  }

  productsEl.innerHTML = "<p>Loading products...</p>";
  if (categoryFiltersEl) {
    categoryFiltersEl.innerHTML = "";
  }
  if (resultsHintEl) {
    resultsHintEl.textContent = "";
  }

  try {
    var products = await C.fetchCatalog(PRODUCTS_API_URL);
    fullCatalog = Array.isArray(products) ? products : [];
    window.FIOR_CATALOG = fullCatalog;
    C.backfillCartSnapshots(fullCatalog);
    renderCategoryChips(collectCategories(fullCatalog));
    activeCategory = "all";
    if (searchInput) {
      searchInput.value = "";
    }
    applyFiltersAndRender();
    updateHeaderCartCount();
  } catch (error) {
    console.error(error);
    productsEl.innerHTML =
      "<p>Unable to load products. Start the server (<code>npm start</code>) and open <code>http://localhost:3000</code>, then refresh.</p>";
  }
}

if (categoryFiltersEl) {
  categoryFiltersEl.addEventListener("click", function (event) {
    var btn = event.target.closest(".category-chip");
    if (!btn || !categoryFiltersEl.contains(btn)) {
      return;
    }
    var cat = btn.getAttribute("data-category");
    if (cat == null) {
      return;
    }
    activeCategory = cat;
    applyFiltersAndRender();
  });
}

if (searchInput) {
  searchInput.addEventListener("input", function () {
    if (searchDebounceId) {
      clearTimeout(searchDebounceId);
    }
    searchDebounceId = setTimeout(function () {
      applyFiltersAndRender();
    }, 200);
  });
}

requestProducts();
