const API = 'https://webapppassport.fly.dev';
const MAX_SCORE = 179;
const POPULAR_ISOS = ['SG','DE','JP','GB','FR','IT','ES','US','CA','AU','NZ','CH','SE','NO','DK','FI','NL','AT','BE','LU','PT','KR','UAE','BR','MX'];

const JVM_COLORS = {
  vf: '#16a34a',
  voa: '#2563eb',
  ev: '#eab308',
  vr: '#dc2626',
  own: '#064e3b',
  visited: '#7c3aed',
  default: '#e5e7eb',
};

function flag(iso) {
  if (!iso || iso.length !== 2) return '🏳️';
  const base = 0x1F1E6 - 65;
  return String.fromCodePoint(base + iso.toUpperCase().charCodeAt(0)) +
         String.fromCodePoint(base + iso.toUpperCase().charCodeAt(1));
}

function norm(s) {
  return (s || '').toLowerCase().trim();
}

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const res = await fetch(API + path, { headers, ...opts });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || res.statusText);
  }
  return res.json();
}

const state = {
  passports: [],
  filtered: [],
  sort: 'rank',
  layout: 'grid',
  user: null,
  token: null,
  myPassports: [],
  visitedCountries: [],
  privacy: {
    passports: true,
    visaMap: true,
    visitedCountries: true,
    visitCounter: true,
    joinDate: true,
    bestStats: true,
    homeCity: false,
  },
  activeMap: null,
  activeMapB: null,
  detailData: null,
  activeDestFilter: 'Visa free',
  modalMode: 'passport',
  modalSelected: null,
  authMode: 'login',
};

let jvmLoaded = false;
let jvmPromise = null;

function loadJVM() {
  if (jvmLoaded) return Promise.resolve();
  if (jvmPromise) return jvmPromise;
  jvmPromise = new Promise((resolve, reject) => {
    const check = () => {
      if (typeof jsVectorMap !== 'undefined' && jsVectorMap.maps && jsVectorMap.maps.world) {
        jvmLoaded = true;
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
    setTimeout(() => reject(new Error('jsvectormap load timeout')), 10000);
  });
  return jvmPromise;
}

function destroyActiveMap() {
  if (state.activeMap) {
    try { state.activeMap.destroy(); } catch(e) {}
    state.activeMap = null;
  }
  if (state.activeMapB) {
    try { state.activeMapB.destroy(); } catch(e) {}
    state.activeMapB = null;
  }
}

function initMap(container, fillMap, height) {
  height = height || 380;
  container.innerHTML = '';
  const inner = document.createElement('div');
  inner.style.height = height + 'px';
  inner.style.width = '100%';
  container.appendChild(inner);

  let mapInstance = null;
  try {
    mapInstance = new jsVectorMap({
      selector: inner,
      map: 'world',
      backgroundColor: 'transparent',
      zoomOnScroll: false,
      zoomButtons: false,
      regionStyle: {
        initial: { fill: JVM_COLORS.default, stroke: '#fff', strokeWidth: 0.5 },
        hover: { fill: JVM_COLORS.default, fillOpacity: 0.8 },
      },
      series: { regions: [] },
    });

    if (fillMap && mapInstance.regions) {
      Object.keys(fillMap).forEach(code => {
        const color = fillMap[code];
        const region = mapInstance.regions[code];
        if (region && region.element && region.element.shape && region.element.shape.node) {
          region.element.shape.node.setAttribute('fill', color);
        } else {
          const el = inner.querySelector('[data-code="' + code + '"]');
          if (el) el.setAttribute('fill', color);
        }
      });
    }
  } catch(e) {
    inner.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;font-size:14px;">Map unavailable</div>';
  }

  return mapInstance;
}

function buildFillMap(destinations, ownIso) {
  const fillMap = {};
  const order = ['Visa required', 'ETA', 'Visa on arrival', 'Visa free'];
  order.forEach(type => {
    const list = destinations[type] || [];
    const color = type === 'Visa free' ? JVM_COLORS.vf
                : type === 'Visa on arrival' ? JVM_COLORS.voa
                : type === 'ETA' ? JVM_COLORS.ev
                : JVM_COLORS.vr;
    list.forEach(d => {
      if (d.isoShortCode) fillMap[d.isoShortCode.toUpperCase()] = color;
    });
  });
  if (ownIso) fillMap[ownIso.toUpperCase()] = JVM_COLORS.own;
  return fillMap;
}

function buildCombinedFillMap(passportList) {
  const rank = { 'Visa free': 4, 'Visa on arrival': 3, 'ETA': 2, 'Visa required': 1 };
  const best = {};
  passportList.forEach(p => {
    if (!p.destinations) return;
    Object.keys(p.destinations).forEach(type => {
      const list = p.destinations[type] || [];
      list.forEach(d => {
        const code = (d.isoShortCode || '').toUpperCase();
        if (!code) return;
        if (!best[code] || rank[type] > rank[best[code]]) best[code] = type;
      });
    });
  });
  const fillMap = {};
  Object.keys(best).forEach(code => {
    const type = best[code];
    fillMap[code] = type === 'Visa free' ? JVM_COLORS.vf
                  : type === 'Visa on arrival' ? JVM_COLORS.voa
                  : type === 'ETA' ? JVM_COLORS.ev
                  : JVM_COLORS.vr;
  });
  state.visitedCountries.forEach(c => {
    const code = (c.isoShortCode || '').toUpperCase();
    if (code) fillMap[code] = JVM_COLORS.visited;
  });
  return fillMap;
}

function showToast(msg, type) {
  type = type || 'info';
  const wrap = document.getElementById('toastWrap');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 350);
  }, 3500);
}

function setActiveNavLink(viewName) {
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.view === viewName);
  });
}

function showView(name) {
  destroyActiveMap();
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + name);
  if (el) el.classList.add('active');
  setActiveNavLink(name);
  window.scrollTo(0, 0);
}

