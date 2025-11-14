// Mobile nav toggle
const navToggle = document.querySelector(".eg-nav-toggle");
const nav = document.querySelector(".eg-nav");

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    nav.classList.toggle("eg-nav-open");
  });
}

// Set footer year
const yearSpan = document.getElementById("eg-year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}
