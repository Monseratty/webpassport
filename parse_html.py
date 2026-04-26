#!/usr/bin/env python3
"""
Locally parse fan product HTML pages.

For every .html in INPUT_DIR extracts:
  - product name (from <h1> / <title>)
  - specs (universal: <table>, <dl>, <ul>/<li>, repeated label/value blocks,
    "Key: value" regex fallback)
  - <img> images (relative paths copied, http(s) downloaded via requests)

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


INPUT_DIR = "htmls"
OUTPUT_DIR = "output"
DOWNLOAD_TIMEOUT = 10
USER_AGENT = "Mozilla/5.0 (compatible; LocalHTMLParser/1.0)"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("parse")


# ---------- slug ----------

_CYR = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "i", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "c", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
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


# ---------- product name ----------

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


# ---------- specs ----------

_CURRENCY_RE = re.compile(r"[₽$€£¥]")
_HAS_LETTER_RE = re.compile(r"[A-Za-zА-Яа-яЁё]")


def _add(specs, key, value):
    key = _norm(key).rstrip(":;  ")
    value = _norm(value)
    if not key or not value or key == value:
        return
    if len(key) > 120 or len(value) > 500:
        return
    if _CURRENCY_RE.search(key) or not _HAS_LETTER_RE.search(key):
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


_BLOCK_TAGS = ["div", "section", "article", "header", "nav", "footer", "aside", "main", "ul", "ol", "table"]


def _from_pair_blocks(soup, specs):
    """Detect <X><label/><value/></X> patterns (e.g. Ozon pdp spec rows)."""
    for el in soup.find_all(True):
        children = [c for c in el.children if getattr(c, "name", None)]
        if len(children) != 2:
            continue
        # children must be leaf-ish: no block-level descendants
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


# ---------- images ----------

def _img_src(img):
    for attr in ("src", "data-src", "data-original", "data-lazy", "data-lazy-src"):
        v = img.get(attr)
        if v and v.strip():
            return v.strip()
    for attr in ("srcset", "data-srcset"):
        v = img.get(attr)
        if v:
            first = v.split(",")[0].strip().split()
            if first:
                return first[0]
    return None


def _safe_filename(url, idx):
    path = urlparse(url).path
    base = os.path.basename(path) or f"image_{idx}"
    base = re.sub(r"[^\w.\-]", "_", base)
    if "." not in base:
        base += ".jpg"
    return f"{idx:02d}_{base}"


def _save_image(src, src_html_dir, images_dir, idx):
    parsed = urlparse(src)
    target = os.path.join(images_dir, _safe_filename(src, idx))
    try:
        if parsed.scheme in ("http", "https"):
            if requests is None:
                log.warning("requests not installed; skipping %s", src)
                return None
            r = requests.get(src, timeout=DOWNLOAD_TIMEOUT,
                             headers={"User-Agent": USER_AGENT})
            r.raise_for_status()
            with open(target, "wb") as f:
                f.write(r.content)
            return target
        if parsed.scheme == "data":
            return None  # base64 inline; skip
        local = src
        if not os.path.isabs(local):
            local = os.path.normpath(os.path.join(src_html_dir, local))
        if os.path.isfile(local):
            shutil.copy2(local, target)
            return target
        log.warning("image not found locally: %s", local)
        return None
    except Exception as e:
        log.warning("image fail %s: %s", src, e)
        return None


def extract_images(soup, src_html_dir, images_dir):
    os.makedirs(images_dir, exist_ok=True)
    seen = set()
    saved = []
    idx = 0
    for img in soup.find_all("img"):
        src = _img_src(img)
        if not src or src in seen:
            continue
        seen.add(src)
        idx += 1
        path = _save_image(src, src_html_dir, images_dir, idx)
        if path:
            saved.append(os.path.relpath(path, os.path.dirname(images_dir)))
    return saved


# ---------- per-file ----------

def process_file(html_path, output_root):
    log.info("processing %s", html_path)
    with open(html_path, "r", encoding="utf-8", errors="replace") as f:
        soup = BeautifulSoup(f, "html.parser")

    name = extract_name(soup)
    specs = extract_specs(soup)

    slug = slugify(name)
    product_dir = os.path.join(output_root, slug)
    # avoid collisions across files
    suffix = 1
    base_slug = slug
    while os.path.exists(product_dir):
        suffix += 1
        slug = f"{base_slug}-{suffix}"
        product_dir = os.path.join(output_root, slug)
    os.makedirs(product_dir, exist_ok=True)
    images_dir = os.path.join(product_dir, "images")

    images = extract_images(soup, os.path.dirname(html_path), images_dir)

    data = {"name": name, "specs": specs, "images": images}
    with open(os.path.join(product_dir, "data.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    log.info("  -> %s | specs=%d images=%d", slug, len(specs), len(images))
    return data


def main():
    if not os.path.isdir(INPUT_DIR):
        log.error("input dir not found: %s", INPUT_DIR)
        return
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

    log.info("done. ok=%d fail=%d total=%d", ok, fail, ok + fail)


if __name__ == "__main__":
    main()
