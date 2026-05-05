/**
 * auth-nav.js
 * If session token exists -> replace Login link with Logout action.
 */
(function initAuthNav() {
  var token = localStorage.getItem("fiorToken");
  var links = document.querySelectorAll('[data-auth-link], a[href="login.html"]');
  if (!links.length) return;

  links.forEach(function (link) {
    if (!token) {
      link.textContent = "Login";
      link.setAttribute("href", "login.html");
      return;
    }

    link.textContent = "Logout";
    link.setAttribute("href", "#");
    link.addEventListener("click", function (event) {
      event.preventDefault();
      localStorage.removeItem("fiorToken");
      localStorage.removeItem("fiorUser");
      window.location.href = "login.html";
    });
  });
})();
