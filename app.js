/* LOGIFAN — Heavy Metal Industrial 2026 */

const PRODUCTS_INDEX = "products.json";
const OUTPUT_BASE    = "output";

const PREFERRED_SPEC_ORDER = [
  "Тип", "Тип вентилятора", "Рабочий механизм вентилятора",
  "Диаметр воздуховода, мм", "Сечение воздуховода, мм",
  "Производительность, м3/час", "Производительность",
  "Мощность", "Напряжение", "Уровень шума", "Материал",
  "Установка вентиляции", "Вид работы вентилятора", "Артикул",
];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = { products: [], filtered: [] };

/* ═══════════════════════════════════════════════════════════════
   PRELOADER
   ═══════════════════════════════════════════════════════════════ */

function initPreloader() {
  const preloader = $("#preloader");
  const fill      = $("#preloaderFill");
  if (!preloader) { launchApp(); return; }

  requestAnimationFrame(() => {
    if (fill) fill.style.width = "100%";
  });

  setTimeout(() => {
    preloader.classList.add("is-done");
    document.body.classList.add("loaded");
    launchApp();
    setTimeout(() => preloader.remove(), 600);
  }, 1500);
}

/* ═══════════════════════════════════════════════════════════════
   CURSOR
   ═══════════════════════════════════════════════════════════════ */

function initCursor() {
  if (window.matchMedia("(pointer: coarse)").matches) return;

  const dot  = $("#cursor");
  const ring = $("#cursorRing");
  if (!dot || !ring) return;

  let mx = -100, my = -100;
  let rx = -100, ry = -100;
  let raf;

  document.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + "px";
    dot.style.top  = my + "px";
  });

  function animateRing() {
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    ring.style.left = rx + "px";
    ring.style.top  = ry + "px";
    raf = requestAnimationFrame(animateRing);
  }
  animateRing();

  document.addEventListener("mouseenter", (e) => {
    const el = e.target;
    if (el.closest("a, button, .card, select, input, .filter-pill")) {
      dot.classList.add("is-hover");
      ring.classList.add("is-hover");
    }
  }, true);

  document.addEventListener("mouseleave", (e) => {
    const el = e.target;
    if (el.closest("a, button, .card, select, input, .filter-pill")) {
      dot.classList.remove("is-hover");
      ring.classList.remove("is-hover");
    }
  }, true);

  document.addEventListener("mouseleave", () => {
    dot.style.opacity  = "0";
    ring.style.opacity = "0";
  });
  document.addEventListener("mouseenter", () => {
    dot.style.opacity  = "1";
    ring.style.opacity = "1";
  });
}

/* ═══════════════════════════════════════════════════════════════
   SCROLL PROGRESS
   ═══════════════════════════════════════════════════════════════ */

function initScrollProgress() {
  const bar = $("#scrollProgress");
  if (!bar) return;

  function update() {
    const scrollTop  = window.scrollY;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const pct        = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width  = pct + "%";
  }

  window.addEventListener("scroll", update, { passive: true });
  update();
}

/* ═══════════════════════════════════════════════════════════════
   NAV — hide on scroll down, show on scroll up, highlight section
   ═══════════════════════════════════════════════════════════════ */

function initNav() {
  const nav     = $("#nav");
  if (!nav) return;

  let lastY    = 0;
  let ticking  = false;

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        nav.classList.toggle("is-scrolled", y > 20);
        nav.classList.toggle("is-hidden", y > lastY && y > 120);
        lastY   = y;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  /* section highlight */
  const sections = $$("section[id], div[id='top']");
  const links    = $$(".nav__link");
  if (!links.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach((l) => {
          const href = l.getAttribute("href");
          l.classList.toggle("is-active", href === "#" + id);
        });
      }
    });
  }, { threshold: 0.35 });

  sections.forEach((s) => io.observe(s));
}

/* ═══════════════════════════════════════════════════════════════
   REVEAL ANIMATIONS (IntersectionObserver)
   ═══════════════════════════════════════════════════════════════ */

