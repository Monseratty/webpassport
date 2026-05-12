/* PassportRank — Vue.js 3 CDN SPA */
const { createApp, ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } = Vue

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

// ─── Translations ─────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    nav_rankings: 'Rankings', nav_compare: 'Compare', nav_profile: 'My Profile', nav_signin: 'Sign In',
    hero_badge: 'Updated 2026', hero_title: 'Global Passport', hero_title_em: 'Power Index',
    hero_sub: 'Discover which passports open the most doors around the world.',
    hero_passports: 'Passports', hero_top_vf: 'Top Visa-Free', hero_leader: 'Current Leader',
    sort_rank: 'By Rank', sort_az: 'A – Z', sort_vf: 'Visa-Free',
    search_ph: 'Search passports by country or ISO code…', search_country: 'Search country…',
    destinations: 'destinations', loading: 'Loading…',
    compare_badge: 'Visa Intelligence', compare_title: 'Compare', compare_title_em: 'Passport Power',
    compare_sub: 'See exactly how any two passports stack up — visa-free access, on-arrival routes, and global rank.',
    passport_a: 'Passport A', passport_b: 'Passport B',
    popular: 'Popular', compare_btn: 'Compare', comparing: 'Comparing…',
    cat_total: 'Total Destinations', cat_vf: 'Visa Free', cat_voa: 'Visa on Arrival', cat_ev: 'E-Visa', cat_vr: 'Visa Required',
    winner_wins: 'wins', tie: "It's a tie! 🤝", global_rank: 'Global Rank',
    visa_map: 'Visa map', visa_map_sub: 'where this passport can travel',
    auth_signin: 'Sign In', auth_register: 'Register', auth_username: 'Username', auth_password: 'Password',
    auth_welcome: 'Welcome back', auth_create: 'Create account',
    auth_signin_sub: 'Sign in to manage your passports.', auth_create_sub: 'Join thousands of travelers.',
    auth_no_acc: "Don't have an account?", auth_have_acc: 'Already have an account?',
    profile_my_passports: 'My Passports', profile_visited: 'Visited Countries',
    profile_stats: 'Travel Stats', add_passport: '＋ Add passport', add_country: '＋ Add country',
    privacy_title: 'Privacy Settings', privacy_sub: 'Control what others can see when they visit your public profile.',
    privacy_public_link: 'Public link', copy: 'Copy', privacy_what: 'What others can see',
    danger_zone: 'Danger Zone', make_private: 'Make profile fully private',
    footer_copy: '© 2026 PassportRank. Visa data is for informational purposes only.',
    rank_label: 'World Rank', add_to_my: '＋ Add to my passports',
    dest_title: 'Destinations', search_dest: 'Search destinations…',
    no_results: 'No results', no_dest: 'No destinations found',
    sign_in_to_view: 'Sign in to view your profile',
  },
  ru: {
    nav_rankings: 'Рейтинг', nav_compare: 'Сравнение', nav_profile: 'Мой профиль', nav_signin: 'Войти',
    hero_badge: 'Обновлено 2026', hero_title: 'Глобальный индекс', hero_title_em: 'силы паспорта',
    hero_sub: 'Узнайте, какие паспорта открывают больше всего дверей по всему миру.',
    hero_passports: 'Паспортов', hero_top_vf: 'Без визы (топ)', hero_leader: 'Лидер',
    sort_rank: 'По рейтингу', sort_az: 'А – Я', sort_vf: 'Без визы',
    search_ph: 'Поиск по стране или ISO-коду…', search_country: 'Поиск страны…',
    destinations: 'направлений', loading: 'Загрузка…',
    compare_badge: 'Виза-аналитика', compare_title: 'Сравните', compare_title_em: 'силу паспортов',
    compare_sub: 'Посмотрите, как два паспорта соотносятся по безвизовому доступу, по прилёту и рейтингу.',
    passport_a: 'Паспорт A', passport_b: 'Паспорт B',
    popular: 'Популярные', compare_btn: 'Сравнить', comparing: 'Сравниваем…',
    cat_total: 'Всего направлений', cat_vf: 'Без визы', cat_voa: 'По прилёту', cat_ev: 'Эл. виза', cat_vr: 'Нужна виза',
    winner_wins: 'побеждает', tie: 'Ничья! 🤝', global_rank: 'Мировой рейтинг',
    visa_map: 'Визовая карта', visa_map_sub: 'куда можно путешествовать',
    auth_signin: 'Войти', auth_register: 'Регистрация', auth_username: 'Имя пользователя', auth_password: 'Пароль',
    auth_welcome: 'С возвращением', auth_create: 'Создать аккаунт',
    auth_signin_sub: 'Войдите для управления паспортами.', auth_create_sub: 'Присоединяйтесь к тысячам путешественников.',
    auth_no_acc: 'Нет аккаунта?', auth_have_acc: 'Уже есть аккаунт?',
    profile_my_passports: 'Мои паспорта', profile_visited: 'Посещённые страны',
    profile_stats: 'Статистика', add_passport: '＋ Добавить паспорт', add_country: '＋ Добавить страну',
    privacy_title: 'Настройки приватности', privacy_sub: 'Управляйте тем, что видят другие в вашем профиле.',
    privacy_public_link: 'Публичная ссылка', copy: 'Скопировать', privacy_what: 'Что видят другие',
    danger_zone: 'Опасная зона', make_private: 'Сделать профиль приватным',
    footer_copy: '© 2026 PassportRank. Данные о визах носят информационный характер.',
    rank_label: 'Мировой рейтинг', add_to_my: '＋ Добавить в мои паспорта',
    dest_title: 'Направления', search_dest: 'Поиск направлений…',
    no_results: 'Нет результатов', no_dest: 'Направлений не найдено',
    sign_in_to_view: 'Войдите чтобы увидеть профиль',
  }
}

