/* Logifan catalog — vanilla SPA. */

const PRODUCTS_INDEX = "products.json";
const OUTPUT_BASE = "output";

// Patterns to skip when picking the "real product" image
// (Ozon UI noise: logo, qr code, payment icons, banner hashes, etc.)
const NON_PRODUCT_IMAGE = /(logo|qr|payment|cover\.|9j83ybpq)/i;

const PREFERRED_SPEC_ORDER = [
  "Тип",
  "Тип вентилятора",
  "Бренд",
  "Производитель",
  "Модель",
  "Диаметр воздуховода, мм",
  "Сечение воздуховода, мм",
  "Производительность, м3/час",
  "Производительность",
  "Мощность",
  "Напряжение",
  "Уровень шума",
  "Материал",
  "Рабочий механизм вентилятора",
  "Установка вентиляции",
  "Вид работы вентилятора",
  "Цвет",
  "Артикул",
];

// Heuristic brand list — name typically contains one of these tokens
const BRAND_TOKENS = ["Logifan", "Веклайн", "VKK", "ВКК", "YWF", "YWL", "XGF"];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  products: [],
  filtered: [],
};

/* ---------- data loading ---------- */

async function loadProducts() {
  const list = await fetch(PRODUCTS_INDEX, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("products.json not found");
    return r.json();
  });

  const results = await Promise.all(
    list.map(async (slug) => {
      try {
        const data = await fetch(`${OUTPUT_BASE}/${slug}/data.json`, {
          cache: "no-store",
        }).then((r) => r.json());
        const images = (data.images || []).map(
          (rel) => `${OUTPUT_BASE}/${slug}/${rel}`
        );
        return {
          slug,
          name: data.name || slug,
          specs: data.specs || {},
          images,
        };
      } catch (err) {
        console.warn("Failed to load", slug, err);
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

/* ---------- helpers ---------- */

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );
}

function pickPrimaryImage(p) {
  return p.images.find((src) => !NON_PRODUCT_IMAGE.test(src)) || p.images[0] || "";
}

function productImages(p) {
  const real = p.images.filter((src) => !NON_PRODUCT_IMAGE.test(src));
  return real.length ? real : p.images;
}

function deriveBrand(p) {
  const direct = p.specs["Бренд"] || p.specs["Производитель"];
  if (direct) return direct;
  for (const token of BRAND_TOKENS) {
    if (p.name.toLowerCase().includes(token.toLowerCase())) return token;
  }
  return "";
}

function deriveType(p) {
  return (
    p.specs["Тип"] ||
    p.specs["Тип вентилятора"] ||
    p.specs["Рабочий механизм вентилятора"] ||
    ""
  );
}

function topSpecs(p, n = 4) {
  const result = [];
  const seen = new Set();

  for (const key of PREFERRED_SPEC_ORDER) {
    if (result.length >= n) break;
    const v = p.specs[key];
    if (v) {
      result.push([key, v]);
      seen.add(key);
    }
  }
  if (result.length < n) {
    for (const [k, v] of Object.entries(p.specs)) {
      if (result.length >= n) break;
      if (!seen.has(k)) result.push([k, v]);
    }
  }
  return result;
}

/* ---------- rendering ---------- */

function renderCards(products) {
  const grid = $("#grid");
  const empty = $("#empty");
  grid.innerHTML = "";
  if (!products.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const fragment = document.createDocumentFragment();
  for (const p of products) {
    fragment.appendChild(buildCard(p));
  }
  grid.appendChild(fragment);
  observeCards();
}

function buildCard(p) {
  const img = pickPrimaryImage(p);
  const specs = topSpecs(p, 4);
  const card = document.createElement("article");
  card.className = "card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Открыть карточку: ${p.name}`);

  card.innerHTML = `
    <div class="card__media">
      ${
        img
          ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(
              p.name
            )}" loading="lazy">`
          : `<div class="card__media-fallback">Нет изображения</div>`
      }
    </div>
    <div class="card__body">
      <h3 class="card__title">${escapeHtml(p.name)}</h3>
      <ul class="card__specs">
        ${specs
          .map(
            ([k, v]) => `
              <li>
                <span>${escapeHtml(k)}</span>
                <span>${escapeHtml(v)}</span>
              </li>`
          )
          .join("")}
      </ul>
      <span class="card__cta">Подробнее →</span>
    </div>
  `;

  const open = () => openModal(p);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });
  return card;
}

function observeCards() {
  if (!("IntersectionObserver" in window)) {
    $$(".card").forEach((c) => c.classList.add("is-visible"));
    return;
  }
  const cards = $$(".card");
  let revealedSoFar = 0;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const stagger = Math.min(revealedSoFar, 8) * 50;
          revealedSoFar++;
          setTimeout(() => entry.target.classList.add("is-visible"), stagger);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );
  cards.forEach((c) => io.observe(c));
}

/* ---------- modal / detail page ---------- */

function openModal(p) {
  const modal = $("#modal");
  const body = $("#modalBody");
  const imgs = productImages(p);
  const heroSrc = imgs[0] || "";
  const brand = deriveBrand(p);

  body.innerHTML = `
    <div class="detail__gallery">
      <div class="detail__hero-img">
        ${
          heroSrc
            ? `<img id="detailHero" src="${escapeHtml(heroSrc)}" alt="${escapeHtml(
                p.name
              )}">`
            : `<div class="card__media-fallback">Нет изображения</div>`
        }
      </div>
      ${
        imgs.length > 1
          ? `<div class="detail__thumbs" id="detailThumbs">
              ${imgs
                .map(
                  (src, i) => `
                    <button class="detail__thumb${
                      i === 0 ? " is-active" : ""
                    }" data-src="${escapeHtml(src)}" aria-label="Изображение ${
                    i + 1
                  }">
                      <img src="${escapeHtml(src)}" alt="" loading="lazy">
                    </button>`
                )
                .join("")}
            </div>`
          : ""
      }
    </div>
    <div class="detail__info">
      ${brand ? `<p class="detail__eyebrow">${escapeHtml(brand)}</p>` : ""}
      <h2 class="detail__title">${escapeHtml(p.name)}</h2>
      <dl class="detail__specs">
        ${Object.entries(p.specs)
          .map(
            ([k, v]) => `
              <div class="detail__row">
                <dt>${escapeHtml(k)}</dt>
                <dd>${escapeHtml(v)}</dd>
              </div>`
          )
          .join("")}
      </dl>
      <button class="btn btn--ghost detail__back" data-close>← Назад к каталогу</button>
    </div>
  `;

  // Thumbnail switcher
  const thumbs = $$(".detail__thumb", body);
  const hero = $("#detailHero", body);
  thumbs.forEach((t) => {
    t.addEventListener("click", () => {
      if (!hero) return;
      hero.style.opacity = "0";
      const newSrc = t.dataset.src;
      const tmp = new Image();
      tmp.onload = () => {
        hero.src = newSrc;
        hero.style.opacity = "1";
      };
      tmp.onerror = () => {
        hero.src = newSrc;
        hero.style.opacity = "1";
      };
      tmp.src = newSrc;
      thumbs.forEach((x) => x.classList.remove("is-active"));
      t.classList.add("is-active");
    });
  });

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  // double rAF to ensure transition triggers
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      modal.dataset.open = "true";
    });
  });
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
  }, 320);
}

function setupModal() {
  $("#modal").addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#modal").hidden) closeModal();
  });
}

/* ---------- filters & search ---------- */

function applyFilters() {
  const q = $("#search").value.trim().toLowerCase();
  const t = $("#filterType").value;
  const b = $("#filterBrand").value;

  let res = state.products.slice();
  if (q) {
    res = res.filter((p) => {
      const inName = p.name.toLowerCase().includes(q);
      const inSpecs = Object.values(p.specs).some((v) =>
        String(v).toLowerCase().includes(q)
      );
      return inName || inSpecs;
    });
  }
  if (t) res = res.filter((p) => deriveType(p) === t);
  if (b) res = res.filter((p) => deriveBrand(p) === b);

  state.filtered = res;
  renderCards(res);
}

function populateFilters() {
  const types = new Set();
  const brands = new Set();
  for (const p of state.products) {
    const t = deriveType(p);
    if (t) types.add(t);
    const b = deriveBrand(p);
    if (b) brands.add(b);
  }
  appendOptions($("#filterType"), [...types].sort((a, b) => a.localeCompare(b, "ru")));
  appendOptions($("#filterBrand"), [...brands].sort((a, b) => a.localeCompare(b, "ru")));
}

function appendOptions(sel, values) {
  for (const v of values) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    sel.appendChild(opt);
  }
}

function setupFilters() {
  let timer;
  $("#search").addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(applyFilters, 140);
  });
  $("#filterType").addEventListener("change", applyFilters);
  $("#filterBrand").addEventListener("change", applyFilters);
}

/* ---------- hero visual ---------- */

function setupHero() {
  if (!state.products.length) return;
  // pick the largest-looking product image we have for the hero spot
  // (deterministic: first product's primary image)
  const p = state.products.find((x) => pickPrimaryImage(x)) || state.products[0];
  const img = pickPrimaryImage(p);
  const target = $(".hero__visual-inner");
  if (img && target) {
    target.innerHTML = `<img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}">`;
  }
}

/* ---------- skeleton loader ---------- */

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
    empty.textContent =
      "Не удалось загрузить каталог. Запустите сайт через локальный сервер (Live Server) — открыть index.html напрямую через file:// браузер не разрешит из-за CORS.";
  }
}

document.addEventListener("DOMContentLoaded", init);
