/* ─── Config ────────────────────────────────────────────────── */
const API = 'http://localhost:5097';

/* ─── Helpers ───────────────────────────────────────────────── */

function flag(iso) {
  if (!iso || iso.length !== 2) return '🏳';
  return [...iso.toUpperCase()].map(c =>
    String.fromCodePoint(c.charCodeAt(0) + 127397)
  ).join('');
}

function normalize(item) {
  /* Accept any reasonable shape the backend might return */
  const iso   = (item.iso || item.isoShortCode || item.code || item.country || '').toUpperCase();
  const name  = item.name || item.countryName || item.country || iso;
  const rank  = item.rank || item.globalRank || 0;
  const vf    = item.visaFree   ?? item.vf   ?? item.visa_free   ?? 0;
  const voa   = item.visaOnArrival ?? item.voa ?? item.visa_on_arrival ?? 0;
  const ev    = item.eVisa      ?? item.ev    ?? item.e_visa      ?? 0;
  const vr    = item.visaRequired ?? item.vr  ?? item.visa_required ?? 0;
  const total = vf + voa + ev + vr || item.mobility || item.score || item.total || 0;
  return { iso, name, rank, vf, voa, ev, vr, total };
}

async function apiFetch(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/* ─── State ─────────────────────────────────────────────────── */
const state = {
  raw: [],          // normalized passport list
  filtered: [],     // after search
  sort: 'rank',
  layout: 'grid',
  user: null,
  token: null,
};

/* Restore session */
try {
  state.user  = localStorage.getItem('pi_user');
  state.token = localStorage.getItem('pi_token');
} catch(_) {}

/* ─── DOM refs ──────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const rankingsGrid   = $('rankingsGrid');
const searchInput    = $('searchInput');
const searchClear    = $('searchClear');
const authBtn        = $('authBtn');
const passportOverlay = $('passportOverlay');
const passportContent = $('passportContent');
const authOverlay    = $('authOverlay');
const toastWrap      = $('toastWrap');

/* ─── Toast ─────────────────────────────────────────────────── */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  toastWrap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ─── Views ─────────────────────────────────────────────────── */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const view = document.getElementById(`view-${name}`);
  if (view) view.classList.add('active');
  document.querySelector(`[data-view="${name}"]`)?.classList.add('active');
}

/* ─── Render cards ──────────────────────────────────────────── */
const MAX_SCORE = 195; /* ~total countries */

function cardHTML(p) {
  const f = flag(p.iso);
  const pct = Math.round((p.total / MAX_SCORE) * 100);
  return `
    <div class="passport-card" data-iso="${p.iso}">
      <div class="card-rank">
        <span class="card-rank-num">${p.rank || '—'}</span>
      </div>
      <span class="card-flag">${f}</span>
      <div class="card-name">${p.name}</div>
      <div class="card-iso">${p.iso}</div>
      <div class="card-score">
        <span class="score-num">${p.total}</span>
        <span class="score-label">destinations</span>
      </div>
      <div class="card-bar">
        <div class="card-bar-fill" style="width:${pct}%"></div>
      </div>
      <div class="card-chips">
        ${p.vf  ? `<span class="chip chip-vf">VF ${p.vf}</span>` : ''}
        ${p.voa ? `<span class="chip chip-voa">VoA ${p.voa}</span>` : ''}
        ${p.ev  ? `<span class="chip chip-ev">eV ${p.ev}</span>` : ''}
        ${p.vr  ? `<span class="chip chip-vr">VR ${p.vr}</span>` : ''}
      </div>
    </div>`;
}

function rowHTML(p) {
  const f = flag(p.iso);
  const pct = Math.round((p.total / MAX_SCORE) * 100);
  return `
    <div class="passport-row" data-iso="${p.iso}">
      <div class="row-rank">${p.rank || '—'}</div>
      <div class="row-flag">${f}</div>
      <div class="row-info">
        <div class="row-name">${p.name}</div>
        <div class="row-iso">${p.iso}</div>
      </div>
      <div class="row-bar-wrap">
        <div class="row-bar"><div class="row-bar-fill" style="width:${pct}%"></div></div>
        <div class="row-score">${p.total} destinations</div>
      </div>
      <div class="row-chips">
        ${p.vf  ? `<span class="chip chip-vf">VF ${p.vf}</span>` : ''}
        ${p.voa ? `<span class="chip chip-voa">VoA ${p.voa}</span>` : ''}
      </div>
    </div>`;
}

