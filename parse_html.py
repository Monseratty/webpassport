#!/usr/bin/env python3
"""
Locally parse Ozon fan product HTML pages.

Extracts per product:
  - name           (from <h1> / <title>)
  - price          (current price in roubles, integer)
  - price_original (before-discount price, integer; None if no discount)
  - rating         (float, e.g. 4.9; None if no reviews)
  - reviews_count  (integer; 0 if none)
  - description    (plain text, from __NUXT__ JSON)
  - specs          (dict of characteristic key→value)
  - images         (list of relative paths, HQ only)

Image strategy:
  Only downloads real product images from Ozon's multimedia CDN
  (ir.ozone.ru/s3/multimedia-*). Always requests wc1000 (highest quality).
  Skips logos, QR codes, banners, marketing images.

Writes:  OUTPUT_DIR/<slug>/data.json + OUTPUT_DIR/<slug>/images/
"""

import json
import logging
import os
import re
import shutil
from urllib.parse import urlparse

from bs4 import BeautifulSoup

try:
    import requests
except ImportError:
    requests = None


INPUT_DIR        = "htmls"
OUTPUT_DIR       = "output"
DOWNLOAD_TIMEOUT = 15
USER_AGENT       = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("parse")


# ──────────────────────────────────────────────────────────────────
# Slug
# ──────────────────────────────────────────────────────────────────

_CYR = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "i", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "c", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "",  "ы": "y", "ь": "",  "э": "e", "ю": "yu", "я": "ya",
}


def slugify(text, maxlen=80):
    text = (text or "").strip().lower()
    out = []
    for ch in text:
        if ch in _CYR:
            out.append(_CYR[ch])
        elif ch.isalnum() and ord(ch) < 128:
            out.append(ch)
        elif ch in (" ", "-", "_", "."):
            out.append("-")
    slug = re.sub(r"-+", "-", "".join(out)).strip("-")
    return (slug or "product")[:maxlen]


def _norm(s):
    return re.sub(r"\s+", " ", (s or "")).strip()


def _text(el):
    return _norm(el.get_text(" ", strip=True)) if el else ""


# ──────────────────────────────────────────────────────────────────
# Name
# ──────────────────────────────────────────────────────────────────

def extract_name(soup):
    h1 = soup.find("h1")
    name = _text(h1)
    if name:
        return name
    if soup.title:
        title = _text(soup.title)
        title = re.sub(r"\s*[—\-|]\s*OZON.*$", "", title, flags=re.IGNORECASE)
        title = re.sub(r"\s*купить.*$", "", title, flags=re.IGNORECASE)
        return title or "product"
    og = soup.find("meta", attrs={"property": "og:title"})
    if og and og.get("content"):
        return _norm(og["content"])
    return "product"


# ──────────────────────────────────────────────────────────────────
# Price
# ──────────────────────────────────────────────────────────────────

def _parse_price_str(raw):
    """'7 748 ₽' → 7748  (handles thin spaces, nbsp, etc.)"""
    if not raw:
        return None
    digits = re.sub(r"[^\d]", "", raw)
    return int(digits) if digits else None


def extract_price(soup):
    """
    Returns (price, price_original) as ints or None.
    price         = discounted / current price (the big one shown in orange/bold)
    price_original= full price before discount; None if no discount shown
    """
    price_el = soup.find(class_="tsHeadline600Large")
    price    = _parse_price_str(_text(price_el))

    orig_el  = soup.find(class_="pdp_bj")
    original = _parse_price_str(_text(orig_el))

    if price and original and price == original:
        original = None

    if not price:
        m = re.search(r'"cardPrice"\s*:\s*"([^"]+)"', soup.decode() if hasattr(soup, 'decode') else "")
        if m:
            price = _parse_price_str(m.group(1))

    return price, original


# ──────────────────────────────────────────────────────────────────
# Rating
# ──────────────────────────────────────────────────────────────────

def extract_rating(content):
    """
    Returns (rating_float_or_None, reviews_count_int).
    """
    rv = re.search(r'"ratingValue"\s*:\s*"([0-9.]+)"', content)
    rc = re.search(r'"reviewCount"\s*:\s*"(\d+)"', content)
    if rv:
        rating  = float(rv.group(1))
        reviews = int(rc.group(1)) if rc else 0
        return rating, reviews

    soup = BeautifulSoup(content, "html.parser")
    el = soup.find(attrs={"data-widget": "webSingleProductScore"})
    if el:
        txt = el.get_text(" ", strip=True)
        m = re.match(r"([0-9.]+)\s*[•·]\s*(\d+)", txt)
        if m:
            return float(m.group(1)), int(m.group(2))

    return None, 0


