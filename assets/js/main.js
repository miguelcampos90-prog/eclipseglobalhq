document.addEventListener("DOMContentLoaded", function () {
  initMobileNav();
  initNavDropdowns();
  initSmoothScroll();
  initCurrentYear();
  initContactForm();
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
    // Close mobile nav when a link is clicked (dropdown toggle is a button, so it won't trigger)
    if (event.target.matches("a") && nav.classList.contains(ACTIVE_CLASS)) {
      nav.classList.remove(ACTIVE_CLASS);
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function initNavDropdowns() {
  const dropdowns = Array.from(document.querySelectorAll("[data-eg-dropdown]"));
  if (dropdowns.length === 0) return;

  function closeAll(exceptEl) {
    dropdowns.forEach((dd) => {
      if (exceptEl && dd === exceptEl) return;
      dd.classList.remove("eg-dropdown--open");
      const btn = dd.querySelector("[data-eg-dropdown-toggle]");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  dropdowns.forEach((dd) => {
    const toggle = dd.querySelector("[data-eg-dropdown-toggle]");
    const menu = dd.querySelector("[data-eg-dropdown-menu]");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      const isOpen = dd.classList.toggle("eg-dropdown--open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) closeAll(dd);
    });

    // Close on menu item click
    menu.addEventListener("click", (e) => {
      if (e.target.matches("a")) {
        dd.classList.remove("eg-dropdown--open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    const clickedInside = dropdowns.some((dd) => dd.contains(e.target));
    if (!clickedInside) closeAll();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
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

function initContactForm() {
  const form = document.getElementById("hqLeadForm");
  const statusEl = document.getElementById("formStatus");

  if (!form || !statusEl) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : "";

    const setStatus = (text) => {
      statusEl.textContent = text;
    };

    setStatus("Sending…");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }

    try {
      const formData = new FormData(form);
      const res = await fetch(form.action, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        setStatus("Sent.");
        form.reset();

        // Clear quickly (~2s) and restore button
        setTimeout(() => {
          setStatus("");
        }, 2000);
      } else {
        setStatus("Error. Please try again or email contact@eclipseglobalhq.com.");
      }
    } catch (err) {
      setStatus("Network issue. Please try again or email contact@eclipseglobalhq.com.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText || "Send to HQ";
      }
    }
  });
}
