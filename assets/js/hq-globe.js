(() => {
  "use strict";

  // =========================
  // CONFIG (Public-safe defaults)
  // =========================
  const CFG = {
    // FEEDS HOST (public-safe)
    // Step 1 target: regions + assets (public)
    feedsBaseUrl: "https://data.eclipseglobalhq.com",
    feeds: {
      regions: "/public/regions.json",
      assets: "/public/assets.json",
      signalsHqPublic: "/public/signals_hq_public.json",
      manifest: "/manifest.json"
    },

    // Local fallback (Plan B if feeds fail)
    fallbackSignalMapPath: "/assets/data/public_signal_map.json",

    // Mobile fallback rule (Plan B)
    mobileMaxWidth: 768,

    // Auto-rotate + hover (locked)
    autoRotateSpeed: 0.35,

    // Transport rolling window (locked concept; defaults to 6)
    transportRollingMonths: 6,

    // Globe library CDN (no installs)
    globeCdn: "https://cdn.jsdelivr.net/npm/globe.gl@2.45.0/dist/globe.gl.min.js",

    // Countries borders (CDN; minimal actions)
    // If this ever fails, we’ll switch to local /assets/data/countries.geojson
    countriesGeoJsonUrl:
      "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json",

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
      neutral: "rgba(255,255,255,0.75)",
      borders: "rgba(255,255,255,0.16)",
      borderCap: "rgba(0,0,0,0)"
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

  async function fetchJson(urlOrPath) {
    const res = await fetch(urlOrPath, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} for ${urlOrPath}`);
    return res.json();
  }

  function absFeedUrl(path) {
    if (!path) return CFG.feedsBaseUrl;
    if (/^https?:\/\//i.test(path)) return path;
    return `${CFG.feedsBaseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  }

  async function fetchRegions() {
    return fetchJson(absFeedUrl(CFG.feeds.regions));
  }

  async function fetchAssets() {
    return fetchJson(absFeedUrl(CFG.feeds.assets));
  }
async function fetchSignalsHqPublic() {
  return fetchJson(absFeedUrl(CFG.feeds.signalsHqPublic));
}
  async function fetchManifest() {
    return fetchJson(absFeedUrl(CFG.feeds.manifest));
  }

  async function fetchSignalMapFallback() {
    return fetchJson(CFG.fallbackSignalMapPath);
  }

  async function fetchCountries() {
    return fetchJson(CFG.countriesGeoJsonUrl);
  }

  function normalizeArrayEnvelope(obj, key) {
    if (Array.isArray(obj)) return obj;
    const arr = obj?.[key];
    return Array.isArray(arr) ? arr : [];
  }

  function toLat(obj) {
    const v = obj?.lat ?? obj?.latitude ?? obj?.y;
    return typeof v === "number" ? v : null;
  }

  function toLng(obj) {
    const v = obj?.lng ?? obj?.lon ?? obj?.longitude ?? obj?.x;
    return typeof v === "number" ? v : null;
  }

  // ---------- Old (fallback) signal-map shape support ----------
  function normalizeSignalMap(data) {
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
    const lvl = (obj?.level || obj?.scope || obj?.tier || "").toString().toLowerCase().trim();
    if (!lvl) return true;
    return lvl.includes("region");
  }

  function arcStartLat(a) { return a?.startLat ?? a?.fromLat ?? a?.srcLat ?? null; }
  function arcStartLng(a) { return a?.startLng ?? a?.fromLng ?? a?.fromLon ?? a?.srcLng ?? a?.srcLon ?? null; }
  function arcEndLat(a)   { return a?.endLat   ?? a?.toLat   ?? a?.dstLat ?? null; }
  function arcEndLng(a)   { return a?.endLng   ?? a?.toLng   ?? a?.toLon  ?? a?.dstLng ?? a?.dstLon ?? null; }

  // ---------- Feed → points builder (Step 1 target) ----------
  function categoryToPaletteKey(categoryRaw) {
    const c = (categoryRaw || "").toString().toLowerCase();
    if (c.includes("hq")) return "hq";
    if (c.includes("transport")) return "transport";
    if (c.includes("logistics")) return "logistics";
    if (c.includes("properties")) return "properties";
    if (c.includes("stone") || c.includes("ember")) return "ember";
    return "neutral";
  }

  function buildAssetPointsFromFeeds(regionsEnvelope, assetsEnvelope) {
    const regions = normalizeArrayEnvelope(regionsEnvelope, "regions");
    const assets = normalizeArrayEnvelope(assetsEnvelope, "assets");

    const regionIndex = new Map();
    regions.forEach((r) => {
      const lat = toLat(r);
      const lng = toLng(r);
      const id = (r?.region_id ?? r?.regionId ?? "").toString();
      if (!id || lat == null || lng == null) return;
      const active = (typeof r?.active === "boolean") ? r.active : true;
      if (!active) return;
      regionIndex.set(id, {
        region_id: id,
        label: r?.label || id,
        lat,
        lng,
        tier: r?.tier || ""
      });
    });

    const points = [];
    assets.forEach((a) => {
      const active = (typeof a?.active === "boolean") ? a.active : true;
      if (!active) return;

      const regionId = (a?.region_id ?? a?.regionId ?? "").toString();
      const reg = regionIndex.get(regionId);
      if (!reg) return;

      const paletteKey = categoryToPaletteKey(a?.category);
      const color = CFG.palette[paletteKey] || CFG.palette.neutral;

      const label =
        a?.label ||
        a?.label_public ||
        a?.name ||
        a?.asset_id ||
        a?.assetId ||
        "Asset";

      const status = (a?.status || "").toString().trim();
      const fullLabel = `${label}${status ? ` — ${status}` : ""} (${reg.label})`;

      const isHq = paletteKey === "hq";
      points.push({
        ...a,
        _lat: reg.lat,
        _lng: reg.lng,
        _color: color,
        _label: fullLabel,
        _radius: isHq ? 0.55 : 0.35,
        _alt: isHq ? 0.05 : 0.03
      });
    });

    return points;
    function statusToColor(statusRaw) {
  const s = (statusRaw || "").toString().toLowerCase();
  if (s.includes("in transit")) return CFG.palette.transport;
  if (s.includes("completed")) return CFG.palette.neutral;
  if (s.includes("owned")) return CFG.palette.properties;
  return CFG.palette.hq;
}

function buildArcsFromPublicSignals(regionsEnvelope, signalsEnvelope) {
  const regions = normalizeArrayEnvelope(regionsEnvelope, "regions");
  const signals = normalizeArrayEnvelope(signalsEnvelope, "signals");

  // Region index: region_id -> {lat,lng,label}
  const regionIndex = new Map();
  regions.forEach((r) => {
    const id = (r?.region_id ?? r?.regionId ?? "").toString();
    const lat = toLat(r);
    const lng = toLng(r);
    const active = (typeof r?.active === "boolean") ? r.active : true;
    if (!id || lat == null || lng == null || !active) return;

    regionIndex.set(id, {
      label: r?.label || id,
      lat,
      lng
    });
  });

  const arcs = [];
  signals.forEach((s) => {
    const active = (typeof s?.active === "boolean") ? s.active : true;
    if (!active) return;

    // respect public-sharing flag if present
    if (typeof s?.share_public === "boolean" && s.share_public === false) return;

    const fromId = (s?.from_region_id ?? s?.fromRegionId ?? "").toString();
    const toId = (s?.to_region_id ?? s?.toRegionId ?? "").toString();
    const from = regionIndex.get(fromId);
    const to = regionIndex.get(toId);
    if (!from || !to) return;

    const status = (s?.status || "").toString().trim();
    const color = statusToColor(status);

    const labelCore = s?.label_public || "Route";
    const label = `${labelCore} — ${from.label} → ${to.label}${status ? ` (${status})` : ""}`;

    arcs.push({
      ...s,
      _startLat: from.lat,
      _startLng: from.lng,
      _endLat: to.lat,
      _endLng: to.lng,
      _color: color,
      _alt: 0.25,
      _stroke: 0.9,
      _label: label
    });
  });

  return arcs;
}

  }

  function disableUserDrag(mount) {
    const canvas = mount.querySelector("canvas");
    if (!canvas) return;

    const block = (e) => {
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

    showGlobe();

    try {
      await loadGlobeLib();
    } catch (err) {
      console.error("[ECLIPSE] Globe lib load failed:", err);
      showFallbackOnly();
      return;
    }

    mount.innerHTML = "";
    ensureHeroHeight();
    showGlobe();

    let globe;
    try {
      globe = window.Globe()(mount)
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true)
        .atmosphereAltitude(0.25)

        // Countries layer (borders)
        .polygonsData([])
        .polygonCapColor(() => CFG.palette.borderCap)
        .polygonSideColor(() => "rgba(0,0,0,0)")
        .polygonStrokeColor(() => CFG.palette.borders)
        .polygonAltitude(0.005)

        // Points + arcs
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
        .arcLabel((d) => d._label || "")
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

    try {
      const controls = globe.controls();
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = CFG.autoRotateSpeed;
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.enableRotate = true;
      }
    } catch (_) {}

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
    // Start view focused on North America / US
globe.pointOfView({ lat: 33.4484, lng: -112.0740, altitude: 1.9 }, 0);

    // Load countries borders (non-fatal)
    try {
      const world = await fetchCountries();
      const features = Array.isArray(world?.features) ? world.features : [];
      globe.polygonsData(features);
    } catch (err) {
      console.warn("[ECLIPSE] Countries layer failed; continuing without borders.", err);
    }

    // Optional: log manifest (non-fatal)
    try {
      const man = await fetchManifest();
      console.log("[ECLIPSE] Feeds manifest:", man);
    } catch (_) {}

    // STEP 1: Load PUBLIC feeds (regions + assets) and render HQ marker
    let pointsData = [];
    let arcsData = []; // Step 2 will wire public signals into arcs
    try {
     const [regionsEnvelope, assetsEnvelope, signalsEnvelope] = await Promise.all([
  fetchRegions(),
  fetchAssets(),
  fetchSignalsHqPublic()
]);

pointsData = buildAssetPointsFromFeeds(regionsEnvelope, assetsEnvelope);
arcsData = buildArcsFromPublicSignals(regionsEnvelope, signalsEnvelope);
    } catch (err) {
      console.warn("[ECLIPSE] Public feeds failed; falling back to local demo map.", err);

      // Fallback: local signal map file
      try {
        const raw = await fetchSignalMapFallback();
        const norm = normalizeSignalMap(raw);
        const points = norm.points || [];
        const arcs = norm.arcs || [];

        pointsData = (points || [])
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

        arcsData = (arcs || [])
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
      } catch (fallbackErr) {
        console.warn("[ECLIPSE] Fallback map also failed; rendering globe without points/arcs.", fallbackErr);
      }
    }

    globe.pointsData(pointsData);
    globe.arcsData(arcsData);

    ensureHeroHeight();
    showGlobe();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
