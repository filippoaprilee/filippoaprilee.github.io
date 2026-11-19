/* TurinPipps 8 · information architecture for desktop and iPhone.
   Progressive enhancement: existing controllers, authentication and listing actions remain authoritative. */
(function(){
"use strict";
const $=selector=>document.querySelector(selector);
const esc=value=>String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const api=()=>window.TurinPippsUXV3;
const view=(name)=>api()&&api().navigate(name);
const classify=a=>api()&&api().classifyListing?api().classifyListing(a):{status:"review",reasons:["Informazioni da verificare"]};
const rows=()=>api()&&api().getListings?api().getListings():[];
const prefs=()=>api()&&api().getPrefs?api().getPrefs():{};
function fmt(iso){
 const date=new Date(iso||"");
 return Number.isFinite(date.getTime())?date.toLocaleString("it-IT",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"Non disponibile";
}
function goodCoordinates(a){return Number.isFinite(a.lat)&&Number.isFinite(a.lng)&&a.lat>=44.8&&a.lat<=45.3&&a.lng>=7.3&&a.lng<=8}
function newNavButton(target,icon,label){
 const b=document.createElement("button");b.type="button";b.dataset.nav=target;
 b.innerHTML='<i class="'+icon+'" aria-hidden="true"></i><span class="nav-label">'+label+"</span>";
 return b;
}
function restructureNavigation(){
 const nav=$(".side .nav");if(!nav||nav.dataset.tp8Ready)return;
 const buttons={};
 Array.from(nav.querySelectorAll("button[data-nav]")).forEach(b=>{buttons[b.dataset.nav]=b});
 buttons.map=buttons.map||newNavButton("map","fa-solid fa-map-location-dot","Mappa");
 const desired=[
  ["ESPLORA",[
   ["home","fa-solid fa-house","Home"],["results","fa-solid fa-magnifying-glass","Cerca casa"],
   ["map","fa-solid fa-map-location-dot","Mappa"]]],
  ["LA TUA RICERCA",[
   ["saved","fa-regular fa-heart","Salvati"],["visits","fa-regular fa-calendar-check","Organizza"],
   ["compare","fa-solid fa-scale-balanced","Confronta"]]],
  ["ACCOUNT",[
   ["sources","fa-solid fa-wave-square","Monitoraggio"],["profile","fa-regular fa-user","Profilo"],
   ["settings","fa-solid fa-sliders","Impostazioni"]]]
 ];
 nav.replaceChildren();
 desired.forEach(function(group,i){
  const section=document.createElement("div");section.className="tp8-nav-group";
  if(i===2)section.classList.add("tp8-nav-account");
  const title=document.createElement("div");title.className="tp8-nav-heading";title.textContent=group[0];section.appendChild(title);
  group[1].forEach(function(item){
   const b=buttons[item[0]]||newNavButton(item[0],item[1],item[2]);
   b.innerHTML='<i class="'+item[1]+'" aria-hidden="true"></i><span class="nav-label">'+item[2]+"</span>";
   b.classList.toggle("active",!!$("#view-"+item[0])&&!$("#view-"+item[0]).classList.contains("hidden"));
   b.setAttribute("aria-label",item[2]);
   section.appendChild(b);
  });
  if(i===2){const staff=document.createElement("div");staff.id="tp8-nav-staff";section.appendChild(staff);if(buttons.admin)staff.appendChild(buttons.admin)}
  nav.appendChild(section);
 });
 nav.dataset.tp8Ready="1";
 const relocateAdmin=function(){
  const staff=$("#tp8-nav-staff"),developer=$("#tp-v5-nav-admin");
  if(staff&&developer&&developer.parentNode!==staff){
   developer.innerHTML='<i class="fa-solid fa-code" aria-hidden="true"></i><span class="nav-label">Sviluppatore</span>';
   staff.appendChild(developer);
  }
 };
 const observer=new MutationObserver(relocateAdmin);
 observer.observe(nav,{childList:true,subtree:false});
 relocateAdmin();
 const mobile=$(".mobile-nav");
 if(mobile){
  mobile.innerHTML=[
   ["home","fa-solid fa-house","Home"],["results","fa-solid fa-magnifying-glass","Cerca"],
   ["map","fa-solid fa-map","Mappa"],["saved","fa-regular fa-heart","Salvati"],
   ["visits","fa-regular fa-calendar-check","Organizza"]
  ].map(function(item){
    return '<button type="button" data-nav="'+item[0]+'"><span><i class="'+item[1]+'"></i></span>'+item[2]+'</button>';
  }).join("");
 }
 const heading=$(".topline .eyebrow");if(heading)heading.innerHTML='<strong>TurinPipps</strong><small>La tua ricerca a Torino</small>';
 const account=$("#tp-account-button");
 if(account){account.setAttribute("aria-label","Accedi o gestisci il tuo account");account.setAttribute("title","Account");}
}
function buildHome(){
 const home=$("#view-home");if(!home||$("#tp8-home"))return;
 const box=document.createElement("section");box.id="tp8-home";
 box.innerHTML='<div class="tp8-home-heading"><div><span class="tp8-eyebrow">IL TUO RADAR IMMOBILIARE</span><h1>La tua prossima casa, più vicina.</h1><p>Annunci di Torino selezionati in base ai tuoi criteri, con informazioni certe e dati ancora da controllare ben distinti.</p></div>'+
 '<button type="button" class="tp8-home-edit" data-nav="settings"><i class="fa-solid fa-sliders"></i> Modifica criteri</button></div>'+
 '<div class="tp8-home-summary"><div class="tp8-home-budget"><span>IL TUO BUDGET</span><strong id="tp8-budget">—</strong><small>Canone mensile, spese escluse</small></div>'+
 '<div class="tp8-home-stats" id="tp8-metrics"></div></div>'+
 '<div class="tp8-home-grid"><section class="tp8-home-main"><div class="tp8-card-head"><div><span class="tp8-eyebrow">ULTIMA SCOPERTA</span><h2>La casa più recente</h2></div><button type="button" data-nav="results">Vedi tutte <i class="fa-solid fa-arrow-right"></i></button></div>'+
 '<div id="tp8-latest" class="tp8-latest"></div></section>'+
 '<section class="tp8-home-secondary"><div class="tp8-card-head"><div><span class="tp8-eyebrow">STATO DELLA RICERCA</span><h2>Il monitoraggio</h2></div></div>'+
 '<div id="tp8-monitor" class="tp8-monitor"></div><button type="button" data-nav="sources" class="tp8-small-link">Cronologia dei controlli <i class="fa-solid fa-chevron-right"></i></button></section></div>'+
 '<div class="tp8-home-quick-head"><div><span class="tp8-eyebrow">ACCESSO RAPIDO</span><h2>Cosa vuoi fare?</h2></div></div>'+
 '<div class="tp8-quick-grid">'+[
  ["results","fa-solid fa-magnifying-glass","Cerca immobili","Filtri, budget e nuove opportunità"],
  ["map","fa-solid fa-map-location-dot","Esplora la mappa","Solo posizioni documentate"],
  ["saved","fa-regular fa-heart","Le case salvate","Ritrova ciò che ti interessa"],
  ["visits","fa-regular fa-calendar-check","Organizza","Contatti, visite e decisioni"]
 ].map(item=>'<button class="tp8-quick" type="button" data-nav="'+item[0]+'"><i class="'+item[1]+'"></i><span><strong>'+item[2]+'</strong><small>'+item[3]+'</small></span><i class="fa-solid fa-arrow-right"></i></button>').join("")+
 '</div>';
 home.prepend(box);
}
function updateHome(){
 const root=$("#tp8-home");if(!root)return;
 const list=rows(),p=prefs(),flags=p.flags||{};
 const counts={good:0,review:0,saved:0,mapped:0};
 list.forEach(a=>{
   const kind=classify(a).status;
   if(kind==="good")counts.good++;
   if(kind==="review")counts.review++;
   if(flags[a.url]&&flags[a.url].saved)counts.saved++;
   if(goodCoordinates(a))counts.mapped++;
 });
 $("#tp8-budget").textContent=(Number(p.budget)||700).toLocaleString("it-IT")+" €/mese";
 $("#tp8-metrics").innerHTML=[
  [counts.good,"Compatibili*","results"],[counts.review,"Da verificare","results"],
  [counts.saved,"Salvati","saved"],[counts.mapped,"Su mappa","map"]
 ].map(item=>'<button type="button" data-nav="'+item[2]+'"><strong>'+item[0]+'</strong><span>'+item[1]+'</span></button>').join("")+
 '<p>* Compatibilità preliminare: proprietario e disponibilità vanno confermati.</p>';
 const discovered=list.slice().sort((a,b)=>Date.parse(b.seen||b.first_seen||0)-Date.parse(a.seen||a.first_seen||0));
 const latest=discovered[0];
 $("#tp8-latest").innerHTML=latest?
  '<div class="tp8-new-badge"><i class="fa-solid fa-house"></i><span>'+esc(latest.source||"Fonte non dichiarata")+'</span></div>'+
  '<div class="tp8-latest-content"><div class="tp8-latest-price">'+(Number(latest.price)>0?Number(latest.price).toLocaleString("it-IT")+" €":"Prezzo non indicato")+
  '<small> /mese</small></div><h3>'+esc(latest.title)+'</h3><p><i class="fa-solid fa-location-dot"></i> '+esc(latest.zone||"Zona da verificare")+' · Rilevato '+esc(fmt(latest.seen||latest.first_seen))+'</p>'+
  '<div class="tp8-latest-badges"><span>'+esc(classify(latest).status==="good"?"Potenzialmente compatibile":"Informazioni da verificare")+'</span>'+
  '<span>'+esc(latest.private_status==="confirmed"&&latest.verification_level==="owner_confirmed"?"Privato verificato":"Inserzionista da controllare")+'</span></div>'+
  '<div class="tp8-latest-actions"><a class="tp8-primary" href="'+esc(latest.url)+'" target="_blank" rel="noopener noreferrer">Apri annuncio <i class="fa-solid fa-arrow-up-right-from-square"></i></a>'+
  '<button type="button" class="tp8-link-button" data-nav="results">Vai alla ricerca</button></div></div>'
 :'<div class="tp8-empty">Non ci sono ancora annunci nell’archivio. Controlla la sezione Cerca.</div>';
 const scan=api()&&api().getLiveScan?api().getLiveScan():null;
 const good=scan&&["ok","partial"].includes(scan.status);
 $("#tp8-monitor").innerHTML='<div class="tp8-scan-state"><span class="tp8-scan-light '+(good?"ok":"")+'"></span><div><strong>'+(good?"Ultima scansione completata":"Stato da verificare")+'</strong><small>'+(scan?esc(fmt(scan.finished_at||scan.started_at)):"Apri Monitoraggio per gli ultimi controlli")+'</small></div></div>'+
 '<div class="tp8-scan-details"><span>Fonti controllate</span><b>'+(scan?Number(scan.jobs_checked)||0:"—")+'</b></div>'+
 '<div class="tp8-scan-details"><span>Fonti con esito positivo</span><b>'+(scan?Number(scan.jobs_ok)||0:"—")+'</b></div>'+
 '<p>Scansione riuscita non significa casa ancora disponibile.</p>';
}
function reorderSearch(){
 const section=$("#view-results");if(!section||section.dataset.tp8Ready)return;
 const head=section.querySelector(".tp-page-lead");
 const reload=$("#reload");
 if(head){
  head.innerHTML='<div><span class="tp8-eyebrow">RICERCA IMMOBILIARE</span><h1>Trova casa a Torino</h1><p>Prima i risultati rilevanti. Prezzo, zona, inserzionista e aggiornamento sono sempre distinguibili da informazioni non verificate.</p></div>';
  if(reload){reload.classList.add('tp8-search-refresh');reload.innerHTML='<i class="fa-solid fa-rotate"></i> Aggiorna';head.appendChild(reload)}
 }
 const tools=section.querySelector(".tp-search-tools"),filterbar=$("#tp-filterbar"),tabs=section.querySelector(".tabs"),intelligence=$("#tp-intelbar");
 if(tools){
  const search=tools.querySelector("div");
  if(search){search.classList.add("tp8-search-main");const label=search.querySelector("label");if(label)label.textContent="Cerca nell’archivio immobili";}
  const reset=document.createElement("button");reset.type="button";reset.className="button tp8-reset";reset.id="tp8-reset";reset.innerHTML='<i class="fa-solid fa-rotate-left"></i><span>Azzera</span>';tools.appendChild(reset);
  reset.addEventListener("click",()=>{
    ["query","tp-main-search","zone","source-filter","age-filter","distance-filter","stale-filter"].forEach(id=>{const e=$("#"+id);if(e)e.value=""});
    const sort=$("#sort");if(sort)sort.value="recent";
    const first=section.querySelector('[data-mode="candidate"]');if(first)first.click();
    const query=$("#tp-main-search");if(query)query.dispatchEvent(new Event("input",{bubbles:true}));
  });
 }
 if(filterbar){
  const q=$("#query");if(q){q.setAttribute("aria-label","Ricerca testo avanzata");q.classList.add("tp8-hidden-duplicate-search");}
  const toggle=$("#tp-filter-toggle");if(toggle)toggle.setAttribute("aria-controls","tp-filterbar");
 }
 if(tabs&&tools){
  const guide=document.createElement("div");guide.className="tp8-search-steps";
  guide.innerHTML='<strong>1. Esplora le opportunità per te</strong><span>Per te · Compatibili · Da verificare · Tutti</span>';
  tabs.before(guide);
  tabs.classList.add("tp8-primary-tabs");
 }
 const toolbar=section.querySelector(".tp-listing-toolbar");
 if(toolbar){
  const bar=document.createElement("div");bar.className="tp8-sortbar";
  const title=document.createElement("div");title.innerHTML='<span class="tp8-eyebrow">RISULTATI DELLA RICERCA</span>';
  bar.appendChild(title);
  const sorter=document.createElement("label");sorter.className="tp8-sort";sorter.textContent="Ordina";
  const original=$("#sort");if(original){sorter.appendChild(original);bar.appendChild(sorter);}
  toolbar.before(bar);
 }
 if(intelligence){
  const details=document.createElement("details");details.className="tp8-insights";
  details.innerHTML='<summary><i class="fa-solid fa-circle-info"></i> Come vengono valutati gli annunci <i class="fa-solid fa-chevron-down"></i></summary>';
  intelligence.before(details);details.appendChild(intelligence);
 }
 const note=document.createElement("p");note.className="tp8-verification-note";
 note.textContent="I filtri separano i dati conosciuti dalle informazioni ancora da verificare. Non considerare un collegamento trovato come un immobile disponibile.";
 const list=$("#list");if(list)list.before(note);
 section.dataset.tp8Ready="1";
}
function prepareMap(){
 const host=$("#tp8-map-host"),map=$("#tp-map");
 if(!host||!map)return;
 if(map.parentNode!==host)host.appendChild(map);
 map.hidden=false;
 const selection=$("#tp8-map-filter");
 if(selection&&!selection.dataset.tp8Bound){
  selection.addEventListener("change",renderMap);
  selection.dataset.tp8Bound="1";
 }
}
function renderMap(){
 const root=$("#view-map");if(!root||root.classList.contains("hidden"))return;
 prepareMap();
 const mode=$("#tp8-map-filter")?.value||"good";
 const selected=rows().filter(a=>(mode==="all"||classify(a).status===mode)&&goodCoordinates(a));
 const count=$("#tp8-map-count"),list=$("#tp8-map-list");
 if(count)count.textContent=selected.length;
 if(list)list.innerHTML=selected.length?selected.slice(0,30).map(a=>
  '<a href="'+esc(a.url)+'" target="_blank" rel="noopener noreferrer" class="tp8-map-result"><span><b>'+esc(a.title)+'</b><small>'+esc(a.zone||"Zona non specificata")+' · '+esc(a.source||"Fonte")+'</small></span>'+
  '<strong>'+(a.price?Number(a.price).toLocaleString("it-IT")+" €":"n.d.")+'</strong><i class="fa-solid fa-arrow-up-right-from-square"></i></a>').join(""):
  '<p class="tp8-empty">Nessun immobile con coordinate per questo filtro. La ricerca testuale contiene anche immobili privi di posizione geografica.</p>';
 if(api()&&api().drawMap)api().drawMap();
}
function buildProfileHub(){
 // The account screen already has identity and security sections.
 // Avoid repeating the sidebar's preferences, alerts and workflow links.
 const duplicate=$("#tp8-account-hub");
 if(duplicate)duplicate.remove();
}
function onNavigate(name){
 if(name==="home")updateHome();
 if(name==="map")renderMap();
 if(name==="results"){reorderSearch();}
 if(name==="profile")buildProfileHub();
}
function init(){
 if(!api()||!$("#view-home"))return;
 restructureNavigation();buildHome();reorderSearch();prepareMap();buildProfileHub();updateHome();
 const old=$("#view-more");if(old)old.setAttribute("aria-hidden","true");
 const list=$("#list");if(list){
  const observer=new MutationObserver(()=>{updateHome();if(!$("#view-map").classList.contains("hidden"))renderMap()});
  observer.observe(list,{childList:true});
 }
 window.addEventListener("turinpipps:ready",updateHome);
 window.addEventListener("turinpipps:account-ready",()=>{updateHome();setTimeout(restructureNavigation,100)});
 window.addEventListener("turinpipps:account-signed-out",updateHome);
 const active=[...document.querySelectorAll("#view-home,#view-results,#view-map")].find(x=>!x.classList.contains("hidden"));
 if(active&&active.id==="view-map")renderMap();
}
window.TurinPippsV8={onNavigate,renderHome:updateHome,renderMap};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();