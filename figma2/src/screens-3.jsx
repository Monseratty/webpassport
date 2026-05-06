/* Screen 5 — My Profile (logged-in own profile w/ /stack map) */
const ScreenProfile = () => {
  const myPassports = [
    window.PR_PASSPORTS.find(p => p.iso === 'RU'),
    window.PR_PASSPORTS.find(p => p.iso === 'TR'),
  ];
  const fillMap = { ...window.PR_STACK_FILL, RU: 'own', TR: 'own' };
  // mark visited countries with purple overlay
  window.PR_VISITED.forEach(v => { if (!fillMap[v.iso]) fillMap[v.iso] = 'visited'; });

  return (
    <div className="pr-screen">
      <PrNav active="profile" loggedIn user="Alex" />
      <div className="pr-main">
        <div className="pr-profile-hero">
          <div className="pr-profile-avatar">A</div>
          <div style={{ flex: 1 }}>
            <div className="pr-profile-name">Alex Petrov</div>
            <div className="pr-profile-handle">@alex_traveller · joined Mar 2025</div>
            <div className="pr-profile-meta">
              <div className="pr-profile-meta-item"><strong>2</strong><span>Passports</span></div>
              <div className="pr-profile-meta-item"><strong>14</strong><span>Countries Visited</span></div>
              <div className="pr-profile-meta-item"><strong>137</strong><span>Best Visa-Free</span></div>
              <div className="pr-profile-meta-item"><strong>7%</strong><span>World Explored</span></div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="pr-btn ghost" style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff' }}>🔗 Share profile</button>
            <button className="pr-btn ghost" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.2)', color: '#fff' }}>⚙ Privacy settings</button>
          </div>
        </div>

        <div className="pr-profile-grid">
          <div>
            <div className="pr-map-wrap pr-mb-12">
              <div className="pr-spread" style={{ marginBottom: 12 }}>
                <strong>My visa map · combined access</strong>
                <span style={{ fontSize: '.78rem', color: 'var(--c-muted)' }}>best of {myPassports.map(p => p.flag).join(' ')}</span>
              </div>
              <PrWorldMap fillMap={fillMap} />
              <PrMapLegend items={[
                { label: 'My passports',    color: '#064e3b' },
                { label: 'Visited',         color: '#7c3aed' },
                { label: 'Visa Free',       color: '#16a34a' },
                { label: 'Visa on Arrival', color: '#2563eb' },
                { label: 'ETA',             color: '#eab308' },
                { label: 'Visa Required',   color: '#dc2626' },
              ]} />
            </div>

            <div className="pr-panel">
              <div className="pr-panel-h">
                <span>Visited Countries & Territories</span>
                <span className="pr-panel-action">＋ Add country</span>
              </div>
              <div className="pr-country-chips">
                {window.PR_VISITED.map(v => (
                  <span className="pr-country-chip" key={v.iso}>
                    <span>{v.flag}</span> {v.name}
                    <span className="x">✕</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="pr-panel">
              <div className="pr-panel-h">
                <span>My Passports</span>
                <span className="pr-panel-action">＋ Add passport</span>
              </div>
              {myPassports.map(p => (
                <div className="pr-passport-mini" key={p.iso}>
                  <span className="flag">{p.flag}</span>
                  <div className="info">
                    <b>{p.name}</b>
                    <i>Rank #{p.rank} · {p.total} destinations</i>
                  </div>
                  <button title="Remove">✕</button>
                </div>
              ))}
            </div>

            <div className="pr-panel">
              <div className="pr-panel-h"><span>Travel Stats</span></div>
              <div className="pr-stack" style={{ gap: 14 }}>
                {[
                  { l: 'Visa-Free Access', v: 137, max: 195, c: 'var(--vf)' },
                  { l: 'Visa on Arrival',  v: 28,  max: 195, c: 'var(--voa)' },
                  { l: 'ETA',              v: 14,  max: 195, c: 'var(--ev)' },
                  { l: 'Visa Required',    v: 16,  max: 195, c: 'var(--vr)' },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="pr-spread" style={{ fontSize: '.85rem', marginBottom: 6 }}>
                      <span style={{ fontWeight: 500 }}>{s.l}</span>
                      <strong>{s.v}</strong>
                    </div>
                    <div className="pr-bar"><div className="pr-bar-fill" style={{ width: (s.v/s.max*100)+'%', background: s.c }}></div></div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
      <PrFooter />
    </div>
  );
};

/* Screen 6 — Public profile (someone else's view; some hidden) */
const ScreenPublicProfile = () => {
  const fillMap = { JP: 'own', GB:'vf', FR:'vf', DE:'vf', IT:'vf', ES:'vf', PT:'vf', NL:'vf', AT:'vf', PL:'vf', SE:'vf', NO:'vf', GR:'vf', RO:'vf', UA:'vf', KR:'vf', SG:'vf', TH:'vf', MY:'vf', PH:'vf', ID:'vf', AU:'vf', NZ:'vf', MX:'vf', BR:'vf', AR:'vf', CL:'vf', PE:'vf', CO:'vf', ZA:'vf', AE:'vf', US:'ev', CA:'ev', VN:'ev', IN:'ev', EG:'voa', KE:'voa', TZ:'voa', AO:'voa', RU:'vr', CN:'vr', IR:'vr' };
  return (
    <div className="pr-screen">
      <PrNav />
      <div className="pr-main">
        <div className="pr-profile-hero">
          <div className="pr-profile-avatar" style={{ background: 'linear-gradient(135deg,#f472b6,#fb923c)' }}>М</div>
          <div style={{ flex: 1 }}>
            <div className="pr-profile-name">Maria Tanaka <span style={{ fontSize: '.85rem', fontWeight: 500, color: 'rgba(255,255,255,.5)', marginLeft: 8 }}>🇯🇵 Tokyo</span></div>
            <div className="pr-profile-handle">@maria_t · joined Sep 2024 · public profile</div>
            <div className="pr-profile-meta">
              <div className="pr-profile-meta-item"><strong>1</strong><span>Passport</span></div>
              <div className="pr-profile-meta-item"><strong>—</strong><span>Visited <span className="pr-vis-pill pr-vis-hidden" style={{ marginLeft: 4 }}>Hidden</span></span></div>
              <div className="pr-profile-meta-item"><strong>193</strong><span>Visa-Free Power</span></div>
              <div className="pr-profile-meta-item"><strong>#1</strong><span>Best Rank</span></div>
            </div>
          </div>
          <button className="pr-btn ghost" style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff' }}>＋ Follow</button>
        </div>

        <div className="pr-profile-grid">
          <div className="pr-map-wrap">
            <div className="pr-spread" style={{ marginBottom: 12 }}>
              <strong>Visa map · 🇯🇵 Japan passport</strong>
              <span className="pr-vis-pill pr-vis-public">Public</span>
            </div>
            <PrWorldMap fillMap={fillMap} />
            <PrMapLegend items={[
              { label: 'Their passport',  color: '#064e3b' },
              { label: 'Visa Free',       color: '#16a34a' },
              { label: 'Visa on Arrival', color: '#2563eb' },
              { label: 'ETA',             color: '#eab308' },
              { label: 'Visa Required',   color: '#dc2626' },
            ]} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="pr-panel">
              <div className="pr-panel-h"><span>Passports</span><span className="pr-vis-pill pr-vis-public">Public</span></div>
              <div className="pr-passport-mini">
                <span className="flag">🇯🇵</span>
                <div className="info">
                  <b>Japan</b>
                  <i>Rank #1 · 193 destinations</i>
                </div>
              </div>
            </div>

            <div className="pr-panel" style={{ position: 'relative' }}>
              <div className="pr-panel-h"><span>Visited Countries</span><span className="pr-vis-pill pr-vis-hidden">🔒 Hidden</span></div>
              <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none', opacity: .6 }}>
                <div className="pr-country-chips">
                  {window.PR_VISITED.slice(0, 6).map(v => (
                    <span className="pr-country-chip" key={v.iso}><span>{v.flag}</span> {v.name}</span>
                  ))}
                </div>
              </div>
              <div style={{ position: 'absolute', inset: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, color: 'var(--c-muted)', fontSize: '.85rem', textAlign: 'center' }}>
                <span style={{ fontSize: '1.2rem' }}>🔒</span>
                <span>Maria has hidden their travel history</span>
              </div>
            </div>

          </div>
        </div>
      </div>
      <PrFooter />
    </div>
  );
};

window.ScreenProfile = ScreenProfile;
window.ScreenPublicProfile = ScreenPublicProfile;
