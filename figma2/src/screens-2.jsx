/* Screen 3 — Compare two passports w/ table & dual map */
const ScreenCompare = () => {
  const a = window.PR_PASSPORTS.find(x => x.iso === 'JP');
  const b = window.PR_PASSPORTS.find(x => x.iso === 'US');
  const fillA = { ...window.PR_STACK_FILL, JP: 'own' };
  const fillB = { US: 'own', GB:'vf', FR:'vf', DE:'vf', JP:'vf', KR:'vf', SG:'vf', AU:'vf', NZ:'vf', CA:'vf', MX:'vf', BR:'vf', AR:'vf', CL:'vf', PE:'vf', CO:'vf', ZA:'vf', AE:'voa', EG:'voa', KE:'voa', NG:'voa', TR:'ev', IN:'ev', VN:'ev', SA:'ev', RU:'vr', CN:'vr', IR:'vr' };
  const Row = ({ label, va, vb, color }) => (
    <tr className={va > vb ? 'pr-cmp-winner-row' : ''}>
      <td style={{ fontWeight: 600 }}>{label}</td>
      <td><div className="pr-cmp-cell"><strong style={{ width: 36 }}>{va}</strong><div className="pr-cmp-bar"><div style={{ width: (va/195*100)+'%', background: color }}></div></div></div></td>
      <td><div className="pr-cmp-cell"><strong style={{ width: 36 }}>{vb}</strong><div className="pr-cmp-bar"><div style={{ width: (vb/195*100)+'%', background: color }}></div></div></div></td>
      <td style={{ fontWeight: 700, color: va === vb ? 'var(--c-muted)' : (va > vb ? 'var(--vf)' : 'var(--vr)') }}>
        {va === vb ? '—' : (va > vb ? '+' : '−') + Math.abs(va - vb)}
      </td>
    </tr>
  );
  return (
    <div className="pr-screen">
      <PrNav active="compare" loggedIn user="Alex" />
      <div className="pr-main">
        <h2 className="pr-section-title">Compare Passports</h2>
        <p className="pr-section-sub">Select two passports to see a side-by-side breakdown of visa power.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 16, alignItems: 'end', background: '#fff', padding: 20, border: '1px solid var(--c-border)', borderRadius: 12, marginBottom: 24 }}>
          <div>
            <div className="pr-field-label">Passport A</div>
            <div className="pr-input" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <span style={{ fontSize: '1.4rem' }}>{a.flag}</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{a.name}</span>
              <span style={{ color: 'var(--c-muted)', fontSize: '.8rem' }}>▾</span>
            </div>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-muted)', paddingBottom: 12 }}>VS</div>
          <div>
            <div className="pr-field-label">Passport B</div>
            <div className="pr-input" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <span style={{ fontSize: '1.4rem' }}>{b.flag}</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{b.name}</span>
              <span style={{ color: 'var(--c-muted)', fontSize: '.8rem' }}>▾</span>
            </div>
          </div>
          <button className="pr-btn">Compare</button>
        </div>

        <div style={{ background: 'linear-gradient(135deg, var(--c-hero), var(--c-hero2))', color: '#fff', padding: 20, borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="pr-row" style={{ gap: 18 }}>
            <span style={{ fontSize: '2rem' }}>{a.flag}</span>
            <span style={{ fontWeight: 700 }}>{a.name}</span>
            <span style={{ color: 'rgba(255,255,255,.5)', fontSize: '.85rem' }}>vs</span>
            <span style={{ fontSize: '2rem' }}>{b.flag}</span>
            <span style={{ fontWeight: 700 }}>{b.name}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Winner</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>🇯🇵 Japan · +{a.total - b.total} destinations</div>
          </div>
        </div>

        <table className="pr-cmp-table" style={{ marginBottom: 24 }}>
          <thead><tr><th style={{ width: '20%' }}>Category</th><th>{a.flag} {a.name}</th><th>{b.flag} {b.name}</th><th style={{ width: 80 }}>Diff</th></tr></thead>
          <tbody>
            <Row label="Total Destinations" va={a.total} vb={b.total} color="linear-gradient(90deg,#2563eb,#7c3aed)" />
            <Row label="Visa Free"          va={a.vf}    vb={b.vf}    color="#16a34a" />
            <Row label="Visa on Arrival"    va={a.voa}   vb={b.voa}   color="#2563eb" />
            <Row label="E-Visa"             va={a.ev}    vb={b.ev}    color="#eab308" />
            <Row label="Visa Required"      va={a.vr}    vb={b.vr}    color="#dc2626" />
            <tr>
              <td style={{ fontWeight: 600 }}>Global Rank</td>
              <td><strong>#{a.rank}</strong></td>
              <td><strong>#{b.rank}</strong></td>
              <td style={{ fontWeight: 700, color: 'var(--vf)' }}>—</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="pr-map-wrap">
            <div className="pr-spread" style={{ marginBottom: 12 }}>
              <strong>{a.flag} {a.name}</strong>
              <span style={{ fontSize: '.78rem', color: 'var(--c-muted)' }}>{a.total} destinations</span>
            </div>
            <PrWorldMap fillMap={fillA} />
          </div>
          <div className="pr-map-wrap">
            <div className="pr-spread" style={{ marginBottom: 12 }}>
              <strong>{b.flag} {b.name}</strong>
              <span style={{ fontSize: '.78rem', color: 'var(--c-muted)' }}>{b.total} destinations</span>
            </div>
            <PrWorldMap fillMap={fillB} />
          </div>
        </div>
      </div>
      <PrFooter />
    </div>
  );
};