function renderGrid() {
  if (!state.filtered.length) {
    rankingsGrid.innerHTML = `
      <div class="empty-state">
        <span>🔍</span>
        <p>No passports found for "<strong>${searchInput.value}</strong>"</p>
      </div>`;
    return;
  }

  const isList = state.layout === 'list';
  rankingsGrid.className = `rankings-grid${isList ? ' list-mode' : ''}`;
  rankingsGrid.innerHTML = state.filtered
    .map(p => isList ? rowHTML(p) : cardHTML(p))
    .join('');

  /* click to open detail */
  rankingsGrid.querySelectorAll('[data-iso]').forEach(el => {
    el.addEventListener('click', () => openPassport(el.dataset.iso));
  });
}

/* ─── Sort & filter ─────────────────────────────────────────── */
function applyFilter() {
  const q = searchInput.value.trim().toLowerCase();
  state.filtered = q
    ? state.raw.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.iso.toLowerCase().includes(q))
    : [...state.raw];

  applySort();
}

function applySort() {
  const s = state.sort;
  state.filtered.sort((a, b) => {
    if (s === 'rank')  return (a.rank || 999) - (b.rank || 999);
    if (s === 'name')  return a.name.localeCompare(b.name);
    if (s === 'vf')    return b.vf - a.vf;
    return 0;
  });
  renderGrid();
}

/* ─── Load data ─────────────────────────────────────────────── */
async function loadRankings() {
  rankingsGrid.innerHTML = `
    <div class="loader-state">
      <div class="spinner"></div>
      <p>Loading passport data…</p>
    </div>`;

  let data = [];

  /* Try endpoints in order of preference */
  const endpoints = ['/rank', '/stack', '/passport', '/'];
  for (const ep of endpoints) {
    try {
      const res = await apiFetch(ep);
      const arr = Array.isArray(res) ? res : (res.data || res.passports || res.ranks || []);
      if (arr.length) { data = arr; break; }
    } catch(_) {}
  }

  /* Fallback: load all countries, then fetch individual passports */
  if (!data.length) {
    try {
      const countries = await apiFetch('/country');
      const arr = Array.isArray(countries) ? countries : [];
      data = arr.slice(0, 30); /* limit for performance */
    } catch(_) {}
  }

  if (!data.length) {
    rankingsGrid.innerHTML = `
      <div class="empty-state">
        <span>⚠️</span>
        <p>Could not load data. Make sure the API is running on <code>${API}</code></p>
      </div>`;
    return;
  }

  state.raw = data.map(normalize).filter(p => p.iso);
  updateHeroStats();
  populateCompareSelects();
  applyFilter();
}

/* ─── Hero stats ────────────────────────────────────────────── */
function updateHeroStats() {
  const sorted  = [...state.raw].sort((a,b) => b.total - a.total);
  const leader  = sorted[0];
  $('statCountries').textContent = state.raw.length;
  $('statTop').textContent       = leader ? leader.total : '—';
  $('statLeader').textContent    = leader ? leader.name  : '—';
}

/* ─── Passport Detail Modal ─────────────────────────────────── */
async function openPassport(iso) {
  passportContent.innerHTML = `
    <div class="loader-state" style="padding:60px 0">
      <div class="spinner"></div><p>Loading passport details…</p>
    </div>`;
  passportOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  let detail = null;
  try {
    detail = await apiFetch(`/passport/${iso}`);
  } catch(_) {
    try { detail = await apiFetch(`/passport?iso=${iso}`); } catch(_) {}
  }

  /* Local fallback from state.raw */
  const local = state.raw.find(p => p.iso === iso) || {};
  const merged = { ...local, ...(detail ? normalize(detail) : {}) };

  /* Destination list: try to extract from detail response */
  let destinations = [];
  if (detail) {
    destinations = detail.destinations || detail.access || detail.countries || [];
  }

  renderPassportDetail(merged, destinations);
}