function updateAuthState() {
  const chip = document.getElementById('navUserChip');
  const signInBtn = document.getElementById('navSignInBtn');
  const profileLink = document.getElementById('navProfileLink');
  if (state.user) {
    chip.classList.remove('hidden');
    signInBtn.classList.add('hidden');
    document.getElementById('navUserAvatar').textContent = (state.user.username || 'U')[0].toUpperCase();
    document.getElementById('navUserName').textContent = state.user.username || 'User';
    profileLink.classList.remove('hidden');
  } else {
    chip.classList.add('hidden');
    signInBtn.classList.remove('hidden');
  }
}

async function loadRankings() {
  const grid = document.getElementById('rankingsGrid');
  const loader = document.getElementById('rankingsLoader');
  const empty = document.getElementById('rankingsEmpty');
  grid.innerHTML = '';
  loader.style.display = 'flex';
  empty.classList.add('hidden');

  try {
    const data = await apiFetch('/rank');
    const passports = (data.passports || []).map(p => ({
      name: p.name,
      iso: p.isoShortCode,
      rank: p.worldRank,
      total: p.mobilityScore,
      vf: 0, voa: 0, ev: 0, vr: 0,
    }));
    state.passports = passports;
    state.filtered = [...passports];
    applySort(state.sort, false);
    loader.style.display = 'none';
    renderGrid();
    populateCompareSelects();
  } catch(e) {
    loader.style.display = 'none';
    showToast('Failed to load rankings: ' + e.message, 'error');
  }
}

function applySort(sortKey, rerender) {
  state.sort = sortKey;
  document.querySelectorAll('.sort-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.sort === sortKey);
  });
  if (sortKey === 'rank') {
    state.filtered.sort((a, b) => (a.rank || 999) - (b.rank || 999));
  } else if (sortKey === 'name') {
    state.filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sortKey === 'vf') {
    state.filtered.sort((a, b) => (b.total || 0) - (a.total || 0));
  }
  if (rerender !== false) renderGrid();
}

function applyFilter(query) {
  const q = norm(query);
  if (!q) {
    state.filtered = [...state.passports];
  } else {
    state.filtered = state.passports.filter(p =>
      norm(p.name).includes(q) || norm(p.iso).includes(q)
    );
  }
  applySort(state.sort, false);
  renderGrid();
}

function cardTemplate(p) {
  const pct = Math.round(((p.total || 0) / MAX_SCORE) * 100);
  const rank = p.rank || '—';
  const isTop3 = p.rank && p.rank <= 3;
  const tierClass = p.rank === 1 ? ' tier-gold' : p.rank === 2 ? ' tier-silver' : p.rank === 3 ? ' tier-bronze' : '';
  return `
    <div class="passport-card${tierClass}" data-iso="${p.iso}" tabindex="0" role="button" aria-label="${p.name}">
      <div class="card-rank-badge${isTop3 ? ' top-3' : ''}">#${rank}</div>
      <div class="card-flag">${flag(p.iso)}</div>
      <div class="card-name">${p.name || ''}</div>
      <div class="card-iso">${p.iso || ''}</div>
      <div class="card-score">${p.total || 0}</div>
      <div class="card-score-label">visa-free score</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="card-chips">
        <span class="chip chip-vf">VF ${p.vf || p.total || 0}</span>
        <span class="chip chip-voa">VoA ${p.voa || 0}</span>
        <span class="chip chip-ev">eV ${p.ev || 0}</span>
        <span class="chip chip-vr">VR ${p.vr || 0}</span>
      </div>
    </div>`;
}

function rowTemplate(p) {
  const pct = Math.round(((p.total || 0) / MAX_SCORE) * 100);
  return `
    <div class="passport-row" data-iso="${p.iso}" tabindex="0" role="button" aria-label="${p.name}">
      <div class="row-rank">#${p.rank || '—'}</div>
      <div class="row-flag">${flag(p.iso)}</div>
      <div class="row-info">
        <div class="row-name">${p.name || ''}</div>
        <div class="row-iso">${p.iso || ''}</div>
      </div>
      <div class="row-bar-wrap">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="row-score">${p.total || 0}</div>
      <div class="row-chips">
        <span class="chip chip-vf">VF ${p.vf || p.total || 0}</span>
        <span class="chip chip-voa">VoA ${p.voa || 0}</span>
        <span class="chip chip-ev">eV ${p.ev || 0}</span>
        <span class="chip chip-vr">VR ${p.vr || 0}</span>
      </div>
    </div>`;
}

