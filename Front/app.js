/* PassportRank — Vue.js 3 CDN SPA */
const { createApp, ref, reactive, computed, watch, onMounted, onUnmounted } = Vue

const BASE = 'https://webapppassport.fly.dev'
const MAX_SCORE = 179

// ─── API ─────────────────────────────────────────────────────
const _token = ref(localStorage.getItem('pr_token') || '')

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (_token.value) headers.Authorization = 'Bearer ' + _token.value
  const res = await fetch(BASE + path, { headers, ...opts })
  if (!res.ok) {
    let msg = res.statusText
    try { const j = await res.json(); msg = j.message || j.error || msg } catch {}
    throw new Error(msg)
  }
  return res.json()
}
const apiGet    = p       => apiFetch(p)
const apiPost   = (p, b) => apiFetch(p, { method: 'POST',   body: JSON.stringify(b) })
const apiDelete = p       => apiFetch(p, { method: 'DELETE' })
const apiPatch  = (p, b) => apiFetch(p, { method: 'PATCH',  body: JSON.stringify(b) })

// ─── Utility ─────────────────────────────────────────────────
function isoFlag(iso) {
  if (!iso || iso.length !== 2) return '🏳️'
  const b = 0x1F1E6 - 65
  return String.fromCodePoint(b + iso.toUpperCase().charCodeAt(0)) +
         String.fromCodePoint(b + iso.toUpperCase().charCodeAt(1))
}

// ─── Country Picker Component ─────────────────────────────────
const CountryPicker = {
  name: 'CountryPicker',
  props: {
    modelValue: { default: null },
    options:    { default: () => [] },
    placeholder: { default: 'Search country…' }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const open = ref(false)
    const query = ref('')
    const root  = ref(null)

    const filtered = computed(() => {
      const list = props.options
      if (!list.length) return []
      if (!query.value) return list.slice(0, 80)
      const q = query.value.toLowerCase()
      return list.filter(o =>
        (o.name || '').toLowerCase().includes(q) ||
        (o.isoShortCode || '').toLowerCase().startsWith(q)
      ).slice(0, 80)
    })

    function select(opt) {
      emit('update:modelValue', opt)
      open.value = false
      query.value = ''
    }

    function onOutside(e) {
      if (root.value && !root.value.contains(e.target)) open.value = false
    }

    onMounted(()   => document.addEventListener('mousedown', onOutside))
    onUnmounted(() => document.removeEventListener('mousedown', onOutside))

    return { open, query, filtered, select, root, isoFlag }
  },
  template: `
    <div class="cp-wrap" :class="{ open }" ref="root">
      <div class="cp-trigger" tabindex="0" role="combobox"
        @click="open = !open"
        @keydown.enter="open = !open"
        @keydown.esc="open = false">
        <span class="cp-trigger-inner">
          <template v-if="modelValue">
            <span class="cp-sel-flag">{{ modelValue.flag || isoFlag(modelValue.isoShortCode) }}</span>
            <span class="cp-sel-name">{{ modelValue.name }}</span>
          </template>
          <span v-else class="cp-placeholder">{{ placeholder }}</span>
        </span>
        <svg class="cp-chevron" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div v-show="open" class="cp-drop">
        <div class="cp-search-row">
          <svg class="cp-search-icon" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M14 14l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input class="cp-search-input" v-model="query" :placeholder="placeholder" @keydown.esc="open = false" />
        </div>
        <div class="cp-list">
          <div v-for="opt in filtered" :key="opt.isoShortCode"
            class="cp-item"
            :class="{ selected: modelValue && modelValue.isoShortCode === opt.isoShortCode }"
            @click="select(opt)">
            <span class="cp-item-flag">{{ opt.flag || isoFlag(opt.isoShortCode) }}</span>
            <span class="cp-item-name">{{ opt.name }}</span>
            <span class="cp-item-rank" v-if="opt.worldRank">#{{ opt.worldRank }}</span>
          </div>
          <div v-if="!filtered.length" style="padding:16px;color:rgba(255,255,255,.4);font-size:13px;text-align:center">
            No results
          </div>
        </div>
      </div>
    </div>
  `
}