const ACCESS_LABEL = {
  'visa-free': 'Visa Free',     'vf': 'Visa Free',
  'visa-on-arrival': 'Visa on Arrival', 'voa': 'Visa on Arrival',
  'e-visa': 'E-Visa',           'ev': 'E-Visa',
  'visa-required': 'Visa Required', 'vr': 'Visa Required',
  'no-admission': 'No Admission', 'na': 'No Admission',
};

const ACCESS_CLASS = {
  'visa-free': 'vf',  'vf': 'vf',
  'visa-on-arrival': 'voa', 'voa': 'voa',
  'e-visa': 'ev', 'ev': 'ev',
  'visa-required': 'vr', 'vr': 'vr',
  'no-admission': 'na', 'na': 'na',
};

function renderPassportDetail(p, destinations) {
  const f = flag(p.iso);

  /* Group destinations by access type */
  const groups = { vf: [], voa: [], ev: [], vr: [], na: [] };
  destinations.forEach(d => {
    const type = d.type || d.access || d.accessType || 'na';
    const cls  = ACCESS_CLASS[type.toLowerCase()] || 'na';
    groups[cls].push(d);
  });

  /* Use breakdown from local data if no destinations */
  const vfCount  = groups.vf.length  || p.vf  || 0;
  const voaCount = groups.voa.length || p.voa || 0;
  const evCount  = groups.ev.length  || p.ev  || 0;
  const vrCount  = groups.vr.length  || p.vr  || 0;

  passportContent.innerHTML = `
    <div class="detail-hero">
      <div class="detail-flag">${f}</div>
      <div class="detail-info">
        <div class="detail-name">${p.name || p.iso}</div>
        <div class="detail-meta">
          <span class="detail-rank">🏆 Rank #${p.rank || '—'}</span>
          <span class="detail-iso">${p.iso}</span>
        </div>
      </div>
    </div>

    <div class="detail-stats">
      <div class="ds-item ds-vf" data-tab="vf">
        <div class="ds-count">${vfCount}</div>
        <div class="ds-label">Visa Free</div>
      </div>
      <div class="ds-item ds-voa" data-tab="voa">
        <div class="ds-count">${voaCount}</div>
        <div class="ds-label">Visa on Arrival</div>
      </div>
      <div class="ds-item ds-ev" data-tab="ev">
        <div class="ds-count">${evCount}</div>
        <div class="ds-label">E-Visa</div>
      </div>
      <div class="ds-item ds-vr" data-tab="vr">
        <div class="ds-count">${vrCount}</div>
        <div class="ds-label">Visa Required</div>
      </div>
    </div>

    ${destinations.length ? `
    <div class="detail-tabs">
      <button class="detail-tab active" data-tab="vf">Visa Free (${vfCount})</button>
      <button class="detail-tab" data-tab="voa">Visa on Arrival (${voaCount})</button>
      <button class="detail-tab" data-tab="ev">E-Visa (${evCount})</button>
      <button class="detail-tab" data-tab="vr">Visa Required (${vrCount})</button>
    </div>
    <div class="dest-search-wrap">
      <input type="text" class="dest-search" id="destSearch" placeholder="Search destinations…">
    </div>
    <div class="detail-list" id="destList"></div>
    ` : `
    <div style="padding:32px 24px; color: var(--c-muted); text-align:center;">
      <p>Detailed destination data is not available for this passport.<br>
      Score: <strong>${p.total}</strong> accessible destinations.</p>
    </div>
    `}`;

  /* Tab switching */
  let activeTab = 'vf';

  function renderDestList(tab, query = '') {
    const list = document.getElementById('destList');
    if (!list) return;
    const items = groups[tab] || [];
    const q = query.toLowerCase();
    const filtered = q
      ? items.filter(d => (d.name || d.iso || '').toLowerCase().includes(q))
      : items;

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state" style="padding:32px 0;font-size:.875rem">No destinations in this category</div>`;
      return;
    }

    list.innerHTML = filtered.map(d => {
      const dIso  = (d.iso || d.isoShortCode || d.code || '').toUpperCase();
      const dName = d.name || d.countryName || dIso;
      const dType = d.type || d.access || tab;
      const cls   = ACCESS_CLASS[dType.toLowerCase()] || tab;
      const label = ACCESS_LABEL[dType.toLowerCase()] || dType;
      return `
        <div class="dest-item">
          <span class="dest-flag">${flag(dIso)}</span>
          <span class="dest-name">${dName}</span>
          <span class="dest-badge badge-${cls}">${label}</span>
        </div>`;
    }).join('');
  }

  if (destinations.length) {
    renderDestList('vf');

    passportContent.querySelectorAll('.detail-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        passportContent.querySelectorAll('.detail-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab;
        const q = document.getElementById('destSearch')?.value || '';
        renderDestList(activeTab, q);
      });
    });

    passportContent.querySelectorAll('.ds-item[data-tab]').forEach(el => {
      el.addEventListener('click', () => {
        const tab = el.dataset.tab;
        passportContent.querySelectorAll('.detail-tab').forEach(b => {
          b.classList.toggle('active', b.dataset.tab === tab);
        });
        activeTab = tab;
        renderDestList(activeTab);
      });
    });

    const destSearch = document.getElementById('destSearch');
    if (destSearch) {
      destSearch.addEventListener('input', () => {
        renderDestList(activeTab, destSearch.value);
      });
    }
  }
}

