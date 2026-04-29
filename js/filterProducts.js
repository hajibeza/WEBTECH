/**
 * Assignment: filterProducts(searchTerm, category)
 *
 * Prerequisite: define an array of product objects in the same scope, e.g.
 *   const allProducts = [ { id: 1, name: "Rose", category: "Bouquets" }, ... ];
 *
 * @param {string} searchTerm - Text to find inside product.name (case-insensitive).
 * @param {string} category - If 'All', do not filter by category; otherwise keep only products whose category matches.
 * @returns {Array<Object>} New array of products that pass both filters.
 */
function filterProducts(searchTerm, category) {
  // Normalise the search string once: trim whitespace and lower-case so comparisons are case-insensitive.
  const term = (searchTerm || "").trim().toLowerCase();

  return allProducts.filter((product) => {
    // --- Name search (case-insensitive) ---
    // If the user left the search empty, every product passes the name check.
    // Otherwise require product.name to contain the term (also lower-cased).
    const name = (product.name || "").toLowerCase();
    const nameMatches = term === "" || name.includes(term);

    // --- Category filter ---
    // Special value 'All' means: do not exclude any product based on category.
    // Otherwise require an exact match on product.category (adjust if your data uses another field).
    const categoryMatches =
      category === "All" || (product.category || "") === category;

    // Keep the product only if it satisfies both conditions.
    return nameMatches && categoryMatches;
  });
}

// Example (uncomment when allProducts is loaded):
// const filtered = filterProducts("rose", "All");
// const bouquetsOnly = filterProducts("", "Bouquets");