/* Screen 4 — Auth (Sign In / Register) split view */
const ScreenAuth = () => (
  <div className="pr-screen">
    <PrNav />
    <div className="pr-auth-shell" style={{ minHeight: 'calc(100% - 64px - 60px)' }}>
      <div className="pr-auth-side">
        <div className="pr-row" style={{ gap: 10 }}>
          <div className="pr-logo-icon" style={{ background: 'rgba(255,255,255,.15)' }}>🌐</div>
          <span style={{ fontWeight: 700 }}>PassportRank</span>
        </div>
        <div>
          <div className="pr-auth-quote">
            Your personal<br/>passport <em>collection</em>,<br/>visualized.
          </div>
          <p style={{ color: 'rgba(255,255,255,.6)', marginTop: 16, fontSize: '.95rem', maxWidth: 360 }}>
            Track every passport you hold, every country you've visited, and discover where you can travel — all in one place.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 14, color: 'rgba(255,255,255,.4)', fontSize: '.8rem' }}>
          <span>🌍 199 countries</span>
          <span>·</span>
          <span>🛂 Live visa data</span>
          <span>·</span>
          <span>🔒 Private profiles</span>
        </div>
      </div>
      <div className="pr-auth-form-side">
        <div style={{ width: '100%', maxWidth: 380, margin: '0 auto' }}>
          <div className="pr-auth-tabs">
            <button className="pr-auth-tab active">Sign In</button>
            <button className="pr-auth-tab">Register</button>
          </div>
          <h3 className="pr-auth-h">Welcome back</h3>
          <p className="pr-auth-sub">Sign in to manage your passports and travel history.</p>
          <div className="pr-field">
            <label className="pr-field-label">Username</label>
            <input className="pr-input" defaultValue="alex_traveller" />
          </div>
          <div className="pr-field">
            <label className="pr-field-label">Password</label>
            <input className="pr-input" type="password" defaultValue="••••••••••" />
          </div>
          <div className="pr-spread" style={{ marginBottom: 18, fontSize: '.82rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--c-muted)' }}>
              <input type="checkbox" defaultChecked /> Remember me
            </label>
            <a style={{ color: 'var(--c-accent)', fontWeight: 600 }}>Forgot password?</a>
          </div>
          <button className="pr-btn full">Sign In</button>
          <div style={{ textAlign: 'center', margin: '20px 0', fontSize: '.82rem', color: 'var(--c-muted)' }}>or continue with</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="pr-btn ghost">Google</button>
            <button className="pr-btn ghost">GitHub</button>
          </div>
        </div>
      </div>
    </div>
    <PrFooter />
  </div>
);

window.ScreenCompare = ScreenCompare;
window.ScreenAuth = ScreenAuth;