# ──────────────────────────────────────────────────────────────────
# Description
# ──────────────────────────────────────────────────────────────────

def extract_description(content):
    m = re.search(r'"description"\s*:\s*"([^"]{50,}?)"(?:,|")', content)
    if m:
        raw = m.group(1)
        raw = raw.replace("\\n", "\n").replace("\\r", "").replace('\\"', '"').replace("\\\\", "\\")
        return _norm(raw)
    return None


# ──────────────────────────────────────────────────────────────────
# Specs
# ──────────────────────────────────────────────────────────────────

_CURRENCY_RE   = re.compile(r"[₽$€£¥]")
_HAS_LETTER_RE = re.compile(r"[A-Za-zА-Яа-яЁё]")

# Keys that are Ozon UI artifacts, not real product specs
_SPEC_BLACKLIST = {
    "артикул", "оплатить позже", "pay later", "sku", "article",
    "нашли дешевле", "сообщить о проблеме", "вопросы и ответы",
    "возврат", "доставка", "гарантия",
}


def _add(specs, key, value):
    key   = _norm(key).rstrip(":;  ")
    value = _norm(value)
    if not key or not value or key == value:
        return
    if len(key) > 120 or len(value) > 500:
        return
    if _CURRENCY_RE.search(key) or not _HAS_LETTER_RE.search(key):
        return
    if key.lower() in _SPEC_BLACKLIST:
        return
    specs.setdefault(key, value)


def _from_tables(soup, specs):
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                _add(specs, _text(cells[0]), _text(cells[1]))


def _from_dl(soup, specs):
    for dl in soup.find_all("dl"):
        dts = dl.find_all("dt")
        dds = dl.find_all("dd")
        for dt, dd in zip(dts, dds):
            _add(specs, _text(dt), _text(dd))


_SEP_RE = re.compile(r"\s*[:—–\-]\s+")


def _from_lists(soup, specs):
    for li in soup.find_all("li"):
        txt = _text(li)
        if not txt:
            continue
        parts = _SEP_RE.split(txt, maxsplit=1)
        if len(parts) == 2 and len(parts[0]) <= 80:
            _add(specs, parts[0], parts[1])


_BLOCK_TAGS = ["div", "section", "article", "header", "nav", "footer",
               "aside", "main", "ul", "ol", "table"]


def _from_pair_blocks(soup, specs):
    for el in soup.find_all(True):
        children = [c for c in el.children if getattr(c, "name", None)]
        if len(children) != 2:
            continue
        if any(c.find(_BLOCK_TAGS) for c in children):
            continue
        k = _text(children[0])
        v = _text(children[1])
        if not k or not v or k == v:
            continue
        if len(k) > 80 or len(k.split()) > 10:
            continue
        if k.endswith(".") or k.endswith("?") or k.endswith("!"):
            continue
        if len(v) > 400:
            continue
        _add(specs, k, v)


_PAIR_LINE_RE = re.compile(r"^\s*([^:\n]{2,80})\s*:\s+(.{1,400})\s*$")


def _from_text_pairs(text, specs):
    for line in text.splitlines():
        m = _PAIR_LINE_RE.match(line)
        if m:
            _add(specs, m.group(1), m.group(2))


def extract_specs(soup):
    specs = {}
    try:
        _from_tables(soup, specs)
    except Exception as e:
        log.debug("tables: %s", e)
    try:
        _from_dl(soup, specs)
    except Exception as e:
        log.debug("dl: %s", e)
    try:
        _from_lists(soup, specs)
    except Exception as e:
        log.debug("ul/li: %s", e)
    try:
        _from_pair_blocks(soup, specs)
    except Exception as e:
        log.debug("pair-blocks: %s", e)
    try:
        text_soup = BeautifulSoup(str(soup), "html.parser")
        for s in text_soup(["script", "style", "noscript"]):
            s.decompose()
        _from_text_pairs(text_soup.get_text("\n"), specs)
    except Exception as e:
        log.debug("text-pairs: %s", e)
    return specs


# ──────────────────────────────────────────────────────────────────
# Images — HQ product-only strategy
# ──────────────────────────────────────────────────────────────────

