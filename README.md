# Eclipse Global HQ – Central Command

Eclipse Global HQ is the **command core** for every Eclipse-connected company.
This site is the digital “brain” that explains:

- What HQ is and how it works
- How the different Eclipse divisions plug into it
- How shippers, carriers, and partners should think about the system

The visual language = **command console + kingdom discipline**:
- Dark, calm background
- Precise, bright accents
- Panels / cards that feel like a live system dashboard

---

## Tech Stack

- **Static HTML** – `index.html`
- **CSS** – `assets/css/style.css`
- **JavaScript** – `assets/js/main.js`
- Hosted on **Vercel** (connected to this GitHub repo)

No build step, no framework. Everything is simple and transparent.

---

## File Structure

```text
.
├── index.html          # Main page (Central Command)
├── README.md
└── assets
    ├── css
    │   ├── style.css   # All layout, colors, and responsive styling
    │   └── .gitkeep    # Keeps the folder in Git (can stay empty)
    └── js
        └── main.js     # Mobile nav, smooth scroll, footer year
