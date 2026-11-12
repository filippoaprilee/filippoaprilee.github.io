#!/usr/bin/env python3
"""TurinPipps: report giornaliero SMTP (GitHub Actions; nessun servizio ChatGPT).
Variabili secret richieste: TURINPIPPS_SMTP_USER, TURINPIPPS_SMTP_PASSWORD,
TURINPIPPS_EMAIL_TO. Facoltative: TURINPIPPS_SMTP_HOST, TURINPIPPS_SMTP_PORT.
Lo stato pubblicato NON contiene email, password o dati privati.
"""
from __future__ import annotations
import argparse
import html
import json
import os
import re
import smtplib
import ssl
from collections import Counter
from datetime import date, datetime, timezone, timedelta
from email.message import EmailMessage
from pathlib import Path
from zoneinfo import ZoneInfo

BASE=Path(__file__).resolve().parent
DATA=BASE/"data"
ZONE=ZoneInfo("Europe/Rome")
STATUS=DATA/"report_status.json"
BASE_URL="https://filippoaprilee.github.io/turinpipps/"
MAX_ITEMS=8

def load(path, default):
    try:
        result=json.loads(path.read_text(encoding="utf-8"))
        return result if isinstance(result,dict) else default
    except (ValueError, OSError):
        return default

def dateparse(value):
    if not value: return None
    try:
        parsed=datetime.fromisoformat(str(value).replace("Z","+00:00"))
        return parsed.replace(tzinfo=timezone.utc) if not parsed.tzinfo else parsed
    except (ValueError, TypeError):
        return None

def as_euros(value):
    try: v=int(float(value))
    except (TypeError,ValueError):return "Da verificare"
    return (f"{v:,}".replace(",","." )+" €") if v>0 else "Da verificare"

def score(row):
    try: rent=float(row.get("price") or 0)
    except (ValueError,TypeError):rent=0
    zone=str(row.get("zone") or "").lower()
    near=("crocetta","cenisia","san paolo","borgo san paolo","cit turin")
    accepted=rent>0 and rent<=700 and any(z in zone for z in near+("santa rita","pozzo strada"))
    private=row.get("private_status") in ("confirmed","source","user")
    if not accepted or not private:return False
    text=(str(row.get("title",""))+" "+str(row.get("description",""))+" "+str(row.get("property_type",""))).lower()
    # Do not assert the whole flat is within budget if price seems per room/person.
    if any(x in text for x in ("a persona","per persona","a posto letto","per posto letto")):return False
    return True

def canonical(item):
    url=str(item.get("url") or "").strip()
    return url if re.match(r"^https://",url) else ""

def recipients_from_env():
    raw=os.getenv("TURINPIPPS_EMAIL_TO","")
    values=[v.strip().lower() for v in re.split(r"[,;\n]",raw) if v.strip()]
    if len(values)>20:raise ValueError("Massimo 20 destinatari.")
    seen=[]
    for addr in values:
        if not re.fullmatch(r"[^@\s,;<>]+@[^@\s,;<>]+\.[A-Za-z]{2,}",addr):
            raise ValueError("Indirizzo destinatario non valido.")
        if addr not in seen:seen.append(addr)
    return seen

