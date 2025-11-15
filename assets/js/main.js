document.addEventListener("DOMContentLoaded", function () {
  initMobileNav();
  initSmoothScroll();
  initCurrentYear();
});

function initMobileNav() {
  const toggle = document.querySelector("[data-eg-nav-toggle]");
  const nav = document.querySelector("[data-eg-nav]");

  if (!toggle || !nav) return;

  const ACTIVE_CLASS = "eg-nav--open";

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle(ACTIVE_CLASS);
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.addEventListener("click", (event) => {
    if (event.target.matches("a") && nav.classList.contains(ACTIVE_CLASS)) {
      nav.classList.remove(ACTIVE_CLASS);
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href === "#" || !href.startsWith("#")) return;

      const target = document.getElementById(href.slice(1));
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initCurrentYear() {
  const yearSpans = document.querySelectorAll("[data-eg-year]");
  const year = new Date().getFullYear();
  yearSpans.forEach((span) => (span.textContent = year));
}
