#!/usr/bin/env python3
"""Importa gli avvisi ufficiali (Subito, Immobiliare.it, ecc.) da IMAP.
Nessuno scraping dei portali, nessuna modifica delle email, nessun invio automatico.
Le credenziali arrivano SOLO da variabili ambiente/segreti, mai dal repository.
Pubblica SOLO riferimenti agli annunci, senza nomi/email/telefoni dei destinatari.
"""
from __future__ import annotations
import email, html, imaplib, json, os, re, ssl
from datetime import datetime, timezone
from email.header import decode_header, make_header
from email.utils import parseaddr
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote, urlunparse

BASE=Path(__file__).resolve().parent
DATA=BASE/"data"/"listings.json"
HOSTS={
 "subito.it":"Subito", "immobiliare.it":"Immobiliare.it",
 "idealista.it":"Idealista", "clickcase.it":"ClickCase",
 "bakeca.it":"Bakeca", "casa.it":"Casa.it",
}
ZONES=("Crocetta","Cenisia","San Paolo","Borgo San Paolo","Cit Turin","Santa Rita","Pozzo Strada")
TRACKING_PARAMS=("url","u","target","redirect","redirect_url","destination","link")

def domain_ok(host,root):
    return host==root or host.endswith("."+root)

def decode_text(msg):
    if msg.is_multipart():
        pieces=[]
        for part in msg.walk():
            if part.get_content_disposition()=="attachment":continue
            if part.get_content_type() in ("text/html","text/plain"):
                data=part.get_payload(decode=True) or b""
                pieces.append((part.get_content_type(),data.decode(part.get_content_charset() or "utf-8","replace")))
        pieces.sort(key=lambda x:0 if x[0]=="text/html" else 1)
        return pieces[0][1] if pieces else ""
    data=msg.get_payload(decode=True) or b""
    return data.decode(msg.get_content_charset() or "utf-8","replace")

def sanitize(text):
    if not isinstance(text,str):return ""
    text=html.unescape(re.sub(r"<[^>]*>"," ",text))
    text=re.sub(r"\s+"," ",text).strip()
    text=re.sub(r"[\w.+-]+@[\w.-]+\.[a-z]{2,}","[email omessa]",text,flags=re.I)
    text=re.sub(r"(?:\+39\s*)?(?:3\d{2}[\s.-]*){1}\d{3}[\s.-]*\d{4}","[telefono omesso]",text)
    return text

def portal_url(link):
    """Keep direct listing URLs only. Decode known tracking wrappers without fetching."""
    url=html.unescape(str(link or "").strip())
    for _ in range(3):
        p=urlparse(url)
        if p.scheme not in ("https","http"):return None
        host=(p.hostname or "").lower()
        for root,label in HOSTS.items():
            if domain_ok(host,root):
                path=p.path.lower()
                if root=="immobiliare.it" and not re.search(r"/annunci/\d+",path):break
                if root=="subito.it" and not (path.endswith(".htm") and ("/appartamenti/" in path or "/camere-posti-letto/" in path)):break
                if root=="idealista.it" and not re.search(r"/immobile/\d+",path):break
                if root=="clickcase.it" and not re.search(r"-\d+\.html$",path):break
                if root=="bakeca.it" and "/dettaglio/" not in path:break
                if root=="casa.it" and "/immobili/" not in path:break
                return (urlunparse((p.scheme,host,p.path.rstrip("/"),"","","")),label)
        qs=parse_qs(p.query)
        nxt=next((qs[k][0] for k in TRACKING_PARAMS if k in qs and qs[k]),None)
        if not nxt:break
        url=unquote(nxt)
    return None

class Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.anchors=[];self.active=None;self.parts=[]
    def handle_starttag(self,tag,attrs):
        if tag=="a":
            self.active=dict(attrs).get("href","");self.parts=[]
    def handle_data(self,data):
        if self.active is not None:self.parts.append(data)
    def handle_endtag(self,tag):
        if tag=="a" and self.active is not None:
            self.anchors.append((self.active,sanitize(" ".join(self.parts))[:180]))
            self.active=None

def maybe_price(text):
    text=sanitize(text)
    # Never guess a monthly rent from an arbitrary number without monthly context.
    for pattern in (r"(?:€|euro)\s*(\d{2,4})\s*(?:/mese|mensili|al mese)",
                    r"(\d{2,4})\s*(?:€|euro)\s*(?:/mese|mensili|al mese)",
                    r"(?:affitto|canone)\s*(?:da|di|:)?\s*(?:€|euro)?\s*(\d{2,4})"):
        m=re.search(pattern,text,re.I)
        if m:
            n=int(m.group(1))
            if 150<=n<=4000:return n
    return 0

