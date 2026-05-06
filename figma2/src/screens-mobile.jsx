/* Mobile adaptive variants of key screens (375 px wide phone frame) */

const PrPhoneFrame = ({ children, time = '9:41' }) => (
  <div className="pr-mobile-frame">
    <div className="pr-status-bar">
      <span>{time}</span>
      <span>● ● ●</span>
      <span>📶 🔋</span>
    </div>
    <div className="pr-mobile-content">{children}</div>
  </div>
);

const MobileHome = () => {
  const top = window.PR_PASSPORTS.slice(0, 8);
  return (
    <PrPhoneFrame>
      <div className="pr-screen" style={{ overflow: 'visible', height: 'auto' }}>
        <div className="pr-nav">
          <div className="pr-nav-logo">
            <div className="pr-logo-icon">🌐</div>
            <span style={{ fontSize: '1rem' }}>PassportRank</span>
          </div>
          <button className="pr-btn-signin" style={{ padding: '6px 14px', fontSize: '.8rem' }}>☰</button>
        </div>
        <div className="pr-hero">
          <div className="pr-hero-inner">
            <span className="pr-hero-badge">Updated 2026</span>
            <h1 className="pr-hero-title">Passport<br/><em>Power Index</em></h1>
            <p className="pr-hero-sub">Which passports unlock the most.</p>
            <div className="pr-search">
              <span className="pr-search-icon">🔍</span>
              <input placeholder="Search…" />
            </div>
            <div className="pr-hero-stats">
              <div className="pr-hs-item"><strong>199</strong><span>Pass.</span></div>
              <div className="pr-hs-sep"></div>
              <div className="pr-hs-item"><strong>193</strong><span>Top VF</span></div>
              <div className="pr-hs-sep"></div>
              <div className="pr-hs-item"><strong>🇯🇵</strong><span>Leader</span></div>
            </div>
          </div>
        </div>
        <div className="pr-main">
          <div className="pr-toolbar">
            <div className="pr-tabs">
              <button className="pr-tab active">Rank</button>
              <button className="pr-tab">A–Z</button>
              <button className="pr-tab">VF</button>
            </div>
          </div>
          <div className="pr-grid">
            {top.map((p, i) => <PrCard p={p} key={p.iso} featured={i === 0} />)}
          </div>
        </div>
      </div>
    </PrPhoneFrame>
  );
};