def render(now, listings, existing, last_date, status):
    valid=[x for x in listings if isinstance(x,dict) and canonical(x)]
    unique={canonical(x):x for x in valid}
    matching=[x for x in unique.values() if score(x)]
    matching.sort(key=lambda r: str(r.get("seen") or r.get("last_seen") or ""), reverse=True)
    last=None
    if last_date:
        try:last=date.fromisoformat(last_date)
        except ValueError:pass
    fresh=[x for x in matching if (dateparse(x.get("seen")) and
        dateparse(x.get("seen")).astimezone(ZONE).date()>last)] if last else matching[:]
    update=dateparse(existing.get("updated_at"))
    age=(now.astimezone(timezone.utc)-update).total_seconds()/3600 if update else None
    stale=age is None or age>36
    counts=Counter(str(x.get("source") or "Sconosciuta").split(" · ")[0] for x in matching)
    weekday=now.astimezone(ZONE).strftime("%d/%m/%Y")
    summary=(f"Archivio: {len(unique)} annunci, {len(matching)} compatibili, "
      f"{len(fresh)} nuovi dall'ultimo report. Aggiornamento fonti: "
      +(update.astimezone(ZONE).strftime("%d/%m/%Y %H:%M") if update else "non disponibile"))
    if stale:summary+=". ATTENZIONE: archivio non aggiornato da oltre 36 ore."
    rows=""
    for item in (fresh[:MAX_ITEMS] or matching[:MAX_ITEMS]):
        title=html.escape(str(item.get("title") or "Annuncio"),quote=True)
        url=html.escape(canonical(item),quote=True)
        zone=html.escape(str(item.get("zone") or "Zona da verificare"),quote=True)
        src=html.escape(str(item.get("source") or "Fonte non indicata"),quote=True)
        extra=html.escape(str(item.get("expenses") or "Spese da verificare"),quote=True)
        rent=html.escape(as_euros(item.get("price")))
        rows+=(
            "<tr><td style='padding:16px;border-bottom:1px solid #e8ecf4'>"
            "<a href='"+url+"' style='color:#263d86;font-weight:700;text-decoration:none'>"+title+"</a>"
            "<div style='font-size:12px;color:#748198;margin-top:5px'>"+zone+" · "+src+" · "+extra+"</div></td>"
            "<td style='padding:16px;text-align:right;border-bottom:1px solid #e8ecf4;white-space:nowrap;color:#182a4c;font-weight:800'>"+rent+"</td></tr>")
    if not rows:rows="<tr><td style='padding:22px'>Nessun annuncio compatibile archiviato.</td></tr>"
    warning=(
        "<p style='padding:12px 15px;background:#fff5df;color:#82590e;border-radius:8px;font-size:13px'>"
        "L'archivio non risulta aggiornato di recente: verifica lo stato del workflow GitHub Actions."
        "</p>" if stale else "")
    source_str=" · ".join(f"{html.escape(k)}: {n}" for k,n in counts.most_common(6))
    body=f"""<!doctype html><html lang="it"><head><meta charset="utf-8"></head><body style="margin:0;background:#f3f5fa;font-family:Arial,Helvetica,sans-serif;color:#182642">
<div style="max-width:680px;margin:24px auto;background:white;border:1px solid #e6eafa;border-radius:17px;overflow:hidden">
<div style="background:#131f37;padding:30px;color:#fff"><div style="font-size:13px;letter-spacing:2px;color:#abb9ea">TURINPIPPS · TORINO</div><h1 style="margin:12px 0 4px;font-size:28px">Il tuo report affitti</h1><p style="color:#b9c7e3;margin:0">{weekday} · Privati · max 700 € + spese</p></div>
<div style="padding:27px"><div style="display:flex;gap:14px"><div style="font-weight:700">Annunci compatibili: {len(matching)} &nbsp; · &nbsp; Nuovi: {len(fresh)}</div></div>
<p style="font-size:13px;color:#76829b">Le spese accessorie sono valutate separatamente. Il prezzo e la disponibilità vanno confermati con il proprietario.</p>{warning}
<table style="width:100%;border-collapse:collapse;font-size:14px">{rows}</table>
<p style="font-size:13px;color:#6f7c96;padding-top:16px">Per fonte: {source_str or "Nessun annuncio compatibile"}</p>
<p style="margin:25px 0 10px"><a href="{BASE_URL}" style="display:inline-block;background:#5263e8;color:white;padding:13px 21px;border-radius:9px;text-decoration:none;font-weight:700">Apri TurinPipps</a></p>
<p style="font-size:12px;color:#8792a6">Report generato automaticamente da GitHub Actions. Nessun messaggio viene inviato ai proprietari.<br>Stato fonti: {html.escape(update.astimezone(ZONE).strftime("%d/%m/%Y %H:%M") if update else "sconosciuto")}.</p>
</div></div></body></html>"""
    plain=(f"TurinPipps — report {weekday}\n{summary}\n\n"+
       "\n".join(f"- {x.get('title','Annuncio')}: {as_euros(x.get('price'))}; {x.get('zone','?')}; {canonical(x)}"
        for x in (fresh[:MAX_ITEMS] or matching[:MAX_ITEMS]))+
        f"\n\nApri: {BASE_URL}\n\nNessun contatto automatico ai proprietari.")
    return summary,body,plain,{"total":len(unique),"matching":len(matching),"new":len(fresh),"stale":stale,"updated_at":existing.get("updated_at")}