# Only match Ozon multimedia CDN images (real product photos)
_PRODUCT_IMG_RE = re.compile(
    r'https://ir\.ozone\.ru/s3/(multimedia-[^/"]+)/([^/"]+)/(\d+\.(?:jpg|jpeg|png|webp))',
    re.IGNORECASE,
)


def extract_images(content, images_dir):
    """
    Find all unique product image files from the Ozon multimedia CDN,
    upgrade to wc1000 (highest quality), download and save.

    Skips: logos, QR codes, banners, payment images, marketing assets.
    """
    os.makedirs(images_dir, exist_ok=True)

    if requests is None:
        log.warning("requests not installed — skipping image download")
        return []

    # Collect unique files in document order, remembering their CDN bucket.
    # If the same file appears at wc1000, prefer that bucket (already HQ).
    file_bucket: dict[str, str] = {}  # filename → bucket
    for bucket, size, fname in _PRODUCT_IMG_RE.findall(content):
        if fname not in file_bucket:
            file_bucket[fname] = bucket
        if size == "wc1000":
            # Confirm bucket for the HQ version
            file_bucket[fname] = bucket

    saved = []
    for idx, (fname, bucket) in enumerate(file_bucket.items(), 1):
        url    = f"https://ir.ozone.ru/s3/{bucket}/wc1000/{fname}"
        target = os.path.join(images_dir, f"{idx:02d}_{fname}")
        try:
            r = requests.get(
                url,
                timeout=DOWNLOAD_TIMEOUT,
                headers={"User-Agent": USER_AGENT},
            )
            r.raise_for_status()
            with open(target, "wb") as f:
                f.write(r.content)
            rel = os.path.relpath(target, os.path.dirname(images_dir))
            saved.append(rel)
            log.debug("  saved %s (%d KB)", fname, len(r.content) // 1024)
        except Exception as e:
            log.warning("  image fail %s: %s", url, e)

    return saved


# ──────────────────────────────────────────────────────────────────
# Per-file
# ──────────────────────────────────────────────────────────────────

def process_file(html_path, output_root):
    log.info("processing %s", html_path)
    with open(html_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    soup = BeautifulSoup(content, "html.parser")

    name        = extract_name(soup)
    specs       = extract_specs(soup)
    price, orig = extract_price(soup)
    rating, rev = extract_rating(content)
    description = extract_description(content)

    slug = slugify(name)
    product_dir = os.path.join(output_root, slug)
    suffix = 1
    base_slug = slug
    while os.path.exists(product_dir):
        suffix += 1
        slug        = f"{base_slug}-{suffix}"
        product_dir = os.path.join(output_root, slug)
    os.makedirs(product_dir, exist_ok=True)
    images_dir = os.path.join(product_dir, "images")

    images = extract_images(content, images_dir)

    data = {
        "name":           name,
        "price":          price,
        "price_original": orig,
        "rating":         rating,
        "reviews_count":  rev,
        "description":    description,
        "specs":          specs,
        "images":         images,
    }

    with open(os.path.join(product_dir, "data.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    log.info(
        "  -> %s | price=%s orig=%s rating=%s reviews=%s desc=%s specs=%d images=%d",
        slug, price, orig, rating, rev,
        f"{len(description)}ch" if description else "none",
        len(specs), len(images),
    )
    return data


# ──────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────

def main():
    if not os.path.isdir(INPUT_DIR):
        log.error("input dir not found: %s", INPUT_DIR)
        return
    if os.path.isdir(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
        log.info("cleared old output dir")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    files = sorted(
        os.path.join(INPUT_DIR, f)
        for f in os.listdir(INPUT_DIR)
        if f.lower().endswith(".html")
    )
    log.info("found %d html files in %s", len(files), INPUT_DIR)

    ok = fail = 0
    for path in files:
        try:
            process_file(path, OUTPUT_DIR)
            ok += 1
        except Exception as e:
            fail += 1
            log.exception("failed on %s: %s", path, e)

    slugs = sorted(
        d for d in os.listdir(OUTPUT_DIR)
        if os.path.isdir(os.path.join(OUTPUT_DIR, d))
    )
    with open("products.json", "w", encoding="utf-8") as f:
        json.dump(slugs, f, ensure_ascii=False, indent=2)
    log.info("wrote products.json with %d entries", len(slugs))
    log.info("done. ok=%d fail=%d total=%d", ok, fail, ok + fail)


if __name__ == "__main__":
    main()
