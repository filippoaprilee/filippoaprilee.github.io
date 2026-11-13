#!/usr/bin/env python3
"""TurinPipps optional Python collector: BeautifulSoup4 + Playwright Chromium.
Public housing indexes only, with robots.txt checks. No CAPTCHA solving,
credential use, proxy rotation, browser fingerprint spoofing or login bypass.
This worker is a fallback for GitHub Actions; production cron runs in Supabase.
"""
from __future__ import annotations
import argparse
import asyncio
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser
from urllib.error import HTTPError

try:
    from bs4 import BeautifulSoup
except ImportError as e:
    raise SystemExit("Installa beautifulsoup4: pip install beautifulsoup4") from e

HERE = Path(__file__).resolve().parent
PUBLIC_SOURCES = [
    "https://www.clickcase.it/annunci/affitti-appartamenti-privati-torino.html",
    "https://www.clickcase.it/annunci/affitti-case-privati-torino.html",
    "https://www.clickcase.it/annunci/appartamenti-in-affitto-privati-torino.html",
]
UA = "TurinPippsPublicCollector/4.0 (public listings, robots.txt respected)"
ZONES = ["Crocetta", "Cenisia", "Borgo San Paolo", "San Paolo",
         "Cit Turin", "Santa Rita", "Pozzo Strada"]
MAX_BYTES = 1_500_000
MAX_LISTINGS = 400

def clean(s: str) -> str:
    return re.sub(r"\s+", " ", BeautifulSoup(str(s), "html.parser").get_text(" ", strip=True)).strip()

def permitted(url: str) -> bool:
    u = urlsplit(url)
    if u.scheme != "https" or u.hostname != "www.clickcase.it":
        return False
    robots = f"{u.scheme}://{u.netloc}/robots.txt"
    try:
        req = Request(robots, headers={"User-Agent": UA})
        with urlopen(req, timeout=8) as resp:
            raw = resp.read(200000).decode("utf-8", "replace")
    except HTTPError as e:
        if e.code == 404:
            return True
        return False
    except OSError:
        return False
    parser = RobotFileParser()
    parser.parse(raw.splitlines())
    return parser.can_fetch(UA, url)

def normalize_url(value: str, base: str) -> str | None:
    try:
        u = urlsplit(urljoin(base, value))
    except ValueError:
        return None
    if u.scheme != "https" or u.hostname != "www.clickcase.it":
        return None
    if not re.search(r"-torino-\d+\.html$", u.path, re.I):
        return None
    return urlunsplit(("https", "www.clickcase.it", u.path, "", ""))

def zone_from(text: str) -> str:
    low = text.casefold()
    return next((z for z in ZONES if z.casefold() in low), "")

def extract_cards(source: str, html_doc: str) -> list[dict]:
    soup = BeautifulSoup(html_doc, "html.parser")
    for el in soup(["script", "style", "noscript"]):
        el.decompose()
    discovered: dict[str, dict] = {}
    for a in soup.find_all("a", href=True):
        uri = normalize_url(a["href"], source)
        if not uri or uri in discovered:
            continue
        title = clean(a.get_text(" ", strip=True))[:220]
        if len(title) < 9 or re.search(r"\b(stanza|camera|posto letto|box|garage)\b", title, re.I):
            continue
        context = ""
        current = a
        for _ in range(3):
            current = current.parent
            if not current:
                break
            context = clean(current.get_text(" ", strip=True))[:850]
            if len(context) > 90:
                break
        zone = zone_from(title + " " + context)
        if not zone:
            continue
        money = re.search(r"€\s*(\d{3,4})\b", context)
        price = int(money.group(1)) if money else 0
        if not 180 <= price <= 2500:
            price = 0
        discovered[uri] = {
            "url": uri,
            "title": title,
            "description": context[:700],
            "zone": zone,
            "price": price,
            "source": "ClickCase",
            "private_status": "source",
            "seen": datetime.now(timezone.utc).isoformat(timespec="seconds")
        }
    return list(discovered.values())

def fetch_html(url: str) -> str:
    req = Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urlopen(req, timeout=15) as res:
        if "html" not in res.headers.get("Content-Type", ""):
            return ""
        raw = res.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            return ""
        return raw.decode("utf-8", "replace")

async def browser_html(url: str) -> str:
    """Only a normal headless browser rendering the same already-permitted public page."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return ""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page(
                viewport={"width": 1280, "height": 800},
                user_agent=UA,
                locale="it-IT"
            )
            response = await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            if not response or response.status >= 400:
                return ""
            return (await page.content())[:MAX_BYTES]
        finally:
            await browser.close()

async def collect(use_playwright: bool, pages: int) -> dict:
    found: dict[str,dict] = {}
    status: list[dict] = []
    for source in PUBLIC_SOURCES:
        for page_no in range(1, pages + 1):
            url = source if page_no == 1 else source + "?pagina=" + str(page_no)
            if not permitted(url):
                status.append({"source": source, "page": page_no, "status": "robots_denied"})
                break
            try:
                raw = fetch_html(url)
                rows = extract_cards(url, raw)
                if use_playwright and not rows:
                    raw = await browser_html(url)
                    rows = extract_cards(url, raw)
                for r in rows:
                    found.setdefault(r["url"], r)
                status.append({"source": source, "page": page_no, "status": "ok", "found": len(rows)})
                if page_no > 1 and not rows:
                    break
            except Exception as e:
                status.append({"source": source, "page": page_no,
                               "status": "error", "error": type(e).__name__})
                break
            await asyncio.sleep(0.8)
    return {"updated_at":datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "listings":list(found.values())[:MAX_LISTINGS], "sources":status}

def write_output(result: dict) -> None:
    target = HERE / "data" / "playwright_results.json"
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", "utf-8")
    # Unifica i dati senza scartare i collegamenti già presenti o modificarne la prima scoperta.
    listing_file = HERE / "data" / "listings.json"
    try:
        archive = json.loads(listing_file.read_text("utf-8"))
    except (OSError, ValueError):
        archive = {"listings": []}
    existing = {row["url"]: row for row in archive.get("listings", [])
                if isinstance(row, dict) and row.get("url")}
    newly_found = 0
    for row in result["listings"]:
        uri = row["url"]
        old = existing.get(uri, {})
        if not old:
            newly_found += 1
        combined = dict(old)
        for key, value in row.items():
            if value not in ("", None, 0, []):
                combined[key] = value
        combined["seen"] = old.get("seen") or row["seen"]
        combined["last_seen"] = result["updated_at"]
        existing[uri] = combined
    archive["listings"] = sorted(existing.values(),
                                key=lambda x: x.get("last_seen") or x.get("seen") or "",
                                reverse=True)[:700]
    archive["updated_at"] = result["updated_at"]
    listing_file.write_text(json.dumps(archive, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"Raccolta Python: {len(result['listings'])} link, {newly_found} nuovi, "
          f"{len(result['sources'])} pagine consultate")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--playwright", action="store_true", help="Render Chromium solo per pagine consentite")
    parser.add_argument("--pages", type=int, default=4)
    args = parser.parse_args()
    write_output(asyncio.run(collect(args.playwright, max(1, min(args.pages, 8)))))
