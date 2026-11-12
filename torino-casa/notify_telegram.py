#!/usr/bin/env python3
"""Notify new matching housing listings via official Telegram Bot API (opt-in).
Messages only to a chat explicitly configured by the owner; NEVER to landlords.
Credentials must be set via environment, never in public data or git commits.
"""
from __future__ import annotations
import json,os,re
from pathlib import Path
from urllib.request import Request,urlopen
from datetime import datetime,timezone

ROOT=Path(__file__).resolve().parent
DATA=ROOT/"data"
STATE=DATA/"notified.json"
MAX_ALERTS=8
ZONES=("crocetta","cenisia","san paolo","borgo san paolo","cit turin","santa rita","pozzo strada")
def load(path,default):
    try:return json.loads(path.read_text("utf-8"))
    except (OSError,ValueError):return default
def fits(row):
    if not isinstance(row,dict):return False
    try:p=float(row.get("price") or 0)
    except (TypeError,ValueError):return False
    zone=str(row.get("zone") or "").lower()
    return 150<=p<=700 and any(x in zone for x in ZONES) and row.get("private_status") in ("source","confirmed","user")
def send(token,chat,msg):
    url="https://api.telegram.org/bot"+token+"/sendMessage"
    req=Request(url,data=json.dumps({"chat_id":chat,"text":msg,"disable_web_page_preview":False}).encode("utf-8"),
        headers={"Content-Type":"application/json"},method="POST")
    with urlopen(req,timeout=20) as r:
        if r.status!=200:raise RuntimeError("Telegram API "+str(r.status))
def run():
    token=os.getenv("CASARADAR_TELEGRAM_TOKEN","").strip()
    chat=os.getenv("CASARADAR_TELEGRAM_CHAT_ID","").strip()
    if not token or not chat:
        print("Telegram: non configurato, nessuna notifica inviata.",flush=True)
        return
    if not re.fullmatch(r"\d+:[A-Za-z0-9_-]+",token):raise ValueError("Token Telegram non valido")
    listings=load(DATA/"listings.json",{}).get("listings",[])
    urls={x["url"]:x for x in listings if fits(x) and x.get("url")}
    state=load(STATE,None)
    if state is None:
        # On initial setup, record the existing backlog without sending hundreds of alerts.
        STATE.write_text(json.dumps({"notified":list(urls),"initialized_at":datetime.now(timezone.utc).isoformat()},indent=2)+"\n","utf-8")
        print("Telegram: prima esecuzione, annunci esistenti registrati senza notificarli.",flush=True)
        return
    seen=set(state.get("notified",[]))
    pending=[x for url,x in urls.items() if url not in seen][:MAX_ALERTS]
    sent=0
    for row in pending:
        title=str(row.get("title") or "Affitto Torino")[:130]
        msg="Nuovo annuncio CasaRadar\n"+title+"\n"+str(row.get("zone"))+" · "+str(row.get("price"))+" €/mese (spese da verificare)\n"+row["url"]
        try:send(token,chat,msg)
        except Exception as e:
            print("Telegram: invio non riuscito: "+type(e).__name__,flush=True)
            break
        seen.add(row["url"]);sent+=1
    # Never mark a failed message as sent.
    state["notified"]=list(seen)[-1800:]
    state["updated_at"]=datetime.now(timezone.utc).isoformat()
    STATE.write_text(json.dumps(state,ensure_ascii=False,indent=2)+"\n","utf-8")
    print(f"Telegram: {sent} messaggi inviati al proprio chat ID.",flush=True)
if __name__=="__main__":run()