def run(force=False,dry_run=False):
    now=datetime.now(ZONE)
    if not force and now.hour!=19:
        print("Nessun invio: sono le",now.strftime("%H:%M"),"in Europa/Roma; finestra report 19:00.")
        return False
    recipients=recipients_from_env()
    if not recipients:
        print("Report non inviato: secret TURINPIPPS_EMAIL_TO non configurato.")
        return False
    user=os.getenv("TURINPIPPS_SMTP_USER","").strip()
    password=os.getenv("TURINPIPPS_SMTP_PASSWORD","").strip()
    host=os.getenv("TURINPIPPS_SMTP_HOST","smtp.gmail.com").strip()
    port=int(os.getenv("TURINPIPPS_SMTP_PORT","465"))
    if not user or not password:
        print("Report non inviato: mancano TURINPIPPS_SMTP_USER / TURINPIPPS_SMTP_PASSWORD.")
        return False
    status=load(STATUS,{})
    today=now.date().isoformat()
    if not force and status.get("last_sent_date")==today:
        print("Report già inviato nella giornata",today)
        return False
    data=load(DATA/"listings.json",{})
    summary,html_body,plain,counts=render(now,data.get("listings",[]),data,status.get("last_sent_date"),status)
    print(summary)
    if dry_run:
        print("Dry-run: nessuna email inviata.")
        return False
    message=EmailMessage()
    message["From"]=user
    message["To"]=recipients[0]
    message["Subject"]=f"TurinPipps | Report affitti Torino — {now:%d/%m/%Y}"
    message.set_content(plain)
    message.add_alternative(html_body,subtype="html")
    context=ssl.create_default_context()
    if port not in (465,587):raise ValueError("Porta SMTP ammessa: 465 (SSL) o 587 (STARTTLS)")
    # Messaggi separati: gli utenti non vedono gli indirizzi degli altri destinatari.
    # Non caricare nel repository le email personali o lo storico delle spedizioni.
    if port==465:
        smtp=smtplib.SMTP_SSL(host,port,context=context,timeout=25)
    else:
        smtp=smtplib.SMTP(host,port,timeout=25)
    with smtp:
        if port==587:smtp.starttls(context=context)
        smtp.login(user,password)
        for recipient in recipients:
            message.replace_header("To",recipient)
            rejected=smtp.send_message(message,from_addr=user,to_addrs=[recipient])
            if rejected:raise RuntimeError("Invio rifiutato dal server SMTP.")
    STATUS.parent.mkdir(parents=True,exist_ok=True)
    STATUS.write_text(json.dumps({"last_sent_date":today,"last_sent_at":now.isoformat(),
        "recipient_count":len(recipients),**counts},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Report SMTP inviato a",len(recipients),"destinatario/i (indirizzi non mostrati).")
    return True

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--force",action="store_true",help="Invia anche fuori finestra, solo su esecuzione manuale.")
    parser.add_argument("--dry-run",action="store_true",help="Non inviare email.")
    args=parser.parse_args()
    run(args.force,args.dry_run)
