/* Shared UI atoms for PassportRank screens */

const PASSPORTS = [
  { iso: 'JP', name: 'Japan',          flag: '🇯🇵', rank: 1, total: 193, vf: 168, voa: 14, ev: 6,  vr: 30 },
  { iso: 'SG', name: 'Singapore',      flag: '🇸🇬', rank: 1, total: 193, vf: 165, voa: 17, ev: 5,  vr: 31 },
  { iso: 'DE', name: 'Germany',        flag: '🇩🇪', rank: 2, total: 192, vf: 170, voa: 12, ev: 4,  vr: 32 },
  { iso: 'IT', name: 'Italy',          flag: '🇮🇹', rank: 2, total: 192, vf: 169, voa: 13, ev: 4,  vr: 32 },
  { iso: 'FR', name: 'France',         flag: '🇫🇷', rank: 3, total: 191, vf: 168, voa: 13, ev: 4,  vr: 33 },
  { iso: 'ES', name: 'Spain',          flag: '🇪🇸', rank: 3, total: 191, vf: 167, voa: 14, ev: 4,  vr: 33 },
  { iso: 'NL', name: 'Netherlands',    flag: '🇳🇱', rank: 4, total: 190, vf: 167, voa: 13, ev: 4,  vr: 34 },
  { iso: 'AT', name: 'Austria',        flag: '🇦🇹', rank: 4, total: 190, vf: 166, voa: 14, ev: 4,  vr: 34 },
  { iso: 'GB', name: 'United Kingdom', flag: '🇬🇧', rank: 5, total: 189, vf: 162, voa: 16, ev: 5,  vr: 35 },
  { iso: 'US', name: 'United States',  flag: '🇺🇸', rank: 6, total: 188, vf: 159, voa: 17, ev: 5,  vr: 36 },
  { iso: 'CA', name: 'Canada',         flag: '🇨🇦', rank: 6, total: 188, vf: 158, voa: 18, ev: 5,  vr: 36 },
  { iso: 'AU', name: 'Australia',      flag: '🇦🇺', rank: 6, total: 188, vf: 157, voa: 19, ev: 5,  vr: 36 },
  { iso: 'BR', name: 'Brazil',         flag: '🇧🇷', rank: 17, total: 173, vf: 134, voa: 24, ev: 8, vr: 51 },
  { iso: 'AE', name: 'UAE',            flag: '🇦🇪', rank: 11, total: 184, vf: 152, voa: 22, ev: 6, vr: 40 },
  { iso: 'TR', name: 'Türkiye',        flag: '🇹🇷', rank: 49, total: 124, vf:  78, voa: 30, ev: 12, vr: 100 },
  { iso: 'RU', name: 'Russia',         flag: '🇷🇺', rank: 50, total: 119, vf:  74, voa: 28, ev: 14, vr: 105 },
  { iso: 'CN', name: 'China',          flag: '🇨🇳', rank: 62, total: 88,  vf:  44, voa: 30, ev: 11, vr: 136 },
  { iso: 'IN', name: 'India',          flag: '🇮🇳', rank: 80, total: 60,  vf:  26, voa: 26, ev:  8, vr: 164 },
];

const VISITED = [
  { iso: 'FR', name: 'France',     flag: '🇫🇷' },
  { iso: 'IT', name: 'Italy',      flag: '🇮🇹' },
  { iso: 'JP', name: 'Japan',      flag: '🇯🇵' },
  { iso: 'TH', name: 'Thailand',   flag: '🇹🇭' },
  { iso: 'GR', name: 'Greece',     flag: '🇬🇷' },
  { iso: 'TR', name: 'Türkiye',    flag: '🇹🇷' },
  { iso: 'PT', name: 'Portugal',   flag: '🇵🇹' },
  { iso: 'AE', name: 'UAE',        flag: '🇦🇪' },
  { iso: 'GE', name: 'Georgia',    flag: '🇬🇪' },
  { iso: 'RS', name: 'Serbia',     flag: '🇷🇸' },
  { iso: 'ME', name: 'Montenegro', flag: '🇲🇪' },
  { iso: 'EG', name: 'Egypt',      flag: '🇪🇬' },
  { iso: 'GP', name: 'Guadeloupe (FR)', flag: '🇬🇵' },
  { iso: 'PF', name: 'French Polynesia', flag: '🇵🇫' },
];