function renderGrid() {
  const grid = document.getElementById('rankingsGrid');
  const empty = document.getElementById('rankingsEmpty');

  if (state.filtered.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  if (state.layout === 'grid') {
    grid.className = 'passport-grid';
    grid.innerHTML = state.filtered.map(cardTemplate).join('');
  } else {
    grid.className = 'passport-grid list-mode';
    grid.innerHTML = state.filtered.map(rowTemplate).join('');
  }

  grid.querySelectorAll('.passport-card, .passport-row').forEach((el, i) => {
    el.style.animationDelay = `${Math.min(i * 0.045, 0.75)}s`;
  });

  grid.querySelectorAll('[data-iso]').forEach(el => {
    el.addEventListener('click', () => openDetail(el.dataset.iso));
    el.addEventListener('keydown', e => { if (e.key === 'Enter') openDetail(el.dataset.iso); });
  });
}

async function openDetail(iso) {
  showView('detail');
  document.getElementById('detailBreadcrumbName').textContent = iso;
  const content = document.getElementById('detailContent');
  content.innerHTML = '<div class="loader-wrap"><div class="spinner"></div><p>Loading…</p></div>';

  try {
    const data = await apiFetch('/country/' + iso);
    state.detailData = data;
    state.activeDestFilter = 'Visa free';
    renderDetailContent(data);
    document.getElementById('detailBreadcrumbName').textContent = data.name || iso;
  } catch(e) {
    content.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Failed to load</h3><p>' + e.message + '</p></div>';
  }
}

function renderDetailContent(data) {
  const destinations = data.destinations || {};
  const vfList = destinations['Visa free'] || [];
  const voaList = destinations['Visa on arrival'] || [];
  const evList = destinations['ETA'] || [];
  const vrList = destinations['Visa required'] || [];

  const passport = state.passports.find(p => p.iso === data.isoShortCode) || {};
  const rankNum = passport.rank || '—';

  const isLoggedIn = !!state.user;
  const alreadyAdded = state.myPassports.some(p => p.iso === data.isoShortCode);

  const addBtnHtml = isLoggedIn
    ? `<button class="btn-add-passport" id="detailAddBtn">${alreadyAdded ? '✓ Added' : '＋ Add to my passports'}</button>`
    : '';

  const content = document.getElementById('detailContent');
  content.innerHTML = `
    <div class="detail-wrap">
      <div class="detail-header">
        <div class="detail-flag">${flag(data.isoShortCode)}</div>
        <div class="detail-info">
          <div class="detail-country-name">${data.name || ''}</div>
          <div class="detail-iso">${data.isoShortCode || ''}</div>
          <div class="detail-rank-badge">🏆 Rank #${rankNum}</div>
        </div>
        <div class="detail-actions">${addBtnHtml}</div>
      </div>

      <div class="detail-stat-row">
        <div class="detail-stat-cell stat-vf${state.activeDestFilter === 'Visa free' ? ' active' : ''}" data-filter="Visa free">
          <div class="detail-stat-number">${vfList.length}</div>
          <div class="detail-stat-label">Visa Free</div>
        </div>
        <div class="detail-stat-cell stat-voa${state.activeDestFilter === 'Visa on arrival' ? ' active' : ''}" data-filter="Visa on arrival">
          <div class="detail-stat-number">${voaList.length}</div>
          <div class="detail-stat-label">Visa on Arrival</div>
        </div>
        <div class="detail-stat-cell stat-ev${state.activeDestFilter === 'ETA' ? ' active' : ''}" data-filter="ETA">
          <div class="detail-stat-number">${evList.length}</div>
          <div class="detail-stat-label">ETA / eVisa</div>
        </div>
        <div class="detail-stat-cell stat-vr${state.activeDestFilter === 'Visa required' ? ' active' : ''}" data-filter="Visa required">
          <div class="detail-stat-number">${vrList.length}</div>
          <div class="detail-stat-label">Visa Required</div>
        </div>
      </div>

      <div class="detail-columns">
        <div class="map-card">
          <div class="map-card-title">World Access Map</div>
          <div class="map-container" id="detailMapContainer"></div>
          <div class="map-legend">
            <div class="legend-item"><div class="legend-dot" style="background:${JVM_COLORS.vf}"></div>Visa Free</div>
            <div class="legend-item"><div class="legend-dot" style="background:${JVM_COLORS.voa}"></div>Visa on Arrival</div>
            <div class="legend-item"><div class="legend-dot" style="background:${JVM_COLORS.ev}"></div>ETA / eVisa</div>
            <div class="legend-item"><div class="legend-dot" style="background:${JVM_COLORS.vr}"></div>Visa Required</div>
            <div class="legend-item"><div class="legend-dot" style="background:${JVM_COLORS.own}"></div>Home Country</div>
          </div>
        </div>

        <div class="destinations-card">
          <div class="destinations-header">
            <div class="destinations-title">Destinations</div>
            <input class="dest-search" id="destSearch" type="text" placeholder="Search destinations…" autocomplete="off" />
          </div>
          <div class="dest-filter-chips">
            <button class="dest-filter-chip chip-vf${state.activeDestFilter === 'Visa free' ? ' active' : ''}" data-filter="Visa free">VF ${vfList.length}</button>
            <button class="dest-filter-chip chip-voa${state.activeDestFilter === 'Visa on arrival' ? ' active' : ''}" data-filter="Visa on arrival">VoA ${voaList.length}</button>
            <button class="dest-filter-chip chip-ev${state.activeDestFilter === 'ETA' ? ' active' : ''}" data-filter="ETA">ETA ${evList.length}</button>
            <button class="dest-filter-chip chip-vr${state.activeDestFilter === 'Visa required' ? ' active' : ''}" data-filter="Visa required">VR ${vrList.length}</button>
          </div>
          <div class="dest-list" id="destList"></div>
        </div>
      </div>
    </div>`;

  renderDestList(destinations, state.activeDestFilter, '');

  const fillMap = buildFillMap(destinations, data.isoShortCode);

  loadJVM().then(() => {
    const container = document.getElementById('detailMapContainer');
    if (container) {
      destroyActiveMap();
      state.activeMap = initMap(container, fillMap, 340);
    }
  }).catch(() => {});

  content.querySelectorAll('.detail-stat-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      state.activeDestFilter = cell.dataset.filter;
      content.querySelectorAll('.detail-stat-cell').forEach(c => c.classList.remove('active'));
      cell.classList.add('active');
      content.querySelectorAll('.dest-filter-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.filter === state.activeDestFilter);
      });
      const destSearchEl = document.getElementById('destSearch');
      renderDestList(destinations, state.activeDestFilter, destSearchEl ? destSearchEl.value : '');
    });
  });

  content.querySelectorAll('.dest-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.activeDestFilter = chip.dataset.filter;
      content.querySelectorAll('.dest-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      content.querySelectorAll('.detail-stat-cell').forEach(c => {
        c.classList.toggle('active', c.dataset.filter === state.activeDestFilter);
      });
      const destSearchEl = document.getElementById('destSearch');
      renderDestList(destinations, state.activeDestFilter, destSearchEl ? destSearchEl.value : '');
    });
  });

  const destSearchEl = document.getElementById('destSearch');
  if (destSearchEl) {
    destSearchEl.addEventListener('input', () => {
      renderDestList(destinations, state.activeDestFilter, destSearchEl.value);
    });
  }

  const addBtn = document.getElementById('detailAddBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (alreadyAdded) return;
      const passportEntry = {
        name: data.name,
        iso: data.isoShortCode,
        rank: rankNum,
        total: passport.total || 0,
        destinations: data.destinations,
      };
      state.myPassports.push(passportEntry);
      saveLocal();
      addBtn.textContent = '✓ Added';
      showToast(data.name + ' added to your passports', 'success');
    });
  }
}

