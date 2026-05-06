/* Real jsVectorMap integration.
   Loads jsvectormap CSS + JS + world map data via CDN.
   PrWorldMap is a React wrapper that mounts a jsVectorMap instance.

   fillMap: { ISO2: 'vf'|'voa'|'ev'|'vr'|'na'|'own'|'visited' }
   jsVectorMap world map uses ISO 3166-1 alpha-2 codes (lowercase),
   so we map our keys accordingly.
*/

const JVM_COLORS = {
  vf:      '#16a34a',  // visa free — green
  voa:     '#2563eb',  // visa on arrival — blue
  ev:      '#eab308',  // electronic permit — yellow
  vr:      '#dc2626',  // visa required — red
  na:      '#dc2626',  // unknown / unmapped — also red (treat as inaccessible)
  own:     '#064e3b',  // owner passport — dark green
  visited: '#7c3aed',  // visited
};

// Inject CDN assets once
let __jvmLoaded = null;
function loadJVM() {
  if (__jvmLoaded) return __jvmLoaded;
  __jvmLoaded = new Promise((resolve, reject) => {
    // Inline minimal CSS (the CDN .css path 404s on some versions)
    if (!document.querySelector('style[data-jvm]')) {
      const style = document.createElement('style');
      style.setAttribute('data-jvm', '1');
      style.textContent = `
        .jvm-container { touch-action: none; position: relative; overflow: hidden; width: 100%; height: 100%; }
        .jvm-tooltip { position: absolute; display: none; padding: 6px 10px; border-radius: 6px;
          background: #0b1220; color: #fff; font: 500 12px/1.2 Inter, system-ui, sans-serif;
          box-shadow: 0 6px 20px rgba(0,0,0,.18); pointer-events: none; z-index: 1000; white-space: nowrap; }
        .jvm-tooltip.active { display: block; }
        .jvm-region { transition: fill .15s; }
        .jvm-zoom-btn { position: absolute; left: 10px; width: 24px; height: 24px;
          background: #292929; color: #fff; border-radius: 3px; line-height: 22px;
          text-align: center; cursor: pointer; font-weight: 700; font-size: 14px; user-select: none; }
        .jvm-zoomin { top: 10px; } .jvm-zoomout { top: 40px; }
      `;
      document.head.appendChild(style);
    }
    const loadScript = (src) => new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    loadScript('https://cdn.jsdelivr.net/npm/jsvectormap@1.6.0/dist/jsvectormap.min.js')
      .then(() => loadScript('https://cdn.jsdelivr.net/npm/jsvectormap@1.6.0/dist/maps/world.js'))
      .then(resolve)
      .catch(reject);
  });
  return __jvmLoaded;
}

const PrWorldMap = ({ fillMap = {}, height = 380 }) => {
  const ref = React.useRef(null);
  const mapRef = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;
    loadJVM().then(() => {
      if (cancelled || !ref.current || !window.jsVectorMap) return;
      try {
        if (mapRef.current) { mapRef.current.destroy(); mapRef.current = null; }
        ref.current.innerHTML = '';
        mapRef.current = new window.jsVectorMap({
          selector: ref.current,
          map: 'world',
          backgroundColor: 'transparent',
          zoomOnScroll: false,
          zoomButtons: false,
          regionStyle: {
            initial: {
              fill: JVM_COLORS.vr,
              stroke: '#ffffff',
              strokeWidth: 0.5,
              fillOpacity: 1,
            },
            hover: { fillOpacity: 0.85, cursor: 'pointer' },
          },
        });

        // Apply per-region fills imperatively after init.
        // jsVectorMap world map uses UPPERCASE ISO 3166-1 alpha-2 codes.
        const inst = mapRef.current;
        requestAnimationFrame(() => {
          Object.entries(fillMap).forEach(([iso, kind]) => {
            const code = iso.toUpperCase();
            const color = JVM_COLORS[kind] || JVM_COLORS.na;
            // Try a few API shapes for cross-version safety
            const region = inst.regions && inst.regions[code];
            if (region && region.element && region.element.shape && region.element.shape.node) {
              region.element.shape.node.setAttribute('fill', color);
            } else if (region && region.element && typeof region.element.setStyle === 'function') {
              region.element.setStyle('fill', color);
            } else {
              // DOM fallback
              const path = ref.current.querySelector(`[data-code="${code}"]`);
              if (path) path.setAttribute('fill', color);
            }
          });
        });
      } catch (e) {
        console.warn('jsVectorMap init failed', e);
      }
    }).catch(e => console.warn('jsVectorMap load failed', e));
    return () => {
      cancelled = true;
      try { mapRef.current && mapRef.current.destroy(); } catch(_) {}
      mapRef.current = null;
    };
  }, [JSON.stringify(fillMap)]);

  return <div ref={ref} style={{ width: '100%', height: height + 'px' }} />;
};

const PrMapLegend = ({ items }) => (
  <div className="pr-map-legend">
    {items.map((it, i) => (
      <span className="pr-leg-item" key={i}>
        <span className="pr-leg-dot" style={{ background: it.color }}></span>
        {it.label}
      </span>
    ))}
  </div>
);

window.PrWorldMap = PrWorldMap;
window.PrMapLegend = PrMapLegend;