// ─── Main App ─────────────────────────────────────────────────
createApp({
  components: { CountryPicker },

  setup() {
    // ── Router ──────────────────────────────────────
    const view   = ref('rankings')
    const params = ref({})
    const VIEWS  = ['rankings','detail','compare','auth','profile','public-profile','privacy']

    function navigate(v, p = {}) {
      view.value   = v
      params.value = p
      window.scrollTo({ top: 0, behavior: 'smooth' })
      const slug = p.slug ? '/' + p.slug : ''
      history.replaceState(null, '', '#' + v + slug)
    }

    function readHash() {
      const h = location.hash.replace('#', '') || 'rankings'
      const [v, ...rest] = h.split('/')
      if (VIEWS.includes(v)) {
        view.value   = v
        params.value = rest.length ? { slug: rest.join('/') } : {}
      }
    }

    // ── Auth ────────────────────────────────────────
    const token    = _token
    const username = ref(localStorage.getItem('pr_user') || '')
    const loggedIn = computed(() => !!token.value && !!username.value)

    function setAuth(t, u) {
      token.value    = t
      username.value = u
      localStorage.setItem('pr_token', t)
      localStorage.setItem('pr_user',  u)
    }

    function logout() {
      token.value    = ''
      username.value = ''
      localStorage.removeItem('pr_token')
      localStorage.removeItem('pr_user')
      navigate('rankings')
      pushToast('Signed out', 'info')
    }

    // ── Toast ───────────────────────────────────────
    const toasts = ref([])
    let toastSeq  = 0

    function pushToast(msg, type = 'info') {
      const id = ++toastSeq
      toasts.value.push({ id, msg, type })
      setTimeout(() => {
        const i = toasts.value.findIndex(t => t.id === id)
        if (i !== -1) toasts.value.splice(i, 1)
      }, 3500)
    }

    // ── Rankings ────────────────────────────────────
    const allPassports    = ref([])
    const rankingsLoading = ref(false)
    const searchQuery     = ref('')
    const sortKey         = ref('rank')
    const layoutMode      = ref('grid')

    const filteredPassports = computed(() => {
      let list = allPassports.value
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        list = list.filter(p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.isoShortCode || '').toLowerCase().startsWith(q)
        )
      }
      return [...list].sort((a, b) => {
        if (sortKey.value === 'rank') return (a.worldRank || 999) - (b.worldRank || 999)
        if (sortKey.value === 'name') return (a.name || '').localeCompare(b.name || '')
        if (sortKey.value === 'vf')   return (b.visaFreeCount || 0) - (a.visaFreeCount || 0)
        return 0
      })
    })

    async function loadRankings() {
      if (allPassports.value.length) return
      rankingsLoading.value = true
      try {
        const data = await apiGet('/rank')
        allPassports.value = (data.passports || []).map(p => ({
          ...p,
          flag: isoFlag(p.isoShortCode)
        }))
      } catch (e) {
        pushToast('Could not load rankings: ' + e.message, 'error')
      } finally {
        rankingsLoading.value = false
      }
    }

    // ── Passport Detail ─────────────────────────────
    const detail        = ref(null)
    const detailLoading = ref(false)
    const destFilter    = ref('Visa free')
    const destSearch    = ref('')

    const DEST_CATS = [
      { key: 'Visa free',       label: 'Visa Free',       cls: 'chip-vf',  statCls: 'stat-vf'  },
      { key: 'Visa on arrival', label: 'Visa on Arrival', cls: 'chip-voa', statCls: 'stat-voa' },
      { key: 'E-Visa',          label: 'E-Visa',          cls: 'chip-ev',  statCls: 'stat-ev'  },
      { key: 'Required',        label: 'Visa Required',   cls: 'chip-vr',  statCls: 'stat-vr'  },
    ]

    const filteredDests = computed(() => {
      if (!detail.value?.destinations) return []
      const list = detail.value.destinations[destFilter.value] || []
      if (!destSearch.value) return list
      const q = destSearch.value.toLowerCase()
      return list.filter(d => (d.name || '').toLowerCase().includes(q))
    })

    function destCount(cat) {
      if (!detail.value) return 0
      if (cat.key === 'Visa free')       return detail.value.visaFreeCount
      if (cat.key === 'Visa on arrival') return detail.value.visaOnArrivalCount
      if (cat.key === 'E-Visa')          return detail.value.etaCount
      return detail.value.requiredVisaCount
    }

    async function loadDetail(iso) {
      detailLoading.value = true
      detail.value        = null
      destFilter.value    = 'Visa free'
      destSearch.value    = ''
      try {
        const p = await apiGet('/passport/' + iso)
        detail.value = { ...p, flag: isoFlag(p.isoShortCode) }
      } catch (e) {
        pushToast('Could not load passport: ' + e.message, 'error')
      } finally {
        detailLoading.value = false
      }
    }

    async function addMyPassport(iso) {
      if (!loggedIn.value) { navigate('auth'); return }
      try {
        await apiPost('/user/addPassport?isos=' + iso)
        pushToast('Passport added to your collection!', 'success')
      } catch (e) {
        pushToast(e.message, 'error')
      }
    }

    // ── Compare ─────────────────────────────────────
    const cmpA       = ref(null)
    const cmpB       = ref(null)
    const cmpResult  = ref(null)
    const cmpLoading = ref(false)

    async function runCompare() {
      if (!cmpA.value || !cmpB.value) { pushToast('Select two passports first', 'warn'); return }
      cmpLoading.value = true
      cmpResult.value  = null
      try {
        const isos = cmpA.value.isoShortCode + ',' + cmpB.value.isoShortCode
        const arr  = await apiGet('/compare?isos=' + isos)
        const list = Array.isArray(arr) ? arr : [arr.a, arr.b]
        cmpResult.value = {
          a: { ...list[0], flag: isoFlag(list[0].isoShortCode) },
          b: { ...list[1], flag: isoFlag(list[1].isoShortCode) },
        }
      } catch (e) {
        pushToast('Compare failed: ' + e.message, 'error')
      } finally {
        cmpLoading.value = false
      }
    }

    function setPopular(a, b) {
      const find = iso =>
        allPassports.value.find(p => p.isoShortCode === iso) ||
        { isoShortCode: iso, name: iso, flag: isoFlag(iso) }
      cmpA.value = find(a)
      cmpB.value = find(b)
      runCompare()
    }

    const cmpWinner = computed(() => {
      if (!cmpResult.value) return null
      const { a, b } = cmpResult.value
      if ((a.mobilityScore || 0) > (b.mobilityScore || 0))
        return { winner: a, diff: a.mobilityScore - b.mobilityScore }
      if ((b.mobilityScore || 0) > (a.mobilityScore || 0))
        return { winner: b, diff: b.mobilityScore - a.mobilityScore }
      return { winner: null, diff: 0 }
    })

    function cmpRowWinner(va, vb) {
      return va != null && vb != null && va > vb
    }

    // ── Auth form ────────────────────────────────────
    const authMode    = ref('login')
    const authUser    = ref('')
    const authPass    = ref('')
    const authError   = ref('')
    const authLoading = ref(false)

    async function submitAuth() {
      authError.value = ''
      if (!authUser.value || !authPass.value) { authError.value = 'Fill in all fields'; return }
      authLoading.value = true
      try {
        const path = authMode.value === 'login' ? '/user/login' : '/user/register'
        const data = await apiPost(path, { username: authUser.value, password: authPass.value })
        setAuth(data.token, authUser.value)
        pushToast('Welcome, ' + authUser.value + '!', 'success')
        authUser.value = ''
        authPass.value = ''
        navigate('profile')
      } catch (e) {
        authError.value = e.message || 'Authentication failed'
      } finally {
        authLoading.value = false
      }
    }

    // ── Profile / Stack ──────────────────────────────
    const stack        = ref(null)
    const stackLoading = ref(false)

    async function loadStack() {
      if (!loggedIn.value) return
      stackLoading.value = true
      try {
        stack.value = await apiGet('/stack')
      } catch (e) {
        pushToast('Could not load profile: ' + e.message, 'error')
      } finally {
        stackLoading.value = false
      }
    }

    async function removeMyPassport(iso) {
      try {
        await apiDelete('/user/removePassport?isos=' + iso)
        await loadStack()
        pushToast('Passport removed', 'success')
      } catch (e) { pushToast(e.message, 'error') }
    }

    async function removeMyCountry(iso) {
      try {
        await apiDelete('/user/removeCountry?isos=' + iso)
        await loadStack()
        pushToast('Country removed', 'success')
      } catch (e) { pushToast(e.message, 'error') }
    }

    // ── Modal ────────────────────────────────────────
    const modal = reactive({ open: false, mode: 'passport', query: '', selected: null })

    function openModal(mode) {
      modal.mode     = mode
      modal.query    = ''
      modal.selected = null
      modal.open     = true
    }

    const modalItems = computed(() => {
      const list = allPassports.value
      if (!modal.query) return list.slice(0, 80)
      const q = modal.query.toLowerCase()
      return list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.isoShortCode || '').toLowerCase().startsWith(q)
      ).slice(0, 80)
    })

    async function confirmModal() {
      if (!modal.selected) return
      const iso = modal.selected.isoShortCode
      try {
        if (modal.mode === 'passport') {
          await apiPost('/user/addPassport?isos=' + iso)
          pushToast('Passport added!', 'success')
        } else {
          await apiPost('/user/addCountry?isos=' + iso)
          pushToast('Country added!', 'success')
        }
        modal.open = false
        await loadStack()
      } catch (e) { pushToast(e.message, 'error') }
    }

    // ── Public Profile ───────────────────────────────
    const publicProfile        = ref(null)
    const publicProfileLoading = ref(false)

    async function loadPublicProfile(u) {
      publicProfileLoading.value = true
      publicProfile.value        = null
      try {
        publicProfile.value = await apiGet('/u/' + u)
      } catch (e) {
        pushToast('Profile not found', 'error')
      } finally {
        publicProfileLoading.value = false
      }
    }

    // ── Privacy ──────────────────────────────────────
    const privacySettings = reactive({
      passports:        true,
      visaMap:          true,
      visitedCountries: true,
      visitCounter:     true,
      joinDate:         true,
      bestStats:        true,
      homeCity:         false,
    })

    const PRIVACY_ITEMS = [
      { key: 'passports',        label: 'Passports',        desc: 'Your passport collection'             },
      { key: 'visaMap',          label: 'Visa map',         desc: 'Combined visa access world map'       },
      { key: 'visitedCountries', label: 'Visited countries',desc: 'Countries you have visited'           },
      { key: 'visitCounter',     label: 'Visit counter',    desc: 'Total number of countries visited'    },
      { key: 'joinDate',         label: 'Join date',        desc: 'When you joined PassportRank'         },
      { key: 'bestStats',        label: 'Best rank & stats',desc: 'Your top passport rank & visa-free'   },
      { key: 'homeCity',         label: 'Home city',        desc: 'Your home city location'              },
    ]

    async function togglePrivacy(key) {
      privacySettings[key] = !privacySettings[key]
      const path = key === 'visitedCountries'
        ? '/user/visibility/countries'
        : '/user/visibility/passports'
      try {
        await apiPatch(path, { show: privacySettings[key] })
        pushToast('Privacy updated', 'success')
      } catch (e) {
        privacySettings[key] = !privacySettings[key]
        pushToast(e.message, 'error')
      }
    }

    function copyPublicLink() {
      const url = `passportrank.app/u/${username.value}`
      navigator.clipboard?.writeText(url)
        .then(() => pushToast('Link copied!', 'success'))
        .catch(() => pushToast('Could not copy', 'error'))
    }

    // ── Watchers & Init ──────────────────────────────
    watch([view, params], ([v, p]) => {
      if (v === 'detail'         && p.slug) loadDetail(p.slug)
      if (v === 'public-profile' && p.slug) loadPublicProfile(p.slug)
      if (v === 'profile')                  loadStack()
    }, { deep: true })

    onMounted(() => {
      window.addEventListener('hashchange', readHash)
      readHash()
      loadRankings()
    })

    onUnmounted(() => {
      window.removeEventListener('hashchange', readHash)
    })

    return {
      view, params, navigate,
      token, username, loggedIn, logout,
      toasts, pushToast,
      allPassports, rankingsLoading, searchQuery, sortKey, layoutMode, filteredPassports,
      detail, detailLoading, destFilter, destSearch, DEST_CATS, filteredDests, destCount, addMyPassport,
      cmpA, cmpB, cmpResult, cmpLoading, cmpWinner, runCompare, setPopular, cmpRowWinner,
      authMode, authUser, authPass, authError, authLoading, submitAuth,
      stack, stackLoading, removeMyPassport, removeMyCountry,
      modal, openModal, modalItems, confirmModal,
      publicProfile, publicProfileLoading,
      privacySettings, PRIVACY_ITEMS, togglePrivacy, copyPublicLink,
      isoFlag, MAX_SCORE,
    }
  },

  template: `
<div>

  <!-- ── Navigation ────────────────────────────── -->
  <nav class="nav" id="mainNav">
    <div class="nav-inner">
      <a class="nav-logo" href="#" @click.prevent="navigate('rankings')">
        <div class="logo-icon">🌐</div>
        PassportRank
      </a>
      <div class="nav-links">
        <a class="nav-link" :class="{ active: view === 'rankings' }"
          href="#" @click.prevent="navigate('rankings')">Rankings</a>
        <a class="nav-link" :class="{ active: view === 'compare' }"
          href="#" @click.prevent="navigate('compare')">Compare</a>
        <a class="nav-link" :class="{ active: view === 'profile' || view === 'privacy' }"
          href="#" @click.prevent="loggedIn ? navigate('profile') : navigate('auth')">My Profile</a>
      </div>
      <div class="nav-actions">
        <button v-if="!loggedIn" class="btn-signin" @click="navigate('auth')">Sign In</button>
        <div v-else class="user-chip">
          <span class="user-chip-avatar">{{ username[0]?.toUpperCase() }}</span>
          <span class="user-chip-name">{{ username }}</span>
          <button class="user-chip-logout" @click="logout" title="Sign out">✕</button>
        </div>
      </div>
    </div>
  </nav>

  <!-- ══ RANKINGS ══════════════════════════════ -->
  <div v-show="view === 'rankings'">
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-badge">Updated 2026</div>
        <h1 class="hero-title">Global Passport <em>Power Index</em></h1>
        <p class="hero-subtitle">Discover which passports open the most doors around the world. Real-time visa intelligence for every nationality.</p>
        <div class="hero-search-wrap">
          <input class="hero-search" v-model="searchQuery" type="text"
            placeholder="Search passports by country or ISO code…" autocomplete="off" />
          <button class="hero-search-clear" v-show="searchQuery" @click="searchQuery = ''">✕</button>
        </div>
      </div>
      <div class="hero-stats">
        <span>{{ allPassports.length || 201 }} Passports</span>
        <span class="hero-stats-sep">|</span>
        <span>{{ allPassports[0]?.mobilityScore || 179 }} Top Visa-Free</span>
        <span class="hero-stats-sep">|</span>
        <span>{{ allPassports[0] ? (allPassports[0].flag + ' ' + allPassports[0].name) : '🇸🇬 Singapore' }} — Current Leader</span>
      </div>
    </section>

    <div class="rankings-toolbar">
      <div class="sort-tabs">
        <button class="sort-tab" :class="{ active: sortKey === 'rank' }" @click="sortKey = 'rank'">By Rank</button>
        <button class="sort-tab" :class="{ active: sortKey === 'name' }" @click="sortKey = 'name'">A – Z</button>
        <button class="sort-tab" :class="{ active: sortKey === 'vf' }"   @click="sortKey = 'vf'">Visa-Free</button>
      </div>
      <div class="layout-toggle">
        <button class="layout-btn" :class="{ active: layoutMode === 'grid' }" @click="layoutMode = 'grid'" title="Grid view">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="0" y="0" width="7" height="7" rx="1"/>
            <rect x="9" y="0" width="7" height="7" rx="1"/>
            <rect x="0" y="9" width="7" height="7" rx="1"/>
            <rect x="9" y="9" width="7" height="7" rx="1"/>
          </svg>
        </button>
        <button class="layout-btn" :class="{ active: layoutMode === 'list' }" @click="layoutMode = 'list'" title="List view">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="0" y="0" width="16" height="3" rx="1"/>
            <rect x="0" y="6" width="16" height="3" rx="1"/>
            <rect x="0" y="12" width="16" height="3" rx="1"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="rankings-container">
      <div v-if="rankingsLoading" class="loader-wrap">
        <div class="spinner"></div>
        <p>Loading passports…</p>
      </div>
      <div v-else-if="!filteredPassports.length && searchQuery" class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No results for "{{ searchQuery }}"</h3>
        <p>Try a different country name or ISO code.</p>
      </div>
      <div v-else :class="['passport-grid', layoutMode === 'list' ? 'list-view' : '']">
        <div v-for="p in filteredPassports" :key="p.isoShortCode"
          class="passport-card"
          @click="navigate('detail', { slug: p.isoShortCode })">
          <div class="card-rank-badge" :class="{ 'top-3': p.worldRank <= 3 }">#{{ p.worldRank }}</div>
          <div class="card-flag">{{ p.flag }}</div>
          <div class="card-name">{{ p.name }}</div>
          <div class="card-iso">{{ p.isoShortCode }}</div>
          <div class="card-score">{{ p.mobilityScore }}</div>
          <div class="card-score-label">destinations</div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: Math.round((p.mobilityScore / MAX_SCORE) * 100) + '%' }"></div>
          </div>
          <div class="card-chips">
            <span v-if="p.visaFreeCount"      class="chip chip-vf">VF {{ p.visaFreeCount }}</span>
            <span v-if="p.visaOnArrivalCount" class="chip chip-voa">VoA {{ p.visaOnArrivalCount }}</span>
            <span v-if="p.etaCount"           class="chip chip-ev">eVisa {{ p.etaCount }}</span>
            <span v-if="p.requiredVisaCount"  class="chip chip-vr">VR {{ p.requiredVisaCount }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ DETAIL ════════════════════════════════ -->
  <div v-show="view === 'detail'">
    <div class="detail-breadcrumb">
      <a href="#" @click.prevent="navigate('rankings')">Rankings</a>
      <span>›</span>
      <span>{{ detail?.name || params.slug }}</span>
    </div>

    <div v-if="detailLoading" class="loader-wrap" style="min-height:400px">
      <div class="spinner"></div><p>Loading passport…</p>
    </div>

    <div v-else-if="detail" class="detail-wrap">
      <div class="detail-header">
        <div class="detail-flag">{{ detail.flag }}</div>
        <div class="detail-info">
          <div class="detail-country-name">{{ detail.name }}</div>
          <div class="detail-iso">{{ detail.isoShortCode }}</div>
          <div class="detail-rank-badge">🏆 World Rank #{{ detail.worldRank }}</div>
        </div>
        <div class="detail-actions">
          <button class="btn-add-passport" @click="addMyPassport(detail.isoShortCode)">
            ＋ Add to my passports
          </button>
        </div>
      </div>

      <div class="detail-stat-row">
        <div v-for="cat in DEST_CATS" :key="cat.key"
          class="detail-stat-cell"
          :class="[cat.statCls, { active: destFilter === cat.key }]"
          @click="destFilter = cat.key; destSearch = ''">
          <div class="detail-stat-number">{{ destCount(cat) }}</div>
          <div class="detail-stat-label">{{ cat.label }}</div>
        </div>
      </div>

      <div class="destinations-card">
        <div class="destinations-header">
          <h3 class="destinations-title">
            Destinations &nbsp;
            <span class="chip" :class="DEST_CATS.find(c => c.key === destFilter)?.cls">{{ destFilter }}</span>
          </h3>
          <input class="form-input" v-model="destSearch" placeholder="Search destinations…"
            style="max-width:220px;padding:8px 12px;font-size:13px" />
        </div>
        <div class="dest-filter-chips">
          <span v-for="cat in DEST_CATS" :key="cat.key"
            class="chip" :class="cat.cls"
            :style="{ cursor:'pointer', padding:'5px 12px', fontSize:'12px', opacity: destFilter === cat.key ? 1 : 0.6 }"
            @click="destFilter = cat.key; destSearch = ''">
            {{ cat.label }} ({{ destCount(cat) }})
          </span>
        </div>
        <div class="dest-list">
          <div v-for="d in filteredDests" :key="d.isoShortCode" class="dest-item">
            <span class="dest-flag">{{ isoFlag(d.isoShortCode) }}</span>
            <span class="dest-name">{{ d.name }}</span>
            <span class="dest-iso">{{ d.isoShortCode }}</span>
          </div>
          <div v-if="!filteredDests.length" class="empty-state" style="padding:32px">
            <div class="empty-icon">🌍</div>
            <p>No destinations found</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ COMPARE ═══════════════════════════════ -->
  <div v-show="view === 'compare'">
    <div class="compare-hero">
      <div class="compare-hero-inner">
        <div class="compare-hero-badge">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="#93c5fd" stroke-width="1.5"/>
            <line x1="6" y1="1" x2="6" y2="11" stroke="#93c5fd" stroke-width="1.5"/>
            <line x1="1" y1="6" x2="11" y2="6" stroke="#93c5fd" stroke-width="1.5"/>
          </svg>
          Visa Intelligence
        </div>
        <h1 class="compare-hero-title">Compare <em>Passport</em> Power</h1>
        <p class="compare-hero-sub">See exactly how any two passports stack up — visa-free access, on-arrival routes, and global rank.</p>
      </div>
    </div>

    <div class="compare-wrap">
      <div class="compare-picker-card">
        <div class="compare-picker-slot">
          <div class="compare-picker-flag-wrap" :class="{ empty: !cmpA, active: !!cmpA }">
            <span class="compare-picker-flag">
              {{ cmpA ? (cmpA.flag || isoFlag(cmpA.isoShortCode)) : '+' }}
            </span>
          </div>
          <div class="compare-picker-body">
            <div class="compare-picker-label">Passport A</div>
            <country-picker v-model="cmpA" :options="allPassports" placeholder="Search country…" />
          </div>
        </div>

        <div class="compare-vs-col">
          <div class="compare-vs-ring">VS</div>
          <button class="btn-primary compare-go-btn" @click="runCompare"
            :disabled="cmpLoading || !cmpA || !cmpB">
            {{ cmpLoading ? 'Comparing…' : 'Compare' }}
          </button>
        </div>

        <div class="compare-picker-slot">
          <div class="compare-picker-flag-wrap" :class="{ empty: !cmpB, active: !!cmpB }">
            <span class="compare-picker-flag">
              {{ cmpB ? (cmpB.flag || isoFlag(cmpB.isoShortCode)) : '+' }}
            </span>
          </div>
          <div class="compare-picker-body">
            <div class="compare-picker-label">Passport B</div>
            <country-picker v-model="cmpB" :options="allPassports" placeholder="Search country…" />
          </div>
        </div>
      </div>

      <div class="compare-popular">
        <span class="compare-popular-label">Popular</span>
        <div class="compare-popular-chips">
          <button class="popular-chip" @click="setPopular('SG','JP')">🇸🇬 Singapore vs 🇯🇵 Japan</button>
          <button class="popular-chip" @click="setPopular('DE','US')">🇩🇪 Germany vs 🇺🇸 USA</button>
          <button class="popular-chip" @click="setPopular('GB','FR')">🇬🇧 UK vs 🇫🇷 France</button>
          <button class="popular-chip" @click="setPopular('AU','CA')">🇦🇺 Australia vs 🇨🇦 Canada</button>
          <button class="popular-chip" @click="setPopular('CN','IN')">🇨🇳 China vs 🇮🇳 India</button>
        </div>
      </div>

      <div v-if="cmpLoading" class="loader-wrap" style="min-height:300px">
        <div class="spinner"></div><p>Comparing passports…</p>
      </div>

      <div v-else-if="cmpResult">
        <div class="winner-banner">
          <div class="winner-flags">
            <span>{{ cmpResult.a.flag }}</span>
            <span class="winner-vs">VS</span>
            <span>{{ cmpResult.b.flag }}</span>
          </div>
          <div class="winner-names">
            <span class="winner-name"
              :class="{ winner: cmpWinner?.winner?.isoShortCode === cmpResult.a.isoShortCode }">
              {{ cmpResult.a.name }}
            </span>
            <span style="color:rgba(255,255,255,.4);font-size:14px">vs</span>
            <span class="winner-name"
              :class="{ winner: cmpWinner?.winner?.isoShortCode === cmpResult.b.isoShortCode }">
              {{ cmpResult.b.name }}
            </span>
          </div>
          <template v-if="cmpWinner?.winner">
            <div class="winner-announce">🏆 {{ cmpWinner.winner.name }} wins</div>
            <div class="winner-diff">+{{ cmpWinner.diff }} more destinations</div>
          </template>
          <div v-else class="winner-announce">It's a tie! 🤝</div>
        </div>

        <table class="compare-table">
          <thead>
            <tr>
              <th style="width:28%">Category</th>
              <th>{{ cmpResult.a.flag }} {{ cmpResult.a.name }}</th>
              <th>{{ cmpResult.b.flag }} {{ cmpResult.b.name }}</th>
              <th style="width:80px">Diff</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in [
              { label:'Total Destinations', a: cmpResult.a.mobilityScore,      b: cmpResult.b.mobilityScore },
              { label:'Visa Free',          a: cmpResult.a.visaFreeCount,      b: cmpResult.b.visaFreeCount },
              { label:'Visa on Arrival',    a: cmpResult.a.visaOnArrivalCount, b: cmpResult.b.visaOnArrivalCount },
              { label:'E-Visa',             a: cmpResult.a.etaCount,           b: cmpResult.b.etaCount },
              { label:'Visa Required',      a: cmpResult.a.requiredVisaCount,  b: cmpResult.b.requiredVisaCount },
            ]" :key="row.label" :class="{ 'row-winner': cmpRowWinner(row.a, row.b) }">
              <td style="font-weight:600;color:rgba(255,255,255,.9)">{{ row.label }}</td>
              <td style="font-weight:700;color:#fff">{{ row.a ?? '—' }}</td>
              <td style="font-weight:700;color:#fff">{{ row.b ?? '—' }}</td>
              <td>
                <span v-if="row.a != null && row.b != null && row.a !== row.b"
                  :class="row.a > row.b ? 'diff-pos' : 'diff-neg'">
                  {{ row.a > row.b ? '+' : '−' }}{{ Math.abs(row.a - row.b) }}
                </span>
                <span v-else style="color:rgba(255,255,255,.3)">—</span>
              </td>
            </tr>
            <tr>
              <td style="font-weight:600;color:rgba(255,255,255,.9)">Global Rank</td>
              <td style="font-weight:700;color:#fbbf24">#{{ cmpResult.a.worldRank }}</td>
              <td style="font-weight:700;color:#fbbf24">#{{ cmpResult.b.worldRank }}</td>
              <td><span style="color:rgba(255,255,255,.3)">—</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ══ AUTH ══════════════════════════════════ -->
  <div v-show="view === 'auth'">
    <div class="auth-split">
      <div class="auth-left">
        <div class="auth-left-inner">
          <div class="auth-logo">🌐 PassportRank</div>
          <h2 class="auth-headline">Your personal passport collection, visualized.</h2>
          <p class="auth-desc">Track every passport you hold, every country you've visited, and discover where you can travel — all in one place.</p>
          <div class="auth-stats">
            <div class="auth-stat">
              <span class="auth-stat-n">201</span>
              <span class="auth-stat-l">Passports tracked</span>
            </div>
            <div class="auth-stat">
              <span class="auth-stat-n">40K+</span>
              <span class="auth-stat-l">Visa routes mapped</span>
            </div>
            <div class="auth-stat">
              <span class="auth-stat-n">195</span>
              <span class="auth-stat-l">Countries covered</span>
            </div>
          </div>
        </div>
      </div>
      <div class="auth-right">
        <div class="auth-form-wrap">
          <div class="auth-tabs">
            <button class="auth-tab" :class="{ active: authMode === 'login' }"
              @click="authMode = 'login'; authError = ''">Sign In</button>
            <button class="auth-tab" :class="{ active: authMode === 'register' }"
              @click="authMode = 'register'; authError = ''">Register</button>
          </div>
          <h3 class="auth-form-title">{{ authMode === 'login' ? 'Welcome back' : 'Create account' }}</h3>
          <p class="auth-form-sub">{{ authMode === 'login' ? 'Sign in to manage your passports.' : 'Join thousands of travelers.' }}</p>
          <form class="auth-form" @submit.prevent="submitAuth">
            <div class="form-group">
              <label class="form-label">Username</label>
              <input class="form-input" v-model="authUser" type="text"
                placeholder="Enter username" autocomplete="username" required />
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input class="form-input" v-model="authPass" type="password"
                placeholder="Enter password" autocomplete="current-password" required />
            </div>
            <div v-if="authError" class="form-error">{{ authError }}</div>
            <button class="btn-primary btn-full" type="submit" :disabled="authLoading">
              {{ authLoading ? 'Please wait…' : (authMode === 'login' ? 'Sign In' : 'Create Account') }}
            </button>
          </form>
          <p class="auth-switch">
            <template v-if="authMode === 'login'">
              Don't have an account?
              <a href="#" @click.prevent="authMode = 'register'; authError = ''">Register</a>
            </template>
            <template v-else>
              Already have an account?
              <a href="#" @click.prevent="authMode = 'login'; authError = ''">Sign In</a>
            </template>
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ PROFILE ════════════════════════════════ -->
  <div v-show="view === 'profile'">
    <div v-if="!loggedIn" style="text-align:center;padding:80px 24px">
      <div style="font-size:56px;margin-bottom:20px">🔒</div>
      <h2 style="margin-bottom:12px;font-size:1.6rem;font-weight:800">Sign in to view your profile</h2>
      <p style="color:var(--c-muted);margin-bottom:24px">Track your passports and travel history.</p>
      <button class="btn-primary" @click="navigate('auth')">Sign In</button>
    </div>

    <div v-else-if="stackLoading" class="loader-wrap" style="min-height:400px">
      <div class="spinner"></div><p>Loading your profile…</p>
    </div>

    <div v-else>
      <div class="profile-hero">
        <div class="profile-hero-top">
          <div class="profile-avatar">{{ username[0]?.toUpperCase() }}</div>
          <div class="profile-info">
            <div class="profile-name">{{ username }}</div>
            <div class="profile-handle">@{{ username }}</div>
            <div class="profile-meta-row">
              <div class="profile-meta-item">
                <strong>{{ stack?.passports?.length || 0 }}</strong>
                <span>Passports</span>
              </div>
              <div class="profile-meta-item">
                <strong>{{ stack?.visitedCountries?.length || 0 }}</strong>
                <span>Countries Visited</span>
              </div>
              <div class="profile-meta-item">
                <strong>{{ stack?.visaFreeCount || 0 }}</strong>
                <span>Visa-Free Access</span>
              </div>
              <div class="profile-meta-item">
                <strong>{{ stack?.mobilityScore || 0 }}</strong>
                <span>Total Destinations</span>
              </div>
            </div>
          </div>
          <div class="profile-hero-actions">
            <button class="btn-outline" @click="navigate('privacy')">⚙ Privacy settings</button>
          </div>
        </div>
      </div>

      <div class="profile-body">
        <div class="profile-columns">
          <!-- My Passports -->
          <div class="profile-panel">
            <div class="profile-panel-head">
              <span>My Passports</span>
              <button class="profile-panel-action" @click="openModal('passport')">＋ Add passport</button>
            </div>
            <div v-if="!(stack?.passports?.length)" class="empty-state" style="padding:24px">
              <div class="empty-icon">🛂</div>
              <p>No passports yet. Add one!</p>
            </div>
            <div v-else class="passport-mini-list">
              <div v-for="p in (stack?.passports || [])" :key="p.isoShortCode" class="passport-mini">
                <span class="passport-mini-flag">{{ isoFlag(p.isoShortCode) }}</span>
                <div class="passport-mini-info">
                  <strong>{{ p.name }}</strong>
                  <span v-if="p.worldRank">Rank #{{ p.worldRank }} · {{ p.mobilityScore }} destinations</span>
                </div>
                <button class="passport-mini-remove" @click="removeMyPassport(p.isoShortCode)" title="Remove">✕</button>
              </div>
            </div>
          </div>

          <!-- Travel stats -->
          <div class="profile-panel">
            <div class="profile-panel-head"><span>Travel Stats</span></div>
            <div class="stats-bars">
              <div v-for="s in [
                { l:'Visa-Free Access', v: stack?.visaFreeCount,      bar:'var(--vf)'  },
                { l:'Visa on Arrival',  v: stack?.visaOnArrivalCount, bar:'var(--voa)' },
                { l:'E-Visa',           v: stack?.etaCount,           bar:'var(--ev)'  },
                { l:'Visa Required',    v: stack?.requiredVisaCount,  bar:'var(--vr)'  },
              ]" :key="s.l" class="stat-bar-row">
                <div class="stat-bar-label">
                  <span>{{ s.l }}</span>
                  <strong>{{ s.v ?? '—' }}</strong>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: s.v ? Math.round(s.v/195*100)+'%':'0%', background: s.bar }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Visited countries -->
          <div class="profile-panel" style="grid-column:1/-1">
            <div class="profile-panel-head">
              <span>Visited Countries</span>
              <button class="profile-panel-action" @click="openModal('country')">＋ Add country</button>
            </div>
            <div v-if="!(stack?.visitedCountries?.length)" class="empty-state" style="padding:24px">
              <div class="empty-icon">🌍</div>
              <p>No visited countries yet. Start adding!</p>
            </div>
            <div v-else class="country-chips-wrap">
              <span v-for="c in (stack?.visitedCountries || [])" :key="c.isoShortCode" class="country-chip">
                {{ isoFlag(c.isoShortCode) }} {{ c.name }}
                <button @click="removeMyCountry(c.isoShortCode)" title="Remove">✕</button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ PUBLIC PROFILE ════════════════════════ -->
  <div v-show="view === 'public-profile'">
    <div v-if="publicProfileLoading" class="loader-wrap" style="min-height:400px">
      <div class="spinner"></div><p>Loading profile…</p>
    </div>
    <div v-else-if="publicProfile" class="detail-wrap">
      <div class="profile-hero">
        <div class="profile-hero-top">
          <div class="profile-avatar">{{ publicProfile.username?.[0]?.toUpperCase() }}</div>
          <div class="profile-info">
            <div class="profile-name">{{ publicProfile.username }}</div>
            <div class="profile-handle">@{{ publicProfile.username }} · public profile</div>
          </div>
        </div>
      </div>
      <div style="padding:24px;color:var(--c-muted)">Public profile data loaded.</div>
    </div>
    <div v-else class="empty-state" style="padding:80px 24px;text-align:center">
      <div class="empty-icon">👤</div>
      <h3>Profile not found</h3>
      <button class="btn-primary" style="margin-top:16px" @click="navigate('rankings')">Go to Rankings</button>
    </div>
  </div>

  <!-- ══ PRIVACY ════════════════════════════════ -->
  <div v-show="view === 'privacy'">
    <div class="privacy-wrap">
      <div class="detail-breadcrumb" style="padding:20px 0 0">
        <a href="#" @click.prevent="navigate('profile')">Profile</a>
        <span>›</span>
        <span>Privacy Settings</span>
      </div>
      <h1 class="privacy-title">Privacy Settings</h1>
      <p class="privacy-subtitle">Control what others can see when they visit your public profile.</p>

      <div class="card privacy-card">
        <h3 class="privacy-card-title">Public link</h3>
        <div class="public-link-row">
          <span class="public-link-url">passportrank.app/u/{{ username }}</span>
          <button class="btn-outline" @click="copyPublicLink">Copy</button>
        </div>
      </div>

      <div class="card privacy-card">
        <h3 class="privacy-card-title">What others can see</h3>
        <div class="toggle-list">
          <div v-for="item in PRIVACY_ITEMS" :key="item.key" class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-label">{{ item.label }}</span>
              <span class="toggle-desc">{{ item.desc }}</span>
            </div>
            <div class="toggle-pill" :class="{ on: privacySettings[item.key] }"
              @click="togglePrivacy(item.key)">
              <span class="toggle-pill-label">{{ privacySettings[item.key] ? 'On' : 'Off' }}</span>
              <span class="toggle-knob"></span>
            </div>
          </div>
        </div>
      </div>

      <div class="card privacy-card danger-zone">
        <h3 class="privacy-card-title danger-title">Danger Zone</h3>
        <p class="privacy-card-desc">Hide your profile from all public access. Only you will be able to see it.</p>
        <button class="btn-danger">Make profile fully private</button>
      </div>
    </div>
  </div>

  <!-- ── Footer ─────────────────────────────────── -->
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-logo">🌐 PassportRank</div>
      <p class="footer-copy">© 2026 PassportRank. Visa data is for informational purposes only.</p>
      <div class="footer-links">
        <a href="#">About</a>
        <a href="#">Data Sources</a>
        <a href="#" @click.prevent="navigate('privacy')">Privacy</a>
      </div>
    </div>
  </footer>

  <!-- ── Modal ──────────────────────────────────── -->
  <div v-if="modal.open" class="modal-overlay" @click.self="modal.open = false">
    <div class="modal-card">
      <div class="modal-header">
        <h2 class="modal-title">{{ modal.mode === 'passport' ? 'Add a passport' : 'Add visited country' }}</h2>
        <button class="modal-close" @click="modal.open = false">✕</button>
      </div>
      <div class="modal-tabs">
        <button class="modal-tab" :class="{ active: modal.mode === 'passport' }"
          @click="modal.mode = 'passport'; modal.selected = null">🛂 Passport</button>
        <button class="modal-tab" :class="{ active: modal.mode === 'country' }"
          @click="modal.mode = 'country'; modal.selected = null">🌍 Visited country</button>
      </div>
      <div class="modal-search-wrap">
        <input class="modal-search" v-model="modal.query" type="text" placeholder="Search…" autocomplete="off" />
      </div>
      <div class="modal-grid">
        <div v-for="p in modalItems" :key="p.isoShortCode"
          class="modal-item"
          :class="{ selected: modal.selected?.isoShortCode === p.isoShortCode }"
          @click="modal.selected = p">
          <span class="modal-item-flag">{{ p.flag }}</span>
          <span class="modal-item-name">{{ p.name }}</span>
          <span class="modal-item-meta">{{ p.isoShortCode }}{{ p.worldRank ? ' · #' + p.worldRank : '' }}</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-primary" :disabled="!modal.selected" @click="confirmModal">
          ＋ Add {{ modal.mode === 'passport' ? 'to my passports' : 'visited country' }}
        </button>
      </div>
    </div>
  </div>

  <!-- ── Toasts ─────────────────────────────────── -->
  <div class="toast-wrap">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">{{ t.msg }}</div>
  </div>

</div>
  `
}).mount('#app')
