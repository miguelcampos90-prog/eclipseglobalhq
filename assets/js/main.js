/* Eclipse Global HQ - main.js
   Purpose:
   - Auto-load hq-globe.js when #globeViz exists
   - Nav: Divisions dropdown open/close + click-outside + ESC
   - Nav: Mobile menu toggle open/close
   - Footer: auto-set current year
   - Mini Lucien v1 (public-safe): UI-only helper + language switching (EN/ES)
   - Light mode hooks reserved (not implemented yet)
*/
(() => {
  'use strict';

  const CONFIG = {
    globeScriptSrc: '/assets/js/hq-globe.js',
    globeScriptId: 'eclipse-hq-globe-script',
    debug: false,
    storage: {
      theme: 'eclipse_theme',     // later
      language: 'eclipse_lang',   // used now
      lucienAsk: 'eclipse_lucien_asked_lang', // used now
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
  };

  const getLS = (k, fallback = '') => { try { return localStorage.getItem(k) ?? fallback; } catch (_) { return fallback; } };
  const setLS = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };

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
  // 2) Divisions dropdown (desktop nav)
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
  // 5) Language switching (EN/ES) + Mini Lucien v1 (public-safe)
  // ---------------------------
  const I18N = {
    // Minimal, targeted strings (no “framework”, just a dictionary).
    // If a selector is missing, it skips silently.
    en: {
      nav_home: 'HOME',
      nav_about: 'ABOUT HQ',
      nav_signal: 'SIGNAL MAP',
      nav_what: 'WHAT HQ DOES',
      nav_contact: 'CONTACT',
      btn_view_divisions: 'View Divisions',
      lucien_title: 'Mini Lucien',
      lucien_subtitle: 'Public-safe guidance only.',
      lucien_prompt: 'What do you want to do?',
      lucien_hint: 'Try: “switch to Spanish”, “where is the Signal Map?”, “contact”.',
      lucien_close: 'Close',
      lucien_send: 'Send',
      lucien_lang_q: 'Do you want English or Spanish?',
      lucien_lang_en: 'English',
      lucien_lang_es: 'Spanish',
    },
    es: {
      nav_home: 'INICIO',
      nav_about: 'SOBRE HQ',
      nav_signal: 'MAPA DE SEÑALES',
      nav_what: 'QUÉ HACE HQ',
      nav_contact: 'CONTACTO',
      btn_view_divisions: 'Ver Divisiones',
      lucien_title: 'Mini Lucien',
      lucien_subtitle: 'Solo guía pública y segura.',
      lucien_prompt: '¿Qué quieres hacer?',
      lucien_hint: 'Prueba: “cambiar a inglés”, “dónde está el mapa de señales”, “contacto”.',
      lucien_close: 'Cerrar',
      lucien_send: 'Enviar',
      lucien_lang_q: '¿Quieres inglés o español?',
      lucien_lang_en: 'Inglés',
      lucien_lang_es: 'Español',
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
      document.dispatchEvent(new CustomEvent('eclipse:languagechange', { detail: { lang: safe } }));
      applyLanguageToPage(safe);
      updateLangChip(safe);
    }
  };

  function updateLangChip(lang) {
    // Supports either existing chip in nav or we inject a small one.
    const chip = qs('[data-lang-chip]') || qs('#langChip') || qs('.lang-chip');
    if (chip) chip.textContent = lang.toUpperCase();
  }

  function applyLanguageToPage(lang) {
    const t = I18N[lang] || I18N.en;

    // Update a simple language chip if present (your UI shows EN already)
    updateLangChip(lang);

    // Nav items by text match (minimal-change approach; avoids HTML edits)
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

    // Primary hero button if exists
    const heroBtn = qsa('a,button').find(el => {
      const txt = (el.textContent || '').trim();
      return txt === 'View Divisions' || txt === 'Ver Divisiones';
    });
    if (heroBtn) heroBtn.textContent = t.btn_view_divisions;
  }

  function detectLanguageIntent(text) {
    const s = (text || '').toLowerCase();
    const wantsEs = s.includes('spanish') || s.includes('español') || s.includes('espanol') || s.includes('habla español') || s.includes('habla espanol');
    const wantsEn = s.includes('english') || s.includes('inglés') || s.includes('ingles') || s.includes('habla inglés') || s.includes('habla ingles');
    if (wantsEs && !wantsEn) return 'es';
    if (wantsEn && !wantsEs) return 'en';

    // If user writes mostly non-ascii (rough heuristic), treat as unclear and ask once
    const nonAscii = /[^\x00-\x7F]/.test(s);
    if (nonAscii) return 'unclear';

    return null;
  }

  function injectMiniLucienStyles() {
    if (qs('#mini-lucien-styles')) return;

    const css = `
      .ml-btn{
        position:fixed; right:18px; bottom:18px; z-index:9999;
        display:flex; align-items:center; gap:10px;
        background: rgba(6,10,26,0.85);
        border: 1px solid rgba(255,255,255,0.14);
        color:#fff; padding:10px 12px; border-radius:999px;
        cursor:pointer; user-select:none;
        box-shadow: 0 18px 48px rgba(0,0,0,0.45);
        backdrop-filter: blur(8px);
      }
      .ml-dot{ width:10px; height:10px; border-radius:50%; background: var(--hq,#3D84F5); box-shadow: 0 0 18px rgba(61,132,245,0.65); }
      .ml-btn span{ font-size:13px; opacity:0.92; letter-spacing:0.2px; }
      .ml-panel{
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
      .ml-panel.is-open{ display:block; }
      .ml-head{ padding:14px 14px 10px; border-bottom:1px solid rgba(255,255,255,0.10); }
      .ml-title{ font-weight:700; font-size:14px; margin:0; }
      .ml-sub{ margin:4px 0 0; font-size:12px; opacity:0.72; }
      .ml-body{ padding:12px 14px; }
      .ml-msg{ font-size:13px; line-height:1.35; opacity:0.92; margin:0 0 10px; white-space:pre-wrap; }
      .ml-row{ display:flex; gap:8px; }
      .ml-in{
        flex:1; padding:10px 10px; border-radius:12px;
        background: rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.12);
        color:#fff; outline:none; font-size:13px;
      }
      .ml-send{
        padding:10px 12px; border-radius:12px;
        background: rgba(61,132,245,0.95);
        border:1px solid rgba(255,255,255,0.12);
        color:#fff; font-size:13px; cursor:pointer;
      }
      .ml-actions{ display:flex; gap:8px; margin-top:10px; }
      .ml-action{
        padding:8px 10px; border-radius:12px;
        background: rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.12);
        color:#fff; font-size:12px; cursor:pointer; opacity:0.9;
      }
      .ml-foot{ padding:10px 14px 14px; display:flex; justify-content:space-between; gap:10px; }
      .ml-close{
        background: transparent; border:none; color:#fff; cursor:pointer;
        opacity:0.72; font-size:12px;
      }
      .ml-hint{ font-size:12px; opacity:0.65; margin:0; }
    `.trim();

    const style = document.createElement('style');
    style.id = 'mini-lucien-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function injectMiniLucienUI() {
    if (qs('#miniLucienBtn')) return;

    injectMiniLucienStyles();

    const lang = Language.get();
    const t = I18N[lang] || I18N.en;

    const btn = document.createElement('button');
    btn.id = 'miniLucienBtn';
    btn.className = 'ml-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Mini Lucien');
    btn.innerHTML = `<div class="ml-dot"></div><span>Mini Lucien</span>`;
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'miniLucienPanel';
    panel.className = 'ml-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.innerHTML = `
      <div class="ml-head">
        <p class="ml-title">${t.lucien_title}</p>
        <p class="ml-sub">${t.lucien_subtitle}</p>
      </div>
      <div class="ml-body">
        <p class="ml-msg" id="mlMsg">${t.lucien_prompt}\n${t.lucien_hint}</p>
        <div class="ml-row">
          <input class="ml-in" id="mlInput" placeholder="" />
          <button class="ml-send" id="mlSend" type="button">${t.lucien_send}</button>
        </div>
        <div class="ml-actions">
          <button class="ml-action" id="mlGoSignal" type="button">${t.nav_signal}</button>
          <button class="ml-action" id="mlGoContact" type="button">${t.nav_contact}</button>
          <button class="ml-action" id="mlToggleLang" type="button">${lang.toUpperCase()}</button>
        </div>
      </div>
      <div class="ml-foot">
        <p class="ml-hint">${t.lucien_subtitle}</p>
        <button class="ml-close" id="mlClose" type="button">${t.lucien_close}</button>
      </div>
    `;
    document.body.appendChild(panel);

    const open = () => panel.classList.add('is-open');
    const close = () => panel.classList.remove('is-open');
    const toggle = () => panel.classList.toggle('is-open');

    safeAddEvent(btn, 'click', (e) => { e.preventDefault(); toggle(); });

    safeAddEvent(document, 'keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    // Click outside closes
    safeAddEvent(document, 'click', (e) => {
      const tEl = e.target;
      if (btn.contains(tEl) || panel.contains(tEl)) return;
      close();
    });

    const msg = qs('#mlMsg');
    const input = qs('#mlInput');
    const send = qs('#mlSend');
    const goSignal = qs('#mlGoSignal');
    const goContact = qs('#mlGoContact');
    const toggleLang = qs('#mlToggleLang');
    const closeBtn = qs('#mlClose');

    const routeToSection = (hash) => {
      // Public-safe: just scroll / jump
      window.location.hash = hash;
      close();
    };

    const ensureAskedOnce = () => {
      const asked = getLS(CONFIG.storage.lucienAsk, '0') === '1';
      if (asked) return false;
      setLS(CONFIG.storage.lucienAsk, '1');
      return true;
    };

    const respond = (text) => {
      const langNow = Language.get();
      const tt = I18N[langNow] || I18N.en;

      const intent = detectLanguageIntent(text);

      if (intent === 'es') {
        Language.set('es');
        if (msg) msg.textContent = 'Listo. Cambié el idioma a español.';
        return;
      }
      if (intent === 'en') {
        Language.set('en');
        if (msg) msg.textContent = 'Done. Switched language to English.';
        return;
      }
      if (intent === 'unclear') {
        if (ensureAskedOnce()) {
          if (msg) msg.textContent = `${tt.lucien_lang_q}\n- ${tt.lucien_lang_en}\n- ${tt.lucien_lang_es}`;
          return;
        }
      }

      const s = (text || '').toLowerCase();

      if (s.includes('signal') || s.includes('mapa') || s.includes('señal') || s.includes('senal')) {
        routeToSection('#signal-map');
        return;
      }

      if (s.includes('contact') || s.includes('contacto') || s.includes('email') || s.includes('mail')) {
        routeToSection('#contact');
        return;
      }

      // Public-safe default response: short, navigational
      if (msg) msg.textContent =
        (langNow === 'es')
          ? 'Puedo ayudarte a navegar: “mapa de señales”, “contacto”, o “cambiar a inglés/español”.'
          : 'I can help you navigate: “signal map”, “contact”, or “switch to English/Spanish”.';
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

    safeAddEvent(goSignal, 'click', () => routeToSection('#signal-map'));
    safeAddEvent(goContact, 'click', () => routeToSection('#contact'));

    safeAddEvent(toggleLang, 'click', () => {
      const current = Language.get();
      Language.set(current === 'en' ? 'es' : 'en');
      // Refresh panel text lightly
      const now = Language.get();
      if (toggleLang) toggleLang.textContent = now.toUpperCase();
      const ntt = I18N[now] || I18N.en;
      if (qs('.ml-title', panel)) qs('.ml-title', panel).textContent = ntt.lucien_title;
      if (qs('.ml-sub', panel)) qs('.ml-sub', panel).textContent = ntt.lucien_subtitle;
      if (goSignal) goSignal.textContent = ntt.nav_signal;
      if (goContact) goContact.textContent = ntt.nav_contact;
      if (send) send.textContent = ntt.lucien_send;
      if (closeBtn) closeBtn.textContent = ntt.lucien_close;
      if (msg) msg.textContent = `${ntt.lucien_prompt}\n${ntt.lucien_hint}`;
      close();
    });

    safeAddEvent(closeBtn, 'click', () => close());
  }

  // Light mode hooks (reserved; no UI here yet)
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

  // Expose minimal hooks
  window.ECLIPSE_HQ = window.ECLIPSE_HQ || {};
  window.ECLIPSE_HQ.Theme = Theme;
  window.ECLIPSE_HQ.Language = Language;

  // ---------------------------
  // Boot
  // ---------------------------
  onReady(() => {
    // Apply saved language immediately
    const lang = Language.get();
    document.documentElement.setAttribute('lang', lang);
    applyLanguageToPage(lang);

    initGlobeAutoload();
    initDivisionsDropdown();
    initMobileNav();
    initFooterYear();

    // Mini Lucien
    injectMiniLucienUI();
  });
})();
