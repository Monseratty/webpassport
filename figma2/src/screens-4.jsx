/* Screen 7 — Privacy Settings (toggle what's visible on public profile) */
const ScreenPrivacy = () => {
  const [s, setS] = React.useState({
    passports: true,
    visa_map: true,
    visited: false,
    visit_count: false,
    join_date: true,
    rank_stats: true,
    location: false,
  });
  const t = (k) => setS(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="pr-screen">
      <PrNav active="profile" loggedIn user="Alex" />
      <div className="pr-main" style={{ maxWidth: 760 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', color: 'var(--c-muted)', marginBottom: 16 }}>
          <span>Profile</span><span>›</span><span style={{ color: 'var(--c-text)', fontWeight: 600 }}>Privacy Settings</span>
        </div>
        <h2 className="pr-section-title">Privacy Settings</h2>
        <p className="pr-section-sub">Control what appears on your <a style={{ color: 'var(--c-accent)', fontWeight: 600 }}>public profile</a>. Changes save automatically.</p>

        <div className="pr-panel pr-mb-12">
          <div className="pr-panel-h"><span>Public link</span></div>
          <div className="pr-row" style={{ background: 'var(--c-bg)', padding: 12, borderRadius: 8, border: '1px dashed var(--c-border)' }}>
            <span style={{ fontSize: '.9rem', flex: 1, fontFamily: 'monospace', color: 'var(--c-muted)' }}>passportrank.app/u/alex_traveller</span>
            <button className="pr-btn ghost" style={{ padding: '6px 14px', fontSize: '.82rem' }}>Copy</button>
            <button className="pr-btn" style={{ padding: '6px 14px', fontSize: '.82rem' }}>Open</button>
          </div>
        </div>

        <div className="pr-panel pr-mb-12">
          <div className="pr-panel-h"><span>What others can see</span></div>
          {[
            ['passports',     'My passports',          'Show the passports you own and their rank'],
            ['visa_map',      'Visa map',              'Show the combined access map from your passports'],
            ['visited',       'Visited countries',     'Show countries and territories you have visited'],
            ['visit_count',   'Visit counter',         'Show the total number of countries you have visited'],
            ['join_date',     'Join date',             'Show when you joined PassportRank'],
            ['rank_stats',    'Best rank & stats',     'Show your highest passport rank and visa-free count'],
            ['location',      'Home city',             'Show your declared home city under your name'],
          ].map(([k, title, desc]) => (
            <div className="pr-priv-row" key={k}>
              <div className="pr-priv-info">
                <b>{title}</b>
                <span>{desc}</span>
              </div>
              <div className="pr-row" style={{ gap: 12 }}>
                <span className={'pr-vis-pill ' + (s[k] ? 'pr-vis-public' : 'pr-vis-hidden')}>
                  {s[k] ? '👁 Public' : '🔒 Hidden'}
                </span>
                <div className={'pr-toggle' + (s[k] ? ' on' : '')} onClick={() => t(k)}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="pr-panel" style={{ borderColor: 'var(--vr-b)' }}>
          <div className="pr-panel-h"><span style={{ color: 'var(--vr)' }}>Danger zone</span></div>
          <div className="pr-spread">
            <div>
              <b style={{ display: 'block', fontWeight: 600 }}>Make profile fully private</b>
              <span style={{ fontSize: '.82rem', color: 'var(--c-muted)' }}>Public link will show only your username</span>
            </div>
            <button className="pr-btn danger">Make private</button>
          </div>
        </div>
      </div>
      <PrFooter />
    </div>
  );
};

/* Screen 8 — Add passport / country (modal-style centered) */
const ScreenAddPassport = () => {
  const popular = ['JP','SG','DE','FR','GB','US','CA','AU','BR','AE','TR','RU'];
  return (
    <div className="pr-screen" style={{ background: 'rgba(11,18,32,.55)' }}>
      <PrNav active="profile" loggedIn user="Alex" />
      <div className="pr-main" style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 640, overflow: 'hidden' }}>
          <div style={{ padding: '28px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-.02em' }}>Add a passport</div>
              <div style={{ fontSize: '.88rem', color: 'var(--c-muted)', marginTop: 4 }}>Linked passports power your personal visa map.</div>
            </div>
            <button style={{ background: 'rgba(0,0,0,.06)', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', color: 'var(--c-muted)' }}>✕</button>
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--c-border)', padding: '0 32px', marginTop: 20 }}>
            <button className="pr-auth-tab active" style={{ flex: 'none', padding: '12px 20px' }}>🛂 Passport</button>
            <button className="pr-auth-tab" style={{ flex: 'none', padding: '12px 20px' }}>🌍 Visited country</button>
          </div>

          <div style={{ padding: '24px 32px 28px' }}>
            <div className="pr-field">
              <label className="pr-field-label">Search by country or ISO code</label>
              <div className="pr-input" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ opacity: .5 }}>🔍</span>
                <span style={{ flex: 1, color: 'var(--c-muted)' }}>e.g. Japan, JPN, Türkiye…</span>
              </div>
            </div>

            <div className="pr-field-label" style={{ marginTop: 18 }}>Popular passports</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
              {popular.map(iso => {
                const p = window.PR_PASSPORTS.find(x => x.iso === iso);
                if (!p) return null;
                const sel = iso === 'JP';
                return (
                  <div key={iso} style={{
                    border: sel ? '2px solid var(--c-accent)' : '1px solid var(--c-border)',
                    borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: sel ? 'rgba(37,99,235,.05)' : '#fff',
                  }}>
                    <span style={{ fontSize: '1.6rem' }}>{p.flag}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '.82rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--c-muted)' }}>#{p.rank} · {p.total}</div>
                    </div>
                    {sel ? <span style={{ color: 'var(--c-accent)', fontWeight: 700 }}>✓</span> : null}
                  </div>
                );
              })}
            </div>

            <div style={{ background: 'var(--c-bg)', padding: 16, borderRadius: 10, marginBottom: 20 }}>
              <div className="pr-row" style={{ gap: 14 }}>
                <span style={{ fontSize: '2.2rem' }}>🇯🇵</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>Japan · selected</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--c-muted)' }}>Rank #1 · 193 destinations · ISO short: JP / JPN</div>
                </div>
                <span className="pr-chip pr-chip-vf">Top tier</span>
              </div>
            </div>

            <div className="pr-row" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <button className="pr-btn ghost">Cancel</button>
              <button className="pr-btn">＋ Add to my passports</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.ScreenPrivacy = ScreenPrivacy;
window.ScreenAddPassport = ScreenAddPassport;
