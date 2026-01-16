(() => {
  "use strict";

  // =========================
  // CONFIG (Public-safe defaults)
  // =========================
  const CFG = {
    // Keep this stable; make it absolute for safety.
    dataPath: "/assets/data/public_signal_map.json",

    // Mobile fallback rule (Plan B)
    mobileMaxWidth: 768,

    // Auto-rotate + hover (locked)
    autoRotateSpeed: 0.35,

    // Transport rolling window (locked concept; defaults to 6)
    transportRollingMonths: 6,

    // Globe library CDN (no installs)
    globeCdn: "https://cdn.jsdelivr.net/npm/globe.gl@2.45.0/dist/globe.gl.min.js",

    // Render hardening: ensure the hero has height
    heroMinHeight: "70vh",
    heroMinHeightPx: 420,

    // Palette locks
    palette: {
      hq: "#3D84F5",
      logistics: "#6A8DFF",
      transport: "#2BBBAD",
      ember: "#D35B43",
      properties: "#E8A25B",
      neutral: "rgba(255,255,255,0.75)"
    }
  };

  // =========================
  // Helpers
  // =========================
  const $ = (id) => document.getElementById(id);

  function isMobile() {
    return window.matchMedia && window.matchMedia(`(max-width: ${CFG.mobileMaxWidth}px)`).matches;
  }

  function ensureHeroHeight() {
    const hero =
      document.querySelector("section#home.hero-globe") ||
      document.querySelector("section.hero-globe") ||
      document.querySelector("#home.hero-globe") ||
      document.querySelector(".hero-globe");

    if (hero) {
      const h = hero.getBoundingClientRect().height;
      if (h < CFG.heroMinHeightPx) hero.style.minHeight = CFG.heroMinHeight;
    }

    const gv = $("globeViz");
    if (gv) {
      // Force visible (your CSS currently sets opacity:0)
      gv.style.display = "block";
      gv.style.opacity = "1";
    }
  }

  function showFallbackOnly() {
    const fb = $("globeFallback");
    const gv = $("globeViz");
    if (fb) fb.style.display = "block";
    if (gv) {
      gv.style.display = "none";
      gv.style.opacity = "0";
    }
  }

  function showGlobe() {
    const fb = $("globeFallback");
    const gv = $("globeViz");
    if (fb) fb.style.display = "none";
    if (gv) {
      gv.style.display = "block";
      gv.style.opacity = "1";
    }
  }

  function loadGlobeLib() {
    return new Promise((resolve, reject) => {
      if (window.Globe) return resolve(true);

      const existing = document.querySelector('script[data-eclipse-globe-lib="1"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(true), { once: true });
        existing.addEventListener("error", () => reject(new Error("globe.gl CDN blocked")), { once: true });
        return;
      }

      const s = document.createElement("script");
      s.src = CFG.globeCdn;
      s.async = true;
      s.defer = true;
      s.setAttribute("data-eclipse-globe-lib", "1");
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error("Failed to load globe.gl CDN"));
      document.head.appendChild(s);
    });
  }

  async function fetchSignalMap() {
    const res = await fetch(CFG.dataPath, { cache: "no-store" });
    if (!res.ok) throw new Error(`Signal map fetch failed: ${res.status}`);
    return res.json();
  }

  function normalizeSignalMap(data) {
    // Accept multiple shapes without “inventing” a schema.
    let points = data?.points || data?.locations || data?.nodes || data?.hubs || [];
    let arcs = data?.arcs || data?.routes || data?.links || data?.flows || [];

    if (Array.isArray(data)) points = data;

    return {
      points: Array.isArray(points) ? points : [],
      arcs: Array.isArray(arcs) ? arcs : []
    };
  }

  function pickDivisionKey(obj) {
    const raw = (obj?.division || obj?.node || obj?.type || obj?.category || "").toString().toLowerCase();
    if (raw.includes("hq")) return "hq";
    if (raw.includes("logistics")) return "logistics";
    if (raw.includes("transport")) return "transport";
    if (raw.includes("stone") || raw.includes("ember")) return "ember";
    if (raw.includes("properties")) return "properties";
    return "neutral";
  }

  function regionOnly(obj) {
    // Lock: region-level only. If no level field exists, we keep it.
    const lvl = (obj?.level || obj?.scope || obj?.tier || "").toString().toLowerCase().trim();
    if (!lvl) return true;
    return lvl.includes("region");
  }

  function toLat(obj) {
    const v = obj?.lat ?? obj?.latitude ?? obj?.y;
    return typeof v === "number" ? v : null;
  }

  function toLng(obj) {
    const v = obj?.lng ?? obj?.lon ?? obj?.longitude ?? obj?.x;
    return typeof v === "number" ? v : null;
  }

  function arcStartLat(a) { return a?.startLat ?? a?.fromLat ?? a?.srcLat ?? null; }
  function arcStartLng(a) { return a?.startLng ?? a?.fromLng ?? a?.fromLon ?? a?.srcLng ?? a?.srcLon ?? null; }
  function arcEndLat(a)   { return a?.endLat   ?? a?.toLat   ?? a?.dstLat ?? null; }
  function arcEndLng(a)   { return a?.endLng   ?? a?.toLng   ?? a?.toLon  ?? a?.dstLng ?? a?.dstLon ?? null; }

  function disableUserDrag(mount) {
    // Lock: hover yes, drag no. Block pointerdown/drag/zoom.
    const canvas = mount.querySelector("canvas");
    if (!canvas) return;

    const block = (e) => {
      // Allow hover/move; block actions that start interaction
      e.preventDefault();
      e.stopPropagation();
    };

    ["pointerdown", "mousedown", "touchstart", "wheel"].forEach((evt) => {
      canvas.addEventListener(evt, block, { passive: false });
    });
  }

  // =========================
  // Main init
  // =========================
  async function init() {
    const mount = $("globeViz");
    if (!mount) return;

    ensureHeroHeight();

    if (isMobile()) {
      showFallbackOnly();
      return;
    }

    // Force visible early (prevents blank hero even during async load)
    showGlobe();

    try {
      await loadGlobeLib();
    } catch (err) {
      console.error("[ECLIPSE] Globe lib load failed:", err);
      showFallbackOnly();
      return;
    }

    // Reset mount
    mount.innerHTML = "";
    ensureHeroHeight();
    showGlobe();

    // Create globe
    let globe;
    try {
      globe = window.Globe()(mount)
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true)
        .atmosphereAltitude(0.25)
        .pointLat((d) => d._lat)
        .pointLng((d) => d._lng)
        .pointColor((d) => d._color)
        .pointAltitude((d) => d._alt ?? 0.02)
        .pointRadius((d) => d._radius ?? 0.28)
        .pointLabel((d) => d._label || "")
        .arcStartLat((d) => d._startLat)
        .arcStartLng((d) => d._startLng)
        .arcEndLat((d) => d._endLat)
        .arcEndLng((d) => d._endLng)
        .arcColor((d) => d._color)
        .arcAltitude((d) => d._alt ?? 0.25)
        .arcStroke((d) => d._stroke ?? 0.6)
        .arcDashLength(0.55)
        .arcDashGap(1.0)
        .arcDashAnimateTime(2500);
    } catch (err) {
      console.error("[ECLIPSE] Globe init failed:", err);
      showFallbackOnly();
      return;
    }

    // Controls: auto-rotate (locked); no pan/zoom; attempt to disable rotate.
    try {
      const controls = globe.controls();
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = CFG.autoRotateSpeed;
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.enableRotate = false; // Some versions still allow drag; we also block pointerdown on canvas.
      }
    } catch (_) {}

    // Size / resize
    const resize = () => {
      ensureHeroHeight();
      const r = mount.getBoundingClientRect();
      const w = Math.max(320, Math.floor(r.width));
      const h = Math.max(320, Math.floor(r.height));
      if (globe.width) globe.width(w);
      if (globe.height) globe.height(h);
    };
    window.addEventListener("resize", resize);
    resize();

    // Disable drag after canvas exists
    setTimeout(() => disableUserDrag(mount), 0);

    // Load signal map (but do NOT fail blank if it errors)
    let points = [];
    let arcs = [];
    try {
      const raw = await fetchSignalMap();
      const norm = normalizeSignalMap(raw);
      points = norm.points;
      arcs = norm.arcs;
    } catch (err) {
      console.warn("[ECLIPSE] Signal map load failed; rendering globe without points/arcs.", err);
    }

    // Normalize points (region-level only)
    const pointsData = (points || [])
      .filter(regionOnly)
      .map((p) => {
        const lat = toLat(p);
        const lng = toLng(p);
        if (lat == null || lng == null) return null;

        const divKey = pickDivisionKey(p);
        const color = CFG.palette[divKey] || CFG.palette.neutral;

        const label =
          p?.label ||
          p?.name ||
          p?.title ||
          `${(p?.division || p?.type || "Node").toString()}`;

        // Highlight rules (locked intent). Data-driven when possible.
        // HQ persistent: always colored HQ when division indicates HQ.
        // Transport temp window: if data provides "monthsAgo" or "ageMonths", gate; else allow.
        // Properties persistent if owned: if owned flag exists, gate; else allow.
        let keep = true;
        if (divKey === "transport") {
          const age = p?.monthsAgo ?? p?.ageMonths ?? null;
          if (typeof age === "number") keep = age <= CFG.transportRollingMonths;
        }
        if (divKey === "properties") {
          if (typeof p?.owned === "boolean") keep = p.owned === true;
          if (typeof p?.isOwned === "boolean") keep = p.isOwned === true;
          if (typeof p?.status === "string") {
            const s = p.status.toLowerCase();
            if (s.includes("owned") === false) keep = false;
          }
        }
        if (!keep) return null;

        return {
          ...p,
          _lat: lat,
          _lng: lng,
          _color: color,
          _label: label,
          _radius: 0.28
        };
      })
      .filter(Boolean);

    // Normalize arcs
    const arcsData = (arcs || [])
      .map((a) => {
        const sLat = arcStartLat(a);
        const sLng = arcStartLng(a);
        const eLat = arcEndLat(a);
        const eLng = arcEndLng(a);
        if ([sLat, sLng, eLat, eLng].some((v) => typeof v !== "number")) return null;

        const divKey = pickDivisionKey(a);
        const color = CFG.palette[divKey] || "rgba(255,255,255,0.35)";

        return {
          ...a,
          _startLat: sLat,
          _startLng: sLng,
          _endLat: eLat,
          _endLng: eLng,
          _color: color,
          _alt: a?.altitude ?? 0.25,
          _stroke: a?.stroke ?? 0.6
        };
      })
      .filter(Boolean);

    // Apply data to globe (even if empty)
    globe.pointsData(pointsData);
    globe.arcsData(arcsData);

    // Final visibility assert
    ensureHeroHeight();
    showGlobe();
  }

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
