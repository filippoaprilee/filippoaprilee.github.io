#!/usr/bin/env python3
"""CasaRadar v3: raccolta rispettosa di robots.txt da pagine pubbliche.
Nessun login, CAPTCHA, proxy, dati privati o invio messaggi automatici.
I portali che non autorizzano la lettura sono mostrati in diagnostica.
"""
from __future__ import annotations
import html
import json
import re
import time
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser
from urllib.error import HTTPError, URLError

HERE=Path(__file__).resolve().parent
DATA=HERE/"data"
UA="CasaRadar/3.0 (personal housing alerts; robots.txt respected)"
SOURCE_URLS=[
  ("clickcase","ClickCase · affitti privati","https://www.clickcase.it/annunci/affitti-case-privati-torino.html"),
  ("bakeca","Bakeca · annunci Torino","https://torino.bakeca.it/annunci/offro-casa/"),
]
ZONES=("Crocetta","Cenisia","San Paolo","Borgo San Paolo","Cit Turin","Santa Rita","Pozzo Strada")
ROBOTS={}
MAX_PAGE=3_000_000

class Anchors(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items=[]; self.depth=0; self.href=""; self.parts=[]; self.pos=(0,0)
    def handle_starttag(self,tag,attrs):
        at=dict(attrs)
        if tag=="a":
            if not self.depth:
                self.href=at.get("href","");self.parts=[];self.pos=self.getpos()
            self.depth+=1
        elif tag=="img" and self.depth and at.get("alt"):
            self.parts.append(at["alt"])
    def handle_data(self,text):
        if self.depth and text.strip():self.parts.append(text.strip())
    def handle_endtag(self,tag):
        if tag=="a" and self.depth:
            self.depth-=1
            if self.depth==0:
                self.items.append((self.href," ".join(self.parts),self.pos))

def clean(value):
    if not isinstance(value,str): return ""
    if value.strip().startswith(("{","[")):return ""
    value=html.unescape(re.sub(r"<[^>]+>"," ",value))
    return re.sub(r"\s+"," ",value).strip()

def canonical(link,base):
    try:
        u=urlparse(urljoin(base,link))
        if u.scheme not in ("http","https") or not u.hostname:return ""
        return urlunparse((u.scheme,u.netloc.lower(),u.path.rstrip("/"),"","",""))
    except Exception:return ""

def zone_of(text):
    text=clean(text).lower()
    for z in ZONES:
        if re.search(r"\b"+re.escape(z.lower())+r"\b",text): return z
    if "piazza sabotino" in text or "via monginevro" in text:return "San Paolo"
    return ""

def price_of(s):
    s=clean(s)
    m=re.search(r"€\s*(\d{2,4}(?:\.\d{3})?)\b",s)
    if not m:m=re.search(r"\b(\d{2,4})\s*(?:€|euro)\s*(?:mensili|/mese|al mese)",s,re.I)
    if not m:return 0
    try:
        value=int(m.group(1).replace(".",""))
        return value if 120<=value<=10000 else 0
    except ValueError:return 0

def sqm_of(s):
    m=re.search(r"\b(\d{2,3})\s*(?:m²|mq|metri quadrati)\b",clean(s),re.I)
    return int(m.group(1)) if m else 0

def valid_listing(url,kind):
    p=urlparse(url)
    host=p.hostname or ""
    if kind=="clickcase":
        return host.endswith("clickcase.it") and bool(re.search(r"-torino-\d+\.html$",p.path,re.I))
    if kind=="subito":
        return host.endswith("subito.it") and bool(re.search(r"/appartamenti/[^/]+\.htm$",p.path,re.I))
    if kind=="bakeca":
        return host.endswith("bakeca.it") and p.path.startswith("/dettaglio/offro-casa/")
    return False

def robots_allows(url):
    p=urlparse(url);key=p.scheme+"://"+p.netloc
    if key not in ROBOTS:
        req=Request(key+"/robots.txt",headers={"User-Agent":UA,"Accept":"text/plain"})
        try:
            with urlopen(req,timeout=15) as r:body=r.read(500000).decode("utf-8","replace")
            parser=RobotFileParser();parser.parse(body.splitlines())
            ROBOTS[key]=(parser,"robots.txt verificato")
        except HTTPError as e:
            ROBOTS[key]=(True,"robots.txt assente (404)") if e.code==404 else (False,"robots.txt HTTP "+str(e.code))
        except Exception as e: ROBOTS[key]=(False,"robots.txt non leggibile: "+str(e)[:70])
    status,reason=ROBOTS[key]
    if isinstance(status,bool):return status,reason
    return bool(status.can_fetch(UA,url)),reason

def fetch(url):
    req=Request(url,headers={"User-Agent":UA,"Accept":"text/html,application/xhtml+xml"})
    with urlopen(req,timeout=20) as r:
        if "html" not in r.headers.get("Content-Type","").lower():raise ValueError("Risposta non HTML")
        body=r.read(MAX_PAGE+1)
        if len(body)>MAX_PAGE:raise ValueError("Risposta troppo grande")
        return body.decode("utf-8","replace")

def scrape_index(source,kind,page):
    parser=Anchors();parser.feed(page)
    # Every anchor is considered only when it is an actual listing detail.
    # Never treat JSON-LD text as the listing title.
    results=[];seen=set()
    lines=page.splitlines(keepends=True)
    offsets=[];pos=0
    for line in lines: offsets.append(pos);pos+=len(line)
    for href,title,(line,col) in parser.items:
        url=canonical(href,source)
        if not valid_listing(url,kind) or url in seen:continue
        seen.add(url)
        title=clean(title)[:180]
        if not title or len(title)<5:continue
        start=offsets[line-1]+col if 1<=line<=len(offsets) else 0
        # Local window: nearby metadata only. Unknowns stay unknown, not guessed.
        window=page[start:start+2400]
        text=clean(re.sub(r"<script\b[^>]*>.*?</script>"," ",window,flags=re.S|re.I))
        # For ClickCase the city/zone and monthly rent appear after the headline link.
        zone=zone_of(text[:650])
        price=price_of(text[:800])
        sqm=sqm_of(text[:950])
        if kind=="bakeca" and "Torino" not in text[:650]:continue
        if kind=="clickcase" and not zone:
            # It is acceptable to retain a listing with an unknown zone for manual review.
            pass
        private="source" if kind in ("clickcase","subito") else "unverified"
        results.append({"url":url,"title":title,"description":text[:420],
            "price":price,"sqm":sqm,"zone":zone,"source":("Subito privati" if kind=="subito" else "ClickCase" if kind=="clickcase" else "Bakeca"),
            "private_status":private,"expenses":"","property_type":"","seen":""})
    return results

def enrich_clickcase(a):
    url=a["url"]
    allowed,_=robots_allows(url)
    if not allowed:return a
    try:
        body=fetch(url)
        raw=clean(re.sub(r"<script\b[^>]*>.*?</script>"," ",body,flags=re.S|re.I))
        head=re.search(r"<h1\b[^>]*>(.*?)</h1>",body,re.I|re.S)
        if head and clean(head.group(1)):a["title"]=clean(head.group(1))[:180]
        title_area=re.search(r"<h2\b[^>]*>(.*?)</h2>",body,re.I|re.S)
        if title_area:
            area=clean(title_area.group(1))
            if not a["zone"]:a["zone"]=zone_of(area)
        # Prefer the rent in the property facts ("€ 500 mensili"), not any
        # number mentioned in sidebars or advertisements.
        m=re.search(r"\b\d+\s*m².{0,110}?€\s*(\d{2,4})\s*mensili\b",raw,re.I)
        if m:a["price"]=int(m.group(1))
        elif not a["price"]:
            m=re.search(r"\bcanone\s+(?:di\s+locazione\s+)?(?:di\s+)?(?:euro|€)\s*(\d{2,4})",raw,re.I)
            if m:a["price"]=int(m.group(1))
        if not a["sqm"]:a["sqm"]=sqm_of(raw[:1500])
        a["zone"]=a["zone"] or zone_of(a["title"]+" "+raw[:1900])
        d=re.search(r"Descrizione\s+(.*?)\s+Caratteristiche",raw,re.I|re.S)
        if d:a["description"]=d.group(1)[:850]
        exp=re.search(r"Spese:\s*€\s*(\d+)\s*mensili\s*a\s*parte",raw,re.I)
        if exp:a["expenses"]=exp.group(1)+" € spese a parte"
        elif re.search(r"spese\s+condominiali\s+incluse",raw,re.I):
            a["expenses"]="Spese condominiali incluse"
    except Exception:
        pass
    return a

def load_json(path,default):
    try:return json.loads(path.read_text("utf-8"))
    except (ValueError,OSError):return default

def run():
    DATA.mkdir(parents=True,exist_ok=True)
    now=datetime.now(timezone.utc)
    stamp=now.isoformat(timespec="seconds")
    old=load_json(DATA/"listings.json",{"listings":[]})
    known={row["url"]:row for row in old.get("listings",[]) if isinstance(row,dict) and row.get("url")}
    reports=[]
    for kind,label,url in SOURCE_URLS:
        report={"name":label,"url":url,"status":"in verifica","links_found":0,"new":0,"message":""}
        try:
            allowed,why=robots_allows(url)
            if not allowed:
                report.update(status="bloccata",message="Raccolta non consentita: "+why)
            else:
                page=fetch(url)
                results=scrape_index(url,kind,page)
                report["links_found"]=len(results)
                # A limited number of requests to public detail pages (ClickCase only).
                if kind=="clickcase":
                    prioritized=[a for a in results if a["zone"] in ZONES and (0<a["price"]<=700 or not a["price"])]
                    for item in prioritized[:12]:
                        enrich_clickcase(item)
                        time.sleep(0.7)
                for item in results[:120]:
                    address=item["url"]
                    if address not in known:report["new"]+=1
                    prev=known.get(address,{})
                    for k,v in item.items():
                        if not v and prev.get(k):item[k]=prev[k]
                    item["seen"]=prev.get("seen") or stamp
                    item["last_seen"]=stamp
                    known[address]=item
                report.update(status="ok" if results else "zero annunci",message=("Pagina letta; risultati estratti: "+str(len(results)) if results else "Pagina accessibile, nessun link annuncio leggibile")+". "+why)
        except HTTPError as e:report.update(status="errore HTTP",message="HTTP "+str(e.code)+": nessun tentativo di aggirare il blocco")
        except Exception as e:report.update(status="errore",message=str(e)[:160])
        reports.append(report)
        print(label+": "+report["status"]+" · "+str(report["links_found"])+" link · "+str(report["new"])+" nuovi",flush=True)
    for name in ("Subito (solo avvisi ufficiali)","Immobiliare.it (solo avvisi ufficiali)","Idealista (solo avvisi ufficiali)","Facebook Marketplace"):
        reports.append({"name":name,"status":"solo avvisi/manuale","links_found":0,"new":0,
            "message":"Nessuno scraping automatizzato. Attiva gli avvisi email ufficiali e configura il modulo IMAP, oppure consulta la ricerca salvata."})
    cutoff=now-timedelta(days=40)
    output=[]
    for item in known.values():
        try:
            last=datetime.fromisoformat(item.get("last_seen") or item.get("seen"))
            if last.tzinfo is None:last=last.replace(tzinfo=timezone.utc)
            if last<cutoff:continue
        except (ValueError,TypeError): pass
        output.append(item)
    output.sort(key=lambda x:x.get("last_seen",""),reverse=True)
    (DATA/"listings.json").write_text(json.dumps({"updated_at":stamp,"listings":output[:700]},ensure_ascii=False,indent=2)+"\n","utf-8")
    (DATA/"diagnostics.json").write_text(json.dumps({"updated_at":stamp,"sources":reports},ensure_ascii=False,indent=2)+"\n","utf-8")
    print("Totale annunci in archivio: "+str(len(output)),flush=True)
if __name__=="__main__":run()