function closePassport() {
  passportOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

/* ─── Auth ──────────────────────────────────────────────────── */
function openAuth() { authOverlay.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeAuth() { authOverlay.classList.add('hidden'); document.body.style.overflow = ''; }

function updateAuthBtn() {
  if (state.user) {
    authBtn.textContent = state.user;
    authBtn.classList.add('logged-in');
  } else {
    authBtn.textContent = 'Sign In';
    authBtn.classList.remove('logged-in');
  }
}

async function doLogin() {
  const username = $('loginUser').value.trim();
  const password = $('loginPass').value;
  const err = $('loginErr');
  err.classList.add('hidden');

  if (!username || !password) {
    err.textContent = 'Please fill in all fields.';
    err.classList.remove('hidden');
    return;
  }

  try {
    const r = await fetch(`${API}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!r.ok) {
      const msg = await r.text().catch(() => 'Login failed');
      throw new Error(msg || `Error ${r.status}`);
    }

    const data = await r.json().catch(() => ({}));
    state.user  = username;
    state.token = data.token || data.accessToken || data.jwt || 'ok';
    localStorage.setItem('pi_user',  state.user);
    localStorage.setItem('pi_token', state.token);
    updateAuthBtn();
    closeAuth();
    toast(`Welcome back, ${username}! 👋`, 'success');
  } catch(e) {
    err.textContent = e.message || 'Login failed. Please try again.';
    err.classList.remove('hidden');
  }
}

async function doRegister() {
  const username = $('regUser').value.trim();
  const password = $('regPass').value;
  const err = $('regErr');
  err.classList.add('hidden');

  if (!username || !password) {
    err.textContent = 'Please fill in all fields.';
    err.classList.remove('hidden');
    return;
  }

  if (password.length < 6) {
    err.textContent = 'Password must be at least 6 characters.';
    err.classList.remove('hidden');
    return;
  }

  try {
    const r = await fetch(`${API}/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!r.ok) {
      const msg = await r.text().catch(() => 'Registration failed');
      throw new Error(msg || `Error ${r.status}`);
    }

    toast(`Account created! You can now sign in.`, 'success');

    /* Auto-switch to login tab */
    document.querySelector('.auth-tab[data-tab="login"]').click();
    $('loginUser').value = username;
  } catch(e) {
    err.textContent = e.message || 'Registration failed. Please try again.';
    err.classList.remove('hidden');
  }
}

function doLogout() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('pi_user');
  localStorage.removeItem('pi_token');
  updateAuthBtn();
  toast('Signed out.', 'info');
}

/* ─── Compare ───────────────────────────────────────────────── */
function populateCompareSelects() {
  const options = state.raw
    .sort((a,b) => a.name.localeCompare(b.name))
    .map(p => `<option value="${p.iso}">${flag(p.iso)} ${p.name}</option>`)
    .join('');
  const base = '<option value="">Select country…</option>';
  $('compareA').innerHTML = base + options;
  $('compareB').innerHTML = base + options;
}

function doCompare() {
  const isoA = $('compareA').value;
  const isoB = $('compareB').value;
  const result = $('compareResult');

  if (!isoA || !isoB) { toast('Please select both passports.', 'error'); return; }
  if (isoA === isoB)  { toast('Please select two different passports.', 'error'); return; }

  const a = state.raw.find(p => p.iso === isoA);
  const b = state.raw.find(p => p.iso === isoB);
  if (!a || !b) return;

  const winner = a.total > b.total ? a : b;

  result.classList.remove('hidden');
  result.innerHTML = `
    ${comparePassportHTML(a, b.total)}
    <div class="compare-mid">
      <div class="cmp-mid-vs">VS</div>
      <div class="cmp-winner">
        ${a.total === b.total ? 'Tied!' : `${winner.name} wins by ${Math.abs(a.total - b.total)} destinations`}
      </div>
    </div>
    ${comparePassportHTML(b, a.total)}`;
}

function comparePassportHTML(p, otherTotal) {
  const better = p.total >= otherTotal;
  return `
    <div class="compare-passport">
      <div class="cmp-header">
        <span class="cmp-flag">${flag(p.iso)}</span>
        <div>
          <div class="cmp-name">${p.name}</div>
          <div class="cmp-rank">Rank #${p.rank || '—'} · ${p.total} destinations ${better ? '✓' : ''}</div>
        </div>
      </div>
      <div class="cmp-stats">
        <div class="cmp-stat cmp-stat-vf">
          <span>Visa Free</span><strong>${p.vf}</strong>
        </div>
        <div class="cmp-stat cmp-stat-voa">
          <span>Visa on Arrival</span><strong>${p.voa}</strong>
        </div>
        <div class="cmp-stat cmp-stat-ev">
          <span>E-Visa</span><strong>${p.ev}</strong>
        </div>
        <div class="cmp-stat cmp-stat-vr">
          <span>Visa Required</span><strong>${p.vr}</strong>
        </div>
      </div>
    </div>`;
}

/* ─── Event Listeners ───────────────────────────────────────── */

/* Nav view switching */
document.querySelectorAll('.nav-link[data-view]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    showView(link.dataset.view);
  });
});

