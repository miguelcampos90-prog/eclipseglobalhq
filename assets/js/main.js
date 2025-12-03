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
async function submitLead(event) {
  event.preventDefault();

  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const company = document.getElementById("company").value;
  const needs = document.getElementById("needs").value;
  const selectedNode = document.getElementById("selectedNode").value;
  const notes = document.getElementById("notes").value;

  const payload = {
    fullName,
    email,
    phone,
    company,
    needs,
    selectedNode,
    pageSource: "HQ Form",
    notes
  };

  try {
    const res = await fetch("https://eclipse-command-backend-37886694782.us-central1.run.app/hq/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.status === "OK") {
      document.getElementById("formStatus").textContent =
        "HQ received your signal. Command will reach out shortly.";
      document.getElementById("hqLeadForm").reset();
    } else {
      document.getElementById("formStatus").textContent =
        "Something went wrong. Try again or email HQ directly.";
    }
  } catch (error) {
    document.getElementById("formStatus").textContent =
      "Network issue. Please try again.";
  }
}
