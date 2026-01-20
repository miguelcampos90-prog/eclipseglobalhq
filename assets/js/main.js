/* Eclipse Global HQ - main.js
   Purpose:
   - Auto-load hq-globe.js when #globeViz exists
   - Nav: Divisions dropdown open/close + click-outside + ESC
   - Nav: Mobile menu toggle open/close
   - Footer: auto-set current year
   - HQ Guide (public): navigation helper + language switching (EN/ES state)
   - HQ Guide drop-down (public): 5s delay every visit (overlay), buttons: Signal Map / Contact / Divisions
*/
(() => {
  'use strict';

  const CONFIG = {
    globeScriptSrc: '/assets/js/hq-globe.js',
    globeScriptId: 'eclipse-hq-globe-script',
    debug: false,
    brandAssistantName: 'HQ Guide', // public widget name
    guideDropDelayMs: 5000,         // locked: 5s
    contactMailto: 'mailto:contact@eclipseglobalhq.com', // locked via ledger
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
  // Shared helpers (Signal Map / Divisions / Contact)
  // ---------------------------
  function getDivisionsElements() {
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

    if (!toggle || !menu) return { toggle: null, menu: null };
    if (!menu.id) menu.id = 'divisionsMenu';
    return { toggle, menu };
  }

  function openDivisionsMenu() {
    const { toggle, menu } = getDivisionsElements();
    if (!toggle || !menu) return false;
    menu.classList.add(CONFIG.classes.dropdownOpen);
    setAriaExpanded(toggle, true);
    return true;
  }

  function scrollToSignalMap() {
    // "Signal Map" = globe section. Try anchors first, then fall back to #globeViz.
    const el =
      qs('#signal-map') ||
      qs('[data-signal-map]') ||
      qs('#globe') ||
      qs('#globeViz') ||
      document.getElementById('globeViz');

    if (!el) {
      // Last resort: go to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    // Scroll to the nearest section if possible (cleaner alignment)
    const section = el.closest('section') || el;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  function openContact() {
    window.location.href = CONFIG.contactMailto;
  }

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
    const { toggle, menu } = getDivisionsElements();
    if (!toggle || !menu) return;

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
  // 5) Language (EN/ES) - FIXED dropdown control (independent of header DOM)
  // Direct truth: ES is a later project for full-page copy. This control sets state + HQ Guide strings.
  // ---------------------------
  const I18N = {
    en: {
      nav_signal: 'SIGNAL MAP',
      nav_contact: 'CONTACT',
      nav_divisions: 'DIVISIONS',
      asst_title: CONFIG.brandAssistantName,
      asst_prompt: 'Where should I take you?',
      asst_hint: 'Try: “signal map”, “contact”, or “divisions”.',
      close: 'Close',
      send: 'Send',
      div_hint: 'Use “Eclipse Divisions” in the top navigation.',
      help_hint: 'I can take you to: “signal map”, “contact”, or “divisions”.'
    },
    es: {
      nav_signal: 'MAPA DE SEÑALES',
      nav_contact: 'CONTACTO',
      nav_divisions: 'DIVISIONES',
      asst_title: CONFIG.brandAssistantName,
      asst_prompt: '¿A dónde quieres ir?',
      asst_hint: 'Prueba: “mapa de señales”, “contacto”, o “divisiones”.',
      close: 'Cerrar',
      send: 'Enviar',
      div_hint: 'Usa “Eclipse Divisions” en la navegación superior.',
      help_hint: 'Puedo llevarte a: “mapa de señales”, “contacto”, o “divisiones”.'
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
      updateFixedLangControlLabel(safe);
      document.dispatchEvent(new CustomEvent('eclipse:languagechange', { detail: { lang: safe } }));
    }
  };

  function updateLangChip(lang) {
    const chip = qs('[data-lang-chip]') || qs('#langChip') || qs('.lang-chip');
    if (!chip) return;
    chip.textContent = lang.toUpperCase();
  }

  function injectFixedLangControl() {
    if (qs('#eclipseLangCtl')) return;

    const styleId = 'eclipse-langctl-styles';
    if (!qs('#' + styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `
        #eclipseLangCtl{
          position:fixed;
          top: calc(env(safe-area-inset-top, 0px) + 14px);
          right: 14px;
          z-index: 10000;
          font-family: inherit;
        }
        @media (max-width: 720px){
          #eclipseLangCtl{
            top: calc(env(safe-area-inset-top, 0px) + 64px);
          }
        }
        .ecl-lang-btn{
          display:flex; align-items:center; gap:8px;
          background: rgba(6,10,26,0.86);
          border: 1px solid rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.92);
          padding: 8px 10px;
          border-radius: 999px;
          cursor: pointer;
          box-shadow: 0 18px 48px rgba(0,0,0,0.45);
          backdrop-filter: blur(10px);
          user-select:none;
          font-size: 12px;
          letter-spacing: 0.3px;
        }
        .ecl-lang-caret{ opacity:0.75; font-size: 12px; transform: translateY(-1px); }
        .ecl-lang-menu{
          position:absolute;
          top: 44px;
          right: 0;
          min-width: 120px;
          background: rgba(6,10,26,0.92);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 14px;
          box-shadow: 0 18px 48px rgba(0,0,0,0.45);
          backdrop-filter: blur(10px);
          padding: 6px;
          display:none;
        }
        .ecl-lang-menu.is-open{ display:block; }
        .ecl-lang-item{
          width:100%;
          display:flex;
          justify-content:space-between;
          padding: 10px 10px;
          border-radius: 12px;
          border: 1px solid transparent;
          background: transparent;
          color: rgba(255,255,255,0.90);
          cursor:pointer;
          font-size: 12px;
        }
        .ecl-lang-item:hover{
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.12);
        }
        .ecl-lang-kbd{ opacity:0.6; font-size: 11px; }
      `.trim();
      document.head.appendChild(s);
    }

    const ctl = document.createElement('div');
    ctl.id = 'eclipseLangCtl';
    ctl.innerHTML = `
      <button id="eclipseLangBtn" class="ecl-lang-btn" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Language">
        <span id="eclipseLangLbl">EN</span>
        <span class="ecl-lang-caret">▾</span>
      </button>
      <div id="eclipseLangMenu" class="ecl-lang-menu" role="menu">
        <button class="ecl-lang-item" type="button" data-lang="en" role="menuitem">
          <span>English</span><span class="ecl-lang-kbd">EN</span>
        </button>
        <button class="ecl-lang-item" type="button" data-lang="es" role="menuitem">
          <span>Español</span><span class="ecl-lang-kbd">ES</span>
        </button>
      </div>
    `;
    document.body.appendChild(ctl);

    const btn = qs('#eclipseLangBtn');
    const menu = qs('#eclipseLangMenu');

    const open = () => { menu.classList.add('is-open'); btn?.setAttribute('aria-expanded', 'true'); };
    const close = () => { menu.classList.remove('is-open'); btn?.setAttribute('aria-expanded', 'false'); };
    const toggle = () => menu.classList.contains('is-open') ? close() : open();

    safeAddEvent(btn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
    safeAddEvent(btn, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      if (e.key === 'Escape') close();
    });

    safeAddEvent(menu, 'click', (e) => {
      const item = e.target.closest('[data-lang]');
      if (!item) return;
      const lang = item.getAttribute('data-lang');
      Language.set(lang);
      close();
    });

    safeAddEvent(document, 'click', (e) => {
      const t = e.target;
      if (ctl.contains(t)) return;
      close();
    });

    safeAddEvent(document, 'keydown', (e) => { if (e.key === 'Escape') close(); });

    updateFixedLangControlLabel(Language.get());
  }

  function updateFixedLangControlLabel(lang) {
    const lbl = qs('#eclipseLangLbl');
    if (!lbl) return;
    lbl.textContent = (lang || 'en').toUpperCase();
  }

  // ---------------------------
  // 6) HQ Guide DROP-DOWN (locked behavior)
  // - Every visit, 5s delay, drops down
  // - Copy: "Where should I take you?"
  // - Buttons: Signal Map / Contact / Divisions
  // - Dismiss: no cooldown
  // ---------------------------
  function injectHqGuideDropStyles() {
    if (qs('#hq-guide-drop-styles')) return;

    const s = document.createElement('style');
    s.id = 'hq-guide-drop-styles';
    s.textContent = `
      .hqg-drop{
        position: fixed;
        left: 50%;
        top: calc(env(safe-area-inset-top, 0px) + 14px);
        transform: translateX(-50%) translateY(-130%);
        opacity: 0;
        z-index: 9999;
        width: min(980px, calc(100vw - 28px));
        background: rgba(6,10,26,0.92);
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 18px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.55);
        backdrop-filter: blur(12px);
        transition: transform 320ms ease, opacity 320ms ease;
        overflow: hidden;
      }
      @media (max-width: 720px){
        .hqg-drop{
          top: calc(env(safe-area-inset-top, 0px) + 64px);
          width: calc(100vw - 22px);
        }
      }
      .hqg-drop.is-open{
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
      .hqg-inner{
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 14px;
        align-items: center;
        padding: 14px 14px 14px 14px;
        position: relative;
      }
      .hqg-accent{
        position:absolute;
        left:0; top:0; bottom:0;
        width: 6px;
        background: rgba(61,132,245,0.95);
        box-shadow: 0 0 22px rgba(61,132,245,0.35);
      }
      .hqg-title{
        font-size: 15px;
        font-weight: 800;
        letter-spacing: 0.2px;
        color: rgba(255,255,255,0.96);
        margin: 0;
        line-height: 1.2;
      }
      .hqg-sub{
        font-size: 12px;
        margin: 4px 0 0;
        opacity: 0.78;
      }
      .hqg-actions{
        display:flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .hqg-btn{
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.14);
        color: rgba(255,255,255,0.92);
        cursor: pointer;
        font-size: 12px;
        letter-spacing: 0.2px;
        white-space: nowrap;
      }
      .hqg-btn.primary{
        background: rgba(61,132,245,0.95);
        border-color: rgba(255,255,255,0.18);
        color: #fff;
      }
      .hqg-btn:hover{
        filter: brightness(1.06);
      }
      .hqg-dismiss{
        position:absolute;
        right: 10px;
        top: 10px;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.85);
        cursor: pointer;
        line-height: 1;
        display:flex;
        align-items:center;
        justify-content:center;
      }
    `.trim();
    document.head.appendChild(s);
  }

  function injectHqGuideDrop() {
    if (qs('#hqGuideDrop')) return;

    injectHqGuideDropStyles();

    const wrap = document.createElement('div');
    wrap.id = 'hqGuideDrop';
    wrap.className = 'hqg-drop';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', CONFIG.brandAssistantName);

    wrap.innerHTML = `
      <div class="hqg-inner">
        <div class="hqg-accent" aria-hidden="true"></div>

        <div style="padding-left:10px;">
          <p class="hqg-title">Where should I take you?</p>
        </div>

        <div class="hqg-actions" aria-label="HQ Guide actions">
          <button class="hqg-btn primary" id="hqgGoSignal" type="button">Signal Map</button>
          <button class="hqg-btn" id="hqgGoContact" type="button">Contact</button>
          <button class="hqg-btn" id="hqgGoDivisions" type="button">Divisions</button>
        </div>

        <button class="hqg-dismiss" id="hqgDismiss" type="button" aria-label="Dismiss">×</button>
      </div>
    `;
    document.body.appendChild(wrap);

    const open = () => wrap.classList.add('is-open');
    const close = () => wrap.classList.remove('is-open');

    const btnSignal = qs('#hqgGoSignal');
    const btnContact = qs('#hqgGoContact');
    const btnDiv = qs('#hqgGoDivisions');
    const btnDismiss = qs('#hqgDismiss');

    safeAddEvent(btnSignal, 'click', () => { close(); scrollToSignalMap(); });
    safeAddEvent(btnContact, 'click', () => { close(); openContact(); });

    safeAddEvent(btnDiv, 'click', () => {
      close();
      // Ensure user sees the nav dropdown area, then open the dropdown.
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => { openDivisionsMenu(); }, 260);
    });

    safeAddEvent(btnDismiss, 'click', () => close());
    safeAddEvent(document, 'keydown', (e) => { if (e.key === 'Escape') close(); });

    // Locked behavior: show after ~5s every visit (no cooldown).
    setTimeout(() => open(), CONFIG.guideDropDelayMs);
  }

  // ---------------------------
  // 7) HQ Guide widget (existing, preserved) - navigation-only
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

    const respond = (text) => {
      const langNow = Language.get();
      const tt = I18N[langNow] || I18N.en;
      const s = (text || '').toLowerCase();

      if (s.includes('signal') || s.includes('mapa') || s.includes('señal') || s.includes('senal')) {
        close();
        scrollToSignalMap();
        return;
      }

      if (s.includes('contact') || s.includes('contacto') || s.includes('email') || s.includes('mail')) {
        close();
        openContact();
        return;
      }

      if (s.includes('division') || s.includes('divisions') || s.includes('divisiones')) {
        close();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => { openDivisionsMenu(); }, 260);
        return;
      }

      if (msg) msg.textContent = tt.help_hint;
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

    safeAddEvent(goSignal, 'click', () => { close(); scrollToSignalMap(); });
    safeAddEvent(goContact, 'click', () => { close(); openContact(); });
    safeAddEvent(goDiv, 'click', () => { close(); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => openDivisionsMenu(), 260); });
    safeAddEvent(closeBtn, 'click', () => close());

    // Update panel copy on language change
    safeAddEvent(document, 'eclipse:languagechange', () => {
      const lng = Language.get();
      const tt = I18N[lng] || I18N.en;
      const title = qs('#asstTitle');
      if (title) title.textContent = tt.asst_title;
      if (goSignal) goSignal.textContent = tt.nav_signal;
      if (goContact) goContact.textContent = tt.nav_contact;
      if (goDiv) goDiv.textContent = tt.nav_divisions;
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
    updateLangChip(lang);

    // NEW: fixed language dropdown (works even if header pill is broken)
    injectFixedLangControl();
    updateFixedLangControlLabel(lang);

    initGlobeAutoload();
    initDivisionsDropdown();
    initMobileNav();
    initFooterYear();

    injectAssistantUI();

    // NEW: HQ Guide top drop-down overlay (locked behavior)
    injectHqGuideDrop();
  });
})();