// ─── CountryPicker (Options API — reliable in CDN) ────────────
const CountryPicker = {
  name: 'CountryPicker',
  props: {
    modelValue:  { default: null },
    options:     { default: () => [] },
    placeholder: { default: 'Search country…' },
    lang:        { default: 'en' }
  },
  emits: ['update:modelValue'],
  data() { return { open: false, query: '' } },
  computed: {
    filtered() {
      const list = this.options
      if (!list.length) return []
      if (!this.query) return list.slice(0, 100)
      const q = this.query.toLowerCase()
      return list.filter(o =>
        (o.name || '').toLowerCase().includes(q) ||
        (o.isoShortCode || '').toLowerCase().startsWith(q)
      ).slice(0, 100)
    },
    ph() { return TRANSLATIONS[this.lang]?.search_country || this.placeholder }
  },
  methods: {
    flag(iso) { return isoFlag(iso) },
    toggle() {
      this.open = !this.open
      if (this.open) nextTick(() => { this.$refs.si && this.$refs.si.focus() })
    },
    select(opt) {
      this.$emit('update:modelValue', opt)
      this.open = false
      this.query = ''
    },
    outside(e) { if (!this.$el.contains(e.target)) this.open = false }
  },
  mounted()      { document.addEventListener('click', this.outside) },
  beforeUnmount(){ document.removeEventListener('click', this.outside) },
  template: `
<div class="cpick" :class="{ 'cpick--open': open }">
  <button type="button" class="cpick-trigger" @click.stop="toggle">
    <span v-if="modelValue" class="cpick-selected">
      <span class="cpick-flag">{{ modelValue.flag || flag(modelValue.isoShortCode) }}</span>
      <span class="cpick-name">{{ modelValue.name }}</span>
    </span>
    <span v-else class="cpick-placeholder">{{ ph }}</span>
    <svg class="cpick-chevron" width="12" height="8" viewBox="0 0 12 8" fill="none">
      <path d="M1 1.5l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
  <div v-if="open" class="cpick-dropdown" @click.stop>
    <div class="cpick-search-wrap">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style="flex-shrink:0;color:rgba(255,255,255,.4)">
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.8"/>
        <path d="M14 14l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <input ref="si" class="cpick-search" v-model="query" :placeholder="ph" @keydown.esc.stop="open=false" />
    </div>
    <div class="cpick-list">
      <div v-for="opt in filtered" :key="opt.isoShortCode"
        class="cpick-item" :class="{'cpick-item--sel': modelValue && modelValue.isoShortCode === opt.isoShortCode}"
        @click="select(opt)">
        <span class="cpick-item-flag">{{ opt.flag || flag(opt.isoShortCode) }}</span>
        <span class="cpick-item-name">{{ opt.name }}</span>
        <span v-if="opt.worldRank" class="cpick-item-rank">#{{ opt.worldRank }}</span>
      </div>
      <div v-if="!filtered.length" class="cpick-empty">{{ lang === 'ru' ? 'Нет результатов' : 'No results' }}</div>
    </div>
  </div>
</div>`
}

// ─── VectorMap (wraps jsvectormap) ────────────────────────────
const VectorMap = {
  name: 'VectorMap',
  props: {
    series: { default: () => ({}) },
    height: { default: '320px' }
  },
  data() { return { uid: 'vm' + Math.random().toString(36).slice(2) } },
  watch: {
    series: {
      deep: true,
      handler() { this.applyColors() }
    }
  },
  mounted() { nextTick(() => this.init()) },
  beforeUnmount() {
    try { if (this._map) { this._map.destroy(); this._map = null } } catch {}
  },
  methods: {
    COLORS() {
      return { vf: '#22c55e', voa: '#3b82f6', ev: '#eab308', vr: '#ef4444', own: '#15803d', visited: '#a855f7' }
    },
    applyColors() {
      const container = document.getElementById(this.uid)
      if (!container) return
      const C = this.COLORS()
      // reset all paths to base fill
      container.querySelectorAll('path.jvm-region').forEach(p => {
        p.setAttribute('fill', '#1e293b')
        p.style.fill = ''
      })
      // apply visa colors via data-code attribute
      Object.entries(this.series).forEach(([iso, type]) => {
        const color = C[type]
        if (!color) return
        const path = container.querySelector(`[data-code="${iso}"]`)
        if (path) {
          path.setAttribute('fill', color)
          path.style.fill = color
        }
      })
    },
    init() {
      if (typeof jsVectorMap === 'undefined') {
        setTimeout(() => this.init(), 300); return
      }
      const el = this.$el
      if (!el || el.offsetWidth === 0) { setTimeout(() => this.init(), 300); return }
      try {
        this._map = new jsVectorMap({
          selector: '#' + this.uid,
          map: 'world',
          backgroundColor: 'transparent',
          zoomOnScroll: false,
          regionStyle: {
            initial: { fill: '#1e293b', stroke: '#0f172a', strokeWidth: 0.5 },
            hover:   { fillOpacity: 0.75 }
          }
        })
        // wait one frame so jsvectormap finishes painting SVG paths
        requestAnimationFrame(() => this.applyColors())
      } catch (e) { console.warn('VectorMap init error', e) }
    }
  },
  template: `<div :id="uid" :style="{ height, width: '100%' }"></div>`
}