$('navLogo').addEventListener('click', e => {
  e.preventDefault();
  showView('rankings');
});

/* Sort tabs */
document.querySelectorAll('.sort-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sort-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.sort = btn.dataset.sort;
    applySort();
  });
});

/* Layout toggle */
document.querySelectorAll('.layout-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.layout = btn.dataset.layout;
    renderGrid();
  });
});

/* Search */
searchInput.addEventListener('input', () => {
  searchClear.classList.toggle('hidden', !searchInput.value);
  applyFilter();
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.add('hidden');
  applyFilter();
  searchInput.focus();
});

/* Passport modal */
$('passportClose').addEventListener('click', closePassport);
passportOverlay.addEventListener('click', e => {
  if (e.target === passportOverlay) closePassport();
});

/* Auth modal */
authBtn.addEventListener('click', () => {
  if (state.user) {
    if (confirm(`Sign out from ${state.user}?`)) doLogout();
  } else {
    openAuth();
  }
});

$('authClose').addEventListener('click', closeAuth);
authOverlay.addEventListener('click', e => {
  if (e.target === authOverlay) closeAuth();
});

/* Auth tabs */
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`form${tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)}`).classList.add('active');
  });
});

$('btnLogin').addEventListener('click', doLogin);
$('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

$('btnRegister').addEventListener('click', doRegister);
$('regPass').addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });

/* Compare */
$('btnCompare').addEventListener('click', doCompare);

/* Keyboard: close modals on Escape */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closePassport();
    closeAuth();
  }
});

/* ─── Init ──────────────────────────────────────────────────── */
updateAuthBtn();
loadRankings();
