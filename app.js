/* Logifan catalog — industrial dark edition */

const PRODUCTS_INDEX = "products.json";
const OUTPUT_BASE = "output";

const PREFERRED_SPEC_ORDER = [
  "Тип",
  "Тип вентилятора",
  "Рабочий механизм вентилятора",
  "Диаметр воздуховода, мм",
  "Сечение воздуховода, мм",
  "Производительность, м3/час",
  "Производительность",
  "Мощность",
  "Напряжение",
  "Уровень шума",
  "Материал",
  "Установка вентиляции",
  "Вид работы вентилятора",
  "Артикул",
];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = { products: [], filtered: [] };

/* ---------- data ---------- */

async function loadProducts() {
  const list = await fetch(PRODUCTS_INDEX, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("products.json not found");
    return r.json();
  });

  const results = await Promise.all(
    list.map(async (slug) => {
      try {
        const data = await fetch(`${OUTPUT_BASE}/${slug}/data.json`, { cache: "no-store" }).then((r) => r.json());
        const images = (data.images || []).map((rel) => `${OUTPUT_BASE}/${slug}/${rel}`);
        return { slug, name: data.name || slug, specs: data.specs || {}, images };
      } catch {
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

/* ---------- helpers ---------- */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function primaryImage(p) {
  return p.images[0] || "";
}

function deriveType(p) {
  return p.specs["Тип"] || p.specs["Тип вентилятора"] || "";
}

function deriveMech(p) {
  return p.specs["Рабочий механизм вентилятора"] || "";
}

function topSpecs(p, n = 3) {
  const result = [];
  const seen = new Set();
  for (const key of PREFERRED_SPEC_ORDER) {
    if (result.length >= n) break;
    const v = p.specs[key];
    if (v) { result.push([key, v]); seen.add(key); }
  }
  for (const [k, v] of Object.entries(p.specs)) {
    if (result.length >= n) break;
    if (!seen.has(k)) result.push([k, v]);
  }
  return result;
}

/* ---------- rendering ---------- */

function renderCards(products) {
  const grid = $("#grid");
  const empty = $("#empty");
  const badge = $("#countNum");
  grid.innerHTML = "";
  if (badge) badge.textContent = products.length;
  if (!products.length) { empty.hidden = false; return; }
  empty.hidden = true;
  const frag = document.createDocumentFragment();
  products.forEach((p, i) => frag.appendChild(buildCard(p, i + 1)));
  grid.appendChild(frag);
  observeCards();
}

function buildCard(p, num) {
  const img = primaryImage(p);
  const specs = topSpecs(p, 3);
  const card = document.createElement("article");
  card.className = "card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Открыть: ${p.name}`);

  card.innerHTML = `
    <span class="card__num">#${String(num).padStart(2, "0")}</span>
    <div class="card__media">
      ${img
        ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" loading="lazy">`
        : `<div class="card__media-fallback">НЕТ ФОТО</div>`}
    </div>
    <div class="card__body">
      <h3 class="card__title">${escapeHtml(p.name)}</h3>
      <ul class="card__specs">
        ${specs.map(([k, v]) => `
          <li>
            <span>${escapeHtml(k)}</span>
            <span>${escapeHtml(v)}</span>
          </li>`).join("")}
      </ul>
      <div class="card__footer">
        <span class="card__cta">ПОДРОБНЕЕ</span>
        <svg class="card__arrow" viewBox="0 0 20 8" fill="none">
          <path d="M0 4h18M15 1l3 3-3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `;

  const open = () => openModal(p);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  return card;
}

function observeCards() {
  const cards = $$(".card");
  if (!("IntersectionObserver" in window)) {
    cards.forEach((c) => c.classList.add("is-visible"));
    return;
  }
  let seq = 0;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = Math.min(seq, 10) * 45;
          seq++;
          setTimeout(() => entry.target.classList.add("is-visible"), delay);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05, rootMargin: "0px 0px -30px 0px" }
  );
  cards.forEach((c) => io.observe(c));
}

/* ---------- modal ---------- */

function openModal(p) {
  const modal = $("#modal");
  const body = $("#modalBody");
  const heroSrc = p.images[0] || "";

  body.innerHTML = `
    <div class="detail__gallery">
      <div class="detail__hero-img">
        ${heroSrc
          ? `<img id="detailHero" src="${escapeHtml(heroSrc)}" alt="${escapeHtml(p.name)}">`
          : `<div class="card__media-fallback">НЕТ ФОТО</div>`}
      </div>
      ${p.images.length > 1
        ? `<div class="detail__thumbs" id="detailThumbs">
            ${p.images.map((src, i) => `
              <button class="detail__thumb${i === 0 ? " is-active" : ""}" data-src="${escapeHtml(src)}" aria-label="Фото ${i + 1}">
                <img src="${escapeHtml(src)}" alt="" loading="lazy">
              </button>`).join("")}
          </div>`
        : ""}
    </div>
    <div class="detail__info">
      <p class="detail__eyebrow">// ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ</p>
      <h2 class="detail__title">${escapeHtml(p.name)}</h2>
      <div>
        <p class="detail__specs-label">// ХАРАКТЕРИСТИКИ</p>
        <dl class="detail__specs">
          ${Object.entries(p.specs).map(([k, v]) => `
            <div class="detail__row">
              <dt>${escapeHtml(k)}</dt>
              <dd>${escapeHtml(v)}</dd>
            </div>`).join("")}
        </dl>
      </div>
      <button class="detail__back" data-close>← НАЗАД</button>
    </div>
  `;

  const thumbs = $$(".detail__thumb", body);
  const hero = $("#detailHero", body);
  thumbs.forEach((t) => {
    t.addEventListener("click", () => {
      if (!hero) return;
      hero.style.opacity = "0";
      const src = t.dataset.src;
      const tmp = new Image();
      tmp.onload = tmp.onerror = () => { hero.src = src; hero.style.opacity = "1"; };
      tmp.src = src;
      thumbs.forEach((x) => x.classList.remove("is-active"));
      t.classList.add("is-active");
    });
  });

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => requestAnimationFrame(() => { modal.dataset.open = "true"; }));
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const modal = $("#modal");
  if (modal.hidden) return;
  modal.dataset.open = "";
  modal.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    modal.hidden = true;
    document.body.style.overflow = "";
    $("#modalBody").innerHTML = "";
  }, 350);
}