// ─── Main App ─────────────────────────────────────────────────
createApp({
  components: { CountryPicker, VectorMap },

  setup() {
    // ── Language ────────────────────────────────────
    const lang = ref(localStorage.getItem('pr_lang') || 'en')
    const t = key => TRANSLATIONS[lang.value]?.[key] ?? TRANSLATIONS.en[key] ?? key
    function toggleLang() {
      lang.value = lang.value === 'en' ? 'ru' : 'en'
      localStorage.setItem('pr_lang', lang.value)
    }

    // ── Router ──────────────────────────────────────
    const view   = ref('rankings')
    const params = ref({})
    const VIEWS  = ['rankings','detail','compare','auth','profile','public-profile','privacy']

    function navigate(v, p = {}) {
      view.value   = v
      params.value = p
      window.scrollTo({ top: 0, behavior: 'smooth' })
      history.replaceState(null, '', '#' + v + (p.slug ? '/' + p.slug : ''))
    }

    function readHash() {
      const h = location.hash.replace('#', '') || 'rankings'
      const [v, ...rest] = h.split('/')
      if (VIEWS.includes(v)) { view.value = v; params.value = rest.length ? { slug: rest.join('/') } : {} }
    }

    // ── Auth ────────────────────────────────────────
    const token    = _token
    const username = ref(localStorage.getItem('pr_user') || '')
    const loggedIn = computed(() => !!token.value && !!username.value)

    function setAuth(tk, u) {
      token.value = tk; username.value = u
      localStorage.setItem('pr_token', tk); localStorage.setItem('pr_user', u)
    }
    function logout() {
      token.value = ''; username.value = ''
      localStorage.removeItem('pr_token'); localStorage.removeItem('pr_user')
      navigate('rankings')
      pushToast(lang.value === 'ru' ? 'Вы вышли' : 'Signed out', 'info')
    }

    // ── Toast ───────────────────────────────────────
    const toasts = ref([])
    let toastSeq = 0
    function pushToast(msg, type = 'info') {
      const id = ++toastSeq
      toasts.value.push({ id, msg, type })
      setTimeout(() => { const i = toasts.value.findIndex(x => x.id === id); if (i !== -1) toasts.value.splice(i, 1) }, 3500)
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
        list = list.filter(p => (p.name || '').toLowerCase().includes(q) || (p.isoShortCode || '').toLowerCase().startsWith(q))
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
        allPassports.value = (data.passports || []).map(p => ({ ...p, flag: isoFlag(p.isoShortCode) }))
      } catch (e) { pushToast('Could not load rankings: ' + e.message, 'error') }
      finally { rankingsLoading.value = false }
    }

    // ── Passport Detail ─────────────────────────────
    const detail        = ref(null)
    const detailLoading = ref(false)
    const destFilter    = ref('Visa free')
    const destSearch    = ref('')

    const DEST_CATS = [
      { key: 'Visa free',       tKey: 'cat_vf',  cls: 'chip-vf',  statCls: 'stat-vf'  },
      { key: 'Visa on arrival', tKey: 'cat_voa', cls: 'chip-voa', statCls: 'stat-voa' },
      { key: 'ETA',             tKey: 'cat_ev',  cls: 'chip-ev',  statCls: 'stat-ev'  },
      { key: 'Visa required',   tKey: 'cat_vr',  cls: 'chip-vr',  statCls: 'stat-vr'  },
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
      if (cat.key === 'Visa free')       return detail.value.visaFreeCount || 0
      if (cat.key === 'Visa on arrival') return detail.value.visaOnArrivalCount || 0
      if (cat.key === 'ETA')              return detail.value.etaCount || 0
      return detail.value.requiredVisaCount || 0
    }

    const detailMapSeries = computed(() => {
      if (!detail.value?.destinations) return {}
      const s = {}
      ;(detail.value.destinations['Visa free']       || []).forEach(d => { s[d.isoShortCode] = 'vf'  })
      ;(detail.value.destinations['Visa on arrival'] || []).forEach(d => { s[d.isoShortCode] = 'voa' })
      ;(detail.value.destinations['ETA']             || []).forEach(d => { s[d.isoShortCode] = 'ev'  })
      ;(detail.value.destinations['Visa required']  || []).forEach(d => { s[d.isoShortCode] = 'vr'  })
      if (detail.value.isoShortCode) s[detail.value.isoShortCode] = 'own'
      return s
    })

    async function loadDetail(iso) {
      detailLoading.value = true; detail.value = null
      destFilter.value = 'Visa free'; destSearch.value = ''
      try {
        const p = await apiGet('/passport/' + iso)
        detail.value = { ...p, flag: isoFlag(p.isoShortCode) }
      } catch (e) { pushToast('Could not load passport: ' + e.message, 'error') }
      finally { detailLoading.value = false }
    }

    async function addMyPassport(iso) {
      if (!loggedIn.value) { navigate('auth'); return }
      try { await apiPost('/user/addPassport?isos=' + iso); pushToast(lang.value === 'ru' ? 'Паспорт добавлен!' : 'Passport added!', 'success') }
      catch (e) { pushToast(e.message, 'error') }
    }

    // ── Compare ─────────────────────────────────────
    const cmpA       = ref(null)
    const cmpB       = ref(null)
    const cmpResult  = ref(null)
    const cmpLoading = ref(false)

    function buildMapSeries(passport) {
      if (!passport?.destinations) return {}
      const s = {}
      ;(passport.destinations['Visa free']       || []).forEach(d => { s[d.isoShortCode] = 'vf'  })
      ;(passport.destinations['Visa on arrival'] || []).forEach(d => { s[d.isoShortCode] = 'voa' })
      ;(passport.destinations['ETA']             || []).forEach(d => { s[d.isoShortCode] = 'ev'  })
      ;(passport.destinations['Visa required']  || []).forEach(d => { s[d.isoShortCode] = 'vr'  })
      if (passport.isoShortCode) s[passport.isoShortCode] = 'own'
      return s
    }
    const cmpMapA = computed(() => buildMapSeries(cmpResult.value?.a))
    const cmpMapB = computed(() => buildMapSeries(cmpResult.value?.b))

    async function runCompare() {
      if (!cmpA.value || !cmpB.value) {
        pushToast(lang.value === 'ru' ? 'Выберите два паспорта' : 'Select two passports first', 'warn'); return
      }
      cmpLoading.value = true; cmpResult.value = null
      try {
        const isos = cmpA.value.isoShortCode + ',' + cmpB.value.isoShortCode
        const arr  = await apiGet('/compare?isos=' + isos)
        const list = Array.isArray(arr) ? arr : [arr.a, arr.b]
        cmpResult.value = {
          a: { ...list[0], flag: isoFlag(list[0].isoShortCode) },
          b: { ...list[1], flag: isoFlag(list[1].isoShortCode) },
        }
      } catch (e) { pushToast('Compare failed: ' + e.message, 'error') }
      finally { cmpLoading.value = false }
    }

    function setPopular(a, b) {
      const find = iso => allPassports.value.find(p => p.isoShortCode === iso) || { isoShortCode: iso, name: iso, flag: isoFlag(iso) }
      cmpA.value = find(a); cmpB.value = find(b); runCompare()
    }

    const cmpWinner = computed(() => {
      if (!cmpResult.value) return null
      const { a, b } = cmpResult.value
      if ((a.mobilityScore || 0) > (b.mobilityScore || 0)) return { winner: a, diff: a.mobilityScore - b.mobilityScore }
      if ((b.mobilityScore || 0) > (a.mobilityScore || 0)) return { winner: b, diff: b.mobilityScore - a.mobilityScore }
      return { winner: null, diff: 0 }
    })

    // ── Auth ────────────────────────────────────────
    const authMode = ref('login'); const authUser = ref(''); const authPass = ref('')
    const authError = ref(''); const authLoading = ref(false)

    async function submitAuth() {
      authError.value = ''
      if (!authUser.value || !authPass.value) { authError.value = lang.value === 'ru' ? 'Заполните все поля' : 'Fill in all fields'; return }
      authLoading.value = true
      try {
        const path = authMode.value === 'login' ? '/user/login' : '/user/register'
        const data = await apiPost(path, { username: authUser.value, password: authPass.value })
        setAuth(data.token, authUser.value)
        pushToast((lang.value === 'ru' ? 'Добро пожаловать, ' : 'Welcome, ') + authUser.value + '!', 'success')
        authUser.value = ''; authPass.value = ''
        navigate('profile')
      } catch (e) { authError.value = e.message || 'Auth failed' }
      finally { authLoading.value = false }
    }

    // ── Profile / Stack ──────────────────────────────
    const stack = ref(null); const stackLoading = ref(false)

    async function loadStack() {
      if (!loggedIn.value) return
      stackLoading.value = true
      try { stack.value = await apiGet('/stack') }
      catch (e) { pushToast('Could not load profile: ' + e.message, 'error') }
      finally { stackLoading.value = false }
    }

    async function removeMyPassport(iso) {
      try { await apiDelete('/user/removePassport?isos=' + iso); await loadStack(); pushToast(lang.value === 'ru' ? 'Паспорт удалён' : 'Passport removed', 'success') }
      catch (e) { pushToast(e.message, 'error') }
    }
    async function removeMyCountry(iso) {
      try { await apiDelete('/user/removeCountry?isos=' + iso); await loadStack(); pushToast(lang.value === 'ru' ? 'Страна удалена' : 'Country removed', 'success') }
      catch (e) { pushToast(e.message, 'error') }
    }

    // ── Modal ────────────────────────────────────────
    const modal = reactive({ open: false, mode: 'passport', query: '', selected: null })
    function openModal(mode) { modal.mode = mode; modal.query = ''; modal.selected = null; modal.open = true }
    const modalItems = computed(() => {
      const list = allPassports.value
      if (!modal.query) return list.slice(0, 80)
      const q = modal.query.toLowerCase()
      return list.filter(p => (p.name || '').toLowerCase().includes(q) || (p.isoShortCode || '').toLowerCase().startsWith(q)).slice(0, 80)
    })
    async function confirmModal() {
      if (!modal.selected) return
      const iso = modal.selected.isoShortCode
      try {
        if (modal.mode === 'passport') { await apiPost('/user/addPassport?isos=' + iso); pushToast(lang.value === 'ru' ? 'Паспорт добавлен!' : 'Passport added!', 'success') }
        else { await apiPost('/user/addCountry?isos=' + iso); pushToast(lang.value === 'ru' ? 'Страна добавлена!' : 'Country added!', 'success') }
        modal.open = false; await loadStack()
      } catch (e) { pushToast(e.message, 'error') }
    }

    // ── Public Profile ───────────────────────────────
    const publicProfile = ref(null); const publicProfileLoading = ref(false)
    async function loadPublicProfile(u) {
      publicProfileLoading.value = true; publicProfile.value = null
      try { publicProfile.value = await apiGet('/u/' + u) }
      catch (e) { pushToast('Profile not found', 'error') }
      finally { publicProfileLoading.value = false }
    }

    // ── Privacy ──────────────────────────────────────
    const privacySettings = reactive({ passports: true, visaMap: true, visitedCountries: true, visitCounter: true, joinDate: true, bestStats: true, homeCity: false })

    const PRIVACY_ITEMS = computed(() => [
      { key: 'passports',        label: t('profile_my_passports'), desc: lang.value === 'ru' ? 'Ваша коллекция паспортов' : 'Your passport collection' },
      { key: 'visaMap',          label: t('visa_map'),             desc: lang.value === 'ru' ? 'Карта визового доступа' : 'Combined visa access world map' },
      { key: 'visitedCountries', label: t('profile_visited'),      desc: lang.value === 'ru' ? 'Страны, которые вы посетили' : 'Countries you have visited' },
      { key: 'visitCounter',     label: lang.value === 'ru' ? 'Счётчик посещений' : 'Visit counter', desc: lang.value === 'ru' ? 'Общее количество стран' : 'Total countries visited' },
      { key: 'joinDate',         label: lang.value === 'ru' ? 'Дата регистрации' : 'Join date', desc: lang.value === 'ru' ? 'Когда вы зарегистрировались' : 'When you joined' },
      { key: 'bestStats',        label: lang.value === 'ru' ? 'Лучший рейтинг' : 'Best rank & stats', desc: lang.value === 'ru' ? 'Рейтинг и безвизовый доступ' : 'Top rank and visa-free count' },
      { key: 'homeCity',         label: lang.value === 'ru' ? 'Родной город' : 'Home city', desc: lang.value === 'ru' ? 'Ваш город' : 'Your home city location' },
    ])

    async function togglePrivacy(key) {
      privacySettings[key] = !privacySettings[key]
      const path = key === 'visitedCountries' ? '/user/visibility/countries' : '/user/visibility/passports'
      try { await apiPatch(path, { show: privacySettings[key] }); pushToast(lang.value === 'ru' ? 'Настройки сохранены' : 'Privacy updated', 'success') }
      catch (e) { privacySettings[key] = !privacySettings[key]; pushToast(e.message, 'error') }
    }

    function copyPublicLink() {
      const url = 'passportrank.app/u/' + username.value
      navigator.clipboard?.writeText(url)
        .then(() => pushToast(lang.value === 'ru' ? 'Ссылка скопирована!' : 'Link copied!', 'success'))
        .catch(() => pushToast('Could not copy', 'error'))
    }

    // ── Watchers & Init ──────────────────────────────
    watch([view, params], ([v, p]) => {
      if (v === 'detail'         && p.slug) loadDetail(p.slug)
      if (v === 'public-profile' && p.slug) loadPublicProfile(p.slug)
      if (v === 'profile')                  loadStack()
    }, { deep: true })

    onMounted(() => { window.addEventListener('hashchange', readHash); readHash(); loadRankings() })
    onUnmounted(() => window.removeEventListener('hashchange', readHash))

    return {
      lang, t, toggleLang,
      view, params, navigate,
      token, username, loggedIn, logout,
      toasts, pushToast,
      allPassports, rankingsLoading, searchQuery, sortKey, layoutMode, filteredPassports,
      detail, detailLoading, destFilter, destSearch, DEST_CATS, filteredDests, destCount, detailMapSeries, addMyPassport,
      cmpA, cmpB, cmpResult, cmpLoading, cmpWinner, cmpMapA, cmpMapB, runCompare, setPopular,
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

  <!-- ── Nav ────────────────────────────────────── -->
  <nav class="nav" id="mainNav">
    <div class="nav-inner">
      <a class="nav-logo" href="#" @click.prevent="navigate('rankings')">
        <div class="logo-icon">🌐</div>PassportRank
      </a>
      <div class="nav-links">
        <a class="nav-link" :class="{active: view==='rankings'}" href="#" @click.prevent="navigate('rankings')">{{ t('nav_rankings') }}</a>
        <a class="nav-link" :class="{active: view==='compare'}"  href="#" @click.prevent="navigate('compare')">{{ t('nav_compare') }}</a>
        <a class="nav-link" :class="{active: view==='profile'||view==='privacy'}" href="#" @click.prevent="loggedIn?navigate('profile'):navigate('auth')">{{ t('nav_profile') }}</a>
      </div>
      <div class="nav-actions">
        <button class="lang-toggle" @click="toggleLang">{{ lang === 'en' ? '🇷🇺 RU' : '🇬🇧 EN' }}</button>
        <button v-if="!loggedIn" class="btn-signin" @click="navigate('auth')">{{ t('nav_signin') }}</button>
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
        <div class="hero-badge">{{ t('hero_badge') }}</div>
        <h1 class="hero-title">{{ t('hero_title') }} <em>{{ t('hero_title_em') }}</em></h1>
        <p class="hero-subtitle">{{ t('hero_sub') }}</p>
        <div class="hero-search-wrap">
          <input class="hero-search" v-model="searchQuery" type="text" :placeholder="t('search_ph')" autocomplete="off" />
          <button class="hero-search-clear" v-show="searchQuery" @click="searchQuery=''">✕</button>
        </div>
      </div>
      <div class="hero-stats">
        <span>{{ allPassports.length||201 }} {{ t('hero_passports') }}</span>
        <span class="hero-stats-sep">|</span>
        <span>{{ allPassports[0]?.mobilityScore||179 }} {{ t('hero_top_vf') }}</span>
        <span class="hero-stats-sep">|</span>
        <span>{{ allPassports[0]?(allPassports[0].flag+' '+allPassports[0].name):'🇸🇬 Singapore' }} — {{ t('hero_leader') }}</span>
      </div>
    </section>
    <div class="rankings-toolbar">
      <div class="sort-tabs">
        <button class="sort-tab" :class="{active:sortKey==='rank'}" @click="sortKey='rank'">{{ t('sort_rank') }}</button>
        <button class="sort-tab" :class="{active:sortKey==='name'}" @click="sortKey='name'">{{ t('sort_az') }}</button>
        <button class="sort-tab" :class="{active:sortKey==='vf'}"   @click="sortKey='vf'">{{ t('sort_vf') }}</button>
      </div>
      <div class="layout-toggle">
        <button class="layout-btn" :class="{active:layoutMode==='grid'}" @click="layoutMode='grid'" title="Grid">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="7" height="7" rx="1"/><rect x="9" y="0" width="7" height="7" rx="1"/><rect x="0" y="9" width="7" height="7" rx="1"/><rect x="9" y="9" width="7" height="7" rx="1"/></svg>
        </button>
        <button class="layout-btn" :class="{active:layoutMode==='list'}" @click="layoutMode='list'" title="List">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="16" height="3" rx="1"/><rect x="0" y="6" width="16" height="3" rx="1"/><rect x="0" y="12" width="16" height="3" rx="1"/></svg>
        </button>
      </div>
    </div>
    <div class="rankings-container">
      <div v-if="rankingsLoading" class="loader-wrap"><div class="spinner"></div><p>{{ t('loading') }}</p></div>
      <div v-else-if="!filteredPassports.length && searchQuery" class="empty-state">
        <div class="empty-icon">🔍</div><h3>{{ t('no_results') }} "{{ searchQuery }}"</h3>
      </div>
      <div v-else :class="['passport-grid', layoutMode==='list'?'list-view':'']">
        <div v-for="p in filteredPassports" :key="p.isoShortCode" class="passport-card" @click="navigate('detail',{slug:p.isoShortCode})">
          <div class="card-rank-badge" :class="{'top-3':p.worldRank<=3}">#{{ p.worldRank }}</div>
          <div class="card-flag">{{ p.flag }}</div>
          <div class="card-name">{{ p.name }}</div>
          <div class="card-iso">{{ p.isoShortCode }}</div>
          <div class="card-score">{{ p.mobilityScore }}</div>
          <div class="card-score-label">{{ t('destinations') }}</div>
          <div class="progress-bar"><div class="progress-fill" :style="{width:Math.round((p.mobilityScore/MAX_SCORE)*100)+'%'}"></div></div>
          <div class="card-chips">
            <span v-if="p.visaFreeCount"      class="chip chip-vf">VF {{ p.visaFreeCount }}</span>
            <span v-if="p.visaOnArrivalCount" class="chip chip-voa">VoA {{ p.visaOnArrivalCount }}</span>
            <span v-if="p.etaCount"           class="chip chip-ev">eV {{ p.etaCount }}</span>
            <span v-if="p.requiredVisaCount"  class="chip chip-vr">VR {{ p.requiredVisaCount }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ DETAIL ════════════════════════════════ -->
  <div v-show="view === 'detail'">
    <div class="detail-breadcrumb">
      <a href="#" @click.prevent="navigate('rankings')">{{ t('nav_rankings') }}</a>
      <span>›</span>
      <span>{{ detail?.name || params.slug }}</span>
    </div>
    <div v-if="detailLoading" class="loader-wrap" style="min-height:400px"><div class="spinner"></div><p>{{ t('loading') }}</p></div>
    <div v-else-if="detail" class="detail-wrap">
      <div class="detail-header">
        <div class="detail-flag">{{ detail.flag }}</div>
        <div class="detail-info">
          <div class="detail-country-name">{{ detail.name }}</div>
          <div class="detail-iso">{{ detail.isoShortCode }}</div>
          <div class="detail-rank-badge">🏆 {{ t('rank_label') }} #{{ detail.worldRank }}</div>
        </div>
        <div class="detail-actions">
          <button class="btn-add-passport" @click="addMyPassport(detail.isoShortCode)">{{ t('add_to_my') }}</button>
        </div>
      </div>
      <div class="detail-stat-row">
        <div v-for="cat in DEST_CATS" :key="cat.key" class="detail-stat-cell" :class="[cat.statCls,{active:destFilter===cat.key}]" @click="destFilter=cat.key;destSearch=''">
          <div class="detail-stat-number">{{ destCount(cat) }}</div>
          <div class="detail-stat-label">{{ t(cat.tKey) }}</div>
        </div>
      </div>
      <div class="map-card" style="margin-bottom:20px">
        <div class="map-card-title">{{ t('visa_map') }} — {{ t('visa_map_sub') }}</div>
        <div class="map-container">
          <vector-map :series="detailMapSeries" height="340px" />
        </div>
        <div class="map-legend">
          <span class="legend-item"><span class="legend-dot" style="background:#16a34a"></span>{{ t('cat_vf') }}</span>
          <span class="legend-item"><span class="legend-dot" style="background:#2563eb"></span>{{ t('cat_voa') }}</span>
          <span class="legend-item"><span class="legend-dot" style="background:#eab308"></span>{{ t('cat_ev') }}</span>
          <span class="legend-item"><span class="legend-dot" style="background:#dc2626"></span>{{ t('cat_vr') }}</span>
          <span class="legend-item"><span class="legend-dot" style="background:#064e3b"></span>{{ lang==='ru'?'Свой паспорт':'Home Country' }}</span>
        </div>
      </div>
      <div class="destinations-card">
        <div class="destinations-header">
          <h3 class="destinations-title">{{ t('dest_title') }} <span class="chip" :class="DEST_CATS.find(c=>c.key===destFilter)?.cls">{{ t(DEST_CATS.find(c=>c.key===destFilter)?.tKey||'') }}</span></h3>
          <input class="dest-search" v-model="destSearch" :placeholder="t('search_dest')" />
        </div>
        <div class="dest-filter-chips">
          <button v-for="cat in DEST_CATS" :key="cat.key" class="dest-filter-chip" :class="[cat.cls,{active:destFilter===cat.key}]" @click="destFilter=cat.key;destSearch=''">
            {{ t(cat.tKey) }} ({{ destCount(cat) }})
          </button>
        </div>
        <div class="dest-list">
          <div v-for="d in filteredDests" :key="d.isoShortCode" class="dest-item">
            <span class="dest-flag">{{ isoFlag(d.isoShortCode) }}</span>
            <span class="dest-name">{{ d.name }}</span>
            <span class="dest-iso">{{ d.isoShortCode }}</span>
          </div>
          <div v-if="!filteredDests.length" class="empty-state" style="padding:32px"><div class="empty-icon">🌍</div><p>{{ t('no_dest') }}</p></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ COMPARE ═══════════════════════════════ -->
  <div v-show="view === 'compare'" id="view-compare">
    <div class="compare-hero">
      <div class="compare-hero-inner">
        <div class="compare-hero-badge">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#93c5fd" stroke-width="1.5"/><line x1="6" y1="1" x2="6" y2="11" stroke="#93c5fd" stroke-width="1.5"/><line x1="1" y1="6" x2="11" y2="6" stroke="#93c5fd" stroke-width="1.5"/></svg>
          {{ t('compare_badge') }}
        </div>
        <h1 class="compare-hero-title">{{ t('compare_title') }} <em>{{ t('compare_title_em') }}</em></h1>
        <p class="compare-hero-sub">{{ t('compare_sub') }}</p>
      </div>
    </div>
    <div class="compare-wrap">
      <!-- Picker card -->
      <div class="compare-picker-card">
        <div class="compare-picker-slot">
          <div class="compare-picker-flag-wrap" :class="{empty:!cmpA,active:!!cmpA}">
            <span class="compare-picker-flag" style="font-size:2rem;line-height:1">{{ cmpA?(cmpA.flag||isoFlag(cmpA.isoShortCode)):'+' }}</span>
          </div>
          <div class="compare-picker-body">
            <div class="compare-picker-label">{{ t('passport_a') }}</div>
            <country-picker v-model="cmpA" :options="allPassports" :lang="lang" />
          </div>
        </div>
        <div class="compare-vs-col">
          <div class="compare-vs-ring">VS</div>
          <button class="btn-primary compare-go-btn" @click="runCompare" :disabled="cmpLoading||!cmpA||!cmpB">
            {{ cmpLoading ? t('comparing') : t('compare_btn') }}
          </button>
        </div>
        <div class="compare-picker-slot">
          <div class="compare-picker-flag-wrap" :class="{empty:!cmpB,active:!!cmpB}">
            <span class="compare-picker-flag" style="font-size:2rem;line-height:1">{{ cmpB?(cmpB.flag||isoFlag(cmpB.isoShortCode)):'+' }}</span>
          </div>
          <div class="compare-picker-body">
            <div class="compare-picker-label">{{ t('passport_b') }}</div>
            <country-picker v-model="cmpB" :options="allPassports" :lang="lang" />
          </div>
        </div>
      </div>
      <!-- Popular presets -->
      <div class="compare-popular">
        <span class="compare-popular-label">{{ t('popular') }}</span>
        <div class="compare-popular-chips">
          <button class="popular-chip" @click="setPopular('SG','JP')">🇸🇬 Singapore vs 🇯🇵 Japan</button>
          <button class="popular-chip" @click="setPopular('DE','US')">🇩🇪 Germany vs 🇺🇸 USA</button>
          <button class="popular-chip" @click="setPopular('GB','FR')">🇬🇧 UK vs 🇫🇷 France</button>
          <button class="popular-chip" @click="setPopular('AU','CA')">🇦🇺 Australia vs 🇨🇦 Canada</button>
          <button class="popular-chip" @click="setPopular('CN','IN')">🇨🇳 China vs 🇮🇳 India</button>
        </div>
      </div>
      <!-- Loading -->
      <div v-if="cmpLoading" class="loader-wrap" style="min-height:300px"><div class="spinner"></div><p>{{ t('comparing') }}</p></div>
      <!-- Results -->
      <div v-else-if="cmpResult">
        <div class="winner-banner">
          <div class="winner-flags">
            <span style="font-size:56px">{{ cmpResult.a.flag }}</span>
            <span class="winner-vs">VS</span>
            <span style="font-size:56px">{{ cmpResult.b.flag }}</span>
          </div>
          <div class="winner-names">
            <span class="winner-name" :class="{winner:cmpWinner&&cmpWinner.winner&&cmpWinner.winner.isoShortCode===cmpResult.a.isoShortCode}">{{ cmpResult.a.name }}</span>
            <span style="color:rgba(255,255,255,.4);font-size:14px">vs</span>
            <span class="winner-name" :class="{winner:cmpWinner&&cmpWinner.winner&&cmpWinner.winner.isoShortCode===cmpResult.b.isoShortCode}">{{ cmpResult.b.name }}</span>
          </div>
          <template v-if="cmpWinner&&cmpWinner.winner">
            <div class="winner-announce">🏆 {{ cmpWinner.winner.name }} {{ t('winner_wins') }}</div>
            <div class="winner-diff">+{{ cmpWinner.diff }} {{ t('destinations') }}</div>
          </template>
          <div v-else class="winner-announce">{{ t('tie') }}</div>
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
              {tKey:'cat_total', a:cmpResult.a.mobilityScore,      b:cmpResult.b.mobilityScore},
              {tKey:'cat_vf',    a:cmpResult.a.visaFreeCount,      b:cmpResult.b.visaFreeCount},
              {tKey:'cat_voa',   a:cmpResult.a.visaOnArrivalCount, b:cmpResult.b.visaOnArrivalCount},
              {tKey:'cat_ev',    a:cmpResult.a.etaCount,           b:cmpResult.b.etaCount},
              {tKey:'cat_vr',    a:cmpResult.a.requiredVisaCount,  b:cmpResult.b.requiredVisaCount},
            ]" :key="row.tKey" :class="{'row-winner':row.a!=null&&row.b!=null&&row.a>row.b}">
              <td style="font-weight:600;color:rgba(255,255,255,.9)">{{ t(row.tKey) }}</td>
              <td style="font-weight:700;color:#fff">{{ row.a??'—' }}</td>
              <td style="font-weight:700;color:#fff">{{ row.b??'—' }}</td>
              <td>
                <span v-if="row.a!=null&&row.b!=null&&row.a!==row.b" :class="row.a>row.b?'diff-pos':'diff-neg'">
                  {{ row.a>row.b?'+':'−' }}{{ Math.abs(row.a-row.b) }}
                </span>
                <span v-else style="color:rgba(255,255,255,.3)">—</span>
              </td>
            </tr>
            <tr>
              <td style="font-weight:600;color:rgba(255,255,255,.9)">{{ t('global_rank') }}</td>
              <td style="font-weight:700;color:#fbbf24">#{{ cmpResult.a.worldRank }}</td>
              <td style="font-weight:700;color:#fbbf24">#{{ cmpResult.b.worldRank }}</td>
              <td><span style="color:rgba(255,255,255,.3)">—</span></td>
            </tr>
          </tbody>
        </table>
        <div class="compare-maps">
          <div class="map-card">
            <div class="map-card-title">{{ cmpResult.a.flag }} {{ cmpResult.a.name }}</div>
            <div class="map-container"><vector-map :series="cmpMapA" height="260px" /></div>
          </div>
          <div class="map-card">
            <div class="map-card-title">{{ cmpResult.b.flag }} {{ cmpResult.b.name }}</div>
            <div class="map-container"><vector-map :series="cmpMapB" height="260px" /></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ AUTH ══════════════════════════════════ -->
  <div v-show="view === 'auth'">
    <div class="auth-split">
      <div class="auth-left">
        <div class="auth-left-inner">
          <div class="auth-logo">🌐 PassportRank</div>
          <h2 class="auth-headline">{{ lang==='ru'?'Ваша личная коллекция паспортов, визуализированная.':'Your personal passport collection, visualized.' }}</h2>
          <p class="auth-desc">{{ lang==='ru'?'Отслеживайте паспорта, страны и безвизовые направления.':'Track every passport you hold, every country you visited.' }}</p>
          <div class="auth-stats">
            <div class="auth-stat"><span class="auth-stat-n">201</span><span class="auth-stat-l">{{ t('hero_passports') }}</span></div>
            <div class="auth-stat"><span class="auth-stat-n">40K+</span><span class="auth-stat-l">{{ lang==='ru'?'Визовых маршрутов':'Visa routes mapped' }}</span></div>
            <div class="auth-stat"><span class="auth-stat-n">195</span><span class="auth-stat-l">{{ lang==='ru'?'Стран':'Countries covered' }}</span></div>
          </div>
        </div>
      </div>
      <div class="auth-right">
        <div class="auth-form-wrap">
          <div class="auth-tabs">
            <button class="auth-tab" :class="{active:authMode==='login'}"    @click="authMode='login';authError=''">{{ t('auth_signin') }}</button>
            <button class="auth-tab" :class="{active:authMode==='register'}" @click="authMode='register';authError=''">{{ t('auth_register') }}</button>
          </div>
          <h3 class="auth-form-title">{{ authMode==='login'?t('auth_welcome'):t('auth_create') }}</h3>
          <p class="auth-form-sub">{{ authMode==='login'?t('auth_signin_sub'):t('auth_create_sub') }}</p>
          <form class="auth-form" @submit.prevent="submitAuth">
            <div class="form-group">
              <label class="form-label">{{ t('auth_username') }}</label>
              <input class="form-input" v-model="authUser" type="text" :placeholder="t('auth_username')" autocomplete="username" required />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('auth_password') }}</label>
              <input class="form-input" v-model="authPass" type="password" :placeholder="t('auth_password')" autocomplete="current-password" required />
            </div>
            <div v-if="authError" class="form-error">{{ authError }}</div>
            <button class="btn-primary btn-full" type="submit" :disabled="authLoading">
              {{ authLoading?(lang==='ru'?'Подождите…':'Please wait…'):(authMode==='login'?t('auth_signin'):t('auth_register')) }}
            </button>
          </form>
          <p class="auth-switch">
            <template v-if="authMode==='login'">{{ t('auth_no_acc') }} <a href="#" @click.prevent="authMode='register';authError=''">{{ t('auth_register') }}</a></template>
            <template v-else>{{ t('auth_have_acc') }} <a href="#" @click.prevent="authMode='login';authError=''">{{ t('auth_signin') }}</a></template>
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ PROFILE ════════════════════════════════ -->
  <div v-show="view === 'profile'">
    <div v-if="!loggedIn" style="text-align:center;padding:80px 24px">
      <div style="font-size:56px;margin-bottom:20px">🔒</div>
      <h2 style="margin-bottom:12px;font-size:1.6rem;font-weight:800">{{ t('sign_in_to_view') }}</h2>
      <button class="btn-primary" @click="navigate('auth')">{{ t('nav_signin') }}</button>
    </div>
    <div v-else-if="stackLoading" class="loader-wrap" style="min-height:400px"><div class="spinner"></div><p>{{ t('loading') }}</p></div>
    <div v-else>
      <div class="profile-hero">
        <div class="profile-hero-top">
          <div class="profile-avatar">{{ username[0]?.toUpperCase() }}</div>
          <div class="profile-info">
            <div class="profile-name">{{ username }}</div>
            <div class="profile-handle">@{{ username }}</div>
            <div class="profile-meta-row">
              <div class="profile-meta-item"><strong>{{ stack?.passports?.length||0 }}</strong><span>{{ t('profile_my_passports') }}</span></div>
              <div class="profile-meta-item"><strong>{{ stack?.visitedCountries?.length||0 }}</strong><span>{{ t('profile_visited') }}</span></div>
              <div class="profile-meta-item"><strong>{{ stack?.visaFreeCount||0 }}</strong><span>{{ t('cat_vf') }}</span></div>
              <div class="profile-meta-item"><strong>{{ stack?.mobilityScore||0 }}</strong><span>{{ t('cat_total') }}</span></div>
            </div>
          </div>
          <div class="profile-hero-actions">
            <button @click="navigate('privacy')">⚙ {{ t('privacy_title') }}</button>
          </div>
        </div>
      </div>
      <div class="profile-body">
        <div class="profile-columns">
          <div class="profile-panel">
            <div class="profile-panel-head"><span>{{ t('profile_my_passports') }}</span><button class="profile-panel-action" @click="openModal('passport')">{{ t('add_passport') }}</button></div>
            <div v-if="!(stack?.passports?.length)" class="empty-state" style="padding:24px"><div class="empty-icon">🛂</div><p>{{ lang==='ru'?'Нет паспортов. Добавьте!':'No passports yet.' }}</p></div>
            <div v-else class="passport-mini-list">
              <div v-for="p in (stack?.passports||[])" :key="p.isoShortCode" class="passport-mini">
                <span class="passport-mini-flag">{{ isoFlag(p.isoShortCode) }}</span>
                <div class="passport-mini-info"><strong>{{ p.name }}</strong><span v-if="p.worldRank">{{ t('rank_label') }} #{{ p.worldRank }}</span></div>
                <button class="passport-mini-remove" @click="removeMyPassport(p.isoShortCode)" title="Remove">✕</button>
              </div>
            </div>
          </div>
          <div class="profile-panel">
            <div class="profile-panel-head"><span>{{ t('profile_stats') }}</span></div>
            <div class="stats-bars">
              <div v-for="s in [{l:t('cat_vf'),v:stack?.visaFreeCount,c:'var(--vf)'},{l:t('cat_voa'),v:stack?.visaOnArrivalCount,c:'var(--voa)'},{l:t('cat_ev'),v:stack?.etaCount,c:'var(--ev)'},{l:t('cat_vr'),v:stack?.requiredVisaCount,c:'var(--vr)'}]" :key="s.l" class="stat-bar-row">
                <div class="stat-bar-label"><span>{{ s.l }}</span><strong>{{ s.v??'—' }}</strong></div>
                <div class="progress-bar"><div class="progress-fill" :style="{width:s.v?Math.round(s.v/195*100)+'%':'0%',background:s.c}"></div></div>
              </div>
            </div>
          </div>
          <div class="profile-panel" style="grid-column:1/-1">
            <div class="profile-panel-head"><span>{{ t('profile_visited') }}</span><button class="profile-panel-action" @click="openModal('country')">{{ t('add_country') }}</button></div>
            <div v-if="!(stack?.visitedCountries?.length)" class="empty-state" style="padding:24px"><div class="empty-icon">🌍</div><p>{{ lang==='ru'?'Нет посещённых стран.':'No visited countries yet.' }}</p></div>
            <div v-else class="country-chips-wrap">
              <span v-for="c in (stack?.visitedCountries||[])" :key="c.isoShortCode" class="country-chip">
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
    <div v-if="publicProfileLoading" class="loader-wrap" style="min-height:400px"><div class="spinner"></div><p>{{ t('loading') }}</p></div>
    <div v-else-if="publicProfile" class="detail-wrap">
      <div class="profile-hero">
        <div class="profile-hero-top">
          <div class="profile-avatar">{{ publicProfile.username?.[0]?.toUpperCase() }}</div>
          <div class="profile-info">
            <div class="profile-name">{{ publicProfile.username }}</div>
            <div class="profile-handle">@{{ publicProfile.username }}</div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-state" style="padding:80px 24px;text-align:center">
      <div class="empty-icon">👤</div><h3>{{ t('no_results') }}</h3>
      <button class="btn-primary" style="margin-top:16px" @click="navigate('rankings')">{{ t('nav_rankings') }}</button>
    </div>
  </div>

  <!-- ══ PRIVACY ════════════════════════════════ -->
  <div v-show="view === 'privacy'">
    <div class="privacy-wrap">
      <div class="detail-breadcrumb" style="padding:20px 0 0">
        <a href="#" @click.prevent="navigate('profile')">{{ t('nav_profile') }}</a><span>›</span><span>{{ t('privacy_title') }}</span>
      </div>
      <h1 class="privacy-title">{{ t('privacy_title') }}</h1>
      <p class="privacy-subtitle">{{ t('privacy_sub') }}</p>
      <div class="card privacy-card">
        <h3 class="privacy-card-title">{{ t('privacy_public_link') }}</h3>
        <div class="public-link-row">
          <span class="public-link-url">passportrank.app/u/{{ username }}</span>
          <button class="btn-outline" @click="copyPublicLink">{{ t('copy') }}</button>
        </div>
      </div>
      <div class="card privacy-card">
        <h3 class="privacy-card-title">{{ t('privacy_what') }}</h3>
        <div class="toggle-list">
          <div v-for="item in PRIVACY_ITEMS" :key="item.key" class="toggle-row">
            <div class="toggle-info"><span class="toggle-label">{{ item.label }}</span><span class="toggle-desc">{{ item.desc }}</span></div>
            <div class="toggle-pill" :class="{on:privacySettings[item.key]}" @click="togglePrivacy(item.key)">
              <span class="toggle-pill-label">{{ privacySettings[item.key]?(lang==='ru'?'Вкл':'On'):(lang==='ru'?'Выкл':'Off') }}</span>
              <span class="toggle-knob"></span>
            </div>
          </div>
        </div>
      </div>
      <div class="card privacy-card danger-zone">
        <h3 class="privacy-card-title danger-title">{{ t('danger_zone') }}</h3>
        <p class="privacy-card-desc">{{ lang==='ru'?'Скрыть профиль от всех.':'Hide your profile from all public access.' }}</p>
        <button class="btn-danger">{{ t('make_private') }}</button>
      </div>
    </div>
  </div>

  <!-- ── Footer ──────────────────────────────── -->
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-logo">🌐 PassportRank</div>
      <p class="footer-copy">{{ t('footer_copy') }}</p>
      <div class="footer-links">
        <a href="#">{{ lang==='ru'?'О нас':'About' }}</a>
        <a href="#">{{ lang==='ru'?'Данные':'Data Sources' }}</a>
        <a href="#" @click.prevent="navigate('privacy')">{{ t('privacy_title') }}</a>
      </div>
    </div>
  </footer>

  <!-- ── Modal ───────────────────────────────── -->
  <div v-if="modal.open" class="modal-overlay" @click.self="modal.open=false">
    <div class="modal-card">
      <div class="modal-header">
        <h2 class="modal-title">{{ modal.mode==='passport'?(lang==='ru'?'Добавить паспорт':'Add a passport'):(lang==='ru'?'Добавить страну':'Add visited country') }}</h2>
        <button class="modal-close" @click="modal.open=false">✕</button>
      </div>
      <div class="modal-tabs">
        <button class="modal-tab" :class="{active:modal.mode==='passport'}" @click="modal.mode='passport';modal.selected=null">🛂 {{ lang==='ru'?'Паспорт':'Passport' }}</button>
        <button class="modal-tab" :class="{active:modal.mode==='country'}"  @click="modal.mode='country';modal.selected=null">🌍 {{ lang==='ru'?'Страна':'Visited country' }}</button>
      </div>
      <div class="modal-search-wrap">
        <input class="modal-search" v-model="modal.query" type="text" :placeholder="t('search_country')" autocomplete="off" />
      </div>
      <div class="modal-grid">
        <div v-for="p in modalItems" :key="p.isoShortCode" class="modal-item" :class="{selected:modal.selected?.isoShortCode===p.isoShortCode}" @click="modal.selected=p">
          <span class="modal-item-flag">{{ p.flag }}</span>
          <span class="modal-item-name">{{ p.name }}</span>
          <span class="modal-item-meta">{{ p.isoShortCode }}{{ p.worldRank?' · #'+p.worldRank:'' }}</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-primary" :disabled="!modal.selected" @click="confirmModal">
          {{ modal.mode==='passport'?t('add_passport'):t('add_country') }}
        </button>
      </div>
    </div>
  </div>

  <!-- ── Toasts ──────────────────────────────── -->
  <div class="toast-wrap">
    <div v-for="t2 in toasts" :key="t2.id" class="toast" :class="t2.type">{{ t2.msg }}</div>
  </div>

</div>
  `
}).mount('#app')