const MobilePassport = () => {
  const p = window.PR_PASSPORTS.find(x => x.iso === 'JP');
  const fillMap = { ...window.PR_STACK_FILL, JP: 'own' };
  return (
    <PrPhoneFrame>
      <div className="pr-screen" style={{ overflow: 'visible', height: 'auto' }}>
        <div className="pr-nav">
          <span style={{ color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>‹</span>
          <span style={{ color: '#fff', fontWeight: 700, flex: 1, textAlign: 'center', fontSize: '.95rem' }}>{p.flag} {p.name}</span>
          <span style={{ color: '#fff', fontSize: '1rem' }}>⋯</span>
        </div>
        <div style={{ background: 'linear-gradient(135deg, var(--c-hero), var(--c-hero2))', padding: '24px 16px', color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', lineHeight: 1, marginBottom: 12 }}>{p.flag}</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{p.name}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 100, padding: '4px 14px', fontSize: '.78rem', fontWeight: 600, marginTop: 10 }}>🏆 Rank #{p.rank}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#fff' }}>
          {[
            { n: p.vf,  l: 'Visa Free',       c: 'var(--vf)' },
            { n: p.voa, l: 'Visa on Arrival', c: 'var(--voa)' },
            { n: p.ev,  l: 'E-Visa',          c: 'var(--ev)' },
            { n: p.vr,  l: 'Visa Required',   c: 'var(--vr)' },
          ].map((s, i) => (
            <div key={i} style={{ padding: 16, textAlign: 'center', borderRight: i % 2 === 0 ? '1px solid var(--c-border)' : 'none', borderBottom: i < 2 ? '1px solid var(--c-border)' : 'none' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: '.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: s.c, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div className="pr-main">
          <div className="pr-map-wrap" style={{ marginBottom: 12 }}>
            <strong style={{ fontSize: '.85rem' }}>Visa Map</strong>
            <PrWorldMap fillMap={fillMap} />
          </div>
          <div className="pr-panel">
            <div className="pr-panel-h"><span>Top destinations</span></div>
            <div className="pr-dest-list">
              {[['🇬🇧','UK','vf','VF'],['🇫🇷','France','vf','VF'],['🇺🇸','USA','ev','eV'],['🇪🇬','Egypt','voa','VoA'],['🇨🇳','China','vr','VR']].map((d, i) => (
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
    </PrPhoneFrame>
  );
};

const MobileProfile = () => {
  const fillMap = { ...window.PR_STACK_FILL, RU: 'own', TR: 'own' };
  window.PR_VISITED.forEach(v => { if (!fillMap[v.iso]) fillMap[v.iso] = 'visited'; });
  return (
    <PrPhoneFrame>
      <div className="pr-screen" style={{ overflow: 'visible', height: 'auto' }}>
        <div className="pr-nav">
          <span style={{ color: '#fff', fontSize: '1.2rem' }}>‹</span>
          <span style={{ color: '#fff', fontWeight: 700, flex: 1, textAlign: 'center', fontSize: '.95rem' }}>My Profile</span>
          <span style={{ color: '#fff', fontSize: '1rem' }}>⚙</span>
        </div>
        <div className="pr-main">
          <div className="pr-profile-hero">
            <div className="pr-profile-avatar" style={{ width: 72, height: 72, fontSize: '1.8rem' }}>A</div>
            <div className="pr-profile-name" style={{ fontSize: '1.3rem' }}>Alex Petrov</div>
            <div className="pr-profile-handle">@alex_traveller</div>
            <div className="pr-profile-meta" style={{ justifyContent: 'center', gap: 14 }}>
              <div className="pr-profile-meta-item"><strong>2</strong><span>Pass.</span></div>
              <div className="pr-profile-meta-item"><strong>14</strong><span>Visited</span></div>
              <div className="pr-profile-meta-item"><strong>137</strong><span>VF</span></div>
            </div>
          </div>
          <div className="pr-map-wrap pr-mb-12">
            <strong style={{ fontSize: '.85rem' }}>My Visa Map</strong>
            <PrWorldMap fillMap={fillMap} />
          </div>
          <div className="pr-panel pr-mb-12">
            <div className="pr-panel-h"><span>My Passports</span><span className="pr-panel-action">＋</span></div>
            {[window.PR_PASSPORTS.find(p => p.iso === 'RU'), window.PR_PASSPORTS.find(p => p.iso === 'TR')].map(p => (
              <div className="pr-passport-mini" key={p.iso}>
                <span className="flag">{p.flag}</span>
                <div className="info">
                  <b>{p.name}</b>
                  <i>#{p.rank} · {p.total}</i>
                </div>
              </div>
            ))}
          </div>
          <div className="pr-panel">
            <div className="pr-panel-h"><span>Visited</span><span className="pr-panel-action">＋</span></div>
            <div className="pr-country-chips">
              {window.PR_VISITED.slice(0, 8).map(v => (
                <span className="pr-country-chip" key={v.iso}><span>{v.flag}</span> {v.name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PrPhoneFrame>
  );
};

const MobileAuth = () => (
  <PrPhoneFrame>
    <div className="pr-screen" style={{ overflow: 'visible', height: 'auto', minHeight: '100%' }}>
      <div style={{ background: 'linear-gradient(135deg, var(--c-hero), var(--c-hero2))', padding: '40px 20px 32px', color: '#fff', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <div className="pr-logo-icon">🌐</div>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>PassportRank</span>
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, marginTop: 24, letterSpacing: '-.02em' }}>
          Welcome<br/>back<span style={{ background: 'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>.</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '.85rem', marginTop: 8 }}>Sign in to your collection</p>
      </div>
      <div style={{ padding: '20px 18px', background: '#fff', borderRadius: '20px 20px 0 0', marginTop: -16, position: 'relative' }}>
        <div className="pr-auth-tabs">
          <button className="pr-auth-tab active">Sign In</button>
          <button className="pr-auth-tab">Register</button>
        </div>
        <div className="pr-field">
          <label className="pr-field-label">Username</label>
          <input className="pr-input" defaultValue="alex_traveller" />
        </div>
        <div className="pr-field">
          <label className="pr-field-label">Password</label>
          <input className="pr-input" type="password" defaultValue="••••••••" />
        </div>
        <button className="pr-btn full" style={{ marginTop: 8 }}>Sign In</button>
        <div style={{ textAlign: 'center', margin: '14px 0 10px', fontSize: '.78rem', color: 'var(--c-muted)' }}>or</div>
        <button className="pr-btn ghost full" style={{ marginBottom: 8 }}>Continue with Google</button>
        <button className="pr-btn ghost full">Continue with Apple</button>
      </div>
    </div>
  </PrPhoneFrame>
);

window.MobileHome = MobileHome;
window.MobilePassport = MobilePassport;
window.MobileProfile = MobileProfile;
window.MobileAuth = MobileAuth;
