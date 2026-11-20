/* TurinPipps 9 — provenance on every listing + account controls.
   Augments existing listing controllers without changing save/compare/visit behavior. */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const api=()=>window.TurinPippsUXV3;
const auth=()=>window.TurinPippsAuth;
const cfg=()=>window.TURINPIPPS_SUPABASE||{};
const money=v=>Number(v).toLocaleString("it-IT",{style:"currency",currency:"EUR",maximumFractionDigits:0});
function date(v){const d=new Date(v||"");return Number.isFinite(d.getTime())?d.toLocaleDateString("it-IT"):"non disponibile";}
function dataState(type,value,detail){
 return '<li class="tp9-proof-row"><div><strong>'+esc(type)+'</strong><span>'+esc(value)+'</span></div>'+
  '<span class="tp9-proof-tag '+esc(detail)+'">'+(detail==="verified"?"Verificato":detail==="claimed"?"Dichiarato":"Sconosciuto")+'</span></li>';
}
/* Conservative cross-portal duplicate candidates: never merge or hide distinct homes.
   Require matching explicit street + number, with non-conflicting area/price and zone. */
function streetAddress(a){
 const raw=String(a.address||a.title||"").toLocaleLowerCase("it-IT")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");
 const match=raw.match(/\b(via|viale|corso|piazza|largo)\s+([a-z'. ]{3,50}?)\s*,?\s*(\d{1,4}[a-z]?)\b/i);
 if(!match)return "";
 return match[1]+" "+match[2].replace(/\s+/g," ").trim()+" "+match[3];
}
function duplicatesAcrossPortals(a){
 const address=streetAddress(a),current=Number(a.sqm)||0,price=Number(a.price)||0;
 if(!address)return [];
 return (api()?.getListings?.()||[]).filter(b=>{
  if(a.url===b.url||String(a.source||"").toLowerCase()===String(b.source||"").toLowerCase())return false;
  if(streetAddress(b)!==address)return false;
  if(a.zone&&b.zone&&String(a.zone).toLowerCase()!==String(b.zone).toLowerCase())return false;
  const otherArea=Number(b.sqm)||0,otherPrice=Number(b.price)||0;
  if(current&&otherArea&&Math.abs(current-otherArea)>5)return false;
  if(price&&otherPrice&&Math.abs(price-otherPrice)>120)return false;
  return (current&&otherArea)||(price&&otherPrice);
 }).slice(0,5);
}
function fieldEvidence(a){
 const names={price:"Canone",expenses:"Spese dichiarate",address:"Indirizzo",sqm:"Superficie",zone:"Quartiere",property_type:"Tipologia",description:"Descrizione",
  source_updated:"Ultimo aggiornamento fonte",published_at:"Pubblicazione originale",
  private_status:"Indicazione di privato"};
 const proof=a.field_provenance&&typeof a.field_provenance==="object"?a.field_provenance:{};
 const entries=Object.keys(names).filter(key=>proof[key]&&proof[key].origin==="public_listing_page");
 const link=a.evidence_url&&/^https:\/\//i.test(a.evidence_url)?a.evidence_url:"";
 if(!entries.length){
  const manual=a.verification_level==="source_documented"&&link;
  return '<p class="tp11-proof-limited">'+
   (manual?'Questa pagina è stata consultata come fonte, ma non disponiamo ancora dello storico per ogni singolo campo. Le informazioni restano dichiarate, non verificate indipendentemente.':
   'Non abbiamo ancora una provenienza documentata per singolo campo. Controlla l’annuncio originale; un valore presente non è una verifica indipendente.')+
   (link?' <a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">Apri la fonte</a>':'')+'</p>';
 }
 return '<details class="tp11-field-proof"><summary>Origine dei dati dichiarati ('+entries.length+')</summary>'+
 '<ul>'+entries.map(key=>{
  const p=proof[key];const when=p.observed_at?date(p.observed_at):"data non disponibile";
  return '<li><b>'+esc(names[key])+'</b><span>Letto nella pagina pubblica · '+esc(when)+'</span></li>';
 }).join("")+'</ul><p>La lettura automatica della fonte non conferma identità, disponibilità o correttezza dei dati.</p>'+
 (link?'<a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">Consulta la fonte originale</a>':"")+'</details>';
}
function evidence(a){
 const budget=Number(api()?.getPrefs()?.budget)||700;
 const cls=api()?.classifyListing?.(a)||{status:"review"};
 const price=Number(a.price)||0,knownPrice=price>0;
 const verifiedPrice=knownPrice&&!!a.price_verified_at&&a.verification_level==="owner_confirmed"&&!!a.evidence_url;
 const priceStatus=verifiedPrice?"verified":knownPrice?"claimed":"unknown";
 const priceDescription=knownPrice?money(price)+"/mese · "+(cls.status==="excluded"?"fuori criteri":price<=budget?"nel budget indicato":"oltre budget"):"Canone da chiedere";
 const ownerVerified=a.verification_level==="owner_confirmed"&&a.private_status==="confirmed";
 const ownerClaimed=["source","confirmed","user"].includes(a.private_status);
 const owner=ownerVerified?["Identità documentata dal proprietario","verified"]:
  ownerClaimed?[a.private_status==="user"?"Inserito come privato da te":"Indicazione di privato non confermata","claimed"]:
  ["Proprietario o agenzia da accertare","unknown"];
 const available=a.availability_status==="owner_confirmed"&&a.verification_level==="owner_confirmed";
 const availability=available?["Confermata dal proprietario","verified"]:
  a.availability_status==="source_available"?["Segnalata disponibile dalla fonte","claimed"]:
  a.availability_status==="unavailable"||a.availability_status==="expired"?["Segnalata non disponibile · ricontrolla","claimed"]:
  ["Disponibilità da chiedere","unknown"];
 const n=Number(a.expenses),expense=n>0?[money(n)+"/mese indicati, utenze da chiarire",a.verification_level==="owner_confirmed"&&!!a.evidence_url?"verified":"claimed"]:
  a.expenses&&typeof a.expenses==="string"&&a.expenses.trim()?[a.expenses.slice(0,110),"claimed"]:
  ["Condominio, utenze e altri costi non verificati","unknown"];
 const hasRoute=Number(a.walking_minutes)>0;
 const route=hasRoute&&a.route_checked_at?[Math.round(Number(a.walking_minutes))+" minuti a piedi · calcolato "+date(a.route_checked_at),"verified"]:
  hasRoute?[Math.round(Number(a.walking_minutes))+" minuti dichiarati, percorso da verificare","claimed"]:
  ["Percorso reale non calcolato","unknown"];
 const fresh=a.source_updated||a.published_at;
 const freshness=fresh?["Pubblicazione/aggiornamento fonte: "+date(fresh),"claimed"]:
  ["Data della fonte sconosciuta · rilevato il "+date(a.seen),"unknown"];
 const duplicates=duplicatesAcrossPortals(a);
 const duplicateHTML=duplicates.length?'<details class="tp9-history"><summary>'+duplicates.length+' possibile/i ripubblicazione/i su altri portali</summary>'+
   '<ul>'+duplicates.map(d=>'<li><a href="'+esc(d.url)+'" target="_blank" rel="noopener noreferrer">'+esc(d.source||"Altro portale")+' · '+esc(d.title)+'</a> — stessa via e numero civico, ricontrolla le foto</li>').join("")+'</ul>'+
   '<p>Possibile duplicato, non identità accertata. Confronta le foto e i dettagli; gli annunci restano separati.</p></details>':"";
 const check=a.link_status==="reachable"?"Link raggiungibile al controllo del "+date(a.link_checked_at):
  a.link_status==="missing"?"Link non raggiungibile in almeno due controlli":
  a.link_status==="blocked"?"Controllo limitato dalla fonte: non implica rimozione":
  a.link_status==="error"?"Controllo inconcludente: apri la fonte":
  "Link non ancora controllato";
 return '<div class="tp9-evaluation" aria-label="Scheda di affidabilità"><div class="tp9-proof-heading"><b>Valutazione dell’immobile</b><small>Ordine di verifica consigliato</small></div>'+
  '<ol class="tp9-proof-list">'+
  dataState("1. Prezzo e compatibilità",priceDescription,priceStatus)+
  dataState("2. Proprietario",owner[0],owner[1])+
  dataState("3. Disponibilità",availability[0],availability[1])+
  dataState("4. Spese",expense[0],expense[1])+
  dataState("5. Distanza reale",route[0],route[1])+
  dataState("6. Freschezza",freshness[0],freshness[1])+
  dataState("7. Indirizzo",a.address||"Indirizzo esatto sconosciuto",a.address?"claimed":"unknown")+
  dataState("8. Superficie",Number(a.sqm)>0?String(a.sqm)+" m² dichiarati":"Superficie non comunicata",Number(a.sqm)>0?"claimed":"unknown")+
  '</ol><div class="tp9-link-health '+(a.link_status==="missing"?"tp9-warning":"")+'"><strong>Controllo link</strong><span>'+esc(check)+'</span></div>'+
  duplicateHTML+
  '<details class="tp9-history"><summary>Storico modifiche registrate</summary><div class="tp9-history-content" role="status" aria-live="polite">Apri per caricare lo storico.</div></details>'+
  fieldEvidence(a)+
  '<p class="tp9-proof-legend">Verificato = conferma indipendente documentata; dichiarato = informazione della fonte non confermata indipendentemente; sconosciuto = dato mancante. Link raggiungibile e data di scansione non dimostrano che la casa sia disponibile.</p></div>';
}
async function loadHistory(a,details){
 const node=$(".tp9-history-content",details);
 if(!node||details.dataset.loaded)return;
 details.dataset.loaded="1";
 node.textContent="Lettura dello storico…";
 const c=cfg(),base=String(c.url||"").replace(/\/$/,"");
 if(!base||!c.publishableKey){node.textContent="Storico temporaneamente non disponibile.";return;}
 try{
  const query="listing_url=eq."+encodeURIComponent(a.url)+"&select=observed_at,event_type,changes&order=observed_at.desc&limit=30";
  const resp=await fetch(base+"/rest/v1/turinpipps_listing_history?"+query,
    {headers:{"apikey":c.publishableKey,"Accept":"application/json"},cache:"no-store",signal:AbortSignal.timeout(9500)});
  if(!resp.ok)throw Error("HTTP "+resp.status);
  const data=await resp.json();
  if(!Array.isArray(data))throw Error("Dati non validi");
  if(!data.length){node.textContent="Nessuna variazione successiva all'attivazione dello storico. Non ricostruiamo modifiche non osservate.";return;}
  const events=data.map(e=>{
   const changes=e.changes||{},parts=[];
   for(const [key,label] of [["price","Prezzo"],["expenses","Spese"],["availability_status","Disponibilità"],["verification_level","Verifica"],["private_status","Inserzionista"],["link_status","Link"],["title","Titolo"]]){
    if(changes[key]!==undefined){const v=changes[key];parts.push(label+": "+(v&&typeof v==="object"&&"to" in v?String(v.from||"—")+" → "+String(v.to||"—"):String(v)));}
   }
   if(changes.description_updated)parts.push("Descrizione modificata");
   if(e.event_type==="discovered")parts.push("Primo inserimento nell’archivio");
   return '<li><time>'+esc(date(e.observed_at))+'</time> · '+esc(parts.join(" · ")||"Aggiornamento rilevato")+'</li>';
  });
  node.innerHTML="<ul>"+events.join("")+"</ul>";
 }catch(_){details.dataset.loaded="";node.textContent="Impossibile caricare lo storico. Riprova aprendo di nuovo.";}
}
function enhanceCards(){
 if(!api()?.getListings)return;
 const byUrl=new Map(api().getListings().map(a=>[a.url,a]));
 document.querySelectorAll(".listing").forEach(article=>{
  if($(".tp9-evaluation",article))return;
  const btn=article.querySelector('[data-action="save"][data-url]');if(!btn)return;
  const a=byUrl.get(btn.dataset.url);if(!a)return;
  const holder=document.createElement("div");holder.innerHTML=evidence(a);
  const proof=holder.firstElementChild;
  const details=$(".tp-card-details",article);
  if(article.classList.contains("tp18-listing")){
   const anchor=$(".tp18-tools-anchor",article);
   if(anchor)anchor.before(proof);
  }else if(details)details.before(proof);else $(".body",article)?.appendChild(proof);
  proof?.querySelector(".tp9-history")?.addEventListener("toggle",e=>{if(e.currentTarget.open)loadHistory(a,e.currentTarget)});
 });
}
function addPublicLinks(){
 if($("#tp9-global-footer"))return;
 const main=$("main.content");if(!main)return;
 const el=document.createElement("footer");el.id="tp9-global-footer";
 el.innerHTML='<span>TurinPipps · Progetto indipendente. Nessuna affiliazione con i portali di annunci.</span>'+
  '<nav aria-label="Informazioni legali e assistenza"><a href="./informazioni.html#come-funziona">Come funziona</a><a href="./informazioni.html#faq">FAQ</a><a href="./informazioni.html#assistenza">Assistenza</a><a href="./informazioni.html#privacy">Privacy</a><a href="./informazioni.html#termini">Condizioni</a></nav>';
 main.appendChild(el);
}
async function privacyRequest(action,payload={},overrideToken=null){
 const c=cfg(),token=overrideToken||await auth()?.getAccessToken?.();
 if(!token||!c.url||!c.publishableKey)throw Error("Accedi al tuo account per continuare.");
 const r=await fetch(c.url.replace(/\/$/,"")+"/functions/v1/turinpipps-privacy",{
  method:"POST",headers:{"Authorization":"Bearer "+token,"apikey":c.publishableKey,"Content-Type":"application/json"},
  body:JSON.stringify({action,...payload}),signal:AbortSignal.timeout(25000),cache:"no-store"
 });
 const answer=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(answer.error||"Operazione non completata.");
 return answer;
}
function downloadJson(json){
 const data=JSON.stringify(json,null,2),blob=new Blob([data],{type:"application/json;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;
 a.download="turinpipps-dati-personali-"+new Date().toISOString().slice(0,10)+".json";
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function deleteDialog(){
 let modal=$("#tp9-delete-dialog");
 if(modal)return modal;
 modal=document.createElement("dialog");modal.id="tp9-delete-dialog";modal.setAttribute("aria-labelledby","tp9-delete-title");
 modal.innerHTML='<form method="dialog" id="tp9-delete-form"><h2 id="tp9-delete-title">Elimina definitivamente l’account</h2>'+
 '<p>Tutti i dati personali associati all’account saranno cancellati dal servizio. L’operazione non è reversibile. Puoi prima esportare i tuoi dati.</p>'+
 '<label>Email dell’account<input id="tp9-delete-email" type="email" required autocomplete="email"></label>'+
 '<label>Password attuale<input id="tp9-delete-password" type="password" required autocomplete="current-password"></label>'+
 '<label>Scrivi ELIMINA IL MIO ACCOUNT<input id="tp9-delete-confirm" type="text" required autocomplete="off" placeholder="ELIMINA IL MIO ACCOUNT"></label>'+
 '<p id="tp9-delete-message" role="alert"></p><div class="tp9-dialog-actions"><button class="button" type="button" id="tp9-delete-cancel">Annulla</button>'+
 '<button class="button tp9-danger" type="submit" id="tp9-delete-submit">Elimina account e dati</button></div></form>';
 document.body.appendChild(modal);
 $("#tp9-delete-cancel",modal).addEventListener("click",()=>modal.close());
 $("#tp9-delete-form",modal).addEventListener("submit",async ev=>{
  ev.preventDefault();
  const current=auth()?.getCurrentUser?.();
  const msg=$("#tp9-delete-message",modal),submit=$("#tp9-delete-submit",modal);
  const email=$("#tp9-delete-email",modal).value.trim();
  const password=$("#tp9-delete-password",modal).value;
  const confirm=$("#tp9-delete-confirm",modal).value;
  if(!current||email.toLowerCase()!==String(current.email||"").toLowerCase()||confirm!=="ELIMINA IL MIO ACCOUNT"){
   msg.textContent="Email o frase di conferma non corretta.";return;
  }
  if(!window.confirm("Confermi la cancellazione definitiva di TurinPipps e dei tuoi dati personali?"))return;
  submit.disabled=true;msg.textContent="Verifica dell'identità e cancellazione in corso…";
  try{
   const token=await auth().reauthenticate(password);
   const result=await privacyRequest("delete",{email,confirm},token);
   if(!result.deleted)throw Error("Cancellazione non confermata dal server");
   localStorage.removeItem("turinpipps.v1");
   localStorage.removeItem("casaradar.v3");
   try{await auth().finishErasure()}catch(_){}
   window.location.reload();
  }catch(error){msg.textContent=error.message||"Cancellazione non riuscita";submit.disabled=false}
 });
 return modal;
}
function addProfilePrivacy(){
 const root=$("#view-profile");if(!root||$("#tp9-profile-privacy"))return;
 const block=document.createElement("section");block.id="tp9-profile-privacy";
 block.innerHTML='<h3>Privacy e dati personali</h3><p>Scarica tutti i dati del tuo account o richiedi la cancellazione definitiva. Le operazioni richiedono l’accesso.</p>'+
 '<div class="tp9-account-actions"><button class="button" id="tp9-export-account" type="button">Esporta i miei dati (JSON)</button>'+
 '<button class="button tp9-danger-outline" id="tp9-delete-account" type="button">Elimina account</button></div>'+
 '<p id="tp9-privacy-status" role="status" aria-live="polite"></p>'+
 '<a href="./informazioni.html#privacy">Consulta l’informativa privacy</a>';
 root.appendChild(block);
 $("#tp9-export-account").addEventListener("click",async e=>{
  const btn=e.currentTarget,msg=$("#tp9-privacy-status");
  if(!auth()?.isSignedIn?.()){auth()?.open?.();return;}
  btn.disabled=true;msg.textContent="Preparazione del file personale…";
  try{const data=await privacyRequest("export");downloadJson(data);msg.textContent="Esportazione completata: controlla il file scaricato."}
  catch(error){msg.textContent=error.message||"Esportazione non riuscita"}
  finally{btn.disabled=false}
 });
 $("#tp9-delete-account").addEventListener("click",()=>{
  if(!auth()?.isSignedIn?.()){auth()?.open?.();return;}
  const dialog=deleteDialog();$("#tp9-delete-message",dialog).textContent="";
  $("#tp9-delete-password",dialog).value="";$("#tp9-delete-confirm",dialog).value="";
  $("#tp9-delete-email",dialog).value=auth()?.getCurrentUser?.()?.email||"";
  dialog.showModal();
 });
}
function initialize(){
 addPublicLinks();addProfilePrivacy();enhanceCards();
 const hosts=["#list","#saved-list","#tp-home-list"];
 hosts.forEach(id=>{const root=$(id);if(root)new MutationObserver(enhanceCards).observe(root,{childList:true})});
 window.addEventListener("turinpipps:ready",()=>{enhanceCards();addProfilePrivacy()});
 window.addEventListener("turinpipps:account-ready",()=>{enhanceCards();addProfilePrivacy()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();