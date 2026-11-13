#!/usr/bin/env python3
"""TurinPipps: collector Python per fonti pubbliche consentite.

Uso:
  pip install -r requirements.txt && playwright install chromium
  python tools/public_collector.py --output annunci.json
  python tools/public_collector.py --rss-file alerts.txt --output annunci.json

Il collector non aggira robots.txt, CAPTCHA, login, rate limit o paywall.
Il lavoro automatico di produzione resta svolto dal job Supabase, non da questo CLI.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.robotparser import RobotFileParser
from xml.etree import ElementTree as ET

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

USER_AGENT = "TurinPippsResearchBot/1.0 (+public property feed reader)"
PAGES = [
    "https://www.clickcase.it/annunci/affitti-case-privati-torino.html",
    "https://www.clickcase.it/annunci/affitti-appartamenti-privati-torino.html",
]
ZONES = ["Crocetta", "Cenisia", "Borgo San Paolo", "San Paolo", "Cit Turin", "Santa Rita", "Pozzo Strada"]
ALLOWED = {"www.clickcase.it", "clickcase.it", "www.subito.it", "www.idealista.it",
           "www.immobiliare.it", "torino.bakeca.it", "www.casa.it", "www.facebook.com"}
RESTRICTED_WORDS = re.compile(r"\b(stanza|posto letto|camera singola)\b", re.I)
LINK_PATTERNS = (
    re.compile(r"/[^/]+-\d+\.html$", re.I),
    re.compile(r"/annunci/\d+/?$", re.I),
    re.compile(r"/immobile/\d+/?$", re.I),
    re.compile(r"/appartamenti/[^/]+\.htm$", re.I),
    re.compile(r"/dettaglio/offro-casa/[^/]+$", re.I),
)


def robots_allowed(url: str) -> bool:
    """Se i robots non sono raggiungibili, fallisce in modo prudente."""
    u = urlparse(url)
    if u.scheme != "https" or not u.hostname:
        return False
    path = urlunparse((u.scheme, u.netloc, "/robots.txt", "", "", ""))
    try:
        with urlopen(Request(path, headers={"User-Agent": USER_AGENT}), timeout=9) as r:
            rules = r.read(300_000).decode("utf-8", errors="replace").splitlines()
    except HTTPError as exc:
        if exc.code == 404:
            return True
        return False
    except (OSError, URLError):
        return False
    rp = RobotFileParser()
    rp.parse(rules)
    return rp.can_fetch(USER_AGENT, url)


def listing_link(url: str) -> str | None:
    try:
        p = urlparse(url)
        if p.scheme not in {"https", "http"} or not p.hostname:
            return None
        if p.hostname.lower() not in ALLOWED:
            return None
        if not any(r.search(p.path) for r in LINK_PATTERNS):
            return None
        return urlunparse(("https", p.netloc.lower(), p.path.rstrip("/"), "", "", ""))
    except ValueError:
        return None


def zone_of(text: str) -> str:
    lower = text.casefold()
    for zone in ZONES:
        if zone.casefold() in lower:
            return zone
    return ""


def extract_html(html: str, origin: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    found: dict[str, dict] = {}
    for a in soup.select("a[href]"):
        href = listing_link(urljoin(origin, a.get("href", "")))
        if not href or href in found:
            continue
        parent = a.find_parent(["article", "li", "div"])
        ctx = (parent.get_text(" ", strip=True) if parent else a.get_text(" ", strip=True))[:900]
        title = a.get_text(" ", strip=True)[:200]
        if len(title) < 8 or RESTRICTED_WORDS.search(title):
            continue
        zone = zone_of(ctx + " " + title)
        if not zone:
            continue
        found[href] = {
            "listing_url": href,
            "title": title,
            "description": "Scheda indicizzata; canone e disponibilità da confermare.",
            "zone": zone,
            "source": urlparse(href).hostname or "",
            "origin_engine": "python_playwright_bs4",
            "price": 0,
            "private_status": "unverified",
            "first_seen": datetime.now(timezone.utc).isoformat(),
        }
        if len(found) >= 100:
            break
    return list(found.values())


def read_alert_atom(xml: bytes) -> list[dict]:
    """Consuma ogni entry presente nell'Atom, non solo le prime N."""
    root = ET.fromstring(xml)
    ns = {"a": "http://www.w3.org/2005/Atom"}
    entries = root.findall(".//a:entry", ns)
    result = {}
    for entry in entries:
        title = (entry.findtext("a:title", default="", namespaces=ns) or "").strip()
        snippet = entry.findtext("a:content", default="", namespaces=ns) or ""
        link = entry.find("a:link", ns)
        href = link.get("href", "") if link is not None else ""
        href = listing_link(href)
        if not href or RESTRICTED_WORDS.search(title):
            continue
        zone = zone_of(title + " " + BeautifulSoup(snippet, "html.parser").get_text(" ", strip=True))
        if not zone:
            continue
        result[href] = {
            "listing_url": href,
            "title": title[:200] or "Annuncio da controllare",
            "description": BeautifulSoup(snippet, "html.parser").get_text(" ", strip=True)[:1100],
            "zone": zone,
            "source": urlparse(href).hostname or "Google Alerts",
            "origin_engine": "google_alerts_atom",
            "price": 0,
            "private_status": "unverified",
            "first_seen": datetime.now(timezone.utc).isoformat(),
        }
    return list(result.values())


def get_feeds(feed_file: Path) -> list[dict]:
    if not feed_file.is_file():
        return []
    listings: list[dict] = []
    for feed in feed_file.read_text(encoding="utf-8").splitlines():
        feed = feed.strip()
        if not re.fullmatch(r"https://(?:www\.)?google\.com/alerts/feeds/\d+/\d+", feed):
            continue
        try:
            with urlopen(Request(feed, headers={"User-Agent": USER_AGENT}), timeout=10) as r:
                listings.extend(read_alert_atom(r.read(2_000_000)))
        except (HTTPError, URLError, OSError, ET.ParseError):
            # Nessun token/feed URL personale nei log.
            continue
    return listings


async def collect_pages() -> list[dict]:
    found: dict[str, dict] = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(user_agent=USER_AGENT, viewport={"width": 1280, "height": 900})
        try:
            for url in PAGES:
                if not robots_allowed(url):
                    print(f"Fonte non consultabile in automatico: {urlparse(url).hostname}")
                    continue
                try:
                    response = await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                    if not response or response.status >= 400:
                        continue
                    for row in extract_html(await page.content(), url):
                        found.setdefault(row["listing_url"], row)
                except Exception:
                    print(f"Fonte temporaneamente indisponibile: {urlparse(url).hostname}")
        finally:
            await browser.close()
    return list(found.values())


def main() -> None:
    parser = argparse.ArgumentParser(description="Ricerca pubblica TurinPipps (rispetta robots.txt)")
    parser.add_argument("--rss-file", type=Path, help="File locale con Google Alerts Atom RSS: NON committare")
    parser.add_argument("--output", type=Path, default=Path("annunci_pubblici.json"))
    args = parser.parse_args()
    result = {row["listing_url"]: row for row in asyncio.run(collect_pages())}
    if args.rss_file:
        for row in get_feeds(args.rss_file):
            result.setdefault(row["listing_url"], row)
    args.output.write_text(json.dumps({"listings": list(result.values())}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Schede trovate: {len(result)} · Disponibilità non verificata · File: {args.output}")


if __name__ == "__main__":
    main()
