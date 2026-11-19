/* TurinPipps 12 — mobile clarity, progressive disclosure, and persistent accessible themes.
   Works with existing listing, auth and save handlers; does not replace them. */
(function(){
"use strict";
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const allowed=["system","light","dark"],themeKey="turinpipps.theme.v12";
const themeName={system:"Automatico",light:"Chiaro",dark:"Scuro"};
const themeIcon={system:"fa-solid fa-circle-half-stroke",light:"fa-solid fa-sun",dark:"fa-solid fa-moon"};
const iconList={home:"fa-solid fa-house",results:"fa-solid fa-magnifying-glass",saved:"fa-regular fa-heart",visits:"fa-regular fa-calendar-check",profile:"fa-regular fa-user"};
const root=document.documentElement;
const mq=window.matchMedia?.("(prefers-color-scheme: dark)")||null;
let theme=allowed.includes(root.dataset.tpThemeChoice)?root.dataset.tpThemeChoice:"system";
let observed=false,raf=0;
function applyTheme(choice,persist){
 theme=allowed.includes(choice)?choice:"system";
 const resolved=theme==="system"?(mq?.matches?"dark":"light"):theme;
 root.dataset.tpTheme=resolved;
 root.dataset.tpThemeChoice=theme;
 root.style.colorScheme=resolved;
 const color=resolved==="dark"?"#101c29":"#f5f8fa";
 const meta=$('meta[name="theme-color"]');if(meta)meta.setAttribute("content",color);
 if(persist){try{localStorage.setItem(themeKey,theme)}catch(_){}}
 $$("[data-tp12-theme]").forEach(button=>{
   const selected=button.dataset.tp12Theme===theme;
   button.setAttribute("aria-pressed",selected?"true":"false");
   button.classList.toggle("selected",selected);
 });
 const summary=$("#tp12-theme-trigger");
 if(summary){
   summary.innerHTML='<i class="'+themeIcon[theme]+'" aria-hidden="true"></i><span class="tp12-visually-hidden">Aspetto: '+themeName[theme]+'</span>';
   summary.setAttribute("aria-label","Tema "+themeName[theme]+". Apri opzioni tema");
 }
}
function themeButtons(){
 return allowed.map(mode=>'<button type="button" data-tp12-theme="'+mode+'" aria-pressed="'+(theme===mode?"true":"false")+'" class="'+(theme===mode?"selected":"")+'"><i class="'+themeIcon[mode]+'" aria-hidden="true"></i><span>'+themeName[mode]+'</span>'+
 (mode==="system"?'<small>Segue il dispositivo</small>':"")+'</button>').join("");
}
function themeControls(){
 const actions=$(".topline .top-actions");
 if(actions&&!$("#tp12-theme-menu")){
  const menu=document.createElement("details");
  menu.id="tp12-theme-menu";menu.className="tp12-theme-menu";
  menu.innerHTML='<summary id="tp12-theme-trigger" aria-label="Modifica tema" title="Aspetto dell’app">'+
    '<i class="'+themeIcon[theme]+'" aria-hidden="true"></i></summary>'+
    '<div class="tp12-theme-popover" role="group" aria-label="Tema dell’app">'+
    '<strong>Aspetto dell’app</strong><p>Puoi seguire la modalità di iPhone oppure scegliere manualmente.</p>'+
    '<div class="tp12-theme-options">'+themeButtons()+'</div></div>';
  const bell=$("#tp-v5-bell"),account=$("#tp-account-button");
  if(bell&&bell.parentElement===actions)actions.insertBefore(menu,bell);
  else if(account&&account.parentElement===actions)actions.insertBefore(menu,account);
  else actions.append(menu);
 }
 for(const view of ["#view-settings"]){
  const host=$(view);
  if(!host||host.querySelector(".tp12-theme-settings"))continue;
  const card=document.createElement("section");card.className="tp12-theme-settings";
  card.innerHTML='<div class="tp12-settings-heading"><span class="tp12-section-eyebrow">PERSONALIZZAZIONE</span><h2>Aspetto dell’app</h2><p>Scegli il tema. Con Automatico, TurinPipps segue l’aspetto di iPhone e cambia anche quando lo cambi nelle impostazioni.</p></div>'+
   '<div class="tp12-theme-options" role="group" aria-label="Modalità chiara, scura o automatica">'+themeButtons()+'</div>';
  const anchor=view==="#view-profile"?"#tp8-account-hub":".panel";
  const reference=$(anchor,host);
  if(reference)reference.after(card);else host.prepend(card);
 }
 applyTheme(theme,false);
}
function closeMenus(event){
 const menu=$("#tp12-theme-menu");
 if(menu?.open&&!menu.contains(event.target))menu.open=false;
}
function installTheme(){
 try{const stored=localStorage.getItem(themeKey);if(allowed.includes(stored))theme=stored}catch(_){}
 applyTheme(theme,false);
 mq?.addEventListener?.("change",()=>{if(theme==="system")applyTheme(theme,false)});
 document.addEventListener("click",event=>{
  const target=event.target.closest("[data-tp12-theme]");
  if(target){event.preventDefault();applyTheme(target.dataset.tp12Theme,true);const menu=$("#tp12-theme-menu");if(menu)menu.open=false;return;}
  closeMenus(event);
 });
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"){$("#tp12-theme-menu")?.removeAttribute("open");}
 });
}
function header(){
 const bar=$(".topline"),brand=$(".tp-mobile-brand"),heading=$(".topline .eyebrow");
 if(!bar)return;
 bar.classList.add("tp12-topbar");
 if(brand){brand.classList.add("tp12-brand");brand.setAttribute("aria-label","TurinPipps, ricerca casa a Torino");}
 if(heading){heading.classList.add("tp12-context-heading");}
 const action=$("#tp-guide-open");if(action){action.setAttribute("aria-label","Apri la guida di TurinPipps");action.title="Guida";}
 const bell=$("#tp-v5-bell");if(bell)bell.title="Notifiche";
 themeControls();
}
function results(){
 const section=$("#view-results");
 if(!section||section.dataset.tp12ResultsReady)return;
 section.dataset.tp12ResultsReady="1";
 const head=$(".tp-page-lead",section);
 if(head){
  const eyebrow=$(".tp8-eyebrow",head);if(eyebrow)eyebrow.textContent="CERCA CASA";
  const h1=$("h1",head);if(h1)h1.textContent="Trova la tua prossima casa";
  const p=$("p",head);if(p)p.textContent="Annunci raccolti da fonti pubbliche. Prezzo e disponibilità sono da confermare quando non documentati.";
 }
 const tools=$(".tp-search-tools",section);
 if(tools){
   tools.classList.add("tp12-search-box");
   const search=$(".tp8-search-main",tools)||tools.querySelector("div");
   if(search)search.classList.add("tp12-search-input");
   const row=document.createElement("div");
   row.className="tp12-search-actions";
   const filter=$("#tp-filter-toggle"),reset=$("#tp8-reset");
   for(const button of [filter,reset]){
      if(button){button.classList.add("tp12-search-action");row.append(button);}
   }
   const more=document.createElement("details");more.className="tp12-search-more";
   more.innerHTML='<summary><i class="fa-solid fa-ellipsis" aria-hidden="true"></i><span>Altre opzioni</span></summary>'+
    '<div class="tp12-search-more-content"></div>';
   const moreContent=$(".tp12-search-more-content",more);
   for(const button of [$(".tp-v6-external-button",tools),$(".tp-v6-add-button",tools)]){
     if(button){moreContent.append(button);}
   }
   if(moreContent.children.length){row.append(more);}
   tools.append(row);
   const input=$("#tp-main-search");
   if(input){input.placeholder="Es. bilocale in Cenisia";input.setAttribute("enterkeyhint","search");}
   const advanced=$("#tp-filter-toggle");
   if(advanced){
     advanced.innerHTML='<i class="fa-solid fa-sliders" aria-hidden="true"></i><span>Filtri</span><i class="fa-solid fa-chevron-down tp12-chevron" aria-hidden="true"></i>';
     advanced.setAttribute("aria-controls","tp-filterbar");
   }
   if(reset)reset.innerHTML='<i class="fa-solid fa-rotate-left" aria-hidden="true"></i><span>Azzera</span>';
 }
 const tabs=$(".tabs",section);
 if(tabs){
   tabs.classList.add("tp12-result-tabs");
   const newLabels={candidate:"Per te",good:"Compatibili",review:"Da verificare",all:"Tutti"};
   $$("[data-mode]",tabs).forEach(b=>{
      b.textContent=newLabels[b.dataset.mode]||b.textContent;
      b.setAttribute("aria-label",b.textContent);
      b.setAttribute("aria-pressed",b.classList.contains("selected")?"true":"false");
   });
   if(!tabs.dataset.tp12PressSync){
     tabs.addEventListener("click",()=>{
       requestAnimationFrame(()=>$$("[data-mode]",tabs).forEach(b=>b.setAttribute("aria-pressed",b.classList.contains("selected")?"true":"false")));
     });
     tabs.dataset.tp12PressSync="1";
   }
 }
 const sorter=$("#sort");
 const sortBar=$(".tp8-sortbar",section);
 const toolbar=$(".tp-listing-toolbar",section);
 const count=$("#tp-search-result-count");
 if(tabs&&!$("#tp12-results-header")){
   const row=document.createElement("div");row.className="tp12-results-header";row.id="tp12-results-header";
   const counter=document.createElement("div");counter.className="tp12-results-caption";
   counter.innerHTML='<span class="tp12-section-eyebrow">RISULTATI</span>';
   if(count)counter.append(count);
   row.append(counter);
   if(sorter){
     const label=sorter.closest("label");
     if(label){label.classList.add("tp12-sort");row.append(label);}
     else{const wrap=document.createElement("label");wrap.className="tp12-sort";wrap.textContent="Ordina";wrap.append(sorter);row.append(wrap);}
   }
   tabs.before(row);
   if(sortBar)sortBar.remove();
   if(toolbar)toolbar.classList.add("tp12-hidden-toolbar");
 }
 const info=$("#tp10-search-tools");
 if(info){
   info.classList.add("tp12-quick-filters");
   const paragraph=$("p",info);if(paragraph)paragraph.textContent="Le informazioni assenti non sono considerate verificate.";
 }
 const banner=$(".tp8-verification-note",section);if(banner)banner.hidden=true;
 const secondary=$(".tp11-a11y-hint",section);if(secondary)secondary.classList.add("tp12-screenreader-hint");
}
function titleClean(text){
 const original=String(text||"").trim();
 const stripped=original.replace(/\s*[-–|]\s*(?:Appartamenti?\s+[Ii]n\s+affitto\s+a\s+Torino\s*[-–|]\s*Subito|Immobili\s+in\s+affitto\s+a\s+Torino\s*[-–|]\s*Subito)\s*$/i,"")
  .replace(/^\s*annuncio\s*:\s*/i,"").trim();
 return stripped||original;
}
function reconcileCard(article,map){
 const btn=article.querySelector('[data-action="save"][data-url]');
 if(!btn)return;
 const record=map.get(btn.dataset.url);
 if(!record)return;
 const trust=$(".tp9-evaluation",article);
 let evidence=$(".tp10-evidence",article);
 // v9 may append evidence after v10's card initialization. Always repair this race.
 if(trust&&(!evidence||!evidence.contains(trust))){
   if(!evidence){
     evidence=document.createElement("details");
     evidence.className="tp10-evidence tp12-evidence";
     evidence.innerHTML='<summary><i class="fa-solid fa-shield-halved" aria-hidden="true"></i><span>Controlli, affidabilità e provenienza</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>';
     trust.before(evidence);
   }
   evidence.append(trust);
   if(!article.dataset.tp12EvidenceSettled)evidence.open=false;
   article.dataset.tp12EvidenceSettled="1";
 }
 if(article.dataset.tp12CardReady)return;
 const body=$(".body",article);if(!body)return;
 const label=$(".listing-banner .price",article);
 if(label&&!(Number(record.price)>0)){
  label.classList.add("tp14-price-unavailable");
  label.textContent="Canone non indicato";
 }
 article.dataset.tp12CardReady="1";
 article.classList.add("tp12-card");
 const heading=$("h3",body);
 if(heading){
   const oldText=heading.textContent.trim();
   const clean=titleClean(oldText);
   if(clean!==oldText){heading.title=oldText;heading.textContent=clean;}
   const badges=document.createElement("div");badges.className="tp12-card-status";
   const isOwner=record.private_status==="confirmed"&&record.verification_level==="owner_confirmed";
   const isClaim=record.private_status==="source";
   const compatibility=window.TurinPippsUXV3?.classifyListing?.(record)?.status||"review";
   badges.innerHTML='<span class="tp12-status '+(compatibility==="excluded"?"tp12-warning":compatibility==="good"?"tp12-positive":"")+'">'+
    (compatibility==="excluded"?"Fuori criteri":compatibility==="good"?"In linea con i criteri":"Dati incompleti")+'</span>'+
    '<span class="tp12-status">'+(isOwner?"Identità confermata":isClaim?"Privato dichiarato":"Inserzionista non confermato")+'</span>';
   const after=$(".tp10-card-summary",body);
   if(after)after.before(badges);
   else heading.after(badges);
 }
 const actions=$(".actions",article);
 const menu=$(".tp-card-menu",actions||article);
 const compare=actions?.querySelector('button[data-action="compare"]');
 const inner=$(".tp-card-menu-items",menu||article);
 // Comparing homes is a core task. Keep its existing button visible beside
 // Save; do not bury it behind an unnamed "more" menu.
 if(compare&&inner){
   compare.classList.add("tp14-compare-action");
   menu.classList.add("tp14-other-actions");
   const summary=$("summary",menu);
   if(summary)summary.innerHTML='<i class="fa-solid fa-ellipsis" aria-hidden="true"></i> Altre azioni';
 }
 const original=$(".tp-card-details",article);
 if(original){const summary=$("summary",original);if(summary)summary.textContent="Descrizione e dati originali";}
 const proof=$(".tp10-evidence",article);
 if(proof){const s=$("summary",proof);if(s)s.setAttribute("aria-label","Apri controlli, provenienza, pubblicazione e storico dell'annuncio");}
}
function cards(){
 const api=window.TurinPippsUXV3;
 if(!api?.getListings)return;
 const map=new Map(api.getListings().map(a=>[a.url,a]));
 $$(".listing").forEach(card=>reconcileCard(card,map));
}
function reconcile(){
 if(raf)return;
 raf=requestAnimationFrame(()=>{raf=0;cards();themeControls();});
}
function observe(){
 if(observed)return;observed=true;
 for(const host of ["#list","#saved-list","#tp-home-list"]){
  const node=$(host);
  if(node)new MutationObserver(reconcile).observe(node,{childList:true,subtree:true});
 }
 // Changes to profile can be created by the auth/profile module after startup.
 const profile=$("#view-profile");
 if(profile)new MutationObserver(()=>{if(!profile.querySelector(".tp12-theme-settings"))themeControls()}).observe(profile,{childList:true,subtree:false});
}
function onboarding(){
 const welcome=$("#tp-welcome");
 if(!welcome)return;
 const headline=$("#tp-welcome-title");
 if(headline)headline.textContent="Troviamo la casa giusta per te.";
 const paragraph=$(".tp-welcome-card p",welcome);
 if(paragraph)paragraph.textContent="Cerca, salva e confronta gli annunci. Inizia subito senza registrarti oppure crea un account gratuito per sincronizzare i tuoi dati.";
 const guest=$("#tp-welcome-guest"),buttons=$(".tp-welcome-actions",welcome);
 if(guest){
  guest.innerHTML='<i class="fa-solid fa-compass" aria-hidden="true"></i> Inizia senza account';
  guest.classList.add("tp12-welcome-primary","primary");
  if(buttons&&buttons.firstElementChild!==guest)buttons.prepend(guest);
 }
 const signup=$("#tp-welcome-register");
 if(signup){signup.classList.remove("primary");signup.innerHTML='<i class="fa-solid fa-user-plus" aria-hidden="true"></i> Crea account gratuito';}
 for(const button of [guest,signup,$("#tp-welcome-signin")]){
   if(button)button.addEventListener("click",()=>{try{localStorage.setItem("turinpipps.welcome.seen.v11","1")}catch(_){}},{once:true});
 }
 const login=$("#tp-welcome-signin");
 if(login)login.textContent="Ho già un account";
 const footer=$(".tp-welcome-footer",welcome);
 if(footer)footer.textContent="Nessun pagamento richiesto · Le preferenze si possono modificare in ogni momento";
 // Never forcibly reopen the guide to returning users.
 const guide=$("#tp-guide-dialog");
 if(guide)guide.setAttribute("aria-label","Guida iniziale personalizzata");
 const open=$("#tp-guide-open");
 if(open)open.title="Riapri la guida quando vuoi";
}
function footer(){
 const node=$("#tp9-global-footer");
 if(!node)return;
 node.classList.add("tp12-footer");
 const text=node.querySelector("span");
 if(text)text.textContent="TurinPipps · Ricerca casa indipendente. Annunci, prezzi e disponibilità sempre da verificare con la fonte.";
 const nav=$("nav",node);if(nav)nav.setAttribute("aria-label","Guida, privacy, termini e assistenza");
}
/* Fix the reading order: search first, answers second, technical methodology last. */
function simplifySearch(){
 const section=$("#view-results");if(!section||section.dataset.tp13Search)return;
 const quick=$("#tp10-search-tools"),advanced=$("#tp-filterbar");
 if(quick&&advanced){
   const controls=$(".tp10-filters-left",quick);
   if(controls){
     controls.classList.add("tp13-inline-filters");
     controls.querySelector("b")?.replaceChildren(document.createTextNode("Filtri rapidi"));
     advanced.prepend(controls);quick.remove();
   }
 }
 const menu=$(".tp12-search-more-content",section),reload=$("#reload");
 if(menu&&reload&&!menu.contains(reload)){
   reload.classList.add("tp13-reload-option");
   reload.innerHTML='<i class="fa-solid fa-rotate" aria-hidden="true"></i> Ricarica gli annunci';
   menu.append(reload);
 }
 const insight=$(".tp8-insights",section),list=$("#list");
 if(insight&&list&&!insight.dataset.tp13Moved){
   insight.classList.add("tp13-methodology");
   list.after(insight);insight.dataset.tp13Moved="1";
   const sum=$("summary",insight);
   if(sum)sum.innerHTML='<i class="fa-solid fa-circle-info" aria-hidden="true"></i> Come valutiamo gli annunci <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
 }
 const tabs=$(".tp12-result-tabs",section);
 if(tabs){
  tabs.setAttribute("role","group");tabs.setAttribute("aria-label","Quali risultati vuoi visualizzare");
 }
 const toolbar=$(".tp12-results-header",section);
 if(toolbar)toolbar.setAttribute("aria-label","Numero risultati e ordinamento");
 section.dataset.tp13Search="1";
}
/** Less noise in secondary journeys: preserve all original actions and data. */
function simplifyJourney(){
 const section=$("#view-visits");if(section){
  const lead=$(".tp-page-lead",section);
  const eyebrow=$(".tp-kicker",lead||section);if(eyebrow)eyebrow.textContent="IL TUO PERCORSO";
  const title=$("h1",lead||section);if(title)title.textContent="Contatti e visite";
  const p=$("p",lead||section);if(p)p.textContent="Segui solo le case che hai contattato, salvato o valutato. Ogni fase resta modificabile.";
 }
 const saved=$("#view-saved");
 if(saved){
  const h1=$(".tp-page-lead h1",saved);if(h1)h1.textContent="Case salvate";
  const lead=$(".tp-page-lead p",saved);if(lead)lead.textContent="Gli annunci che hai contrassegnato come salvati. Le case già contattate sono anche in Organizza.";
  const other=$(".tp-page-lead>button",saved);if(other)other.setAttribute("aria-label","Torna alla ricerca di altri immobili");
 }
 const home=$("#view-home");
 if(home){
  const title=$(".tp10-home-head h1",home);if(title)title.innerHTML="La tua ricerca casa, <span>in un unico posto.</span>";
  const summary=$(".tp10-home-head p",home);if(summary)summary.textContent="Confronta le opportunità, verifica i dati mancanti e segui i contatti senza perdere il filo.";
 }
}
/** The old welcome/login modals should never be reopened by the theme switch. */
function improveThemeDetails(){
 const privacy=$("#tp9-profile-privacy");
 if(privacy){
  privacy.classList.add("tp13-privacy");
  const h=$("h3",privacy);if(h)h.textContent="I tuoi dati, sotto il tuo controllo";
  privacy.querySelectorAll("button").forEach(b=>b.setAttribute("type","button"));
 }
 const themePanel=$(".tp12-theme-settings",$("#view-profile")||document);
 if(themePanel)themePanel.classList.add("tp13-preference");
}
function events(){
 document.addEventListener("click",event=>{
  const button=event.target.closest("[data-nav]");
  if(button){
    $("#tp12-theme-menu")?.removeAttribute("open");
    requestAnimationFrame(()=>{
      const section=$("#view-"+button.dataset.nav),main=$("h1,h2",section||document);
      if(main&&section&&!section.classList.contains("hidden")){
        main.tabIndex=-1;main.focus({preventScroll:true});
      }
    });
  }
  if(event.target.closest(".tp12-search-more-content button")){
     const more=$(".tp12-search-more");if(more)more.open=false;
  }
 });
 window.addEventListener("turinpipps:ready",()=>{results();simplifySearch();simplifyJourney();header();themeControls();improveThemeDetails();cards();footer();});
 window.addEventListener("turinpipps:account-ready",()=>{themeControls();header();improveThemeDetails();cards();footer();});
 window.addEventListener("turinpipps:account-signed-out",()=>{themeControls();header();cards();});
}
function init(){
 if(!window.TurinPippsUXV3)return;
 installTheme();header();results();simplifySearch();simplifyJourney();onboarding();themeControls();improveThemeDetails();footer();cards();events();observe();
}
window.TurinPippsV12={applyTheme,results,cards,themeControls};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();