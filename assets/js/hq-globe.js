(() => {
  const CFG = {
    earthTexturePath: "assets/visuals/earth_blue_marble.jpg", // you will add this file
    backgroundColor: "#060712",
    autoRotateSpeed: 0.35,
    mobileMaxWidth: 768
  };

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isMobile() {
    return window.matchMedia && window.matchMedia(`(max-width: ${CFG.mobileMaxWidth}px)`).matches;
  }

  function showFallbackOnly() {
    const fb = document.getElementById("globeFallback");
    const gv = document.getElementById("globeViz");
    if (fb) fb.style.display = "block";
    if (gv) gv.style.display = "none";
  }

  function showGlobe() {
    const fb = document.getElementById("globeFallback");
    const gv = document.getElementById("globeViz");
    if (fb) fb.style.display = "none";
    if (gv) gv.style.display = "block";
  }

  async function loadSignalData() {
    const res = await fetch("assets/data/public_signal_map.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Signal map fetch failed: ${res.status}`);
    return res.json();
  }

  function colorByStatus(status) {
    switch ((status || "").toLowerCase()) {
      case "active": return "rgba(80,120,255,0.95)";
      case "building": return "rgba(0,255,180,0.85)";
      case "planned": return "rgba(255,220,120,0.85)";
      default: return "rgba(255,255,255,0.7)";
    }
  }

  async function init() {
    const mount = document.getElementById("globeViz");
    if (!mount || typeof Globe !== "function") return;

    // Plan B + C: mobile or reduced-motion => fallback
    if (isMobile() || prefersReducedMotion()) {
      showFallbackOnly();
      return;
    }

    showGlobe();

    const { points = [], arcs = [] } = await loadSignalData();

    const globe = Globe()(mount)
      .backgroundColor(CFG.backgroundColor)
      .globeImageUrl(CFG.earthTexturePath)
      .bumpImageUrl(null)
      .showAtmosphere(true)
      .atmosphereColor("rgba(90,120,255,0.35)")
      .atmosphereAltitude(0.18)

      // Points
      .pointsData(points)
      .pointLat(d => d.lat)
      .pointLng(d => d.lng)
      .pointColor(d => colorByStatus(d.status))
      .pointAltitude(d => (d.status === "active" ? 0.035 : 0.02))
      .pointRadius(d => (d.status === "active" ? 0.22 : 0.16))
      .pointsMerge(true)
      .pointLabel(d => `
        <div style="padding:8px 10px;">
          <div style="font-weight:700; letter-spacing:0.02em;">${escapeHtml(d.label || "")}</div>
          <div style="opacity:0.85; font-size:12px; margin-top:2px;">
            ${(d.type || "node").toUpperCase()} • ${(d.status || "status").toUpperCase()}
          </div>
        </div>
      `)

      // Arcs
      .arcsData(arcs)
      .arcStartLat(d => d.startLat)
      .arcStartLng(d => d.startLng)
      .arcEndLat(d => d.endLat)
      .arcEndLng(d => d.endLng)
      .arcColor(d => [colorByStatus(d.status), "rgba(255,255,255,0.05)"])
      .arcAltitudeAutoScale(0.28)
      .arcDashLength(0.45)
      .arcDashGap(2.2)
      .arcDashAnimateTime(2200);

    // Camera + auto-rotate
    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.25 }, 0);
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = CFG.autoRotateSpeed;

    // Resize safety
    window.addEventListener("resize", () => {
      if (isMobile() || prefersReducedMotion()) showFallbackOnly();
    }, { passive: true });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch(err => {
      console.error("[HQ Globe] init failed:", err);
      showFallbackOnly();
    });
  });
})();
