/* Screen 1 — Home / Rankings (desktop) */
const ScreenHome = () => {
  const top = window.PR_PASSPORTS.slice(0, 12);
  return (
    <div className="pr-screen">
      <PrNav active="rankings" />
      <div className="pr-hero">
        <div className="pr-hero-inner">
          <span className="pr-hero-badge">Updated 2026</span>
          <h1 className="pr-hero-title">Global Passport<br/><em>Power Index</em></h1>
          <p className="pr-hero-sub">Discover which passports unlock the most destinations — visa-free.</p>
          <div className="pr-search">
            <span className="pr-search-icon">🔍</span>
            <input placeholder="Search a country…" />
          </div>
          <div className="pr-hero-stats">
            <div className="pr-hs-item"><strong>199</strong><span>Passports</span></div>
            <div className="pr-hs-sep"></div>
            <div className="pr-hs-item"><strong>193</strong><span>Top Visa-Free</span></div>
            <div className="pr-hs-sep"></div>
            <div className="pr-hs-item"><strong>🇯🇵 Japan</strong><span>Current Leader</span></div>
          </div>
        </div>
      </div>
      <div className="pr-main">
        <div className="pr-toolbar">
          <div className="pr-tabs">
            <button className="pr-tab active">By Rank</button>
            <button className="pr-tab">A – Z</button>
            <button className="pr-tab">Visa-Free</button>
          </div>
          <div className="pr-icon-toggle">
            <button className="pr-icon-btn active" title="Grid">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="7" height="7" rx="1"/><rect x="9" y="0" width="7" height="7" rx="1"/><rect x="0" y="9" width="7" height="7" rx="1"/><rect x="9" y="9" width="7" height="7" rx="1"/></svg>
            </button>
            <button className="pr-icon-btn" title="List">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="1" width="16" height="2" rx="1"/><rect x="0" y="7" width="16" height="2" rx="1"/><rect x="0" y="13" width="16" height="2" rx="1"/></svg>
            </button>
          </div>
        </div>
        <div className="pr-grid">
          {top.map((p, i) => <PrCard p={p} key={p.iso} featured={i === 0} />)}
        </div>
      </div>
      <PrFooter />
    </div>
  );
};

/* Screen 2 — Passport detail w/ world map */
const ScreenPassportDetail = () => {
  const p = window.PR_PASSPORTS.find(x => x.iso === 'JP');
  const fillMap = { ...window.PR_STACK_FILL, JP: 'own' };
  return (
    <div className="pr-screen">
      <PrNav active="rankings" loggedIn user="Alex" />
      <div className="pr-main" style={{ paddingTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', color: 'var(--c-muted)', marginBottom: 16 }}>
          <span>Rankings</span><span>›</span><span style={{ color: 'var(--c-text)', fontWeight: 600 }}>Japan</span>
        </div>
        <div style={{ background: 'linear-gradient(135deg, var(--c-hero), var(--c-hero2))', borderRadius: 12, padding: '32px 32px 0', color: '#fff', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
            <div style={{ fontSize: '4.5rem', lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.2))' }}>{p.flag}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 6 }}>{p.name}</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 100, padding: '4px 14px', fontSize: '.8rem', fontWeight: 600 }}>🏆 Rank #{p.rank}</span>
                <span style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.5)' }}>{p.iso} · ISO short code</span>
              </div>
            </div>
            <button className="pr-btn" style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)' }}>＋ Add to my passports</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, background: '#fff', borderRadius: '12px 12px 0 0', margin: '0 -32px', overflow: 'hidden' }}>
            {[
              { n: p.vf,  l: 'Visa Free',         c: 'var(--vf)' },
              { n: p.voa, l: 'Visa on Arrival',   c: 'var(--voa)' },
              { n: p.ev,  l: 'E-Visa',            c: 'var(--ev)' },
              { n: p.vr,  l: 'Visa Required',     c: 'var(--vr)' },
            ].map((s, i) => (
              <div key={i} style={{ padding: 24, textAlign: 'center', borderRight: i < 3 ? '1px solid var(--c-border)' : 'none' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, marginBottom: 4, color: s.c }}>{s.n}</div>
                <div style={{ fontSize: '.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: s.c }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginTop: 24 }}>
          <div className="pr-map-wrap">
            <div className="pr-spread" style={{ marginBottom: 12 }}>
              <strong style={{ fontSize: '.95rem' }}>Visa map — where {p.name} can travel</strong>
              <span style={{ fontSize: '.78rem', color: 'var(--c-muted)' }}>powered by jVectorMap</span>
            </div>
            <PrWorldMap fillMap={fillMap} />
            <PrMapLegend items={[
              { label: 'Visa Free',         color: '#16a34a' },
              { label: 'Visa on Arrival',   color: '#2563eb' },
              { label: 'ETA',               color: '#eab308' },
              { label: 'Visa Required',     color: '#dc2626' },
              { label: 'Home',              color: '#064e3b' },
            ]} />
          </div>

          <div className="pr-panel">
            <div className="pr-panel-h">
              <span>Destinations</span>
              <span style={{ fontSize: '.78rem', color: 'var(--c-muted)' }}>{p.total} total</span>
            </div>
            <input className="pr-input pr-mb-12" placeholder="Search destinations…" />
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              <span className="pr-chip pr-chip-vf" style={{ cursor: 'pointer' }}>Visa Free 168</span>
              <span className="pr-chip pr-chip-voa">VoA 14</span>
              <span className="pr-chip pr-chip-ev">eVisa 6</span>
              <span className="pr-chip pr-chip-vr">VR 30</span>
            </div>
            <div className="pr-dest-list">
              {[
                ['🇬🇧','United Kingdom','vf','Visa Free'],
                ['🇫🇷','France','vf','Visa Free'],
                ['🇩🇪','Germany','vf','Visa Free'],
                ['🇺🇸','United States','ev','E-Visa'],
                ['🇧🇷','Brazil','vf','Visa Free'],
                ['🇪🇬','Egypt','voa','Visa on Arrival'],
                ['🇨🇳','China','vr','Visa Required'],
                ['🇮🇳','India','ev','E-Visa'],
              ].map((d, i) => (
                <div className="pr-dest-item" key={i}>
                  <span style={{ fontSize: '1.2rem' }}>{d[0]}</span>
                  <span className="pr-dest-name">{d[1]}</span>
                  <span className={'pr-dest-badge pr-bdg-' + d[2]}>{d[3]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <PrFooter />
    </div>
  );
};

window.ScreenHome = ScreenHome;
window.ScreenPassportDetail = ScreenPassportDetail;
