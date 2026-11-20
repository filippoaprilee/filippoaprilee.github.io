/* TurinPipps v10: one coherent interface, matching, private evaluation and costs. */
(function(){
"use strict";
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const safe=value=>String(value==null?"":value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const api=()=>window.TurinPippsUXV3;
const prefs=()=>api()?.getPrefs?.()||{};
const all=()=>api()?.getListings?.()||[];
const auth=()=>window.TurinPippsAuth;
const formatEuro=n=>Number(n).toLocaleString("it-IT",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const date=raw=>{const d=new Date(raw||"");return Number.isFinite(d.getTime())?d.toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"}):"non disponibile"};
const seen=raw=>{const x=Date.parse(raw||"");return Number.isFinite(x)?x:0};
const allowedChecks=[["owner","Identità e titolo del locatore"],["available","Disponibilità confermata"],["charges","Tutte le spese chiarite"],["contract","Contratto e condizioni controllati"],["photos","Foto e caratteristiche coerenti"],["visit","Visita effettuata"]];
const costs=[["condo","Condominio"],["utilities","Luce, gas e acqua"],["heating","Riscaldamento extra"],["internet","Internet"],["tari","TARI e altre spese"]];
const once=new Set();
const filterState={priced:false,fresh:false};
const pending=new Set();
function getFlag(url){return prefs().flags?.[url]||{}}
function typeOf(a){
 const text=String(a.property_type||"")+" "+String(a.title||"");
 const hit=text.toLowerCase().match(/\b(monolocale|bilocale|trilocale|quadrilocale)\b/);
 return hit?.[1]||"";
}
function match(a,p=prefs()){
 const budget=Math.max(100,Number(p.budget)||700),price=Number(a.price)||0,zones=Array.isArray(p.preferredZones)&&p.preferredZones.length?p.preferredZones:null;
 const rows=[];let points=0,maximum=0;
 const put=(label,value,max,known)=>{rows.push({label,points:value,max,known});points+=value;maximum+=known?max:0};
 if(price>0)put("Canone",price<=budget?36:Math.max(0,Math.round(36*(budget/price)*.38)),36,true);
 else put("Canone",0,36,false);
 if(String(a.zone||"").trim())put("Quartiere",!zones||zones.some(z=>String(a.zone).toLowerCase().includes(String(z).toLowerCase()))?22:0,22,true);
 else put("Quartiere",0,22,false);
 const desired=String(p.propertyType||"tutte"),actual=typeOf(a);
 if(desired==="tutte")put("Tipologia",12,12,true);
 else if(actual)put("Tipologia",actual===desired?12:0,12,true);
 else put("Tipologia",0,12,false);
 if(Number(a.walking_minutes)>0&&a.route_checked_at){const minutes=Number(a.walking_minutes),limit=Number(p.maxWalkMinutes)||30;put("Percorso reale",minutes<=limit?20:Math.max(0,Math.round(20*limit/minutes*.5)),20,true);}
 else put("Percorso reale",0,20,false);
 if(Number(a.sqm)>0){const min=Number(p.minSqm)||0;put("Superficie",min===0||Number(a.sqm)>=min?10:0,10,true);}
 else put("Superficie",0,10,false);
 return {score:points,complete:maximum,breakdown:rows.map(x=>[x.label,x.points,x.max]),unknown:rows.filter(x=>!x.known).map(x=>x.label)};
}
function reliability(a){
 const owner=a.private_status==="confirmed"&&a.verification_level==="owner_confirmed";
 const documented=a.verification_level==="source_documented"||a.verification_level==="owner_confirmed";
 const fields=[Number(a.price)>0,!!a.zone,!!a.published_at||!!a.source_updated,
  !!a.last_verified_at,!!a.evidence_url,Number(a.sqm)>0].filter(Boolean).length;
 let label=owner?"Proprietario confermato":documented?"Fonte documentata":"Da verificare";
 if(a.link_status==="missing")label="Link potenzialmente rimosso";
 return {label,fields,owner,documented};
}
function priceDrop(a){
 const h=Array.isArray(a.price_history)?a.price_history.filter(x=>Number(x?.price)>0):[];
 if(h.length<2)return null;
 const previous=Number(h[h.length-2].price),last=Number(h[h.length-1].price);
 return last<previous?previous-last:null;
}
function navigation(){
 const nav=$(".side .nav");if(!nav||nav.dataset.tp10Ready)return;
 const existing={};$$("button[data-nav]",nav).forEach(b=>{existing[b.dataset.nav]=b});
 const areas=[["CERCA CASA",[["home","fa-solid fa-house","Panoramica"],["results","fa-solid fa-magnifying-glass","Cerca immobili"],["map","fa-solid fa-map-location-dot","Mappa"]]],
 ["LA TUA RICERCA",[["saved","fa-regular fa-heart","Salvati"],["visits","fa-regular fa-calendar-check","Contatti e visite"],["compare","fa-solid fa-scale-balanced","Confronti"],["sources","fa-solid fa-chart-line","Monitoraggio"]]],
 ["ACCOUNT",[["profile","fa-regular fa-user","Il tuo account"],["settings","fa-solid fa-sliders","Preferenze ricerca"],["notifications","fa-regular fa-bell","Notifiche"]]]];
 nav.replaceChildren();
 areas.forEach(group=>{
  const shell=document.createElement("section");shell.className="tp10-nav-group";
  const caption=document.createElement("div");caption.className="tp10-nav-caption";caption.textContent=group[0];shell.append(caption);
  group[1].forEach(([key,icon,title])=>{
   let btn=existing[key];
   if(!btn){btn=document.createElement("button");btn.type="button";btn.dataset.nav=key;}
   btn.classList.add("tp10-nav-item");
   btn.setAttribute("aria-label",title);
   btn.innerHTML='<i class="'+icon+'" aria-hidden="true"></i><span class="nav-label">'+title+"</span>";
   shell.append(btn);
  });
  if(group[0]==="ACCOUNT"){
   const holder=document.createElement("div");holder.id="tp8-nav-staff";shell.append(holder);
   if($("#tp-v5-nav-admin"))holder.append($("#tp-v5-nav-admin"));
   const link=document.createElement("a");link.href="./informazioni.html";link.className="tp10-sidebar-help";
   link.innerHTML='<i class="fa-regular fa-circle-question" aria-hidden="true"></i> Guida, FAQ e privacy';shell.append(link);
  }
  nav.append(shell);
 });
 const mobile=$(".mobile-nav");
 if(mobile)mobile.innerHTML=[["home","fa-solid fa-house","Home"],["results","fa-solid fa-magnifying-glass","Cerca"],["saved","fa-regular fa-heart","Salvati"],["visits","fa-regular fa-calendar-check","Organizza"],["profile","fa-regular fa-user","Profilo"]].map(([key,icon,title])=>
  '<button type="button" data-nav="'+key+'" aria-label="'+title+'"><span><i class="'+icon+'" aria-hidden="true"></i></span>'+title+'</button>').join("");
 nav.dataset.tp10Ready="1";
}
function homeMarkup(){
 const home=$("#view-home");if(!home||$("#tp10-home"))return;
 const s=document.createElement("section");s.id="tp10-home";
 s.innerHTML='<header class="tp10-home-head"><div><span class="tp10-overline"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> TORINO · POLITECNICO</span>'+
 '<h1>La tua ricerca casa,<br>senza perdere opportunità.</h1>'+
 '<p>Valuta gli annunci raccolti, distingui le informazioni certe da quelle da confermare e segui ogni contatto in un solo posto.</p>'+
 '<div class="tp10-home-cta"><button class="button primary" data-nav="results"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Esplora immobili</button>'+
 '<button class="button" data-nav="settings"><i class="fa-solid fa-sliders" aria-hidden="true"></i> I miei criteri</button></div></div>'+
 '<div class="tp10-budget-card"><small>BUDGET IMPOSTATO</small><strong id="tp10-budget">—</strong><span>al mese, spese escluse</span><div id="tp10-home-scan">Verifica ultima scansione…</div></div></header>'+
 '<div class="tp10-metrics" id="tp10-metrics" aria-live="polite"></div>'+
 '<div class="tp10-home-sections"><section class="tp10-home-list"><div class="tp10-section-title"><div><span class="tp10-overline">PRIMA DA VALUTARE</span><h2>Opportunità da controllare</h2><p>Ordinate per compatibilità preliminare. Nessuna disponibilità garantita.</p></div><button class="tp10-text-button" data-nav="results">Tutte le case <i class="fa-solid fa-arrow-right"></i></button></div><div id="tp10-home-options"></div></section>'+
 '<aside class="tp10-home-next"><span class="tp10-overline">IL PROSSIMO PASSO</span><h2>Da una scoperta a una visita.</h2>'+
 '<div id="tp10-next-step"></div></aside></div>';
 home.prepend(s);
 document.body.classList.add('tp10-active');
}
function homeUpdate(){
 if(!$("#tp10-home"))return;
 const items=all(),p=prefs(),flags=p.flags||{},budget=Number(p.budget)||700;
 const new7=items.filter(a=>seen(a.seen||a.first_seen)>Date.now()-7*86400000).length;
 const priced=items.filter(a=>a.price>0).length;
 const saved=items.filter(a=>flags[a.url]?.saved).length;
 const candidate=items.filter(a=>Number(a.price)>0&&Number(a.price)<=budget&&api()?.classifyListing?.(a)?.status!=="excluded").length;
 $("#tp10-budget").textContent=formatEuro(budget);
 $("#tp10-metrics").hidden=items.length===0;
 $("#tp10-metrics").innerHTML=[
  [items.length,"Riferimenti raccolti","results","fa-solid fa-house"],
  [new7,"Nuovi negli ultimi 7 giorni","results","fa-solid fa-clock"],
  [candidate,"Canone entro i criteri*","results","fa-solid fa-list-check"],
  [saved,"I tuoi salvati","saved","fa-regular fa-heart"]
 ].map(([n,label,target,icon])=>'<button class="tp10-metric" type="button" data-nav="'+target+'"><i class="'+icon+'" aria-hidden="true"></i><strong>'+n+'</strong><span>'+label+'</span></button>').join("");
 const scan=api()?.getLiveScan?.();
 const last=seen(scan?.finished_at||scan?.started_at);
 $("#tp10-home-scan").textContent=last&&Date.now()-last<3*3600000?
  'Ricerca aggiornata · '+date(last):"Ultimo controllo da verificare";
 const good=items.filter(a=>!flags[a.url]?.discard&&Number(a.price)>0&&Number(a.price)<=budget&&
   api()?.classifyListing?.(a)?.status!=="excluded")
   .sort((a,b)=>match(b,p).score-match(a,p).score||seen(b.seen)-seen(a.seen)).slice(0,3);
 // Never recommend an explicitly incompatible home as a promising match.
 const other=items.filter(a=>!flags[a.url]?.discard&&api()?.classifyListing?.(a)?.status!=="excluded")
   .sort((a,b)=>match(b,p).score-match(a,p).score||seen(b.seen)-seen(a.seen)).slice(0,3);
 $("#tp10-home-options").innerHTML=(good.length?good:other).map(a=>{
  const m=match(a,p),r=reliability(a),f=flags[a.url]||{};
  return '<article class="tp10-home-option"><div class="tp10-option-symbol"><i class="fa-solid fa-building" aria-hidden="true"></i></div>'+
   '<div class="tp10-option-copy"><div class="tp10-option-tags"><span>'+safe(a.source||"Fonte")+'</span><span>'+safe(r.label)+'</span></div>'+
   '<strong>'+safe(a.title)+'</strong><small>'+safe(a.zone||"Zona da verificare")+' · '+(a.price?formatEuro(a.price)+"/mese":"Canone non disponibile")+'</small>'+
   '<span class="tp10-option-score">Match preliminare '+m.score+'/100 · '+m.unknown.length+' dati mancanti</span></div>'+
   '<div class="tp10-option-actions"><button type="button" class="button" data-action="save" data-url="'+safe(a.url)+'" aria-label="'+(f.saved?"Rimuovi dai salvati":"Salva immobile")+'"><i class="'+(f.saved?"fa-solid":"fa-regular")+' fa-heart" aria-hidden="true"></i></button>'+
   '<a class="tp10-open-source" href="'+safe(a.url)+'" target="_blank" rel="noopener noreferrer">Fonte originale</a></div></article>';
 }).join("")||'<div class="tp10-empty"><b>Nessuna proposta suggerita per i criteri attuali.</b><p>Altri annunci possono essere disponibili in Cerca, anche con prezzo o informazioni da verificare.</p><button type="button" class="button" data-nav="results">Esplora tutti i risultati</button></div>';
 const contacted=items.filter(a=>flags[a.url]?.contact&&!flags[a.url]?.replyReceived).length,
 replied=items.filter(a=>flags[a.url]?.replyReceived).length;
 const stage=replied?"reply":contacted?"contact":saved?"saved":"start";
 const guidance={
  start:["Inizia dalla ricerca","Trova una casa interessante, controlla prezzo e dettagli e salvala per confrontarla con le altre.","Esplora gli immobili","results"],
  saved:["Hai delle case da valutare","Rivedi i salvati e confrontali. Prima di contattare verifica prezzo, spese e inserzionista.","Apri le case salvate","saved"],
  contact:["Segui i contatti aperti","Hai richieste in attesa: controlla le risposte e prepara le visite delle case più interessanti.","Gestisci contatti e visite","visits"],
  reply:["Valuta le risposte ricevute","Controlla le condizioni proposte e organizza una visita quando è opportuno.","Organizza una visita","visits"]
 }[stage];
 const progress=[
  [saved,"Salvate"],[contacted,"In attesa"],[replied,"Risposte"]
 ].map(([n,label])=>'<div><strong>'+n+'</strong><span>'+label+'</span></div>').join('');
 $("#tp10-next-step").innerHTML='<div class="tp17-journey-progress" aria-label="Avanzamento ricerca">'+progress+'</div>'+
 '<div class="tp17-journey-guidance"><h3>'+safe(guidance[0])+'</h3><p>'+safe(guidance[1])+'</p>'+
 '<button type="button" class="button primary tp17-next-cta" data-nav="'+guidance[3]+'">'+safe(guidance[2])+' <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div>';

}
function searchEnhance(){
 if($("#tp10-search-tools"))return;
 const section=$("#view-results"),target=section?.querySelector(".tabs");if(!target)return;
 const panel=document.createElement("div");panel.id="tp10-search-tools";
 panel.innerHTML='<div class="tp10-filters-left"><b>Affina i risultati</b><label class="tp10-filter-check"><input type="checkbox" data-tp10-filter="priced"> Solo con prezzo</label>'+
 '<label class="tp10-filter-check"><input type="checkbox" data-tp10-filter="fresh"> Scoperti negli ultimi 7 giorni</label></div>'+
 '<p>La compatibilità non è una conferma dell’immobile. I dati mancanti restano visibili.</p>';
 target.before(panel);
 const head=section.querySelector(".tp-page-lead h1");if(head)head.textContent="Trova un immobile adatto a te";
 const labels=$$(".chip[data-mode]",section);labels.forEach(x=>{if(x.dataset.mode==="good")x.textContent="Dati compatibili";if(x.dataset.mode==="review")x.textContent="Da approfondire"});
 const sort=$("#sort");if(sort){const choice=sort.querySelector('option[value="score"]');if(choice)choice.textContent="Match più alto";}
 const guide=section.querySelector(".tp8-search-steps");if(guide)guide.remove();
 const toolbar=section.querySelector(".tp-listing-toolbar .note");if(toolbar)toolbar.textContent="Apri una scheda per checklist, preventivo e valutazione dettagliata.";
}
function scoreBadge(a){
 const m=match(a),r=reliability(a),drop=priceDrop(a);
 const description=String(a.title||"")+" "+String(a.description||"");
 const signals=[];
 if(a.price>0&&a.price<250&&!/stanza|camera|posto letto/i.test(description))signals.push("Canone insolitamente basso: verifica condizioni e autenticità");
 if(/(?:caparra|anticipo|bonifico|ricarica).{0,100}(?:prima della visita|per bloccare|senza visita)/i.test(description))signals.push("Possibile richiesta di anticipo senza visita: non pagare prima delle verifiche");
 if(a.link_status==="missing")signals.push("Collegamento non raggiungibile: chiedi conferma all'inserzionista");
 const warning=signals.length?'<div class="tp10-safety"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i><span>Da verificare: '+safe(signals.slice(0,2).join(" · "))+'</span></div>':
 '<div class="tp10-safety tp10-safety-neutral"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i><span>Non inviare anticipi senza verificare locatore, immobile e contratto.</span></div>';
 return '<div class="tp10-card-summary"><div class="tp10-card-main-metrics">'+
  '<div><span>MATCH PERSONALE</span><strong>'+m.score+'<small>/100</small></strong><small>'+m.unknown.length+' criteri non documentati</small></div>'+
  '<div><span>AFFIDABILITÀ DATI</span><strong class="tp10-quality-heading">'+safe(r.label)+'</strong><small>'+r.fields+'/6 elementi disponibili'+(r.owner?" · proprietario confermato":" · proprietario non verificato")+'</small></div></div>'+
  (drop?'<div class="tp10-drop"><i class="fa-solid fa-arrow-trend-down"></i> Ribasso rilevato: '+formatEuro(drop)+'</div>':'')+
 warning+'</div>';
}
function numbers(a,f){
 const c=f.costPlan||{},fields={};
 costs.forEach(([id])=>fields[id]=c[id]==null?null:Number(c[id]));
 const rent=Number(a.price)||0;
 const sourceCondo=Number(a.expenses)>0?Number(a.expenses):null;
 const condo=fields.condo===null?sourceCondo:fields.condo;
 const monthlyExtras=costs.reduce((sum,[id])=>sum+(id==="condo"?Math.max(0,Number(condo)||0):Math.max(0,Number(fields[id])||0)),0);
 const months=Math.max(0,Math.min(12,Number(c.depositMonths)||0));
 const onceCosts=Math.max(0,Number(c.agency)||0)+Math.max(0,Number(c.setup)||0);
 return {rent,monthlyExtras,monthly:rent+monthlyExtras,upfront:rent+monthlyExtras+rent*months+onceCosts,hasRent:rent>0,
  countKnown:costs.filter(([id])=>id==="condo"?condo!==null:fields[id]!==null).length,condo,months};
}
function costForm(a,f){
 const v=numbers(a,f),p=f.costPlan||{};
 const fields=costs.map(([key,label])=>{
  let val=p[key]??(key==="condo"&&Number(a.expenses)>0?Number(a.expenses):"");
  return '<label>'+safe(label)+'<span class="tp10-input-money"><input type="number" min="0" max="10000" step="1" inputmode="decimal" data-tp10-cost="'+key+'" data-url="'+safe(a.url)+'" value="'+safe(val)+'" placeholder="Da stimare"> €</span></label>';
 }).join("");
 return '<div class="tp10-cost-head"><div><b>Simula il costo reale</b><p>Inserisci importi mensili stimati. Restano privati e non diventano dati verificati del portale.</p></div></div>'+
 '<div class="tp10-cost-result"><div><span>Mensile stimato (valori inseriti)</span><strong>'+ (v.hasRent?formatEuro(v.monthly):"Canone sconosciuto")+'</strong></div>'+
 '<div><span>Primo esborso stimato</span><strong>'+(v.hasRent?formatEuro(v.upfront):"Da calcolare")+'</strong></div></div>'+
 '<div class="tp10-cost-fields">'+fields+'</div>'+
 '<div class="tp10-cost-extra"><label>Deposito cauzionale (mensilità)<input type="number" min="0" max="12" step="1" data-tp10-cost="depositMonths" data-url="'+safe(a.url)+'" value="'+safe(p.depositMonths??"")+'" placeholder="Da verificare"></label>'+
 '<label>Eventuali costi agenzia / intermediazione (€)<input type="number" min="0" max="10000" step="1" data-tp10-cost="agency" data-url="'+safe(a.url)+'" value="'+safe(p.agency??"")+'" placeholder="Da verificare"></label>'+
 '<label>Altri costi iniziali (€)<input type="number" min="0" max="10000" step="1" data-tp10-cost="setup" data-url="'+safe(a.url)+'" value="'+safe(p.setup??"")+'" placeholder="Da verificare"></label></div>'+
 '<p class="tp10-cost-note">Importi incompleti: '+v.countKnown+'/5 voci mensili compilate. Cauzione e costi iniziali non sono garantiti. Non effettuare pagamenti senza aver verificato l’identità dell’interlocutore e il contratto.</p>';
}
function checksForm(a,f){
 const checks=f.verificationChecks||{},done=allowedChecks.filter(([id])=>checks[id]===true).length;
 return '<div class="tp10-check-head"><b>La tua checklist di verifica</b><span>'+done+'/'+allowedChecks.length+' completate</span></div>'+
 '<p>Le risposte sono private e non certificano pubblicamente la proprietà, le condizioni o l’annuncio.</p>'+
 '<div class="tp10-checklist">'+allowedChecks.map(([id,label])=>
 '<label><input type="checkbox" data-tp10-check="'+id+'" data-url="'+safe(a.url)+'" '+(checks[id]===true?"checked":"")+'> <span>'+safe(label)+'</span></label>').join("")+'</div>';
}
function stageTools(a,f){
 const v=f.contact?"Hai contattato l’inserzionista":"Non ancora contattato";
 return '<div class="tp10-stage-head"><b>Stato del contatto</b><span>'+v+'</span></div><div class="tp10-stage-actions">'+
 '<button class="button" type="button" data-tp10-action="contact" data-url="'+safe(a.url)+'">'+(f.contact?"Annulla contatto":"Segna contattato")+'</button>'+
 '<button class="button '+(f.replyReceived?"tp10-selected":"")+'" type="button" data-tp10-action="reply" data-url="'+safe(a.url)+'">'+(f.replyReceived?"Risposta ricevuta ✓":"Segna risposta ricevuta")+'</button>'+
 '<button class="button" type="button" data-action="visit" data-url="'+safe(a.url)+'">Organizza visita</button></div>';
}
function enhanceCards(){
 if(!api()?.getListings)return;
 const by=new Map(all().map(x=>[x.url,x]));
 $$(".listing").forEach(article=>{
  if(article.dataset.tp10Ready)return;
  const action=$('[data-action="save"][data-url]',article),a=action?by.get(action.dataset.url):null;
  if(!a)return;
  if(article.classList.contains("tp18-listing")){
   article.dataset.tp10Ready="1";
   const area=$(".tp18-tools-anchor",article),f=getFlag(a.url);
   if(area){
    const tools=document.createElement("div");tools.className="tp18-personal-tools";
    tools.innerHTML='<div class="tp18-detail-section tp18-your-evaluation"><h4>La tua valutazione privata</h4><p>Queste informazioni sono solo tue e non certificano l’annuncio.</p>'+
     checksForm(a,f)+'<div class="tp18-cost-planning">'+costForm(a,f)+'</div>'+stageTools(a,f)+
     '<p class="tp10-save-feedback" role="status" aria-live="polite"></p></div>';
    area.append(tools);
   }
   return;
  }
  article.dataset.tp10Ready="1";article.classList.add("tp10-listing");
  const f=getFlag(a.url),head=$(".body",article);if(!head)return;
  const header=document.createElement("div");header.innerHTML=scoreBadge(a);
  const title=$("h3",head);if(title)title.insertAdjacentElement("afterend",header.firstElementChild);
  const evalSection=$(".tp9-evaluation",article);
  if(evalSection&&!$(".tp10-evidence",article)){
    const details=document.createElement("details");details.className="tp10-evidence";
    const summary=document.createElement("summary");summary.textContent="Vedi affidabilità, provenienza e storico";
    evalSection.before(details);details.append(summary,evalSection);
  }
  const tools=document.createElement("details");tools.className="tp10-property-tools";
  tools.innerHTML='<summary><span><i class="fa-solid fa-clipboard-check" aria-hidden="true"></i> La mia valutazione e i costi</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>'+
  '<div class="tp10-tools-content">'+checksForm(a,f)+'<hr>'+costForm(a,f)+'<hr>'+stageTools(a,f)+'<p class="tp10-save-feedback" role="status" aria-live="polite"></p></div>';
  const oldDetails=$(".tp-card-details",article);
  if(oldDetails){const summary=oldDetails.querySelector("summary");if(summary)summary.innerHTML='Dati originali, spese dichiarate e dettagli <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';}
  if(oldDetails)oldDetails.before(tools);
  else head.append(tools);
  $$(".tag",article).forEach(t=>{if(t.textContent.trim().startsWith("Score "))t.classList.add("tp10-legacy-score")});
 });
}
function enhanceBoard(){
 const container=$("#tp-visits-content");if(!container)return;
 const labels=$$(".tp7-stage header b",container);
 labels.forEach(n=>{if(n.textContent==="In contatto")n.textContent="In attesa o in risposta"});
 $$(".tp7-item",container).forEach(article=>{
  const select=$("select[data-tp7-status]",article);if(!select||$(".tp10-board-reply",article))return;
  const url=select.dataset.tp7Status,f=getFlag(url);
  if(!f.contact)return;
  const action=document.createElement("button");action.type="button";action.className="button tp10-board-reply";
  action.dataset.tp10Action="reply";action.dataset.url=url;
  action.textContent=f.replyReceived?"Risposta ricevuta ✓":"Segna risposta ricevuta";
  select.closest(".tp7-item")?.querySelector(".tp7-actions")?.append(action);
 });
}
function renderSourceQuality(){
 const root=$("#view-sources");if(!root)return;
 let host=$("#tp11-source-quality");
 if(!host){
  host=document.createElement("section");host.id="tp11-source-quality";host.className="tp11-quality-panel";
  const grid=root.querySelector(".tp-home-grid");
  if(grid)grid.after(host);else root.querySelector(".tp-page-lead")?.after(host);
 }
 const details=api()?.getLiveScan?.()?.details||{};
 const source=Array.isArray(details.source_quality)?details.source_quality:[];
 const dedup=details.dedup||null,enrich=details.detail_enrichment||null;
 if(!dedup){
  host.innerHTML='<div class="tp11-source-head"><div><span class="tp10-overline">QUALITÀ DELLA RACCOLTA</span><h2>Nuovi annunci e fonti realmente produttive</h2></div></div>'+
   '<p>Il dettaglio per fonte sarà disponibile con una scansione del nuovo collector. Nessun dato storico viene ricostruito artificialmente.</p>';
  return;
 }
 const active=source.filter(x=>Number(x.found)>0).length;
 const blocked=source.reduce((sum,x)=>sum+Number(x.blocked||0),0);
 host.innerHTML='<div class="tp11-source-head"><div><span class="tp10-overline">ULTIMA SCANSIONE · DATI EFFETTIVI</span><h2>Quante opportunità sono state trovate?</h2></div>'+
 '<p>Controlli riusciti e nuovi immobili sono numeri diversi.</p></div>'+
 '<div class="tp11-source-metrics">'+[
  [dedup.raw??"—","Collegamenti osservati"],[dedup.unique??"—","Annunci distinti nella scansione"],
  [dedup.new_unique??"—","Nuovi URL unici"],[dedup.duplicate_observations??"—","Rilevazioni duplicate"]
 ].map(([n,label])=>'<div><strong>'+safe(n)+'</strong><span>'+label+'</span></div>').join("")+'</div>'+
 '<p class="tp11-source-caption">'+active+' fonti/gruppi con risultati nel controllo · '+
 blocked+' controlli limitati o bloccati'+(enrich?" · "+Number(enrich.read||0)+" pagine dettaglio lette su "+Number(enrich.checked||0):"")+
 '. I portali che negano la lettura vengono lasciati alla consultazione manuale.</p>'+
 '<details class="tp11-source-table"><summary>Qualità e risultati per fonte <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>'+
 '<div class="tp11-source-table-wrap"><table><caption>Ultimo controllo per tipologia di origine, non graduatoria dei portali</caption>'+
 '<thead><tr><th scope="col">Fonte</th><th scope="col">Controlli riusciti</th><th scope="col">Link osservati</th><th scope="col">Unici</th><th scope="col">Nuovi</th></tr></thead><tbody>'+
 source.map(x=>'<tr><th scope="row">'+safe(x.source||"Fonte")+'</th><td>'+safe(x.ok||0)+'/'+safe(x.checks||0)+'</td>'+
  '<td>'+safe(x.found||0)+'</td><td>'+safe(x.unique||0)+'</td><td>'+safe(x.new||0)+'</td></tr>').join("")+
 '</tbody></table></div><p>Un risultato trovato non garantisce che l’immobile sia affittabile: verifica sempre annuncio e proprietario.</p></details>';
}
function organizeMonitor(){
 const root=$("#view-sources");if(!root||root.dataset.tp11Organized)return;
 const timeline=$("#tp-activity-timeline"),links=$("#sources");
 if(!timeline||!links)return;
 const panel=timeline.closest(".panel"),first=panel?.previousElementSibling;
 const heading=links.previousElementSibling;
 const details=document.createElement("details");details.className="tp11-source-more";
 details.innerHTML='<summary><span><i class="fa-solid fa-book-open" aria-hidden="true"></i> Cronologia dei controlli e portali consultabili</span>'+
 '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>';
 const body=document.createElement("div");body.className="tp11-source-more-body";
 details.append(body);
 if(first?.classList.contains("section-heading"))first.before(details);
 else panel.before(details);
 if(first?.classList.contains("section-heading"))body.append(first);
 body.append(panel);
 if(heading?.classList.contains("section-heading"))body.append(heading);
 body.append(links);
 root.dataset.tp11Organized="1";
}
function accessibility(){
 // Only the visible layout is enhanced; no duplicate controls or second navigation tree.
 const search=$("#tp-main-search");if(search)search.setAttribute("aria-describedby","tp11-search-help");
 const res=$("#view-results");
 if(res&&!$("#tp11-search-help")){
  const hint=document.createElement("p");hint.id="tp11-search-help";hint.className="tp11-a11y-hint";
  hint.textContent="Cerca nell’archivio di annunci. Puoi aprire i filtri avanzati se necessario.";
  res.querySelector(".tp-search-tools")?.after(hint);
 }
 const zone=$("#zone");if(zone)zone.setAttribute("aria-label","Quartiere");
 const tabs=res?.querySelector(".tabs");if(tabs){tabs.setAttribute("role","group");tabs.setAttribute("aria-label","Tipologia di risultati");}
 const groups=$("#tp-zones");if(groups){groups.setAttribute("role","group");groups.setAttribute("aria-label","Quartieri preferiti");}
 $("#tp10-home")?.setAttribute("aria-label","Panoramica della ricerca casa");
 $("#view-results #list")?.setAttribute("aria-busy","false");
 $("#tp-guide-dialog")?.addEventListener("close",()=>{
  try{localStorage.setItem("turinpipps.onboard.v4","1");}catch(_){}
 });
 document.addEventListener("click",event=>{
  const control=event.target.closest("[data-nav]");
  if(!control)return;
  const key=control.dataset.nav;
  requestAnimationFrame(()=>{
    const view=$("#view-"+key);
    if(!view||view.classList.contains("hidden"))return;
    const title=view.querySelector("h1,h2");
    if(title){
      title.tabIndex=-1;title.focus({preventScroll:true});
      // Avoid surprise viewport jumps and animation for reduced-motion users.
      if(typeof window.matchMedia==="function"&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches){
        view.scrollIntoView({block:"start",behavior:"auto"});
      }
    }
  });
 });
}
function simplifyListingDetails(){
 $(".tp10-listing").forEach(article=>{
  if(article.dataset.tp11Simplified)return;
  const expanded=$(".tp-card-expanded",article),reasons=$(".tp-classification-reasons",article);
  if(expanded&&reasons){reasons.remove();expanded.prepend(reasons);}
  const note=$(".tp8-card-proof",article);
  if(expanded&&note){note.remove();expanded.prepend(note);}
  article.dataset.tp11Simplified="1";
 });
}
function enhanceAdmin(){
 const root=$("#tp-v5-admin-content");
 if(!root||!window.TurinPippsV5?.canAdmin?.())return;
 let card=$("#tp10-admin-quality",root);
 if(!card){card=document.createElement("section");card.id="tp10-admin-quality";card.className="tp-v5-panel tp10-admin-quality";root.prepend(card);}
 const a=all(),priced=a.filter(x=>Number(x.price)>0).length,
 linked=a.filter(x=>x.link_status==="reachable").length,
 checked=a.filter(x=>x.link_checked_at).length,
 source=a.filter(x=>x.verification_level==="source_documented").length,
 owner=a.filter(x=>x.verification_level==="owner_confirmed"&&x.private_status==="confirmed").length;
 const scan=api()?.getLiveScan?.(),last=seen(scan?.started_at||scan?.finished_at);
 card.innerHTML='<div class="tp10-section-title"><div><span class="tp10-overline">QUALITÀ E FRESCHEZZA</span><h2>Controllo reale della ricerca</h2></div></div>'+
 '<div class="tp10-quality-grid">'+[
  [a.length,"Riferimenti unici visibili"],[priced,"Con prezzo noto"],[source,"Fonte documentata"],[owner,"Privati verificati"],[checked,"Link controllati"],[linked,"Link raggiungibili"]
 ].map(([v,l])=>'<div><strong>'+v+'</strong><span>'+l+'</span></div>').join("")+'</div>'+
 '<p>Ultimo controllo: '+(last?date(last):"Non disponibile")+'. '+(scan?'Esito '+safe(scan.status||"da verificare")+" · "+Number(scan.jobs_ok||0)+"/"+Number(scan.jobs_checked||0)+" fonti":'Nessuna scansione recuperata')+'. Nuovi unici nell’ultima scansione: '+(scan?.discovered??"n.d.")+'. Un link raggiungibile non implica disponibilità.</p>'+
 '<p>Se i contatori storici superano gli annunci effettivi, controllare duplicazioni, errori di logging e conservazione, senza presentare il totale storico come nuove case.</p>';
}
async function persistFlag(url,next,origin){
 if(pending.has(url))return false;
 const oldCard=origin?.closest(".listing");
 const openState=oldCard?{tools:!!$(".tp10-property-tools",oldCard)?.open,proof:!!$(".tp10-evidence",oldCard)?.open,details:!!$(".tp-card-details",oldCard)?.open}:null;
 const restoreKey=origin?.dataset?.tp10Check||origin?.dataset?.tp10Cost||origin?.dataset?.tp10Action||"";
 const restoreType=origin?.dataset?.tp10Check?"check":origin?.dataset?.tp10Cost?"cost":"action";
 pending.add(url);const control=origin?.closest("button,label,.tp10-tools-content");
 if(control)control.classList.add("tp10-saving");
 try{
  if(auth()?.isSignedIn?.()){
   if(await auth().saveFlag(url,next)!==true)throw Error("Il server non ha confermato il salvataggio");
  }
  if(window.TurinPippsBridge?.applyPersonalFlag)window.TurinPippsBridge.applyPersonalFlag(url,next);
  else {prefs().flags=prefs().flags||{};prefs().flags[url]=next;api()?.refresh?.();}
  homeUpdate();
  // Rerendering is required by the existing search controller: restore the
  // expansion and input focus instead of collapsing the user's form.
  if(openState)queueMicrotask(()=>{
   enhanceCards();simplifyListingDetails();
   const article=$(".listing").find(x=>$('[data-action="save"][data-url]',x)?.dataset.url===url);
   if(!article)return;
   const tools=$(".tp10-property-tools",article),proof=$(".tp10-evidence",article),details=$(".tp-card-details",article);
   if(tools)tools.open=openState.tools;
   if(proof)proof.open=openState.proof;
   if(details)details.open=openState.details;
   const selector=restoreType==="check"?'[data-tp10-check="'+restoreKey+'"]':
      restoreType==="cost"?'[data-tp10-cost="'+restoreKey+'"]':'[data-tp10-action="'+restoreKey+'"]';
   article.querySelector(selector)?.focus({preventScroll:true});
  });
  return true;
 }catch(err){
  const toast=$("#tp-toast");if(toast){toast.textContent="Salvataggio non riuscito: "+String(err.message||err);toast.hidden=false;toast.className="tp-toast warn";}
  if(origin?.type==="checkbox")origin.checked=!origin.checked;
  return false;
 }finally{pending.delete(url);control?.classList.remove("tp10-saving")}
}
function attachEvents(){
 document.addEventListener("change",async ev=>{
  const field=ev.target;
  if(field.matches("[data-tp10-filter]")){
   filterState[field.dataset.tp10Filter]=field.checked;
   api()?.refresh?.();
   return;
  }
  if(field.matches("[data-tp10-check]")){
   const a=field.dataset.url,f=getFlag(a);
   const next={...f,verificationChecks:{...(f.verificationChecks||{}),[field.dataset.tp10Check]:field.checked}};
   await persistFlag(a,next,field);
   return;
  }
  if(field.matches("[data-tp10-cost]")){
   const url=field.dataset.url,f=getFlag(url),raw=field.value.trim();
   if(raw&&(!Number.isFinite(Number(raw))||Number(raw)<0||Number(raw)>10000)){field.setCustomValidity("Inserisci un importo tra 0 e 10.000");field.reportValidity();return;}
   field.setCustomValidity("");
   const next={...f,costPlan:{...(f.costPlan||{}),[field.dataset.tp10Cost]:raw===""?null:Number(raw)}};
   await persistFlag(url,next,field);
  }
 });
 document.addEventListener("click",async ev=>{
  // The visible Azzera control must clear *all* filters, including quick filters
  // moved into the advanced panel. Let the existing click handler reset the rest.
  if(ev.target.closest("#tp8-reset")){
   filterState.priced=false;filterState.fresh=false;
   $("[data-tp10-filter]").forEach(input=>{input.checked=false;});
  }
  const reset=ev.target.closest("[data-tp11-reset]");
  if(reset){
   ev.preventDefault();
   filterState.priced=false;filterState.fresh=false;
   $("[data-tp10-filter]").forEach(input=>{input.checked=false;});
   $("#tp8-reset")?.click();
   $("#tp-main-search")?.focus();
   return;
  }
  const btn=ev.target.closest("[data-tp10-action]");
  if(!btn)return;
  const url=btn.dataset.url,f=getFlag(url);if(!url)return;
  ev.preventDefault();
  let next;
  if(btn.dataset.tp10Action==="reply"){
   const reply=!f.replyReceived;
   next={...f,contact:reply?true:f.contact,replyReceived:reply,repliedAt:reply?new Date().toISOString():""};
  }else if(btn.dataset.tp10Action==="contact"){
   next={...f,contact:!f.contact,replyReceived:!f.contact?f.replyReceived:false,repliedAt:!f.contact?f.repliedAt:""};
  }else return;
  await persistFlag(url,next,btn);
 });
}
function refresh(){
 homeUpdate();enhanceCards();simplifyListingDetails();enhanceBoard();enhanceAdmin();renderSourceQuality();
}
function init(){
 if(!api()||!$("#view-home"))return;
 navigation();homeMarkup();searchEnhance();organizeMonitor();accessibility();attachEvents();refresh();
 [["#list",()=>{enhanceCards();simplifyListingDetails();homeUpdate()}],["#saved-list",()=>{enhanceCards();simplifyListingDetails()}],["#tp-home-list",()=>{enhanceCards();simplifyListingDetails()}],["#tp-activity-summary",renderSourceQuality],["#tp-visits-content",enhanceBoard],["#tp-v5-admin-content",enhanceAdmin]]
 .forEach(([selector,fn])=>{const root=$(selector);if(root){new MutationObserver(()=>{queueMicrotask(fn);}).observe(root,{childList:true});}});
 const slides=[
  {icon:"fa-solid fa-sliders",title:"Scegli un budget realistico",text:"Imposta il canone massimo che puoi sostenere. Le spese restano separate quando non sono conosciute."},
  {icon:"fa-solid fa-location-dot",title:"Seleziona i quartieri",text:"Scegli le zone di Torino che preferisci. Puoi modificarle quando vuoi nelle impostazioni."},
  {icon:"fa-solid fa-shield-halved",title:"Controlla l'affidabilità",text:"Match e affidabilità sono diversi: un annuncio può sembrare perfetto, ma senza la conferma del proprietario."},
  {icon:"fa-solid fa-list-check",title:"Salva, contatta e organizza",text:"Usa i salvati, la checklist privata e i costi stimati. Poi segna la risposta e programma la visita."}
 ];
 // The five-step onboarding module is authoritative; do not overwrite its steps.
 if(!window.TurinPippsEnhanceGuide)api().guideSlides?.(slides);
 window.addEventListener("turinpipps:ready",()=>{refresh()});
 window.addEventListener('turinpipps:listings-updated',()=>{refresh()});
 window.addEventListener("turinpipps:account-ready",()=>{refresh()});
 window.addEventListener("turinpipps:account-signed-out",()=>{refresh()});
}
window.TurinPippsV10={match,getSearchFilters:()=>({...filterState}),refresh};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();