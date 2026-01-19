/* Eclipse Global HQ - main.js
   Purpose:
   - Auto-load hq-globe.js when #globeViz exists
   - Nav: Divisions dropdown open/close + click-outside + ESC
   - Nav: Mobile menu toggle open/close
   - Footer: auto-set current year
   - HQ Guide (public): navigation helper + language switching (EN/ES)
*/
(() => {
  'use strict';

  const CONFIG = {
    globeScriptSrc: '/assets/js/hq-globe.js',
    globeScriptId: 'eclipse-hq-globe-script',
    debug: false,
    brandAssistantName: 'HQ Guide', // public widget name
    storage: {
      theme: 'eclipse_theme',     // later
      language: 'eclipse_lang',
      askedLang: 'eclipse_asked_lang_once',
    },
    classes: {
      dropdownOpen: 'is-open',
      mobileNavOpen: 'is-open',
      bodyNavOpen: 'nav-open',
      themeLight: 'theme-light',
      themeDark: 'theme-dark',
      langOpen: 'lang-open'
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
  const initDivisionsDropdown = () => {
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
  // 5) Language (EN/ES) - dropdown on the chip
  // ---------------------------
  const I18N = {
    en: {
      nav_home: 'HOME',
      nav_about: 'ABOUT HQ',
      nav_signal: 'SIGNAL MAP',
      nav_what: 'WHAT HQ DOES',
      nav_contact: 'CONTACT',
      btn_view_divisions: 'View Divisions',
      asst_title: CONFIG.brandAssistantName,
      asst_prompt: 'Where should I take you?',
      asst_hint: 'Try: “signal map”, “contact”, or “divisions”.',
      close: 'Close',
      send: 'Send',
    },
    es: {
      nav_home: 'INICIO',
      nav_about: 'SOBRE HQ',
      nav_signal: 'MAPA DE SEÑALES',
      nav_what: 'QUÉ HACE HQ',
      nav_contact: 'CONTACTO',
      btn_view_divisions: 'Ver Divisiones',
      asst_title: CONFIG.brandAssistantName,
      asst_prompt: '¿A dónde quieres ir?',
      asst_hint: 'Prueba: “mapa de señales”, “contacto”, o “divisiones”.',
      close: 'Cerrar',
      send: 'Enviar',
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
      applyLanguageToPage(safe);
      updateLangChip(safe);
      document.dispatchEvent(new CustomEvent('eclipse:languagechange', { detail: { lang: safe } }));
    }
  };

  function updateLangChip(lang) {
    const chip = qs('[data-lang-chip]') || qs('#langChip') || qs('.lang-chip');
    if (!chip) return;
    chip.textContent = lang.toUpperCase();
    chip.style.cursor = 'pointer';
    chip.style.userSelect = 'none';
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-haspopup', 'menu');
    chip.setAttribute('aria-label', 'Language');
  }

  function applyLanguageToPage(lang) {
    const t = I18N[lang] || I18N.en;
    updateLangChip(lang);

    const navMap = [
      { key: 'nav_home', match: ['HOME', 'INICIO'] },
      { key: 'nav_about', match: ['ABOUT HQ', 'SOBRE HQ'] },
      { key: 'nav_signal', match: ['SIGNAL MAP', 'MAPA DE SEÑALES'] },
      { key: 'nav_what', match: ['WHAT HQ DOES', 'QUÉ HACE HQ', 'QUE HACE HQ'] },
      { key: 'nav_contact', match: ['CONTACT', 'CONTACTO'] },
    ];

    const navLinks = qsa('header a, nav a').filter(a => (a.textContent || '').trim().length);
    navMap.forEach(({ key, match }) => {
      const target = navLinks.find(a => match.includes((a.textContent || '').trim().toUpperCase()));
      if (target) target.textContent = t[key];
    });

    const heroBtn = qsa('a,button').find(el => {
      const txt = (el.textContent || '').trim();
      return txt === 'View Divisions' || txt === 'Ver Divisiones';
    });
    if (heroBtn) heroBtn.textContent = t.btn_view_divisions;
  }

  function injectLangDropdown() {
    if (qs('#langMenu')) return;

    const chip = qs('[data-lang-chip]') || qs('#langChip') || qs('.lang-chip');
    if (!chip) return;

    // Minimal styles for the menu (no edits to style.css)
    const styleId = 'lang-menu-styles';
    if (!qs('#' + styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `
        .lang-menu{
          position: absolute;
          top: 44px;
          right: 0;
          min-width: 84px;
          background: rgba(6,10,26,0.92);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 12px;
          box-shadow: 0 18px 48px rgba(0,0,0,0.45);
          backdrop-filter: blur(10px);
          padding: 6px;
          display: none;
          z-index: 9999;
        }
        .lang-menu.is-open{ display:block; }
        .lang-item{
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 8px 10px;
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
      `.trim();
      document.head.appendChild(s);
    }

    // Anchor menu to the chip's parent container
    const parent = chip.parentElement || document.body;
    parent.style.position = parent.style.position || 'relative';

    const menu = document.createElement('div');
    menu.id = 'langMenu';
    menu.className = 'lang-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `
      <button class="lang-item" type="button" data-lang="en" role="menuitem">EN</button>
      <button class="lang-item" type="button" data-lang="es" role="menuitem">ES</button>
    `;
    parent.appendChild(menu);

    const open = () => menu.classList.add('is-open');
    const close = () => menu.classList.remove('is-open');
    const toggle = () => menu.classList.toggle('is-open');

    safeAddEvent(chip, 'click', (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
    safeAddEvent(chip, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape') close();
    });

    safeAddEvent(menu, 'click', (e) => {
      const btn = e.target.closest('[data-lang]');
      if (!btn) return;
      const lang = btn.getAttribute('data-lang');
      Language.set(lang);
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
  // 6) HQ Guide (navigation-only)
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
      }
      .asst-panel.is-open{ display:block; }
      .asst-head{ padding:14px 14px 10px; border-bottom:1px solid rgba(255,255,255,0.10); }
      .asst-title{ font-weight:700; font-size:14px; margin:0; }
      .asst-body{ padding:12px 14px; }
      .asst-msg{ font-size:13px; line-height:1.35; opacity:0.92; margin:0 0 10px; white-space:pre-wrap; }
      .asst-row{ display:flex; gap:8px; }
      .asst-in{
        flex:1; padding:10px 10px; border-radius:12px;
        background: rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.12);
        color:#fff; outline:none; font-size:13px;
      }
      .asst-send{
        padding:10px 12px; border-radius:12px;
        background: rgba(61,132,245,0.95);
        border:1px solid rgba(255,255,255,0.12);
        color:#fff; font-size:13px; cursor:pointer;
      }
      .asst-actions{ display:flex; gap:8px; margin-top:10px; }
      .asst-action{
        padding:8px 10px; border-radius:12px;
        background: rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.12);
        color:#fff; font-size:12px; cursor:pointer; opacity:0.9;
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
        <p class="asst-msg" id="asstMsg">${t.asst_prompt}\n${t.asst_hint}</p>
        <div class="asst-row">
          <input class="asst-in" id="asstInput" placeholder="" />
          <button class="asst-send" id="asstSend" type="button">${t.send}</button>
        </div>
        <div class="asst-actions">
          <button class="asst-action" id="asstGoSignal" type="button">${t.nav_signal}</button>
          <button class="asst-action" id="asstGoContact" type="button">${t.nav_contact}</button>
          <button class="asst-action" id="asstGoDiv" type="button">DIVISIONS</button>
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

    safeAddEvent(btn, 'click', (e) => { e.preventDefault(); toggle(); });
    safeAddEvent(document, 'keydown', (e) => { if (e.key === 'Escape') close(); });

    safeAddEvent(document, 'click', (e) => {
      const tEl = e.target;
      if (btn.contains(tEl) || panel.contains(tEl)) return;
      close();
    });

    const msg = qs('#asstMsg');
    const input = qs('#asstInput');
    const send = qs('#asstSend');
    const goSignal = qs('#asstGoSignal');
    const goContact = qs('#asstGoContact');
    const goDiv = qs('#asstGoDiv');
    const closeBtn = qs('#asstClose');

    const routeToHash = (hash) => { window.location.hash = hash; close(); };

    const respond = (text) => {
      const langNow = Language.get();
      const s = (text || '').toLowerCase();

      if (s.includes('signal') || s.includes('mapa') || s.includes('señal') || s.includes('senal')) { routeToHash('#signal-map'); return; }
      if (s.includes('contact') || s.includes('contacto') || s.includes('email') || s.includes('mail')) { routeToHash('#contact'); return; }
      if (s.includes('division') || s.includes('divisions') || s.includes('divisiones')) {
        // If there's a divisions dropdown, we just tell them to use it (nav-only).
        if (msg) msg.textContent = (langNow === 'es')
          ? 'Usa “Eclipse Divisions” en la navegación superior.'
          : 'Use “Eclipse Divisions” in the top navigation.';
        return;
      }

      if (msg) msg.textContent =
        (langNow === 'es')
          ? 'Puedo llevarte a: “mapa de señales”, “contacto”, o “divisiones”.'
          : 'I can take you to: “signal map”, “contact”, or “divisions”.';
    };

    safeAddEvent(send, 'click', () => {
      const v = (input?.value || '').trim();
      if (!v) return;
      if (input) input.value = '';
      respond(v);
    });

    safeAddEvent(input, 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const v = (input?.value || '').trim();
        if (!v) return;
        if (input) input.value = '';
        respond(v);
      }
    });

    safeAddEvent(goSignal, 'click', () => routeToHash('#signal-map'));
    safeAddEvent(goContact, 'click', () => routeToHash('#contact'));
    safeAddEvent(goDiv, 'click', () => respond('divisions'));
    safeAddEvent(closeBtn, 'click', () => close());

    // Update panel copy on language change
    safeAddEvent(document, 'eclipse:languagechange', () => {
      const lng = Language.get();
      const tt = I18N[lng] || I18N.en;
      const title = qs('#asstTitle');
      if (title) title.textContent = tt.asst_title;
      if (goSignal) goSignal.textContent = tt.nav_signal;
      if (goContact) goContact.textContent = tt.nav_contact;
      if (send) send.textContent = tt.send;
      if (closeBtn) closeBtn.textContent = tt.close;
      if (msg) msg.textContent = `${tt.asst_prompt}\n${tt.asst_hint}`;
    });
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
    const lang = Language.get();
    document.documentElement.setAttribute('lang', lang);
    applyLanguageToPage(lang);
    updateLangChip(lang);
    injectLangDropdown();

    initGlobeAutoload();
    initDivisionsDropdown();
    initMobileNav();
    initFooterYear();

    injectAssistantUI();
  });
})();
