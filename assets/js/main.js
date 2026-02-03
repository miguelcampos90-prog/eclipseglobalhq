/* Eclipse Global HQ - main.js
   Locked outcomes:
   - NO banner. Mini Lucien (HQ Guide widget) auto-opens after 5s every visit (no cooldown).
   - Left EN pill is the language control (EN/ES state only; full ES site later).
   - Divisions button attempts to open real dropdown; if hover-only, it guides user to click it.
   - Preserve: globe autoload, existing nav dropdown logic, mobile nav, footer year.
*/
(() => {
  'use strict';

  const CONFIG = {
    globeScriptSrc: '/assets/js/hq-globe.js',
    globeScriptId: 'eclipse-hq-globe-script',
    brandAssistantName: 'HQ Guide',
    guideAutoOpenDelayMs: 5000,
    contactMailto: 'mailto:contact@eclipseglobalhq.com',
    storage: {
      language: 'eclipse_lang',
      theme: 'eclipse_theme'
    },
    classes: {
      dropdownOpen: 'is-open',
      mobileNavOpen: 'eg-nav--open',
      bodyNavOpen: 'nav-open',
      themeLight: 'theme-light',
      themeDark: 'theme-dark',
    },
    liveDivisionLinks: [
      'https://eclipsegloballogistics.com',
      'https://eclipsetransportco.com',
      '/asset-management',
      'https://stoneandemberco.com'
    ]
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
  // 0) Cleanup any old injected UI (banner / duplicate lang control)
  // ---------------------------
  function cleanupInjected() {
    // Kill old banner versions (if any)
    const oldBannerIds = ['hqGuideDrop', 'hq-guide-drop', 'hqgDrop'];
    oldBannerIds.forEach(id => { const el = qs('#' + id); if (el) el.remove(); });
    qsa('.hqg-drop, .hq-guide-drop').forEach(el => el.remove());
    const oldBannerStyles = ['hq-guide-drop-styles', 'hqg-drop-styles'];
    oldBannerStyles.forEach(id => { const el = qs('#' + id); if (el) el.remove(); });

    // Kill fixed duplicate language control versions
    const fixedCtl = qs('#eclipseLangCtl');
    if (fixedCtl) fixedCtl.remove();
    const fixedStyles = qs('#eclipse-langctl-styles');
    if (fixedStyles) fixedStyles.remove();

    // Kill prior injected lang menus/proxies so we don't duplicate
    const lm = qs('#langMenu');
    if (lm) lm.remove();
    const lp = qs('#eclipseLangProxy');
    if (lp) lp.remove();
    const ls = qs('#lang-chip-fix-styles');
    if (ls) ls.remove();
  }

  // ---------------------------
  // 1) Globe autoloader
  // ---------------------------
  function initGlobeAutoload() {
    const globeMount = document.getElementById('globeViz');
    if (!globeMount) return;

    loadScriptOnce(CONFIG.globeScriptSrc, CONFIG.globeScriptId)
      .catch((err) => console.error('[ECLIPSE] Globe load failed:', err));
  }

  // ---------------------------
  // 2) Divisions dropdown (existing + robust open helper)
  // ---------------------------
  function getDivisionsElements() {
    const toggle =
      qs('[data-eg-dropdown-toggle]') ||
      qs('[data-dropdown-toggle="divisions"]') ||
      qs('#divisionsToggle') ||
      qs('#divisions-toggle') ||
      qs('.divisions-toggle') ||
      qs('[aria-controls="divisionsMenu"]');

    const menu =
      qs('[data-eg-dropdown-menu]') ||
      qs('[data-dropdown-menu="divisions"]') ||
      qs('#divisionsMenu') ||
      qs('#divisions-menu') ||
      qs('.divisions-menu');

    const container =
      (toggle && toggle.closest('[data-eg-dropdown]')) ||
      (menu && menu.closest('[data-eg-dropdown]')) ||
      qs('[data-eg-dropdown]') ||
      qs('.eg-nav-dropdown');

    return { toggle, menu, container };
  }

  function initDivisionsDropdown() {
    const { toggle, menu, container } = getDivisionsElements();
    if (!toggle || !menu || !container) return;
    if (!menu.id) menu.id = 'divisionsMenu';

    const openClass = 'eg-dropdown--open';
    const open = () => { container.classList.add(openClass); setAriaExpanded(toggle, true); };
    const close = () => { container.classList.remove(openClass); setAriaExpanded(toggle, false); };
    const isOpen = () => container.classList.contains(openClass);

    safeAddEvent(toggle, 'click', (e) => { e.preventDefault(); e.stopPropagation(); isOpen() ? close() : open(); });

    safeAddEvent(document, 'click', (e) => {
      if (!isOpen()) return;
      const t = e.target;
      if (container.contains(t) || toggle.contains(t)) return;
      close();
    });

    safeAddEvent(document, 'keydown', (e) => { if (isOpen() && e.key === 'Escape') close(); });
    qsa('a', menu).forEach((a) => safeAddEvent(a, 'click', () => close()));
  }

  function openDivisionsMenuRobust() {
    const { toggle, menu } = getDivisionsElements();

    const addOpenClasses = (el) => {
      if (!el) return;
      el.classList.add('open', 'is-open', 'show', 'active', 'eg-dropdown--open');
      // Some dropdowns hide via inline styles; force visible if needed
      if (el.style && el.style.display === 'none') el.style.display = '';
    };

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

    // 1) Known toggle/menu
    if (toggle) {
      if (tryClick(toggle)) return true;
      if (tryHover(toggle)) return true;
      addOpenClasses(toggle.closest('li') || toggle.parentElement);
    }
    if (menu) {
      addOpenClasses(menu);
      addOpenClasses(menu.closest('li') || menu.parentElement);
      // If we have menu, consider it opened
      return true;
    }

    // 2) Find the toggle by visible text
    const candidates = qsa('header button, header a, nav button, nav a')
      .filter(el => /eclipse\s*divisions/i.test((el.textContent || '').trim()));
    const cand = candidates[0];
    if (cand) {
      if (tryClick(cand)) return true;
      if (tryHover(cand)) return true;
      addOpenClasses(cand.closest('li') || cand.parentElement);
    }

    // 3) Find the menu by locating the live links
    const headerOrNav = qs('header') || qs('nav') || document.body;
    const found = CONFIG.liveDivisionLinks
      .map(href => qs(`a[href="${href}"]`, headerOrNav))
      .filter(Boolean);

    if (found.length >= 2) {
      const container = found[0].closest('ul, .menu, .dropdown-menu, .dropdown, nav, header') || headerOrNav;
      addOpenClasses(container);
      return true;
    }

    // If we couldn't force open, it's likely pure CSS :hover.
    return false;
  }

  // ---------------------------
  // 3) Mobile nav toggle
  // ---------------------------
  function initMobileNav() {
    const toggle = qs('[data-eg-nav-toggle]');
    const nav = qs('[data-eg-nav]');

    if (!toggle || !nav) return;

    const isMobile = () => window.matchMedia('(max-width: 840px)').matches;
    const open = () => {
      if (!isMobile()) return;
      nav.classList.add(CONFIG.classes.mobileNavOpen);
      setAriaExpanded(toggle, true);
    };
    const close = () => {
      nav.classList.remove(CONFIG.classes.mobileNavOpen);
      setAriaExpanded(toggle, false);
    };
    const isOpen = () => nav.classList.contains(CONFIG.classes.mobileNavOpen);

    safeAddEvent(toggle, 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen()) close();
      else open();
    });

    safeAddEvent(document, 'click', (e) => {
      if (!isOpen()) return;
      if (!isVisible(nav)) return;
      const t = e.target;
      if (nav.contains(t) || toggle.contains(t)) return;
      close();
    });

    safeAddEvent(document, 'keydown', (e) => { if (isOpen() && e.key === 'Escape') close(); });
    qsa('a', nav).forEach((a) => safeAddEvent(a, 'click', () => close()));
  }

  // ---------------------------
  // 4) Footer year
  // ---------------------------
  function initFooterYear() {
    const yearEl = qs('[data-year]') || qs('#year') || qs('.js-year');
    if (!yearEl) return;
    yearEl.textContent = String(new Date().getFullYear());
  }

  // ---------------------------
  // 5) Language state — based on document language
  // ---------------------------
  const I18N = {
    en: {
      asst_welcome: 'Welcome to HQ Guide.',
      asst_help: 'How can I help?',
      asst_ack_signal: 'Got it — opening the Signal Map.',
      asst_ack_divisions: 'Sure — taking you to Eclipse Divisions.',
      asst_ack_contact: 'Understood — opening Contact.',
      asst_ack_about: 'Here is a quick overview of HQ.',
      asst_ack_find_div: 'Let’s find the right division.',
      asst_ack_language: 'Choose your language.',
      asst_ack_language_set: 'Language set to English.',
      asst_ack_open_division: 'Opening',
      asst_about: 'HQ is the presentation and command node for Eclipse Global. We build structure, signal, and infrastructure—then help operating companies strengthen structure and scale with clarity.',
      asst_division_prompt: 'Choose a division to visit.',
      btn_signal: 'Signal Map',
      btn_contact: 'Contact',
      btn_div: 'Eclipse Divisions',
      btn_about: 'About HQ',
      btn_find_div: 'Find a Division',
      btn_language: 'Language',
      btn_back: 'Back',
      btn_lang_en: 'English',
      btn_lang_es: 'Español',
      close: 'Close',
      send: 'Send',
      div_fallback: 'Click “Eclipse Divisions” in the top navigation.'
    },
    es: {
      asst_welcome: 'Bienvenido a HQ Guide.',
      asst_help: '¿Cómo puedo ayudarte?',
      asst_ack_signal: 'Perfecto — abriendo el Mapa de Señal.',
      asst_ack_divisions: 'Claro — te llevo a Divisiones Eclipse.',
      asst_ack_contact: 'Entendido — abriendo Contacto.',
      asst_ack_about: 'Aquí tienes un resumen de HQ.',
      asst_ack_find_div: 'Encontremos la división correcta.',
      asst_ack_language: 'Elige tu idioma.',
      asst_ack_language_set: 'Idioma cambiado a Español.',
      asst_ack_open_division: 'Abriendo',
      asst_about: 'HQ es el nodo de presentación y comando de Eclipse Global. Construimos estructura, señal e infraestructura, y ayudamos a las empresas operativas a fortalecer su estructura y escalar con claridad.',
      asst_division_prompt: 'Elige una división para visitar.',
      btn_signal: 'Mapa de Señal',
      btn_contact: 'Contacto',
      btn_div: 'Divisiones Eclipse',
      btn_about: 'Sobre HQ',
      btn_find_div: 'Encontrar una división',
      btn_language: 'Idioma',
      btn_back: 'Volver',
      btn_lang_en: 'English',
      btn_lang_es: 'Español',
      close: 'Cerrar',
      send: 'Enviar',
      div_fallback: 'Haz clic en “Divisiones Eclipse” en la navegación superior.'
    }
  };

  const Language = {
    get() {
      const htmlLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
      if (htmlLang.startsWith('es')) return 'es';
      if (htmlLang.startsWith('en')) return 'en';
      const v = getLS(CONFIG.storage.language, 'en');
      return (v === 'es' || v === 'en') ? v : 'en';
    },
    set(lang) {
      const safe = (lang === 'es') ? 'es' : 'en';
      setLS(CONFIG.storage.language, safe);
      document.documentElement.setAttribute('lang', safe);
      updateLangChipText(safe);
      document.dispatchEvent(new CustomEvent('eclipse:languagechange', { detail: { lang: safe } }));
    }
  };

  function getLangChip() {
    // Prefer the existing header pill (your left EN)
    return (
      qs('header [data-lang-chip], header #langChip, header .lang-chip') ||
      qs('nav [data-lang-chip], nav #langChip, nav .lang-chip') ||
      qs('[data-lang-chip]') ||
      qs('#langChip') ||
      qs('.lang-chip')
    );
  }

  function updateLangChipText(lang) {
    const chip = getLangChip();
    if (!chip) return;
    chip.textContent = (lang || 'en').toUpperCase();
  }

  function initLanguageDropdown() {
    const container = qs('[data-eg-lang-dropdown]');
    const toggle = qs('[data-eg-lang-toggle]');
    const menu = qs('[data-eg-lang-menu]');
    if (!container || !toggle || !menu) return;

    const openClass = 'eg-dropdown--open';
    const open = () => { container.classList.add(openClass); setAriaExpanded(toggle, true); };
    const close = () => { container.classList.remove(openClass); setAriaExpanded(toggle, false); };
    const isOpen = () => container.classList.contains(openClass);

    safeAddEvent(toggle, 'click', (e) => { e.preventDefault(); e.stopPropagation(); isOpen() ? close() : open(); });
    safeAddEvent(document, 'click', (e) => {
      if (!isOpen()) return;
      const t = e.target;
      if (container.contains(t) || toggle.contains(t)) return;
      close();
    });
    safeAddEvent(document, 'keydown', (e) => { if (isOpen() && e.key === 'Escape') close(); });
    qsa('a', menu).forEach((a) => safeAddEvent(a, 'click', () => close()));
  }

  // This creates a transparent proxy exactly over the left pill, so it's clickable even if the header overlay blocks clicks.
  function injectLangProxyAndMenu() {
    if (qs('#eclipseLangProxy')) return;

    const chip = getLangChip();
    if (!chip) return;

    const style = document.createElement('style');
    style.id = 'lang-chip-fix-styles';
    style.textContent = `
      #eclipseLangProxy{
        position: fixed;
        z-index: 10050;
        background: transparent;
        border: none;
        padding: 0;
        margin: 0;
        cursor: pointer;
      }
      #langMenu{
        position: fixed;
        z-index: 10060;
        min-width: 120px;
        background: rgba(6,10,26,0.92);
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 12px;
        box-shadow: 0 18px 48px rgba(0,0,0,0.45);
        backdrop-filter: blur(10px);
        padding: 6px;
        display: none;
      }
      #langMenu.is-open{ display:block; }
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
    document.head.appendChild(style);

    const proxy = document.createElement('button');
    proxy.id = 'eclipseLangProxy';
    proxy.type = 'button';
    proxy.setAttribute('aria-label', 'Language');
    document.body.appendChild(proxy);

    const menu = document.createElement('div');
    menu.id = 'langMenu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `
      <button class="lang-item" type="button" data-lang="en" role="menuitem"><span>English</span><span class="lang-kbd">EN</span></button>
      <button class="lang-item" type="button" data-lang="es" role="menuitem"><span>Español</span><span class="lang-kbd">ES</span></button>
    `;
    document.body.appendChild(menu);

    const positionProxyAndMenu = () => {
      const r = chip.getBoundingClientRect();
      proxy.style.left = `${Math.max(0, r.left)}px`;
      proxy.style.top = `${Math.max(0, r.top)}px`;
      proxy.style.width = `${Math.max(0, r.width)}px`;
      proxy.style.height = `${Math.max(0, r.height)}px`;

      // If menu is open, keep it under the pill
      if (menu.classList.contains('is-open')) {
        const left = Math.min(window.innerWidth - 140, Math.max(8, r.right - 120));
        const top = Math.min(window.innerHeight - 120, r.bottom + 10);
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
      }
    };

    const openMenu = () => {
      menu.classList.add('is-open');
      positionProxyAndMenu();
    };
    const closeMenu = () => menu.classList.remove('is-open');
    const toggleMenu = () => menu.classList.contains('is-open') ? closeMenu() : openMenu();

    safeAddEvent(proxy, 'click', (e) => { e.preventDefault(); e.stopPropagation(); toggleMenu(); });
    safeAddEvent(document, 'click', (e) => {
      const t = e.target;
      if (proxy.contains(t) || menu.contains(t)) return;
      closeMenu();
    });
    safeAddEvent(document, 'keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

    safeAddEvent(menu, 'click', (e) => {
      const btn = e.target.closest('[data-lang]');
      if (!btn) return;
      Language.set(btn.getAttribute('data-lang'));
      closeMenu();
    });

    safeAddEvent(window, 'resize', positionProxyAndMenu);
    safeAddEvent(window, 'scroll', positionProxyAndMenu, { passive: true });
    safeAddEvent(window, 'orientationchange', positionProxyAndMenu);

    // Initial position + keep synced shortly after load
    positionProxyAndMenu();
    setTimeout(positionProxyAndMenu, 200);
    setTimeout(positionProxyAndMenu, 600);
  }

  // ---------------------------
  // Shared navigation actions
  // ---------------------------
  function scrollToSignalMap() {
    const isSpanishRoute = window.location.pathname.startsWith('/es');
    const isHome =
      window.location.pathname === '/' ||
      window.location.pathname === '/es' ||
      window.location.pathname === '/es/';

    if (!isHome) {
      const target = isSpanishRoute ? '/es/#signal-map' : '/#signal-map';
      window.location.href = target;
      return false;
    }

    const el =
      qs('#signal-map') ||
      qs('[data-signal-map]');

    if (!el) {
      const target = isSpanishRoute ? '/es/#signal-map' : '/#signal-map';
      window.location.href = target;
      return false;
    }
    (el.closest('section') || el).scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  function scrollToDivisions() {
    const isSpanishRoute = window.location.pathname.startsWith('/es');
    const isHome =
      window.location.pathname === '/' ||
      window.location.pathname === '/es' ||
      window.location.pathname === '/es/';

    if (!isHome) {
      const target = isSpanishRoute ? '/es/#divisions' : '/#divisions';
      window.location.href = target;
      return false;
    }

    const el = qs('#divisions');
    if (!el) {
      const target = isSpanishRoute ? '/es/#divisions' : '/#divisions';
      window.location.href = target;
      return false;
    }
    (el.closest('section') || el).scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  function openContact() {
    window.location.href = CONFIG.contactMailto;
  }

  // ---------------------------
  // 6) HQ Guide widget (Mini Lucien) + AUTO OPEN after 5s
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
      .asst-title{ font-weight:800; font-size:14px; margin:0; }
      .asst-body{ padding:12px 14px 14px; }
      .asst-transcript{
        display:flex;
        flex-direction:column;
        gap:8px;
        max-height:230px;
        overflow-y:auto;
        padding:4px 2px 8px;
      }
      .asst-bubble{
        align-self:flex-start;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.12);
        color: rgba(255,255,255,0.92);
        padding:10px 12px;
        border-radius:14px;
        font-size:13px;
        line-height:1.35;
        white-space:pre-wrap;
      }
      .asst-bubble.typing{ opacity:0.7; letter-spacing:2px; }
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
        <p class="asst-title" id="asstTitle">${CONFIG.brandAssistantName}</p>
      </div>
      <div class="asst-body">
        <div class="asst-transcript" id="asstTranscript" aria-live="polite"></div>
        <div class="asst-actions" id="asstReplies"></div>
      </div>
      <div class="asst-foot">
        <button class="asst-close" id="asstClose" type="button">${t.close}</button>
      </div>
    `;
    document.body.appendChild(panel);

    const closeBtn = qs('#asstClose');
    const transcript = qs('#asstTranscript');
    const replies = qs('#asstReplies');

    const RESPONSE_DELAY_MS = 180;

    const clearTranscript = () => {
      if (transcript) transcript.innerHTML = '';
    };

    const appendBubble = (text, { typing = false } = {}) => {
      if (!transcript) return null;
      const bubble = document.createElement('div');
      bubble.className = `asst-bubble${typing ? ' typing' : ''}`;
      bubble.textContent = text;
      transcript.appendChild(bubble);
      transcript.scrollTop = transcript.scrollHeight;
      return bubble;
    };

    const appendAssistantReply = (text) => {
      const typingBubble = appendBubble('...', { typing: true });
      setTimeout(() => {
        if (!typingBubble) return;
        typingBubble.textContent = text;
        typingBubble.classList.remove('typing');
        transcript.scrollTop = transcript.scrollHeight;
      }, RESPONSE_DELAY_MS);
    };

    const setReplies = (items) => {
      if (!replies) return;
      replies.innerHTML = items.map(({ id, label, action }) => `
        <button class="asst-action" type="button" data-action="${action}" data-id="${id}">${label}</button>
      `).join('');
    };

    const mainReplies = () => {
      const lng = Language.get();
      const tt = I18N[lng] || I18N.en;
      setReplies([
        { id: 'signal', label: tt.btn_signal, action: 'signal' },
        { id: 'divisions', label: tt.btn_div, action: 'divisions' },
        { id: 'contact', label: tt.btn_contact, action: 'contact' },
        { id: 'about', label: tt.btn_about, action: 'about' },
        { id: 'find', label: tt.btn_find_div, action: 'find' },
        { id: 'language', label: tt.btn_language, action: 'language' }
      ]);
    };

    const divisionReplies = () => setReplies([
      { id: 'logistics', label: 'Logistics', action: 'division' },
      { id: 'transport', label: 'Transport', action: 'division' },
      { id: 'asset', label: 'Eclipse Asset Management', action: 'division' },
      { id: 'stone', label: 'Stone & Ember', action: 'division' },
      { id: 'back', label: (I18N[Language.get()] || I18N.en).btn_back, action: 'back' }
    ]);

    const languageReplies = () => {
      const tt = I18N[Language.get()] || I18N.en;
      setReplies([
        { id: 'en', label: tt.btn_lang_en, action: 'language-set' },
        { id: 'es', label: tt.btn_lang_es, action: 'language-set' },
        { id: 'back', label: tt.btn_back, action: 'back' }
      ]);
    };

    const showWelcome = () => {
      const tt = I18N[Language.get()] || I18N.en;
      clearTranscript();
      appendBubble(tt.asst_welcome);
      appendBubble(tt.asst_help);
      mainReplies();
    };

    const open = () => {
      showWelcome();
      panel.classList.add('is-open');
    };
    const close = () => panel.classList.remove('is-open');
    const toggle = () => (panel.classList.contains('is-open') ? close() : open());

    // Expose for auto-open
    window.ECLIPSE_HQ = window.ECLIPSE_HQ || {};
    window.ECLIPSE_HQ.Assistant = { open, close, toggle };

    safeAddEvent(btn, 'click', (e) => { e.preventDefault(); toggle(); });
    safeAddEvent(document, 'keydown', (e) => { if (e.key === 'Escape') close(); });
    safeAddEvent(document, 'click', (e) => {
      const tEl = e.target;
      if (btn.contains(tEl) || panel.contains(tEl)) return;
      close();
    });

    safeAddEvent(replies, 'click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      const tt = I18N[Language.get()] || I18N.en;

      if (action === 'signal') {
        appendAssistantReply(tt.asst_ack_signal);
        setTimeout(() => { close(); scrollToSignalMap(); }, RESPONSE_DELAY_MS + 60);
        return;
      }
      if (action === 'divisions') {
        appendAssistantReply(tt.asst_ack_divisions);
        setTimeout(() => { close(); scrollToDivisions(); }, RESPONSE_DELAY_MS + 60);
        return;
      }
      if (action === 'contact') {
        appendAssistantReply(tt.asst_ack_contact);
        setTimeout(() => { close(); openContact(); }, RESPONSE_DELAY_MS + 60);
        return;
      }
      if (action === 'about') {
        appendAssistantReply(tt.asst_ack_about);
        setTimeout(() => appendBubble(tt.asst_about), RESPONSE_DELAY_MS + 60);
        return;
      }
      if (action === 'find') {
        appendAssistantReply(tt.asst_ack_find_div);
        setTimeout(() => {
          appendBubble(tt.asst_division_prompt);
          divisionReplies();
        }, RESPONSE_DELAY_MS + 60);
        return;
      }
      if (action === 'language') {
        appendAssistantReply(tt.asst_ack_language);
        setTimeout(() => languageReplies(), RESPONSE_DELAY_MS + 60);
        return;
      }
      if (action === 'back') {
        showWelcome();
        return;
      }
      if (action === 'language-set') {
        if (id) Language.set(id);
        const updated = I18N[Language.get()] || I18N.en;
        appendAssistantReply(updated.asst_ack_language_set);
        setTimeout(() => mainReplies(), RESPONSE_DELAY_MS + 60);
        return;
      }
      if (action === 'division') {
        const map = {
          logistics: CONFIG.liveDivisionLinks[0],
          transport: CONFIG.liveDivisionLinks[1],
          asset: CONFIG.liveDivisionLinks[2],
          stone: CONFIG.liveDivisionLinks[3]
        };
        const link = map[id];
        if (link) {
          appendAssistantReply(`${tt.asst_ack_open_division} ${btn.textContent}.`);
          setTimeout(() => { window.location.href = link; }, RESPONSE_DELAY_MS + 60);
        }
      }
    });

    safeAddEvent(closeBtn, 'click', () => close());

    safeAddEvent(document, 'eclipse:languagechange', () => {
      const tt = I18N[Language.get()] || I18N.en;
      if (closeBtn) closeBtn.textContent = tt.close;
      mainReplies();
    });
  }

  function initAssistantAutoOpen() {
    setTimeout(() => {
      const asst = window.ECLIPSE_HQ?.Assistant;
      if (asst && typeof asst.open === 'function') asst.open();
      else setTimeout(() => window.ECLIPSE_HQ?.Assistant?.open?.(), 400);
    }, CONFIG.guideAutoOpenDelayMs);
  }

  // Theme reserved (unchanged)
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
    updateLangChipText(lang);

    initGlobeAutoload();
    initDivisionsDropdown();
    initLanguageDropdown();
    initMobileNav();
    initFooterYear();

    injectAssistantUI();
    initAssistantAutoOpen();
  });
})();
