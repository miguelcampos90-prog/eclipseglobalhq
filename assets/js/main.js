/* Eclipse Global HQ - main.js
   Purpose:
   - Auto-load hq-globe.js when #globeViz exists
   - Nav: Divisions dropdown open/close + click-outside + ESC
   - Nav: Mobile menu toggle open/close
   - Footer: auto-set current year
   - HQ Guide (public): navigation helper + language state (EN/ES)
   - HQ Guide requirement (locked): every visit, 5s delay, it opens (no cooldown)
*/
(() => {
  'use strict';

  const CONFIG = {
    globeScriptSrc: '/assets/js/hq-globe.js',
    globeScriptId: 'eclipse-hq-globe-script',
    debug: false,
    brandAssistantName: 'HQ Guide',
    guideAutoOpenDelayMs: 5000, // locked: 5 seconds every visit
    contactMailto: 'mailto:contact@eclipseglobalhq.com',
    storage: {
      theme: 'eclipse_theme',     // later
      language: 'eclipse_lang',
    },
    classes: {
      dropdownOpen: 'is-open',
      mobileNavOpen: 'is-open',
      bodyNavOpen: 'nav-open',
      themeLight: 'theme-light',
      themeDark: 'theme-dark',
    },
  };

  const onReady = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  };

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const safeAddEvent = (el, evt, handler, opts) => { if (el) el.addEventListener(evt, handler, opts); };
  const setAriaExpanded = (btn, expanded) => { if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false'); };
  const isVisible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const getLS = (k, fallback = '') => { try { return localStorage.getItem(k) ?? fallback; } catch (_) { return fallback; } };
  const setLS = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };

  const loadScriptOnce = (src, id) => new Promise((resolve, reject) => {
    if (id && document.getElementById(id)) return resolve(true);
    const existing = qsa('script').find(s => (s.src || '').includes(src));
    if (existing) return resolve(true);

    const s = document.createElement('script');
    if (id) s.id = id;
    s.src = src;
    s.defer = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });

  // ---------------------------
  // 0) Cleanup (remove older injected controls if they exist)
  // ---------------------------
  const cleanupInjected = () => {
    // If a previous build injected a fixed language control, remove it (user wants LEFT pill only).
    const fixedCtl = qs('#eclipseLangCtl');
    if (fixedCtl) fixedCtl.remove();
    const fixedStyles = qs('#eclipse-langctl-styles');
    if (fixedStyles) fixedStyles.remove();

    // Remove any old top banner if it exists.
    const oldBanner = qs('#hqGuideDrop');
    if (oldBanner) oldBanner.remove();
    const oldBannerStyles = qs('#hq-guide-drop-styles');
    if (oldBannerStyles) oldBannerStyles.remove();
  };

  // ---------------------------
  // 1) Globe autoloader
  // ---------------------------
  const initGlobeAutoload = () => {
    const globeMount = document.getElementById('globeViz');
    if (!globeMount) return;

    loadScriptOnce(CONFIG.globeScriptSrc, CONFIG.globeScriptId)
      .catch((err) => console.error('[ECLIPSE] Globe load failed:', err));
  };

  // ---------------------------
  // 2) Divisions dropdown
  // ---------------------------
  const getDivisionsElements = () => {
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

    return { toggle, menu };
  };

  // Robust open: click if possible; if hover-only, simulate hover; if still fails, force open nearest menu.
  const openDivisionsMenuRobust = () => {
    const { toggle, menu } = getDivisionsElements();

    const tryClick = (el) => {
      try { el.focus?.(); el.click?.(); return true; } catch (_) { return false; }
    };

    const tryHover = (el) => {
      try {
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        el.focus?.();
        return true;
      } catch (_) { return false; }
    };

    // 1) Known toggle
    if (toggle) {
      if (tryClick(toggle)) return true;
      if (tryHover(toggle)) return true;
    }

    // 2) Find by visible text "Eclipse Divisions"
    const candidates = qsa('header button, header a, nav button, nav a')
      .filter(el => /eclipse\s*divisions/i.test((el.textContent || '').trim()));
    if (candidates[0]) {
      if (tryClick(candidates[0])) return true;
      if (tryHover(candidates[0])) return true;
    }

    // 3) If menu exists, force open class
    if (menu) {
      menu.classList.add(CONFIG.classes.dropdownOpen);
      return true;
    }

    // 4) Last resort: find the menu by searching for live division links in header/nav and open its container
    const LIVE = [
      'https://eclipsegloballogistics.com',
      'https://eclipsetransportco.com',
      'https://stoneandemberco.com',
      'https://eclipsepropertiesmanagement.com'
    ];

    const headerOrNav = qs('header') || qs('nav') || document.body;
    const foundLinks = LIVE.map(href => qs(`a[href="${href}"]`, headerOrNav)).filter(Boolean);

    if (foundLinks.length >= 2) {
      const common = foundLinks[0].closest('ul, .menu, .dropdown, .dropdown-menu, nav, header') || headerOrNav;
      // Try common "open" classes
      common.classList.add('open', 'is-open', 'show', 'active');
      return true;
    }

    return false;
  };

  const initDivisionsDropdown = () => {
    const { toggle, menu } = getDivisionsElements();
    if (!toggle || !menu) return;

    if (!menu.id) menu.id = 'divisionsMenu';

    const open = () => { menu.classList.add(CONFIG.classes.dropdownOpen); setAriaExpanded(toggle, true); };
    const close = () => { menu.classList.remove(CONFIG.classes.dropdownOpen); setAriaExpanded(toggle, false); };
    const isOpen = () => menu.classList.contains(CONFIG.classes.dropdownOpen);

    safeAddEvent(toggle, 'click', (e) => { e.preventDefault(); e.stopPropagation(); isOpen() ? close() : open(); });

    safeAddEvent(document, 'click', (e) => {
      if (!isOpen()) return;
      const t = e.target;
      if (menu.contains(t) || toggle.contains(t)) return;
      close();
    });

    safeAddEvent(document, 'keydown', (e) => { if (isOpen() && e.key === 'Escape') close(); });
    qsa('a', menu).forEach((a) => safeAddEvent(a, 'click', () => close()));
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

    safeAddEvent(toggle, 'click', (e) => { e.preventDefault(); e.stopPropagation(); isOpen() ? close() : open(); });

    safeAddEvent(document, 'click', (e) => {
      if (!isOpen()) return;
      if (!isVisible(nav)) return;
      const t = e.target;
      if (nav.contains(t) || toggle.contains(t)) return;
      close();
    });

    safeAddEvent(document, 'keydown', (e) => { if (isOpen() && e.key === 'Escape') close(); });
    qsa('a', nav).forEach((a) => safeAddEvent(a, 'click', () => close()));
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
  // 5) Language state (EN/ES) — LEFT pill is primary (no duplicate controls)
  // Direct truth: ES full-page translation is later. This controls state + HQ Guide strings.
  // ---------------------------
  const I18N = {
    en: {
      asst_title: CONFIG.brandAssistantName,
      asst_prompt: 'Where should I take you?',
      close: 'Close',
      nav_signal: 'Signal Map',
      nav_contact: 'Contact',
      nav_divisions: 'Divisions',
      send: 'Send',
      help_hint: 'I can take you to: “signal map”, “contact”, or “divisions”.'
    },
    es: {
      asst_title: CONFIG.brandAssistantName,
      asst_prompt: '¿A dónde quieres ir?',
      close: 'Cerrar',
      nav_signal: 'Mapa',
      nav_contact: 'Contacto',
      nav_divisions: 'Divisiones',
      send: 'Enviar',
      help_hint: 'Puedo llevarte a: “mapa”, “contacto”, o “divisiones”.'
    }
  };

  const Language = {
    get() {
      const v = getLS(CONFIG.storage.language, 'en');
      return (v === 'es' || v === 'en') ? v : 'en';
    },
    set(lang) {
      const safe = (lang === 'es') ? 'es' : 'en';
      setLS(CONFIG.storage.language, safe);
      document.documentElement.setAttribute('lang', safe);
      updateLangChip(safe);
      document.dispatchEvent(new CustomEvent('eclipse:languagechange', { detail: { lang: safe } }));
    }
  };

  function getLangChip() {
    // Prefer header/nav chip (the left pill)
    return (
      qs('header [data-lang-chip], header #langChip, header .lang-chip') ||
      qs('nav [data-lang-chip], nav #langChip, nav .lang-chip') ||
      qs('[data-lang-chip]') ||
      qs('#langChip') ||
      qs('.lang-chip')
    );
  }

  function updateLangChip(lang) {
    const chip = getLangChip();
    if (!chip) return;
    chip.textContent = (lang || 'en').toUpperCase();
    chip.style.cursor = 'pointer';
    chip.style.userSelect = 'none';
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-haspopup', 'menu');
    chip.setAttribute('aria-label', 'Language');
  }

  function injectLangDropdownOnChip() {
    // Only one menu, attached to the LEFT pill.
    if (qs('#langMenu')) return;

    const chip = getLangChip();
    if (!chip) return;

    // Ensure chip is actually clickable (in case header overlays steal pointer events)
    const styleId = 'lang-chip-fix-styles';
    if (!qs('#' + styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `
        [data-lang-chip], #langChip, .lang-chip{
          position: relative !important;
          z-index: 10001 !important;
          pointer-events: auto !important;
        }
        .lang-menu{
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          min-width: 120px;
          background: rgba(6,10,26,0.92);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 12px;
          box-shadow: 0 18px 48px rgba(0,0,0,0.45);
          backdrop-filter: blur(10px);
          padding: 6px;
          display: none;
          z-index: 10002;
        }
        .lang-menu.is-open{ display:block; }
        .lang-item{
          width: 100%;
          display: flex;
          justify-content: space-between;
          padding: 10px 10px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: rgba(255,255,255,0.90);
          cursor: pointer;
          font-size: 12px;
        }
        .lang-item:hover{
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.12);
        }
        .lang-kbd{ opacity:0.6; font-size:11px; }
      `.trim();
      document.head.appendChild(s);
    }

    const parent = chip.parentElement || document.body;
    parent.style.position = parent.style.position || 'relative';

    const menu = document.createElement('div');
    menu.id = 'langMenu';
    menu.className = 'lang-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `
      <button class="lang-item" type="button" data-lang="en" role="menuitem"><span>English</span><span class="lang-kbd">EN</span></button>
      <button class="lang-item" type="button" data-lang="es" role="menuitem"><span>Español</span><span class="lang-kbd">ES</span></button>
    `;
    parent.appendChild(menu);

    const close = () => menu.classList.remove('is-open');
    const toggle = () => menu.classList.toggle('is-open');

    safeAddEvent(chip, 'click', (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
    safeAddEvent(chip, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      if (e.key === 'Escape') close();
    });

    safeAddEvent(menu, 'click', (e) => {
      const btn = e.target.closest('[data-lang]');
      if (!btn) return;
      Language.set(btn.getAttribute('data-lang'));
      close();
    });

    safeAddEvent(document, 'click', (e) => {
      const t = e.target;
      if (menu.contains(t) || chip.contains(t)) return;
      close();
    });

    safeAddEvent(document, 'keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  // ---------------------------
  // Shared navigation actions
  // ---------------------------
  function scrollToSignalMap() {
    const el =
      qs('#signal-map') ||
      qs('[data-signal-map]') ||
      qs('#globe') ||
      qs('#globeViz');

    if (!el) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    const section = el.closest('section') || el;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  function openContact() {
    window.location.href = CONFIG.contactMailto;
  }

  // ---------------------------
  // 6) HQ Guide widget (navigation-only) + AUTO OPEN after 5s (locked)
  // ---------------------------
  function injectAssistantStyles() {
    if (qs('#assistant-styles')) return;

    const css = `
      .asst-btn{
        position:fixed; right:18px; bottom:18px; z-index:9999;
        display:flex; align-items:center; gap:10px;
        background: rgba(6,10,26,0.85);
        border: 1px solid rgba(255,255,255,0.14);
        color:#fff; padding:10px 12px; border-radius:999px;
        cursor:pointer; user-select:none;
        box-shadow: 0 18px 48px rgba(0,0,0,0.45);
        backdrop-filter: blur(8px);
      }
      .asst-dot{ width:10px; height:10px; border-radius:50%; background: var(--hq,#3D84F5); box-shadow: 0 0 18px rgba(61,132,245,0.65); }
      .asst-btn span{ font-size:13px; opacity:0.92; letter-spacing:0.2px; }
      .asst-panel{
        position:fixed; right:18px; bottom:74px; z-index:9999;
        width:min(360px, calc(100vw - 36px));
        background: rgba(6,10,26,0.92);
        border:1px solid rgba(255,255,255,0.14);
        border-radius:18px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.55);
        backdrop-filter: blur(10px);
        overflow:hidden;
        display:none;
        transform: translateY(12px);
        opacity: 0;
        transition: transform 260ms ease, opacity 260ms ease;
      }
      .asst-panel.is-open{
        display:block;
        transform: translateY(0);
        opacity: 1;
      }
      .asst-head{ padding:14px 14px 10px; border-bottom:1px solid rgba(255,255,255,0.10); }
      .asst-title{ font-weight:800; font-size:14px; margin:0; }
      .asst-body{ padding:12px 14px; }
      .asst-msg{ font-size:13px; line-height:1.35; opacity:0.92; margin:0 0 10px; white-space:pre-wrap; }
      .asst-actions{ display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
      .asst-action{
        padding:10px 12px; border-radius:14px;
        background: rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.12);
        color:#fff; font-size:12px; cursor:pointer; opacity:0.92;
        white-space: nowrap;
      }
      .asst-action.primary{
        background: rgba(61,132,245,0.95);
        border-color: rgba(255,255,255,0.14);
      }
      .asst-foot{ padding:10px 14px 14px; display:flex; justify-content:flex-end; }
      .asst-close{
        background: transparent; border:none; color:#fff; cursor:pointer;
        opacity:0.72; font-size:12px;
      }
    `.trim();

    const style = document.createElement('style');
    style.id = 'assistant-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function injectAssistantUI() {
    if (qs('#assistantBtn')) return;

    injectAssistantStyles();

    const lang = Language.get();
    const t = I18N[lang] || I18N.en;

    const btn = document.createElement('button');
    btn.id = 'assistantBtn';
    btn.className = 'asst-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', CONFIG.brandAssistantName);
    btn.innerHTML = `<div class="asst-dot"></div><span>${CONFIG.brandAssistantName}</span>`;
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'assistantPanel';
    panel.className = 'asst-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.innerHTML = `
      <div class="asst-head">
        <p class="asst-title" id="asstTitle">${t.asst_title}</p>
      </div>
      <div class="asst-body">
        <p class="asst-msg" id="asstMsg">${t.asst_prompt}</p>

        <div class="asst-actions">
          <button class="asst-action primary" id="asstGoSignal" type="button">${t.nav_signal}</button>
          <button class="asst-action" id="asstGoContact" type="button">${t.nav_contact}</button>
          <button class="asst-action" id="asstGoDiv" type="button">${t.nav_divisions}</button>
        </div>
      </div>
      <div class="asst-foot">
        <button class="asst-close" id="asstClose" type="button">${t.close}</button>
      </div>
    `;
    document.body.appendChild(panel);

    const open = () => panel.classList.add('is-open');
    const close = () => panel.classList.remove('is-open');
    const toggle = () => panel.classList.toggle('is-open');

    // Expose so we can auto-open reliably
    window.ECLIPSE_HQ = window.ECLIPSE_HQ || {};
    window.ECLIPSE_HQ.Assistant = { open, close, toggle };

    safeAddEvent(btn, 'click', (e) => { e.preventDefault(); toggle(); });
    safeAddEvent(document, 'keydown', (e) => { if (e.key === 'Escape') close(); });

    safeAddEvent(document, 'click', (e) => {
      const tEl = e.target;
      if (btn.contains(tEl) || panel.contains(tEl)) return;
      close();
    });

    const goSignal = qs('#asstGoSignal');
    const goContact = qs('#asstGoContact');
    const goDiv = qs('#asstGoDiv');
    const closeBtn = qs('#asstClose');
    const msg = qs('#asstMsg');

    safeAddEvent(goSignal, 'click', () => { close(); scrollToSignalMap(); });
    safeAddEvent(goContact, 'click', () => { close(); openContact(); });

    safeAddEvent(goDiv, 'click', () => {
      close();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => { openDivisionsMenuRobust(); }, 260);
    });

    safeAddEvent(closeBtn, 'click', () => close());

    // Update assistant strings on language change
    safeAddEvent(document, 'eclipse:languagechange', () => {
      const lng = Language.get();
      const tt = I18N[lng] || I18N.en;

      const title = qs('#asstTitle');
      if (title) title.textContent = tt.asst_title;
      if (msg) msg.textContent = tt.asst_prompt;
      if (goSignal) goSignal.textContent = tt.nav_signal;
      if (goContact) goContact.textContent = tt.nav_contact;
      if (goDiv) goDiv.textContent = tt.nav_divisions;
      if (closeBtn) closeBtn.textContent = tt.close;
    });
  }

  // Locked: every visit, 5 second delay, opens (no cooldown)
  function initAssistantAutoOpen() {
    setTimeout(() => {
      const asst = window.ECLIPSE_HQ?.Assistant;
      if (asst && typeof asst.open === 'function') asst.open();
      else {
        // If UI hasn't mounted yet for some reason, try once more shortly.
        setTimeout(() => window.ECLIPSE_HQ?.Assistant?.open?.(), 400);
      }
    }, CONFIG.guideAutoOpenDelayMs);
  }

  // Light mode hooks reserved
  const Theme = {
    get() { return getLS(CONFIG.storage.theme, ''); },
    set(mode) {
      const root = document.documentElement;
      root.classList.remove(CONFIG.classes.themeLight, CONFIG.classes.themeDark);
      if (mode === 'light') root.classList.add(CONFIG.classes.themeLight);
      if (mode === 'dark') root.classList.add(CONFIG.classes.themeDark);
      setLS(CONFIG.storage.theme, mode || '');
      document.dispatchEvent(new CustomEvent('eclipse:themechange', { detail: { mode } }));
    }
  };

  window.ECLIPSE_HQ = window.ECLIPSE_HQ || {};
  window.ECLIPSE_HQ.Theme = Theme;
  window.ECLIPSE_HQ.Language = Language;

  onReady(() => {
    cleanupInjected();

    const lang = Language.get();
    document.documentElement.setAttribute('lang', lang);

    updateLangChip(lang);
    injectLangDropdownOnChip();

    initGlobeAutoload();
    initDivisionsDropdown();
    initMobileNav();
    initFooterYear();

    injectAssistantUI();
    initAssistantAutoOpen();
  });
})();