function renderDestList(destinations, filterType, query) {
  const list = document.getElementById('destList');
  if (!list) return;
  const items = (destinations[filterType] || []).filter(d => {
    if (!query) return true;
    return norm(d.name).includes(norm(query));
  });
  if (items.length === 0) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:#6b7280;font-size:13px;">No destinations found.</div>';
    return;
  }
  const typeClass = filterType === 'Visa free' ? 'chip-vf'
                  : filterType === 'Visa on arrival' ? 'chip-voa'
                  : filterType === 'ETA' ? 'chip-ev'
                  : 'chip-vr';
  const shortLabel = filterType === 'Visa free' ? 'VF'
                   : filterType === 'Visa on arrival' ? 'VoA'
                   : filterType === 'ETA' ? 'ETA'
                   : 'VR';
  list.innerHTML = items.map(d => `
    <div class="dest-item">
      <span class="dest-flag">${flag(d.isoShortCode)}</span>
      <span class="dest-name">${d.name || d.isoShortCode || ''}</span>
      <span class="dest-type chip ${typeClass}">${shortLabel}</span>
    </div>`).join('');
}

function populateCompareSelects() {
  const selA = document.getElementById('compareA');
  const selB = document.getElementById('compareB');
  if (!selA || !selB) return;
  const opts = state.passports.map(p =>
    `<option value="${p.iso}">${flag(p.iso)} ${p.name}</option>`
  ).join('');
  selA.innerHTML = '<option value="">Select Passport A…</option>' + opts;
  selB.innerHTML = '<option value="">Select Passport B…</option>' + opts;
}

async function doCompare() {
  const isoA = document.getElementById('compareA').value;
  const isoB = document.getElementById('compareB').value;
  const result = document.getElementById('compareResult');

  if (!isoA || !isoB) { showToast('Please select two passports', 'info'); return; }
  if (isoA === isoB) { showToast('Please select two different passports', 'info'); return; }

  result.innerHTML = '<div class="loader-wrap"><div class="spinner"></div><p>Loading…</p></div>';

  try {
    const [dataA, dataB] = await Promise.all([
      apiFetch('/country/' + isoA),
      apiFetch('/country/' + isoB),
    ]);

    const passA = state.passports.find(p => p.iso === isoA) || {};
    const passB = state.passports.find(p => p.iso === isoB) || {};

    const destA = dataA.destinations || {};
    const destB = dataB.destinations || {};

    const countA = {
      vf: (destA['Visa free'] || []).length,
      voa: (destA['Visa on arrival'] || []).length,
      ev: (destA['ETA'] || []).length,
      vr: (destA['Visa required'] || []).length,
    };
    const countB = {
      vf: (destB['Visa free'] || []).length,
      voa: (destB['Visa on arrival'] || []).length,
      ev: (destB['ETA'] || []).length,
      vr: (destB['Visa required'] || []).length,
    };

    countA.total = countA.vf + countA.voa + countA.ev + countA.vr;
    countB.total = countB.vf + countB.voa + countB.ev + countB.vr;

    const winnerByScore = (passA.total || countA.vf) >= (passB.total || countB.vf) ? 'A' : 'B';
    const winnerData = winnerByScore === 'A' ? dataA : dataB;
    const diff = Math.abs((passA.total || countA.vf) - (passB.total || countB.vf));

    function tableRow(label, valA, valB, higherIsBetter) {
      higherIsBetter = higherIsBetter !== false;
      const numA = typeof valA === 'number' ? valA : parseInt(valA) || 0;
      const numB = typeof valB === 'number' ? valB : parseInt(valB) || 0;
      const aWins = higherIsBetter ? numA > numB : numA < numB;
      const bWins = higherIsBetter ? numB > numA : numB < numA;
      const diffVal = numA - numB;
      const diffStr = diffVal === 0 ? '—'
        : diffVal > 0
          ? '<span class="diff-pos">+' + diffVal + '</span>'
          : '<span class="diff-neg">' + diffVal + '</span>';
      return `<tr class="${aWins || bWins ? 'row-winner' : ''}">
        <td>${label}</td>
        <td><strong>${aWins ? '✓ ' : ''}${valA}</strong></td>
        <td><strong>${bWins ? '✓ ' : ''}${valB}</strong></td>
        <td>${diffStr}</td>
      </tr>`;
    }

    result.innerHTML = `
      <div class="winner-banner">
        <div class="winner-flags">
          <span>${flag(isoA)}</span>
          <span class="winner-vs">VS</span>
          <span>${flag(isoB)}</span>
        </div>
        <div class="winner-names">
          <span class="winner-name${winnerByScore === 'A' ? ' winner' : ''}">${dataA.name}</span>
          <span style="color:rgba(255,255,255,0.3);font-weight:700;">vs</span>
          <span class="winner-name${winnerByScore === 'B' ? ' winner' : ''}">${dataB.name}</span>
        </div>
        <div class="winner-announce">${winnerData.name} has the stronger passport</div>
        <div class="winner-diff">+${diff} more visa-free destinations</div>
      </div>

      <table class="compare-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>${flag(isoA)} ${dataA.name}</th>
            <th>${flag(isoB)} ${dataB.name}</th>
            <th>Diff (A−B)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRow('Total Destinations', countA.total, countB.total)}
          ${tableRow('Visa Free', countA.vf, countB.vf)}
          ${tableRow('Visa on Arrival', countA.voa, countB.voa)}
          ${tableRow('ETA / eVisa', countA.ev, countB.ev)}
          ${tableRow('Visa Required', countA.vr, countB.vr, false)}
          ${tableRow('Global Rank', passA.rank || '—', passB.rank || '—', false)}
        </tbody>
      </table>

      <div class="compare-maps">
        <div class="compare-map-card">
          <div class="compare-map-title">${flag(isoA)} ${dataA.name}</div>
          <div class="map-container" id="compareMapA"></div>
        </div>
        <div class="compare-map-card">
          <div class="compare-map-title">${flag(isoB)} ${dataB.name}</div>
          <div class="map-container" id="compareMapB"></div>
        </div>
      </div>`;

    loadJVM().then(() => {
      destroyActiveMap();
      const fillA = buildFillMap(destA, isoA);
      const fillB = buildFillMap(destB, isoB);
      const mapContA = document.getElementById('compareMapA');
      const mapContB = document.getElementById('compareMapB');
      if (mapContA) state.activeMap = initMap(mapContA, fillA, 280);
      if (mapContB) state.activeMapB = initMap(mapContB, fillB, 280);
    }).catch(() => {});

  } catch(e) {
    result.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error</h3><p>' + e.message + '</p></div>';
  }
}