/* Sample destination list for /stack visualization */
const STACK_FILL = {
  // visa free (greens)
  GB:'vf', FR:'vf', DE:'vf', IT:'vf', ES:'vf', PT:'vf', NL:'vf', AT:'vf',
  PL:'vf', SE:'vf', NO:'vf', FI:'vf', GR:'vf', RO:'vf', UA:'vf', IE:'vf',
  CH:'vf', JP:'vf', KR:'vf', SG:'vf', MY:'vf', TH:'vf', PH:'vf', ID:'vf',
  MX:'vf', BR:'vf', AR:'vf', CL:'vf', PE:'vf', CO:'vf', CU:'vf', JM:'vf', DO:'vf',
  ZA:'vf', MA:'vf', AE:'vf', TR:'vf', NZ:'vf', AU:'vf',
  // visa on arrival (blue)
  EG:'voa', KE:'voa', TZ:'voa', NG:'voa', GH:'voa', SN:'voa', ET:'voa', AO:'voa',
  // electronic permit (yellow)
  US:'ev', CA:'ev', VN:'ev', IN:'ev', PK:'ev', SA:'ev',
  // visa required (red)
  CN:'vr', RU:'vr', IR:'vr', IQ:'vr', DZ:'vr',
  // own
  // (filled per profile)
};

window.PR_PASSPORTS = PASSPORTS;
window.PR_VISITED = VISITED;
window.PR_STACK_FILL = STACK_FILL;

/* ─── Reusable atoms ──────────────────────────────────────── */
const PrNav = ({ active = 'rankings', loggedIn = false, user = 'Alex' }) => (
  <div className="pr-nav">
    <div className="pr-nav-logo">
      <div className="pr-logo-icon">🌐</div>
      <span>PassportRank</span>
    </div>
    <div className="pr-nav-links">
      <span className={'pr-nav-link' + (active === 'rankings' ? ' active' : '')}>Rankings</span>
      <span className={'pr-nav-link' + (active === 'compare'  ? ' active' : '')}>Compare</span>
      <span className={'pr-nav-link' + (active === 'profile'  ? ' active' : '')}>My Profile</span>
    </div>
    {loggedIn ? (
      <div className="pr-user-chip">
        <div className="pr-user-avatar">{user[0]}</div>
        {user}
      </div>
    ) : (
      <button className="pr-btn-signin">Sign In</button>
    )}
  </div>
);

const PrFooter = () => (
  <div className="pr-footer">
    <span className="pr-footer-logo">🌐 PassportRank</span>
    <span>© 2026 — Global Passport Power Index</span>
  </div>
);

const PrCard = ({ p, featured = false }) => {
  const pct = Math.round((p.total / 195) * 100);
  return (
    <div className={'pr-card' + (featured ? ' featured' : '')}>
      <div className="pr-card-rank">
        <span className="pr-rank-num">{p.rank}</span>
        Rank
      </div>
      <span className="pr-card-flag">{p.flag}</span>
      <div className="pr-card-name">{p.name}</div>
      <div className="pr-card-iso">{p.iso}</div>
      <div className="pr-card-score">
        <span className="pr-score-num">{p.total}</span>
        <span className="pr-score-lbl">destinations</span>
      </div>
      <div className="pr-bar"><div className="pr-bar-fill" style={{ width: pct + '%' }}></div></div>
      <div className="pr-chips">
        {p.vf  ? <span className="pr-chip pr-chip-vf">VF {p.vf}</span> : null}
        {p.voa ? <span className="pr-chip pr-chip-voa">VoA {p.voa}</span> : null}
        {p.ev  ? <span className="pr-chip pr-chip-ev">eV {p.ev}</span> : null}
        {p.vr  ? <span className="pr-chip pr-chip-vr">VR {p.vr}</span> : null}
      </div>
    </div>
  );
};

window.PrNav = PrNav;
window.PrFooter = PrFooter;
window.PrCard = PrCard;
