#!/usr/bin/env python3
"""
Re-download product images at wc1000 (high quality) from HTML source files.
Only keeps real product photos (ir.ozone.ru/s3/multimedia-*).
Skips Ozon logos, QR codes, payment banners.
Updates each product's data.json with new image list.
"""

import json
import logging
import os
import re
import shutil
from urllib.parse import urlparse

from bs4 import BeautifulSoup
import requests

INPUT_DIR = "htmls"
OUTPUT_DIR = "output"
TARGET_SIZE = "wc1000"
DOWNLOAD_TIMEOUT = 20
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("hq-images")

_CYR = {
    "а": "a","б": "b","в": "v","г": "g","д": "d","е": "e","ё": "e",
    "ж": "zh","з": "z","и": "i","й": "i","к": "k","л": "l","м": "m",
    "н": "n","о": "o","п": "p","р": "r","с": "s","т": "t","у": "u",
    "ф": "f","х": "h","ц": "c","ч": "ch","ш": "sh","щ": "sch",
    "ъ": "","ы": "y","ь": "","э": "e","ю": "yu","я": "ya",
}

def slugify(text, maxlen=80):
    text = (text or "").strip().lower()
    out = []
    for ch in text:
        if ch in _CYR: out.append(_CYR[ch])
        elif ch.isalnum() and ord(ch) < 128: out.append(ch)
        elif ch in (" ", "-", "_", "."): out.append("-")
    slug = re.sub(r"-+", "-", "".join(out)).strip("-")
    return (slug or "product")[:maxlen]

def norm(s):
    return re.sub(r"\s+", " ", (s or "")).strip()

def extract_name(soup):
    h1 = soup.find("h1")
    if h1:
        return norm(h1.get_text(" ", strip=True))
    og = soup.find("meta", attrs={"property": "og:title"})
    if og and og.get("content"):
        return norm(og["content"])
    return norm(soup.title.get_text()) if soup.title else "product"

def is_product_image(url):
    """Only keep real product photos from multimedia CDN."""
    return bool(re.search(r"ir\.ozone\.ru/s3/multimedia", url))

def to_hq(url):
    """Replace any wc{n} or c{n} size token with TARGET_SIZE."""
    return re.sub(r"/(wc\d+|c\d+)/", f"/{TARGET_SIZE}/", url)

def collect_multimedia_urls(soup):
    """Extract unique product image URLs (deduped by filename after size change)."""
    seen_names = {}
    for img in soup.find_all("img"):
        for attr in ("src", "data-src", "srcset"):
            val = img.get(attr)
            if not val:
                continue
            for part in val.split(","):
                url = part.strip().split()[0]
                if not is_product_image(url):
                    continue
                hq = to_hq(url)
                fname = os.path.basename(urlparse(hq).path)
                if fname not in seen_names:
                    seen_names[fname] = hq
    return list(seen_names.values())

def download(url, dest_path):
    try:
        r = requests.get(url, timeout=DOWNLOAD_TIMEOUT, headers={"User-Agent": USER_AGENT})
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            f.write(r.content)
        return True
    except Exception as e:
        log.warning("  download failed %s: %s", url, e)
        return False

def find_product_dir(slug):
    """Find existing output directory matching the slug (prefix match)."""
    for d in os.listdir(OUTPUT_DIR):
        if d == slug or d.startswith(slug):
            return os.path.join(OUTPUT_DIR, d)
    return None

def process_html(html_path):
    log.info("Processing %s", html_path)
    with open(html_path, "r", encoding="utf-8", errors="replace") as f:
        soup = BeautifulSoup(f, "html.parser")

    name = extract_name(soup)
    slug = slugify(name)

    urls = collect_multimedia_urls(soup)
    if not urls:
        log.info("  No multimedia images found in %s", html_path)
        return

    product_dir = find_product_dir(slug)
    if not product_dir:
        log.warning("  No output dir found for slug: %s", slug)
        return

    images_dir = os.path.join(product_dir, "images")
    # Clean old images
    if os.path.isdir(images_dir):
        shutil.rmtree(images_dir)
    os.makedirs(images_dir)

    saved = []
    for i, url in enumerate(urls, start=1):
        fname = f"{i:02d}_{os.path.basename(urlparse(url).path)}"
        dest = os.path.join(images_dir, fname)
        log.info("  [%d/%d] %s", i, len(urls), url)
        if download(url, dest):
            saved.append(f"images/{fname}")

    # Update data.json
    data_path = os.path.join(product_dir, "data.json")
    if os.path.isfile(data_path):
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        data["images"] = saved
        with open(data_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        log.info("  Saved %d images -> %s", len(saved), product_dir)
    else:
        log.warning("  data.json not found at %s", data_path)

def main():
    files = sorted(
        os.path.join(INPUT_DIR, f)
        for f in os.listdir(INPUT_DIR)
        if f.lower().endswith(".html")
    )
    log.info("Found %d HTML files", len(files))
    for path in files:
        try:
            process_html(path)
        except Exception as e:
            log.exception("Failed on %s: %s", path, e)
    log.info("Done.")

if __name__ == "__main__":
    main()
