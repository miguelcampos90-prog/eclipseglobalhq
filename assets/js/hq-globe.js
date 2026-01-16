(() => {
  "use strict";

  // =========================
  // CONFIG (Public-safe defaults)
  // =========================
  const CFG = {
    dataPath: "assets/data/public_signal_map.json",

    // Mobile fallback rule (Plan B)
    mobileMaxWidth: 768,

    // Auto-rotate + hover (locked)
    autoRotateSpeed: 0.35,

    // Transport rolling window (locked concept; data can optionally include timestamps)
    transportRollingMonths: 6, // (you said 3–6 months; default to 6; we can tune per point later)

    // Globe library CDN (no installs)
    globeCdn:
      "https://cdn.jsdelivr.net/npm/globe.gl@2.45.0/dist/globe.gl.min.js",
  };

  // =========================
  // Helpers
  // =========================
  function isMobile() {
    return window.matchMedia && window.matchMedia(`(max-width: ${CFG.mobileMaxWidth}px)`).matches;
  }

  function $(id) {
    return document.getElementById(id);
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

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseDateMaybe(v) {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function withinRollingMonths(date, months) {
    if (!date) return true; // if no date, keep it (public safe default)
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - months);
    return date >= cutoff;
  }

  function normalizeStatus(status) {
    const s = String(status || "").toLowerCase().trim();
    if (s === "active" || s === "building" || s === "planned") return s;
    // allow legacy or alternate words
    if (s === "live") return "active";
    if (s === "planning") return "planned";
    return "planned";
  }

  function normalizeType(type) {
    const t = String(type || "").toLowerCase().trim();
    // preferred types: hq, transport, logistics, properties, innovation
    if (!t) return "network";
    return t;
  }

  // Progress colors (public safe)
  function colorByStatus(status) {
    switch (normalizeStatus(status)) {
      case "active":
        return "rgba(61,132,245,0.95)"; // HQ blue
      case "building":
        return "rgba(43,187,173,0.90)"; // transport teal
      case "planned":
      default:
        return "rgba(232,162,91,0.85)"; // properties gold (planned tone)
    }
  }

  // =========================
  // Data rules (Movement + Progress, division behavior)
  // =========================
  function shouldDisplayPoint(p) {
    const type = normalizeType(p.type);
    const status = normalizeStatus(p.status);

    // Region-level only is enforced by what you put into JSON (we won’t add precision here).
    // Now apply persistence/rolling logic:

    // HQ (and innovation labs) are persistent highlights
    if (type === "hq" || type === "innovation" || type === "labs") return true;

    // Properties: highlight if owned; if not provided, allow it (so we don't hide everything by accident)
    if (type === "properties") {
      if (typeof p.owned === "boolean") return p.owned === true || status !== "active";
      return true;
    }

    // Transport: rolling 3–6 month log (use lastActive/updatedAt if present)
    if (type === "transport") {
      const d = parseDateMaybe(p.lastActive || p.updatedAt || p.date);
      return withinRollingMonths(d, CFG.transportRollingMonths);
    }

    // Logistics: not explicitly locked, but safe to treat similar to transport (rolling window) if date exists
    if (type === "logistics") {
      const d = parseDateMaybe(p.lastActive || p.updatedAt || p.date);
      return withinRollingMonths(d, CFG.transportRollingMonths);
    }

    // Default: show
    return true;
  }

  function shouldDisplayArc(a) {
    const type = normalizeType(a.type);
    const d = parseDateMaybe(a.lastActive || a.updatedAt || a.date);

    if (type === "hq" || type === "innovation" || type === "labs") return true;
    if (type === "properties") {
      if (typeof a.owned === "boolean") return a.owned === true;
      return true;
    }
    if (type === "transport" || type === "logistics") {
      return withinRollingMonths(d, CFG.transportRollingMonths);
    }
    return true;
  }

  // =========================
  // Texture: generate a simple “eclipse-style” globe texture in-code
  // (No missing assets, no downloads)
  // =========================
  function makeEclipseTextureDataUrl() {
    const w = 1024;
    const h = 512;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");

    // Base gradient (deep space)
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#0b1320");
    g.addColorStop(0.5, "#070b14");
    g.addColorStop(1, "#050712");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // “Top-right illumination”
    const glow = ctx.createRadialGradient(w * 0.78, h * 0.22, 10, w * 0.78, h * 0.22, w * 0.65);
    glow.addColorStop(0, "rgba(61,132,245,0.35)");
    glow.addColorStop(0.5, "rgba(61,132,245,0.12)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Subtle latitude/longitude lines
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    for (let y = 32; y < h; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 64; x < w; x += 96) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Noise grain
    const img = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 18; // small noise
      img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
      img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
      img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);

    return c.toDataURL("image/jpeg", 0.85);
  }

  // =========================
  // Load Globe library (CDN) if needed
  // =========================
  function loadGlobeLib() {
    return new Promise((resolve, reject) => {
      if (typeof window.Globe === "function") return resolve();

      // Avoid double-injecting
      const existing = document.querySelector(`script[data-eg-globe="1"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Globe CDN failed")));
        return;
      }

      const s = document.createElement("script");
      s.src = CFG.globeCdn;
      s.async = true;
      s.setAttribute("data-eg-globe", "1");
      s.addEventListener("load", () => resolve());
      s.addEventListener("error", () => reject(new Error("Globe CDN failed")));
      document.head.appendChild(s);
    });
  }

  async function loadSignalData() {
    const res = await fetch(CFG.dataPath, { cache: "no-store" });
    if (!res.ok) throw new Error(`Signal map fetch failed: ${res.status}`);
    return res.json();
  }

  // =========================
  // Main init
  // =========================
  async function init() {
    const mount = $("globeViz");
    if (!mount) return;

    // Mobile: fallback only (Plan B)
    if (isMobile()) {
      showFallbackOnly();
      return;
    }

    // Load globe library dynamically (no HTML edits required)
    await loadGlobeLib();

    // If Globe still not available, fallback
    if (typeof window.Globe !== "function") {
      showFallbackOnly();
      return;
    }

    const raw = await loadSignalData();
    const pointsRaw = Array.isArray(raw.points) ? raw.points : [];
    const arcsRaw = Array.isArray(raw.arcs) ? raw.arcs : [];

    // Apply public rules
    const points = pointsRaw.filter(shouldDisplayPoint).map((p) => ({
      ...p,
      type: normalizeType(p.type),
      status: normalizeStatus(p.status),
    }));

    const arcs = arcsRaw.filter(shouldDisplayArc).map((a) => ({
      ...a,
      type: normalizeType(a.type),
      status: normalizeStatus(a.status),
    }));

    // Show globe (hide fallback)
    showGlobe();

    // Transparent background so CSS/hero background shows through
    const globe = window.Globe()(mount)
      .backgroundColor("rgba(0,0,0,0)")
      .globeImageUrl(makeEclipseTextureDataUrl())
      .showAtmosphere(true)
      .atmosphereColor("rgba(61,132,245,0.22)")
      .atmosphereAltitude(0.20)

      // Points = progress
      .pointsData(points)
      .pointLat((d) => d.lat)
      .pointLng((d) => d.lng)
      .pointColor((d) => colorByStatus(d.status))
      .pointAltitude((d) => (d.status === "active" ? 0.045 : 0.028))
      .pointRadius((d) => (d.status === "active" ? 0.25 : 0.18))
      .pointsMerge(true)
      .pointLabel((d) => {
        const label = escapeHtml(d.label || d.region || "Region");
        const type = escapeHtml(String(d.type || "node").toUpperCase());
        const status = escapeHtml(String(d.status || "planned").toUpperCase());
        return `
          <div style="padding:8px 10px; max-width:220px;">
            <div style="font-weight:800; letter-spacing:0.02em;">${label}</div>
            <div style="opacity:0.85; font-size:12px; margin-top:2px;">${type} • ${status}</div>
          </div>
        `;
      })

      // Arcs = movement
      .arcsData(arcs)
      .arcStartLat((d) => d.startLat)
      .arcStartLng((d) => d.startLng)
      .arcEndLat((d) => d.endLat)
      .arcEndLng((d) => d.endLng)
      .arcColor((d) => [colorByStatus(d.status), "rgba(255,255,255,0.05)"])
      .arcAltitudeAutoScale(0.30)
      .arcDashLength(0.45)
      .arcDashGap(2.2)
      .arcDashAnimateTime(2200);

    // Camera baseline
    globe.pointOfView({ lat: 18, lng: 0, altitude: 2.25 }, 0);

    // Auto rotate only (no user drag)
    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = CFG.autoRotateSpeed;

      // Disable manual interaction (auto-rotate + hover)
      controls.enableRotate = false;
      controls.enableZoom = false;
      controls.enablePan = false;
    }

    // Resize safety (if viewport becomes mobile, drop to fallback)
    window.addEventListener(
      "resize",
      () => {
        if (isMobile()) showFallbackOnly();
      },
      { passive: true }
    );
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => {
      console.error("[HQ Globe] init failed:", err);
      showFallbackOnly();
    });
  });
})();