async function doLogin(username, password) {
  const data = await apiFetch('/user/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  state.user = data.user || { username };
  state.token = data.token || data.access_token || '';
  localStorage.setItem('pr_user', JSON.stringify(state.user));
  localStorage.setItem('pr_token', state.token);
  updateAuthState();
  showToast('Welcome back, ' + (state.user.username || username) + '!', 'success');
  showView('rankings');
}

async function doRegister(username, password) {
  const data = await apiFetch('/user/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  state.user = data.user || { username };
  state.token = data.token || data.access_token || '';
  localStorage.setItem('pr_user', JSON.stringify(state.user));
  localStorage.setItem('pr_token', state.token);
  updateAuthState();
  showToast('Account created! Welcome, ' + (state.user.username || username) + '!', 'success');
  showView('profile');
}

function doLogout() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('pr_user');
  localStorage.removeItem('pr_token');
  updateAuthState();
  showToast('Signed out', 'info');
  showView('rankings');
}

function saveLocal() {
  localStorage.setItem('pr_myPassports', JSON.stringify(state.myPassports));
  localStorage.setItem('pr_visitedCountries', JSON.stringify(state.visitedCountries));
  localStorage.setItem('pr_privacy', JSON.stringify(state.privacy));
}

function restoreSession() {
  try {
    const u = localStorage.getItem('pr_user');
    const t = localStorage.getItem('pr_token');
    if (u) state.user = JSON.parse(u);
    if (t) state.token = t;
    const mp = localStorage.getItem('pr_myPassports');
    if (mp) state.myPassports = JSON.parse(mp);
    const vc = localStorage.getItem('pr_visitedCountries');
    if (vc) state.visitedCountries = JSON.parse(vc);
    const pv = localStorage.getItem('pr_privacy');
    if (pv) state.privacy = Object.assign({}, state.privacy, JSON.parse(pv));
  } catch(e) {}
  updateAuthState();
}

function renderProfile() {
  if (!state.user) {
    showView('auth');
    return;
  }
  showView('profile');
  const content = document.getElementById('profileContent');
  const username = state.user.username || 'User';
  const avatarLetter = username[0].toUpperCase();
  const bestPassport = state.myPassports.reduce((best, p) => (!best || (p.rank && p.rank < best.rank)) ? p : best, null);
  const bestVF = bestPassport ? (bestPassport.total || 0) : 0;
  const bestRank = bestPassport ? (bestPassport.rank || '—') : '—';
  const worldPct = bestVF ? Math.round((bestVF / 195) * 100) : 0;
  const joinDate = state.user.joinDate || '2026';

  const myPassportsHtml = state.myPassports.length === 0
    ? '<div style="padding:16px;text-align:center;color:#6b7280;font-size:13px;">No passports added yet.</div>'
    : state.myPassports.map((p, i) => `
        <div class="passport-mini">
          <div class="passport-mini-flag">${flag(p.iso)}</div>
          <div class="passport-mini-info">
            <div class="passport-mini-name">${p.name || p.iso}</div>
            <div class="passport-mini-rank">Rank #${p.rank || '—'} · Score ${p.total || 0}</div>
          </div>
          <button class="passport-mini-remove" data-idx="${i}" title="Remove">✕</button>
        </div>`).join('');

  const visitedHtml = state.visitedCountries.length === 0
    ? '<div style="padding:16px;text-align:center;color:#6b7280;font-size:13px;">No visited countries added yet.</div>'
    : state.visitedCountries.map((c, i) => `
        <div class="visited-chip">
          <span>${flag(c.isoShortCode || c.iso)}</span>
          <span>${c.name || c.iso}</span>
          <button class="visited-chip-remove" data-idx="${i}" title="Remove">✕</button>
        </div>`).join('');

  const maxVF = 179;
  const totalDest = bestPassport
    ? ((bestPassport.vf || bestVF) + (bestPassport.voa || 0) + (bestPassport.ev || 0) + (bestPassport.vr || 0))
    : 195;

  function travelBar(label, value, total, color) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return `<div class="travel-stat-bar">
      <div class="travel-stat-label">
        <span>${label}</span>
        <span style="color:${color}">${value}</span>
      </div>
      <div class="travel-bar">
        <div class="travel-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`;
  }

  const vfCount = bestPassport ? (bestPassport.vf || bestVF) : 0;
  const voaCount = bestPassport ? (bestPassport.voa || 0) : 0;
  const evCount = bestPassport ? (bestPassport.ev || 0) : 0;
  const vrCount = bestPassport ? (bestPassport.vr || 0) : 0;
  const travelTotal = vfCount + voaCount + evCount + vrCount || 1;

  content.innerHTML = `
    <div class="profile-content">
      <div class="profile-hero">
        <div class="profile-hero-top">
          <div class="profile-avatar">${avatarLetter}</div>
          <div class="profile-identity">
            <div class="profile-name">${username}</div>
            <div class="profile-handle">@${username.toLowerCase()}</div>
            <div class="profile-joined">Joined ${joinDate}</div>
          </div>
          <div class="profile-hero-actions">
            <button id="profileShareBtn">🔗 Share profile</button>
            <button id="profilePrivacyBtn">⚙ Privacy settings</button>
          </div>
        </div>
        <div class="profile-meta-stats">
          <div class="profile-meta-stat">
            <span class="profile-meta-n">${state.myPassports.length}</span>
            <span class="profile-meta-l">Passports</span>
          </div>
          <div class="profile-meta-stat">
            <span class="profile-meta-n">${state.visitedCountries.length}</span>
            <span class="profile-meta-l">Countries</span>
          </div>
          <div class="profile-meta-stat">
            <span class="profile-meta-n">${bestVF}</span>
            <span class="profile-meta-l">Best Visa-Free</span>
          </div>
          <div class="profile-meta-stat">
            <span class="profile-meta-n">${worldPct}%</span>
            <span class="profile-meta-l">World</span>
          </div>
        </div>
      </div>

      <div class="profile-columns">
        <div>
          <div class="card" style="margin-bottom:20px;">
            <div class="card-header">
              <span class="card-title">World Visa Map</span>
            </div>
            <div class="map-container" id="profileMapContainer"></div>
            <div class="map-legend" style="padding:12px 20px;">
              <div class="legend-item"><div class="legend-dot" style="background:${JVM_COLORS.vf}"></div>Visa Free</div>
              <div class="legend-item"><div class="legend-dot" style="background:${JVM_COLORS.voa}"></div>Visa on Arrival</div>
              <div class="legend-item"><div class="legend-dot" style="background:${JVM_COLORS.ev}"></div>ETA</div>
              <div class="legend-item"><div class="legend-dot" style="background:${JVM_COLORS.vr}"></div>Visa Required</div>
              <div class="legend-item"><div class="legend-dot" style="background:${JVM_COLORS.visited}"></div>Visited</div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <span class="card-title">Visited Countries</span>
              <button class="btn-outline" id="addVisitedBtn" style="font-size:12px;padding:6px 12px;">＋ Add</button>
            </div>
            <div class="visited-chips" id="visitedChipsList">
              ${visitedHtml}
            </div>
          </div>
        </div>

        <div>
          <div class="card" style="margin-bottom:20px;">
            <div class="card-header">
              <span class="card-title">My Passports</span>
            </div>
            <div class="card-body" id="myPassportsList">
              ${myPassportsHtml}
            </div>
            <div style="padding:0 16px 16px;">
              <button class="btn-add-item" id="addPassportBtn">＋ Add passport</button>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <span class="card-title">Travel Stats</span>
            </div>
            <div class="card-body">
              ${travelBar('Visa Free', vfCount, travelTotal, JVM_COLORS.vf)}
              ${travelBar('Visa on Arrival', voaCount, travelTotal, JVM_COLORS.voa)}
              ${travelBar('ETA / eVisa', evCount, travelTotal, JVM_COLORS.ev)}
              ${travelBar('Visa Required', vrCount, travelTotal, JVM_COLORS.vr)}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  content.querySelector('#profileShareBtn').addEventListener('click', () => {
    const url = 'passportrank.app/u/' + username.toLowerCase();
    navigator.clipboard.writeText(url).catch(() => {});
    showToast('Profile link copied!', 'success');
  });

  content.querySelector('#profilePrivacyBtn').addEventListener('click', () => {
    showView('privacy');
    renderPrivacySettings();
  });

  content.querySelector('#addPassportBtn').addEventListener('click', () => {
    openAddPassport('passport');
  });

  const addVisitedBtn = content.querySelector('#addVisitedBtn');
  if (addVisitedBtn) {
    addVisitedBtn.addEventListener('click', () => openAddPassport('visited'));
  }

  content.querySelectorAll('.passport-mini-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      state.myPassports.splice(idx, 1);
      saveLocal();
      renderProfile();
      showToast('Passport removed', 'info');
    });
  });

  content.querySelectorAll('.visited-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      state.visitedCountries.splice(idx, 1);
      saveLocal();
      renderProfile();
      showToast('Country removed', 'info');
    });
  });

  const passportsWithDest = state.myPassports.filter(p => p.destinations);
  if (passportsWithDest.length > 0) {
    const combinedFill = buildCombinedFillMap(passportsWithDest);
    loadJVM().then(() => {
      const container = document.getElementById('profileMapContainer');
      if (container) {
        destroyActiveMap();
        state.activeMap = initMap(container, combinedFill, 300);
      }
    }).catch(() => {});
  } else {
    const container = document.getElementById('profileMapContainer');
    if (container) {
      loadJVM().then(() => {
        destroyActiveMap();
        state.activeMap = initMap(container, {}, 300);
      }).catch(() => {});
    }
  }
}

function renderPrivacySettings() {
  const publicLinkUrl = document.getElementById('publicLinkUrl');
  if (publicLinkUrl && state.user) {
    publicLinkUrl.textContent = 'passportrank.app/u/' + (state.user.username || 'user').toLowerCase();
  }

  document.querySelectorAll('.toggle-pill').forEach(pill => {
    const key = pill.dataset.key;
    if (key) {
      if (state.privacy[key]) {
        pill.classList.add('on');
      } else {
        pill.classList.remove('on');
      }
    }
  });
}

function openAddPassport(mode) {
  state.modalMode = mode || 'passport';
  state.modalSelected = null;

  const overlay = document.getElementById('addPassportOverlay');
  overlay.classList.remove('hidden');

  document.getElementById('modalTabPassport').classList.toggle('active', mode === 'passport');
  document.getElementById('modalTabVisited').classList.toggle('active', mode === 'visited');
  document.getElementById('modalSearch').value = '';
  document.getElementById('modalConfirmBtn').disabled = true;

  const confirmBtn = document.getElementById('modalConfirmBtn');
  confirmBtn.textContent = mode === 'passport' ? '＋ Add to my passports' : '＋ Add visited country';

  renderModalGrid('');
}

function renderModalGrid(query) {
  const grid = document.getElementById('modalGrid');
  let items = state.passports;

  if (query) {
    items = items.filter(p => norm(p.name).includes(norm(query)) || norm(p.iso).includes(norm(query)));
  } else {
    const popular = POPULAR_ISOS;
    const popularItems = popular.map(iso => items.find(p => p.iso === iso)).filter(Boolean);
    const others = items.filter(p => !popular.includes(p.iso));
    items = [...popularItems, ...others];
  }

  items = items.slice(0, 48);

  grid.innerHTML = items.map(p => `
    <div class="modal-item${state.modalSelected && state.modalSelected.iso === p.iso ? ' selected' : ''}" data-iso="${p.iso}">
      <div class="modal-item-flag">${flag(p.iso)}</div>
      <div class="modal-item-name">${p.name || p.iso}</div>
      <div class="modal-item-meta">Rank #${p.rank || '—'} · ${p.total || 0}</div>
    </div>`).join('');

  grid.querySelectorAll('.modal-item').forEach(item => {
    item.addEventListener('click', () => {
      const iso = item.dataset.iso;
      const passport = state.passports.find(p => p.iso === iso);
      state.modalSelected = passport;
      grid.querySelectorAll('.modal-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      document.getElementById('modalConfirmBtn').disabled = false;
    });
  });
}

function addPassportToCollection() {
  if (!state.modalSelected) return;
  if (state.modalMode === 'passport') {
    const already = state.myPassports.some(p => p.iso === state.modalSelected.iso);
    if (already) { showToast('Passport already added', 'info'); return; }
    state.myPassports.push({ ...state.modalSelected });
    saveLocal();
    showToast(state.modalSelected.name + ' added to your passports', 'success');
  } else {
    const already = state.visitedCountries.some(c => (c.isoShortCode || c.iso) === state.modalSelected.iso);
    if (already) { showToast('Country already added', 'info'); return; }
    state.visitedCountries.push({
      name: state.modalSelected.name,
      isoShortCode: state.modalSelected.iso,
      iso: state.modalSelected.iso,
    });
    saveLocal();
    showToast(state.modalSelected.name + ' added to visited countries', 'success');
  }
  document.getElementById('addPassportOverlay').classList.add('hidden');
  renderProfile();
}

function wireNavLinks() {
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const view = el.dataset.view;
      if (view === 'profile') {
        if (!state.user) { showView('auth'); return; }
        renderProfile();
        return;
      }
      if (view === 'auth' && state.user) return;
      showView(view);
    });
  });
}

/* ─── Hero Canvas — animated flight paths ────────────────────── */
function initHeroCanvas() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-canvas';
  hero.insertBefore(canvas, hero.firstChild);

  const ctx = canvas.getContext('2d');

  function resize() {
    const r = hero.getBoundingClientRect();
    canvas.width  = r.width;
    canvas.height = r.height;
  }
  resize();
  window.addEventListener('resize', resize);

  const nodes = Array.from({ length: 55 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.4 + 0.6,
    phase:      Math.random() * Math.PI * 2,
    phaseSpeed: 0.012 + Math.random() * 0.018,
  }));

  const connections = [];
  nodes.forEach((a, i) => {
    nodes
      .map((b, j) => ({ j, d: Math.hypot(b.x - a.x, b.y - a.y) }))
      .filter(e => e.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .forEach(({ j }) => { if (i < j) connections.push([i, j]); });
  });

  function arcCtrl(a, b) {
    return {
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2 - Math.hypot(b.x - a.x, b.y - a.y) * 0.38,
    };
  }
  function bezier(x1, y1, cx, cy, x2, y2, t) {
    const u = 1 - t;
    return { x: u*u*x1 + 2*u*t*cx + t*t*x2, y: u*u*y1 + 2*u*t*cy + t*t*y2 };
  }

  function spawnPlane(t) {
    let from = (Math.random() * nodes.length) | 0;
    let to   = (Math.random() * nodes.length) | 0;
    while (to === from) to = (Math.random() * nodes.length) | 0;
    return { from, to, t: t || 0, speed: 0.0007 + Math.random() * 0.0009 };
  }
  const planes = Array.from({ length: 8 }, (_, k) => spawnPlane(k / 8));

  function draw() {
    requestAnimationFrame(draw);
    const w = canvas.width, h = canvas.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);

    connections.forEach(([i, j]) => {
      const a = nodes[i], b = nodes[j];
      const { cx, cy } = arcCtrl(a, b);
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.quadraticCurveTo(cx * w, cy * h, b.x * w, b.y * h);
      ctx.strokeStyle = 'rgba(96,165,250,0.07)';
      ctx.lineWidth   = 0.8;
      ctx.stroke();
    });

    nodes.forEach(n => {
      n.phase += n.phaseSpeed;
      const pulse = Math.sin(n.phase);
      const r     = Math.max(0.2, n.r + pulse * 0.7);
      const alpha = 0.22 + pulse * 0.12;
      const nx = n.x * w, ny = n.y * h;

      const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, r * 5);
      grd.addColorStop(0, `rgba(148,197,253,${alpha * 0.7})`);
      grd.addColorStop(1,  'rgba(148,197,253,0)');
      ctx.beginPath();
      ctx.arc(nx, ny, r * 5, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(148,197,253,${alpha + 0.28})`;
      ctx.fill();
    });

    planes.forEach(plane => {
      plane.t += plane.speed;
      if (plane.t >= 1) Object.assign(plane, spawnPlane(0));

      const a = nodes[plane.from], b = nodes[plane.to];
      const { cx, cy } = arcCtrl(a, b);
      const TRAIL = 14;

      for (let i = TRAIL; i >= 0; i--) {
        const tt  = Math.max(0, plane.t - i * 0.016);
        const pos = bezier(a.x*w, a.y*h, cx*w, cy*h, b.x*w, b.y*h, tt);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (1 - i/TRAIL) * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96,165,250,${(1 - i/TRAIL) * 0.65})`;
        ctx.fill();
      }

      const pos = bezier(a.x*w, a.y*h, cx*w, cy*h, b.x*w, b.y*h, plane.t);
      const grd = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 7);
      grd.addColorStop(0,   'rgba(255,255,255,0.95)');
      grd.addColorStop(0.4, 'rgba(147,197,253,0.75)');
      grd.addColorStop(1,   'rgba(96,165,250,0)');
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.fill();
    });

  }

  draw();
}

document.addEventListener('DOMContentLoaded', () => {
  initHeroCanvas();
  restoreSession();
  wireNavLinks();
  loadRankings();

  document.getElementById('heroSearch').addEventListener('input', function() {
    const val = this.value;
    document.getElementById('heroSearchClear').classList.toggle('hidden', !val);
    applyFilter(val);
  });

  document.getElementById('heroSearchClear').addEventListener('click', () => {
    document.getElementById('heroSearch').value = '';
    document.getElementById('heroSearchClear').classList.add('hidden');
    applyFilter('');
  });

  document.querySelectorAll('.sort-tab').forEach(tab => {
    tab.addEventListener('click', () => applySort(tab.dataset.sort));
  });

  document.getElementById('layoutGrid').addEventListener('click', () => {
    state.layout = 'grid';
    document.getElementById('layoutGrid').classList.add('active');
    document.getElementById('layoutList').classList.remove('active');
    renderGrid();
  });

  document.getElementById('layoutList').addEventListener('click', () => {
    state.layout = 'list';
    document.getElementById('layoutList').classList.add('active');
    document.getElementById('layoutGrid').classList.remove('active');
    renderGrid();
  });

  document.getElementById('compareBtn').addEventListener('click', doCompare);

  document.getElementById('tabSignIn').addEventListener('click', () => {
    state.authMode = 'login';
    document.getElementById('tabSignIn').classList.add('active');
    document.getElementById('tabRegister').classList.remove('active');
    document.getElementById('authSubmit').textContent = 'Sign In';
    document.getElementById('authSwitchLink').textContent = 'Register';
    document.querySelector('.auth-switch').innerHTML = 'Don\'t have an account? <a href="#" id="authSwitchLink">Register</a>';
    document.getElementById('authSwitchLink').addEventListener('click', e => {
      e.preventDefault();
      document.getElementById('tabRegister').click();
    });
    document.getElementById('authError').classList.add('hidden');
  });

  document.getElementById('tabRegister').addEventListener('click', () => {
    state.authMode = 'register';
    document.getElementById('tabRegister').classList.add('active');
    document.getElementById('tabSignIn').classList.remove('active');
    document.getElementById('authSubmit').textContent = 'Create Account';
    document.querySelector('.auth-switch').innerHTML = 'Already have an account? <a href="#" id="authSwitchLink">Sign In</a>';
    document.getElementById('authSwitchLink').addEventListener('click', e => {
      e.preventDefault();
      document.getElementById('tabSignIn').click();
    });
    document.getElementById('authError').classList.add('hidden');
  });

  document.getElementById('authSwitchLink').addEventListener('click', e => {
    e.preventDefault();
    if (state.authMode === 'login') {
      document.getElementById('tabRegister').click();
    } else {
      document.getElementById('tabSignIn').click();
    }
  });

  document.getElementById('authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    const errEl = document.getElementById('authError');
    const submitBtn = document.getElementById('authSubmit');
    errEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = '…';
    try {
      if (state.authMode === 'login') {
        await doLogin(username, password);
      } else {
        await doRegister(username, password);
      }
    } catch(err) {
      errEl.textContent = err.message || 'Authentication failed';
      errEl.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = state.authMode === 'login' ? 'Sign In' : 'Create Account';
    }
  });

  document.getElementById('navLogoutBtn').addEventListener('click', doLogout);

  document.getElementById('copyLinkBtn').addEventListener('click', () => {
    const url = document.getElementById('publicLinkUrl').textContent;
    navigator.clipboard.writeText(url).catch(() => {});
    showToast('Link copied!', 'success');
  });

  document.getElementById('makePrivateBtn').addEventListener('click', () => {
    Object.keys(state.privacy).forEach(k => { state.privacy[k] = false; });
    saveLocal();
    renderPrivacySettings();
    showToast('Profile is now fully private', 'info');
  });

  document.querySelectorAll('.toggle-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const key = pill.dataset.key;
      if (!key) return;
      state.privacy[key] = !state.privacy[key];
      pill.classList.toggle('on', state.privacy[key]);
      saveLocal();
    });
  });

  document.getElementById('modalTabPassport').addEventListener('click', () => {
    state.modalMode = 'passport';
    document.getElementById('modalTabPassport').classList.add('active');
    document.getElementById('modalTabVisited').classList.remove('active');
    document.getElementById('modalConfirmBtn').textContent = '＋ Add to my passports';
    state.modalSelected = null;
    document.getElementById('modalConfirmBtn').disabled = true;
    document.getElementById('modalSearch').value = '';
    renderModalGrid('');
  });

  document.getElementById('modalTabVisited').addEventListener('click', () => {
    state.modalMode = 'visited';
    document.getElementById('modalTabVisited').classList.add('active');
    document.getElementById('modalTabPassport').classList.remove('active');
    document.getElementById('modalConfirmBtn').textContent = '＋ Add visited country';
    state.modalSelected = null;
    document.getElementById('modalConfirmBtn').disabled = true;
    document.getElementById('modalSearch').value = '';
    renderModalGrid('');
  });

  document.getElementById('modalSearch').addEventListener('input', function() {
    renderModalGrid(this.value);
  });

  document.getElementById('modalConfirmBtn').addEventListener('click', addPassportToCollection);

  document.getElementById('closeAddPassport').addEventListener('click', () => {
    document.getElementById('addPassportOverlay').classList.add('hidden');
  });

  document.getElementById('addPassportOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('addPassportOverlay')) {
      document.getElementById('addPassportOverlay').classList.add('hidden');
    }
  });
});