function initReveal() {
  const items = $$(".reveal-item, .reveal-line, .catalog__title, .features__title, .about__title, .cta-section__title");
  if (!items.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;

        if (el.classList.contains("reveal-line") ||
            el.classList.contains("catalog__title") ||
            el.classList.contains("features__title") ||
            el.classList.contains("about__title") ||
            el.classList.contains("cta-section__title")) {
          /* Wrap text in spans for line-by-line reveal if not already done */
          if (!el.dataset.wrapped) {
            el.dataset.wrapped = "1";
            el.innerHTML = el.innerHTML
              .split("<br>")
              .map((line) => `<span>${line.trim()}</span>`)
              .join("<br>");
          }
          el.classList.add("is-visible");
        } else {
          el.classList.add("is-visible");
        }

        io.unobserve(el);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  items.forEach((el) => io.observe(el));
}

/* ═══════════════════════════════════════════════════════════════
   HERO TITLE REVEAL (split existing spans)
   ═══════════════════════════════════════════════════════════════ */

function initHeroTitle() {
  const top  = $(".hero__title-top");
  const main = $(".hero__title-main");

  /* Wrap text in span so overflow: hidden clip animation works.
     Set data-wrapped so initReveal() observer skips re-wrapping. */
  if (top && !top.dataset.wrapped) {
    const txt = top.textContent.trim();
    top.innerHTML = `<span>${txt}</span>`;
    top.dataset.wrapped = "1";
  }
  if (main && !main.dataset.wrapped) {
    const txt = main.textContent.trim();
    main.innerHTML = `<span>${txt}</span>`;
    main.dataset.wrapped = "1";
  }

  /* Animate in shortly after preloader fades — observer fires but
     we ensure a minimum delay for dramatic effect */
  setTimeout(() => {
    if (top)  top.classList.add("is-visible");
    if (main) main.classList.add("is-visible");
  }, 200);
}

/* ═══════════════════════════════════════════════════════════════
   COUNT UP
   ═══════════════════════════════════════════════════════════════ */

function countUp(el) {
  const target   = parseInt(el.dataset.target, 10) || 0;
  const duration = 1600;
  const start    = performance.now();

  function frame(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(frame);
    else el.textContent = target;
  }
  requestAnimationFrame(frame);
}

function initCountUp() {
  const els = $$(".count-up");
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !entry.target.dataset.counted) {
        entry.target.dataset.counted = "1";
        countUp(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  els.forEach((el) => io.observe(el));
}

/* ═══════════════════════════════════════════════════════════════
   CANVAS PARTICLES (hero background)
   ═══════════════════════════════════════════════════════════════ */

function initParticles() {
  const canvas = $("#heroParticles");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let W, H, particles, raf;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function makeParticles() {
    return Array.from({ length: 36 }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 1.4 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a:  Math.random() * 0.45 + 0.05,
    }));
  }

  resize();
  particles = makeParticles();
  window.addEventListener("resize", () => { resize(); particles = makeParticles(); });

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,98,0,${p.a})`;
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -2) p.x = W + 2;
      if (p.x > W + 2) p.x = -2;
      if (p.y < -2) p.y = H + 2;
      if (p.y > H + 2) p.y = -2;
    }
    raf = requestAnimationFrame(draw);
  }
  draw();
}

/* ═══════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════ */

async function loadProducts() {
  const list = await fetch(PRODUCTS_INDEX, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("products.json not found");
    return r.json();
  });

  const results = await Promise.all(
    list.map(async (slug) => {
      try {
        const data   = await fetch(`${OUTPUT_BASE}/${slug}/data.json`, { cache: "no-store" }).then((r) => r.json());
        const images = (data.images || []).map((rel) => `${OUTPUT_BASE}/${slug}/${rel}`);
        return {
          slug,
          name:          data.name          || slug,
          specs:         data.specs         || {},
          images,
          price:         data.price         ?? null,
          price_original:data.price_original ?? null,
          rating:        data.rating        ?? null,
          reviews_count: data.reviews_count || 0,
          description:   data.description   || null,
        };
      } catch {
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function primaryImage(p) { return p.images[0] || ""; }
function deriveType(p)   { return p.specs["Тип"] || p.specs["Тип вентилятора"] || ""; }
function deriveMech(p)   { return p.specs["Рабочий механизм вентилятора"] || ""; }

function topSpecs(p, n = 3) {
  const result = [], seen = new Set();
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

function priceHtml(p) {
  if (!p.price) return "";
  const pct = (p.price_original && p.price_original > p.price)
    ? Math.round((1 - p.price / p.price_original) * 100) : 0;
  return `<div class="card__price-row">
    <span class="card__price">${p.price.toLocaleString("ru-RU")} ₽</span>
    ${p.price_original ? `<span class="card__price-orig">${p.price_original.toLocaleString("ru-RU")} ₽</span>` : ""}
    ${pct > 0 ? `<span class="card__discount">-${pct}%</span>` : ""}
  </div>`;
}

function ratingHtml(p, compact = false) {
  if (!p.rating) return "";
  const full  = Math.floor(p.rating);
  const empty = 5 - full;
  const starsHtml = "★".repeat(full) + "☆".repeat(empty);
  if (compact) {
    return `<div class="card__rating">
      <span class="card__rating-stars">${starsHtml}</span>
      <span class="card__rating-score">${p.rating.toFixed(1)}</span>
    </div>`;
  }
  return `<div class="detail__rating">
    <span class="detail__rating-stars">${starsHtml}</span>
    <span class="detail__rating-score">${p.rating.toFixed(1)}</span>
    ${p.reviews_count ? `<span class="detail__rating-count">${p.reviews_count} отзывов</span>` : ""}
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   RENDERING
   ═══════════════════════════════════════════════════════════════ */