def zone_of(text):
    text=sanitize(text).lower()
    for zone in ZONES:
        if re.search(r"\b"+re.escape(zone.lower())+r"\b",text):return zone
    return ""

def records_from_alert(msg):
    from_address=parseaddr(msg.get("From",""))[1].split("@")[-1].lower()
    # Reject messages from unexpected sender domains, and validate target URLs too.
    if not any(domain_ok(from_address,host) for host in HOSTS):return []
    try:subject=str(make_header(decode_header(msg.get("Subject",""))))
    except Exception:subject=""
    body=decode_text(msg)
    parser=Links()
    try:parser.feed(body)
    except Exception:return []
    matches=[];seen=set()
    for link,text in parser.anchors:
        found=portal_url(link)
        if not found:continue
        url,source=found
        if url in seen:continue
        seen.add(url)
        # General 'view listing' button is not a property title.
        generic=re.search(r"^(apri|vedi|visualizza|scopri|dettagli|annuncio|contatta|more|view)\b",text,re.I)
        title=text if text and not generic and len(text)>=8 else sanitize(subject)[:150]
        title=title or source+" · nuovo annuncio"
        neighborhood=(title+" "+subject)
        matches.append({"url":url,"title":title[:170],"description":"Rilevato da un avviso ufficiale. Verifica prezzo, inserzionista e spese alla fonte.",
                        "price":maybe_price(neighborhood),"zone":zone_of(neighborhood),
                        "sqm":0,"private_status":"unverified","source":source+" · avviso email",
                        "expenses":"","seen":datetime.now(timezone.utc).isoformat(timespec="seconds"),
                        "origin":"official_email_alert"})
    return matches

def read_json(path):
    try:
        value=json.loads(path.read_text("utf-8"))
        return value if isinstance(value,dict) else {"listings":[]}
    except (ValueError,OSError):return {"listings":[]}

def run():
    user=os.getenv("CASARADAR_IMAP_USER","").strip()
    password=os.getenv("CASARADAR_IMAP_PASSWORD","")
    host=os.getenv("CASARADAR_IMAP_HOST","").strip()
    folder=os.getenv("CASARADAR_IMAP_FOLDER","INBOX").strip()
    if not (user and password and host):
        print("IMAP: non configurato, avvisi email non acquisiti.",flush=True)
        return 0
    if not re.fullmatch(r"[a-zA-Z0-9._-]+",folder):
        raise ValueError("Nome cartella IMAP non valido")
    port=int(os.getenv("CASARADAR_IMAP_PORT","993"))
    existing=read_json(DATA)
    known={v["url"]:v for v in existing.get("listings",[]) if isinstance(v,dict) and v.get("url")}
    found=0; added=0
    with imaplib.IMAP4_SSL(host,port,ssl_context=ssl.create_default_context(),timeout=25) as imap:
        imap.login(user,password)
        status,_=imap.select(folder,readonly=True)
        if status!="OK":raise RuntimeError("Cartella IMAP non accessibile")
        status,data=imap.search(None,"ALL")
        if status!="OK":raise RuntimeError("Ricerca IMAP fallita")
        ids=(data[0].split() if data and data[0] else [])[-120:]
        for msgid in ids:
            status,parts=imap.fetch(msgid,"(BODY.PEEK[])")
            if status!="OK":continue
            raw=next((x[1] for x in parts if isinstance(x,tuple) and isinstance(x[1],bytes)),None)
            if not raw:continue
            try:msgs=records_from_alert(email.message_from_bytes(raw))
            except Exception:continue
            for row in msgs:
                found+=1
                if row["url"] not in known:
                    known[row["url"]]=row
                    added+=1
    if added:
        DATA.parent.mkdir(parents=True,exist_ok=True)
        existing["listings"]=list(known.values())[:800]
        existing["updated_at"]=datetime.now(timezone.utc).isoformat(timespec="seconds")
        DATA.write_text(json.dumps(existing,ensure_ascii=False,indent=2)+"\n","utf-8")
    print(f"Avvisi email: {found} link validi · {added} nuovi annunci · nessun dato personale esportato.",flush=True)
    return added

if __name__=="__main__":
    run()
