# LOGIFAN — Каталог промышленных вентиляторов

## Контекст проекта

**Что это:** Веб-каталог промышленных вентиляторов бренда LOGIFAN. Чистый HTML/CSS/JS, без фреймворков.

**Репозиторий:** `https://github.com/Monseratty/webpassport`  
**Активная ветка:** `batya` — здесь живёт последняя версия сайта  
**Второй remote:** `origin` → `git.iu7.bmstu.ru` (GitLab МГТУ)

---

## Структура файлов

```
webpassport/
├── index.html        # Вся разметка сайта
├── styles.css        # Все стили + анимации
├── app.js            # Вся логика (данные, рендер, UI)
├── products.json     # Список slug-ов товаров (массив строк)
├── output/           # Данные товаров, распарсенные из HTML
│   └── <slug>/
│       ├── data.json     # { name, specs: {}, images: [] }
│       └── images/       # JPG фотографии товара
├── parse_html.py     # Парсер HTML → output/*/data.json
├── redownload_hq.py  # Перекачка изображений в HD
└── htmls/            # Сырые HTML страницы товаров (источник)
```

---

## Архитектура сайта

### Секции (сверху вниз)
1. **Preloader** — fullscreen с glitch-анимацией LOGIFAN, заполняется за 1.5с, потом исчезает
2. **Nav** — фиксированный, скрывается при скролле вниз, подсвечивает активную секцию
3. **Hero** — двухколоночный: контент слева, изображение справа. Вращающиеся кольца, canvas-частицы, scan-линия
4. **Ticker** — бегущая строка с паузой при ховере
5. **Catalog** (`#catalog`) — поиск + фильтры + сетка карточек
6. **Features** (`#features`) — 3 карточки преимуществ
7. **About** (`#about`) — текст + анимированные счётчики + теги
8. **CTA** — огромный фоновый текст "LOGIFAN", кнопка в каталог
9. **Footer** — трёхколоночный
10. **Modal** — панель справа с деталями товара + галерея

### Поток данных
```
products.json (список slug-ов)
  → fetch output/<slug>/data.json (имя, характеристики, список изображений)
  → buildCard() → renderCards() → observeCards() (stagger reveal)
  → клик по карточке → openModal(product)
```

---

## JavaScript — ключевые функции (`app.js`)

| Функция | Что делает |
|---|---|
| `initPreloader()` | Запускает preloader, через 1.5с вызывает `launchApp()` |
| `launchApp()` | Инициализирует всё: nav, cursor, particles, reveal, фильтры, грузит данные |
| `initCursor()` | Кастомный курсор (только pointer устройства) |
| `initScrollProgress()` | Оранжевая полоса прогресса вверху |
| `initNav()` | Hide-on-scroll + подсветка активной секции |
| `initReveal()` | IntersectionObserver для `.reveal-item` и `.reveal-line` |
| `initHeroTitle()` | Оборачивает hero-заголовки в `<span>` для clip-анимации |
| `initCountUp()` | Анимация счётчиков `.count-up[data-target]` |
| `initParticles()` | Canvas-частицы в hero-секции |
| `loadProducts()` | Fetch products.json → fetch каждый data.json |
| `renderCards(products)` | Очищает грид, строит карточки, запускает observer |
| `openModal(product)` | Рендерит панель деталей, показывает modal |
| `applyFilters()` | Фильтрует по поиску / типу / механизму |

---

## CSS — ключевые классы

| Класс | Описание |
|---|---|
| `.reveal-item` | Fade + translateY при появлении в viewport. `--ri: N` = задержка N×70ms |
| `.reveal-line` | Clip-анимация строки (overflow hidden + translateY(110%) на inner span) |
| `.count-up` | Число для анимации. Нужен `data-target="N"` |
| `.card.is-visible` | Карточка стала видима (opacity 1, transform none) |
| `.card:hover` | Оранжевое свечение, corner-треугольник, shine sweep, сдвиг стрелки |
| `.hero__ring` | Вращающееся декоративное кольцо (`ring-spin` анимация) |
| `.ticker__track` | Бесконечная прокрутка (`ticker-scroll` анимация) |
| `.preloader.is-done` | Fade out + scale(1.04) preloader |
| `body.loaded` | opacity: 1 (body изначально прозрачный) |

---

## Дизайн-система

```css
--bg:      #09090b   /* основной фон */
--bg-2:    #0f1012   /* фон карточек, секций */
--bg-3:    #161719   /* hover-состояние */
--accent:  #ff6200   /* оранжевый — главный акцент */
--accent-2:#ff8c00   /* янтарный — gradient, hover кнопок */
--text:    #dddee6   /* основной текст */
--muted:   #4e505f   /* приглушённый текст */
--muted-2: #6b6e80   /* чуть светлее muted */

--display: 'Bebas Neue'   /* заголовки, цифры */
--mono:    'Space Mono'   /* технические тексты, лейблы */
--body:    'Manrope'      /* основной текст */
```

---

## Данные товаров

- **27 товаров** в `products.json`
- Каждый `data.json` содержит: `name` (строка), `specs` (объект ключ→значение), `images` (массив путей)
- Ключевые поля specs: `Тип`, `Тип вентилятора`, `Рабочий механизм вентилятора`, `Диаметр воздуховода, мм`, `Производительность, м3/час`, `Мощность`, `Напряжение`
- Фильтры работают по `Тип` / `Тип вентилятора` и `Рабочий механизм вентилятора`

---

## Как запустить локально

```bash
# Из папки webpassport:
python3 -m http.server 8080 --bind 0.0.0.0 --directory /root/webpassport

# Открыть: http://localhost:8080
# Нельзя открывать через file:// — fetch не работает
```

---

## Скрипты парсинга (не трогать без нужды)

- `parse_html.py` — читает `htmls/*.html`, пишет `output/<slug>/data.json`
- `redownload_hq.py` — перекачивает изображения в HD качество (wc1000)

---

## Что делали в последней сессии

Полный редизайн фронтенда на ветке `batya`:
- Preloader с glitch-эффектом
- Кастомный cursor (dot + ring с лагом)
- Scroll progress bar
- Hero: вращающиеся кольца, canvas-частицы, scan-линия по фото
- Ticker-лента между hero и каталогом
- Карточки: оранжевое свечение + shine sweep + corner-треугольник
- Новая секция Features (3 карточки)
- About: анимированные счётчики
- CTA-секция с фоновым LOGIFAN
- Расширенный footer

Установлен плагин `ui-ux-pro-max` v2.5.0 от nextlevelbuilder (клонирован в `/root/.claude/plugins/cache/nextlevelbuilder/ui-ux-pro-max-skill/2.5.0/`).
