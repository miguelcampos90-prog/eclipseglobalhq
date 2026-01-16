/* Eclipse Global HQ - main.js
   Purpose:
   - Auto-load hq-globe.js when #globeViz exists (fixes globe not rendering)
   - Nav: Divisions dropdown open/close + click-outside + ESC
   - Nav: Mobile menu toggle open/close
   - Footer: auto-set current year
   - Hooks (inactive by default): theme + language (for later Mini Lucien + light mode)
*/
(() => {
  'use strict';

  const CONFIG = {
    globeScriptSrc: '/assets/js/hq-globe.js',
    globeScriptId: 'eclipse-hq-globe-script',
    debug: false,
    storage: {
      theme: 'eclipse_theme',     // later
      language: 'eclipse_lang',   // later
    },
    classes: {
      dropdownOpen: 'is-open',
      mobileNavOpen: 'is-open',
      bodyNavOpen: 'nav-open',
      themeLight: 'theme-light',
      themeDark: 'theme-dark',
    },
  };

  // ---------------------------
  // Utilities
  // ---------------------------
  const log = (...args) => { if (CONFIG.debug) console.log('[ECLIPSE]', ...args); };

  const onReady = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const safeAddEvent = (el, evt, handler, opts) => {
    if (!el) return;
    el.addEventListener(evt, handler, opts);
  };

  const setAriaExpanded = (btn, expanded) => {
    if (!btn) return;
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };

  const isVisible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));

  const loadScriptOnce = (src, id) => {
    return new Promise((resolve, reject) => {
      // Already loaded by id?
      if (id && document.getElementById(id)) {
        resolve(true);
        return;
      }
      // Already loaded by src?
      const existing = qsa('script').find(s => (s.src || '').includes(src));
      if (existing) {
        resolve(true);
        return;
      }

      const s = document.createElement('script');
      if (id) s.id = id;
      s.src = src;
      s.defer = true;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(s);
    });
  };

  // ---------------------------
  // 1) Globe autoloader
  // ---------------------------
  const initGlobeAutoload = () => {
    const globeMount = document.getElementById('globeViz');
    if (!globeMount) return;

    log('Found #globeViz, loading hq-globe.js...');
    loadScriptOnce(CONFIG.globeScriptSrc, CONFIG.globeScriptId)
      .then(() => log('hq-globe.js loaded'))
      .catch((err) => {
        console.error('[ECLIPSE] Globe load failed:', err);
      });
  };

  // ---------------------------
  // 2) Divisions dropdown (desktop nav)
  // ---------------------------
  const initDivisionsDropdown = () => {
    // Try several selector patterns (robust to HTML differences)
    const toggle =
      qs('[data-dropdown-toggle="divisions"]') ||
      qs('#divisionsToggle') ||
      qs('#divisions-toggle') ||
      qs('.divisions-toggle') ||
      qs('[aria-controls="divisionsMenu"]');

    const menu =
      qs('[data-dropdown-menu="divisions"]') ||
      qs('#divisionsMenu') ||
      qs('#divisions-menu') ||
      qs('.divisions-menu');

    if (!toggle || !menu) return;

    // Ensure menu has an id if toggle uses aria-controls later
    if (!menu.id) menu.id = 'divisionsMenu';

    const open = () => {
      menu.classList.add(CONFIG.classes.dropdownOpen);
      setAriaExpanded(toggle, true);
    };

    const close = () => {
      menu.classList.remove(CONFIG.classes.dropdownOpen);
      setAriaExpanded(toggle, false);
    };

    const isOpen = () => menu.classList.contains(CONFIG.classes.dropdownOpen);

    // Click toggle
    safeAddEvent(toggle, 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isOpen() ? close() : open();
    });

    // Click outside closes
    safeAddEvent(document, 'click', (e) => {
      if (!isOpen()) return;
      const t = e.target;
      if (menu.contains(t) || toggle.contains(t)) return;
      close();
    });

    // ESC closes
    safeAddEvent(document, 'keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') close();
    });

    // If menu links are clicked, close (nice UX)
    qsa('a', menu).forEach((a) => {
      safeAddEvent(a, 'click', () => close());
    });
  };

  // ---------------------------
  // 3) Mobile nav toggle
  // ---------------------------
  const initMobileNav = () => {
    const toggle =
      qs('[data-mobile-nav-toggle]') ||
      qs('#mobileNavToggle') ||
      qs('#navToggle') ||
      qs('.nav-toggle') ||
      qs('.hamburger');

    const nav =
      qs('[data-mobile-nav]') ||
      qs('#mobileNav') ||
      qs('#navMenu') ||
      qs('.mobile-nav') ||
      qs('.nav-links');

    if (!toggle || !nav) return;

    const open = () => {
      nav.classList.add(CONFIG.classes.mobileNavOpen);
      document.body.classList.add(CONFIG.classes.bodyNavOpen);
      setAriaExpanded(toggle, true);
    };

    const close = () => {
      nav.classList.remove(CONFIG.classes.mobileNavOpen);
      document.body.classList.remove(CONFIG.classes.bodyNavOpen);
      setAriaExpanded(toggle, false);
    };

    const isOpen = () => nav.classList.contains(CONFIG.classes.mobileNavOpen);

    safeAddEvent(toggle, 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isOpen() ? close() : open();
    });

    // Click outside closes (only if nav is visible)
    safeAddEvent(document, 'click', (e) => {
      if (!isOpen()) return;
      if (!isVisible(nav)) return;

      const t = e.target;
      if (nav.contains(t) || toggle.contains(t)) return;
      close();
    });

    // ESC closes
    safeAddEvent(document, 'keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') close();
    });

    // Clicking a nav link closes
    qsa('a', nav).forEach((a) => {
      safeAddEvent(a, 'click', () => close());
    });
  };

  // ---------------------------
  // 4) Footer year
  // ---------------------------
  const initFooterYear = () => {
    const yearEl = qs('[data-year]') || qs('#year') || qs('.js-year');
    if (!yearEl) return;
    yearEl.textContent = String(new Date().getFullYear());
  };

  // ---------------------------
  // 5) Hooks for later (no UI yet)
  // ---------------------------
  const Theme = {
    get() {
      try { return localStorage.getItem(CONFIG.storage.theme) || ''; } catch (_) { return ''; }
    },
    set(mode) {
      // mode: 'light' | 'dark' | ''
      const root = document.documentElement;
      root.classList.remove(CONFIG.classes.themeLight, CONFIG.classes.themeDark);

      if (mode === 'light') root.classList.add(CONFIG.classes.themeLight);
      if (mode === 'dark') root.classList.add(CONFIG.classes.themeDark);

      try { localStorage.setItem(CONFIG.storage.theme, mode); } catch (_) {}
      document.dispatchEvent(new CustomEvent('eclipse:themechange', { detail: { mode } }));
    }
  };

  const Language = {
    get() {
      try { return localStorage.getItem(CONFIG.storage.language) || 'en'; } catch (_) { return 'en'; }
    },
    set(lang) {
      // lang: 'en' now; later expand
      try { localStorage.setItem(CONFIG.storage.language, lang); } catch (_) {}
      document.dispatchEvent(new CustomEvent('eclipse:languagechange', { detail: { lang } }));
    }
  };

  // Expose minimal hooks for later Mini Lucien work (not a framework; just handles)
  window.ECLIPSE_HQ = window.ECLIPSE_HQ || {};
  window.ECLIPSE_HQ.Theme = Theme;
  window.ECLIPSE_HQ.Language = Language;

  // ---------------------------
  // Boot
  // ---------------------------
  onReady(() => {
    initGlobeAutoload();
    initDivisionsDropdown();
    initMobileNav();
    initFooterYear();
  });
})();