function setupModal() {
  $("#modal").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });
}

/* ---------- filters ---------- */

function applyFilters() {
  const q = $("#search").value.trim().toLowerCase();
  const t = $("#filterType").value;
  const m = $("#filterMech").value;

  let res = state.products.slice();
  if (q) res = res.filter((p) => p.name.toLowerCase().includes(q) || Object.values(p.specs).some((v) => String(v).toLowerCase().includes(q)));
  if (t) res = res.filter((p) => deriveType(p) === t);
  if (m) res = res.filter((p) => deriveMech(p) === m);

  state.filtered = res;
  renderCards(res);
}

function populateFilters() {
  const types = new Set();
  const mechs = new Set();
  for (const p of state.products) {
    const t = deriveType(p); if (t) types.add(t);
    const m = deriveMech(p); if (m) mechs.add(m);
  }
  appendOptions($("#filterType"), [...types].sort((a, b) => a.localeCompare(b, "ru")));
  appendOptions($("#filterMech"), [...mechs].sort((a, b) => a.localeCompare(b, "ru")));
}

function appendOptions(sel, values) {
  for (const v of values) {
    const o = document.createElement("option");
    o.value = v; o.textContent = v;
    sel.appendChild(o);
  }
}

function setupFilters() {
  let t;
  $("#search").addEventListener("input", () => { clearTimeout(t); t = setTimeout(applyFilters, 140); });
  $("#filterType").addEventListener("change", applyFilters);
  $("#filterMech").addEventListener("change", applyFilters);
}

/* ---------- hero ---------- */

function setupHero() {
  if (!state.products.length) return;
  const p = state.products.find((x) => x.images.length) || state.products[0];
  const src = primaryImage(p);
  const wrap = $(".hero__img-inner");
  if (src && wrap) {
    wrap.innerHTML = `<img src="${escapeHtml(src)}" alt="${escapeHtml(p.name)}">`;
  }
}

/* ---------- skeleton ---------- */

function showSkeleton(n = 8) {
  const grid = $("#grid");
  grid.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const s = document.createElement("div");
    s.className = "skel";
    grid.appendChild(s);
  }
}

/* ---------- init ---------- */

async function init() {
  showSkeleton();
  setupModal();
  setupFilters();
  try {
    state.products = await loadProducts();
    state.filtered = state.products.slice();
    populateFilters();
    setupHero();
    renderCards(state.filtered);
  } catch (err) {
    console.error(err);
    $("#grid").innerHTML = "";
    const empty = $("#empty");
    empty.hidden = false;
    empty.textContent = "// ОШИБКА ЗАГРУЗКИ — Запустите сайт через Live Server (не через file://)";
  }
}

document.addEventListener("DOMContentLoaded", init);