function renderCards(products) {
  const grid  = $("#grid");
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
  const img   = primaryImage(p);
  const specs = topSpecs(p, 3);
  const card  = document.createElement("article");
  card.className = "card";
  card.tabIndex  = 0;
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
      ${priceHtml(p)}
      ${ratingHtml(p, true)}
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
    </div>`;

  const open = () => openModal(p);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
  return card;
}

function observeCards() {
  const cards = $$(".card");
  if (!("IntersectionObserver" in window)) {
    cards.forEach((c) => c.classList.add("is-visible"));
    return;
  }
  let seq = 0;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const delay = Math.min(seq, 12) * 40;
        seq++;
        setTimeout(() => entry.target.classList.add("is-visible"), delay);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.04, rootMargin: "0px 0px -20px 0px" });
  cards.forEach((c) => io.observe(c));
}

/* ═══════════════════════════════════════════════════════════════
   MODAL
   ═══════════════════════════════════════════════════════════════ */

function openModal(p) {
  const modal   = $("#modal");
  const body    = $("#modalBody");
  const heroSrc = p.images[0] || "";

  body.innerHTML = `
    <div class="detail__gallery">
      <div class="detail__hero-img">
        ${heroSrc
          ? `<img id="detailHero" src="${escapeHtml(heroSrc)}" alt="${escapeHtml(p.name)}">`
          : `<div class="card__media-fallback">НЕТ ФОТО</div>`}
      </div>
      ${p.images.length > 1 ? `
        <div class="detail__thumbs" id="detailThumbs">
          ${p.images.map((src, i) => `
            <button class="detail__thumb${i === 0 ? " is-active" : ""}" data-src="${escapeHtml(src)}" aria-label="Фото ${i + 1}">
              <img src="${escapeHtml(src)}" alt="" loading="lazy">
            </button>`).join("")}
        </div>` : ""}
    </div>
    <div class="detail__info">
      <p class="detail__eyebrow">// ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ</p>
      <h2 class="detail__title">${escapeHtml(p.name)}</h2>
      ${p.price ? `<div class="detail__price-row">
        <span class="detail__price">${p.price.toLocaleString("ru-RU")} ₽</span>
        ${p.price_original ? `<span class="detail__price-orig">${p.price_original.toLocaleString("ru-RU")} ₽</span>` : ""}
        ${(p.price_original && p.price_original > p.price) ? `<span class="detail__discount">-${Math.round((1 - p.price / p.price_original) * 100)}%</span>` : ""}
      </div>` : ""}
      ${ratingHtml(p)}
      ${p.description ? `<div class="detail__description">
        <p class="detail__specs-label">// ОПИСАНИЕ</p>
        <p>${escapeHtml(p.description)}</p>
      </div>` : ""}
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
    </div>`;

  const thumbs = $$(".detail__thumb", body);
  const hero   = $("#detailHero", body);
  thumbs.forEach((t) => {
    t.addEventListener("click", () => {
      if (!hero) return;
      hero.style.opacity = "0";
      const tmp = new Image();
      tmp.onload = tmp.onerror = () => { hero.src = t.dataset.src; hero.style.opacity = "1"; };
      tmp.src = t.dataset.src;
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
  }, 450);
}

function setupModal() {
  $("#modal").addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#modal").hidden) closeModal();
  });
}

/* ═══════════════════════════════════════════════════════════════
   FILTERS
   ═══════════════════════════════════════════════════════════════ */

function applyFilters() {
  const q = $("#search").value.trim().toLowerCase();
  const t = $("#filterType").value;
  const m = $("#filterMech").value;

  let res = state.products.slice();
  if (q) res = res.filter((p) =>
    p.name.toLowerCase().includes(q) ||
    Object.values(p.specs).some((v) => String(v).toLowerCase().includes(q))
  );
  if (t) res = res.filter((p) => deriveType(p) === t);
  if (m) res = res.filter((p) => deriveMech(p) === m);

  state.filtered = res;
  renderCards(res);
}

function populateFilters() {
  const types = new Set(), mechs = new Set();
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
    o.value = v;
    o.textContent = v;
    sel.appendChild(o);
  }
}

function setupFilters() {
  let debounce;
  $("#search").addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(applyFilters, 140);
  });
  $("#filterType").addEventListener("change", applyFilters);
  $("#filterMech").addEventListener("change", applyFilters);
}

/* ═══════════════════════════════════════════════════════════════
   HERO IMAGE
   ═══════════════════════════════════════════════════════════════ */

function setupHero() {
  if (!state.products.length) return;
  const p   = state.products.find((x) => x.images.length) || state.products[0];
  const src = primaryImage(p);
  const wrap = $("#heroImg");
  if (src && wrap) {
    wrap.innerHTML = `<img src="${escapeHtml(src)}" alt="${escapeHtml(p.name)}">`;
  }
}

/* ═══════════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════════ */

function showSkeleton(n = 8) {
  const grid = $("#grid");
  grid.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const s = document.createElement("div");
    s.className = "skel";
    grid.appendChild(s);
  }
}

/* ═══════════════════════════════════════════════════════════════
   LAUNCH — called after preloader hides
   ═══════════════════════════════════════════════════════════════ */

async function launchApp() {
  initNav();
  initScrollProgress();
  initCursor();
  initParticles();
  initReveal();
  initCountUp();
  initHeroTitle();
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
    empty.textContent = "// ОШИБКА ЗАГРУЗКИ — Запустите через Live Server (не через file://)";
  }
}

/* ═══════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
  showSkeleton();
  initPreloader();
});
