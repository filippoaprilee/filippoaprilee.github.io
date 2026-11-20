/* TurinPipps · Organizza */
(function(){
"use strict";
const el=id=>document.getElementById(id);
const escapeHtml=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const stages=[["saved","Da contattare","Case salvate da valutare"],["contact","In attesa di risposta","Messaggi inviati, risposta da ricevere"],["replies","Risposta ricevuta","Contatti a cui dare seguito"],["visits","Visite","Appuntamenti e valutazioni"],["decisions","Decisioni","Trattative e case scelte"]];
const decisions=[["valutazione","In valutazione"],["trattativa","In trattativa"],["scelto","Scelto"],["scartato","Scartato"]];
function context(){
 let api=window.TurinPippsUXV3;
 if(!api||!api.getListings||!api.getPrefs)return null;
 let prefs=api.getPrefs();return {rows:api.getListings(),prefs,flags:prefs.flags||{}};
}
function flag(c,url){return c.flags[url]||{}}
function visitDate(s){let d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString("it-IT",{dateStyle:"short",timeStyle:"short"}):"Da definire"}
function group(c){
 let groups={saved:[],contact:[],replies:[],visits:[],decisions:[]};
 let tracked=c.rows.filter(a=>{let f=flag(c,a.url);return !!(f.saved||f.contact||f.replyReceived||f.discard||f.visitStatus&&f.visitStatus!=="non_programmata"||f.decisionStatus&&f.decisionStatus!=="valutazione")});
 tracked.forEach(a=>{
  let f=flag(c,a.url);
  let status=f.discard||f.decisionStatus&&f.decisionStatus!=="valutazione"?"decisions":f.visitStatus&&f.visitStatus!=="non_programmata"?"visits":f.replyReceived?"replies":f.contact?"contact":"saved";
  groups[status].push(a);
 });
 return {groups,tracked};
}
function card(a,c,stage){
 let f=flag(c,a.url),price=Number(a.price)>0?Number(a.price).toLocaleString("it-IT")+" €/mese":"Canone da verificare";
 let status=f.discard?"scartato":f.decisionStatus||"valutazione";
 return '<article class="tp7-item"><div class="tp7-item-meta"><span>'+escapeHtml(a.zone||"Zona da verificare")+'</span><b>'+price+'</b></div>'+
 '<a class="tp7-item-title" href="'+escapeHtml(a.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(a.title)+'</a>'+
 (f.visitAt?'<small>Visita: '+escapeHtml(visitDate(f.visitAt))+'</small>':"")+
 (f.notes?'<p>'+escapeHtml(String(f.notes).slice(0,110))+'</p>':"")+
 '<div class="tp7-actions">'+
 '<button type="button" class="button" data-action="'+(stage==="saved"?"contact":"visit")+'" data-url="'+escapeHtml(a.url)+'">'+(stage==="saved"?"Segna contattato":"Programma visita")+'</button>'+
 '<button type="button" class="button" data-action="note" data-url="'+escapeHtml(a.url)+'">Note</button>'+
 (f.visitAt?'<button type="button" class="button" data-tp7-ics="'+escapeHtml(a.url)+'">Calendario</button>':"")+'</div>'+
 '<label class="tp7-decision-label">Esito<select data-tp7-status="'+escapeHtml(a.url)+'">'+
 decisions.map(d=>'<option value="'+d[0]+'"'+(d[0]===status?" selected":"")+'>'+d[1]+'</option>').join("")+'</select></label></article>';
}
function render(node){
 const c=context();if(!node||!c)return;
 const {groups,tracked}=group(c);
 const future=tracked.filter(a=>{const f=flag(c,a.url);return f.visitStatus==="programmata"&&Date.parse(f.visitAt)>Date.now()})
  .sort((a,b)=>Date.parse(flag(c,a.url).visitAt)-Date.parse(flag(c,b.url).visitAt));
 const contactCount=tracked.filter(a=>flag(c,a.url).contact).length;
 const replies=groups.replies.length,ready=groups.saved.length;
 const active=stages.filter(stage=>groups[stage[0]].length>0);
 if(!tracked.length){
  node.innerHTML='<section class="tp20-journey-empty tp21-journey-empty">'+
   '<div class="tp21-journey-icon" aria-hidden="true"><i class="fa-regular fa-calendar-check"></i></div>'+
   '<div class="tp21-journey-copy"><span class="tp17-eyebrow">IL TUO PERCORSO</span>'+
   '<h2>La tua prossima visita parte da una casa.</h2>'+
   '<p>Quando scegli un immobile, salvalo o registra un contatto. Qui ritroverai risposte, appuntamenti e note, senza dover gestire sezioni vuote.</p>'+
   '<button type="button" class="button primary" data-nav="results">Esplora gli annunci <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>'+
   '<div class="tp21-journey-steps" aria-label="Come funziona"><span><b>01</b> Salva</span><span><b>02</b> Contatta</span><span><b>03</b> Visita</span></div></div>'+
   '</section>';
  return;
 }
 let step;
 if(future.length)step={heading:"Hai una visita in programma",description:"Prossimo appuntamento: "+visitDate(flag(c,future[0].url).visitAt),label:"Aggiungi al calendario",attribute:'data-tp7-ics="'+escapeHtml(future[0].url)+'"'};
 else if(replies)step={heading:"Rispondi ai contatti",description:replies+(replies===1?" risposta da valutare":" risposte da valutare")+". Controlla le condizioni e valuta una visita.",label:"Vai alle risposte",attribute:'data-tp7-jump="replies"'};
 else if(groups.contact.length)step={heading:"Controlla i contatti aperti",description:groups.contact.length+(groups.contact.length===1?" inserzionista contattato":" inserzionisti contattati")+". Segna le risposte quando arrivano.",label:"Apri i contatti",attribute:'data-tp7-jump="contact"'};
 else if(ready)step={heading:"Hai case da valutare",description:"Confronta costi, inserzionista e disponibilità prima di prendere contatto.",label:"Apri i salvati",attribute:'data-tp7-jump="saved"'};
 else step={heading:"Rivedi gli appuntamenti",description:"Tieni traccia di visite, decisioni e note delle case già valutate.",label:"Vai al percorso",attribute:'data-tp7-jump="'+(groups.visits.length?"visits":"decisions")+'"'};
 const metrics='<div class="tp18-journey-numbers" role="group" aria-label="Stato del percorso">'+
  '<span><b>'+tracked.length+'</b> '+(tracked.length===1?'casa seguita':'case seguite')+'</span>'+
  '<span><b>'+contactCount+'</b> '+(contactCount===1?'contatto':'contatti')+'</span>'+
  '<span><b>'+future.length+'</b> '+(future.length===1?'visita prevista':'visite previste')+'</span></div>';
 const next='<section class="tp18-journey-next"><div><span class="tp17-eyebrow">DA FARE ORA</span>'+
  '<h2>'+escapeHtml(step.heading)+'</h2><p>'+escapeHtml(step.description)+'</p></div>'+
  '<button type="button" class="button primary" '+step.attribute+'>'+escapeHtml(step.label)+'</button></section>';
 const sections=active.map(stage=>{
  const list=groups[stage[0]];
  return '<section class="tp7-stage tp18-stage" data-tp7-stage="'+stage[0]+'">'+
   '<header><h3>'+escapeHtml(stage[1])+'</h3><span>'+list.length+'</span></header>'+
   '<div class="tp18-stage-list">'+list.map(a=>card(a,c,stage[0])).join("")+'</div></section>';
 }).join("");
 const remaining=stages.filter(stage=>!groups[stage[0]].length);
 const phases=remaining.length?'<details class="tp18-empty-phases"><summary>Mostra le fasi senza immobili ('+remaining.length+')</summary>'+
  '<p>'+remaining.map(s=>escapeHtml(s[1])).join(' · ')+'</p></details>':'';
 node.innerHTML='<div class="tp18-journey-header">'+metrics+next+'</div>'+
  '<div class="tp18-active-stages">'+sections+'</div>'+phases;
}

function ics(url){
 const c=context();if(!c)return;
 const a=c.rows.find(x=>x.url===url);if(!a)return;
 const d=new Date(flag(c,url).visitAt||"");
 if(!Number.isFinite(d.getTime())){alert("Programma prima una visita.");return}
 const fmt=d=>d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
 const text=x=>String(x).replace(/[\r\n;,]/g," ").slice(0,150);
 const body=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//TurinPipps//IT","BEGIN:VEVENT",
 "UID:tp-"+d.getTime()+"@turinpipps","DTSTAMP:"+fmt(new Date()),"DTSTART:"+fmt(d),
 "DTEND:"+fmt(new Date(d.getTime()+3600000)),"SUMMARY:"+text("Visita casa "+a.title),
 "DESCRIPTION:"+text(a.url),"END:VEVENT","END:VCALENDAR"].join("\r\n");
 const target=URL.createObjectURL(new Blob([body],{type:"text/calendar"}));
 const link=document.createElement("a");link.href=target;link.download="visita-turinpipps.ics";
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(target),1200);
}
document.addEventListener("click",e=>{
 const jump=e.target.closest("[data-tp7-jump]");
 if(jump){
  const stage=el("tp-visits-content")?.querySelector('[data-tp7-stage="'+jump.dataset.tp7Jump+'"]');
  if(stage){if(stage.tagName==="DETAILS")stage.open=true;stage.scrollIntoView({behavior:"auto",block:"start"});stage.querySelector("a,button,summary")?.focus({preventScroll:true});}
  return;
 }
 const t=e.target.closest("[data-tp7-ics]");if(t){e.preventDefault();ics(t.dataset.tp7Ics)}
});
document.addEventListener("change",async e=>{
 const select=e.target.closest("[data-tp7-status]");if(!select)return;
 const c=context();if(!c)return;
 const url=select.dataset.tp7Status,value=select.value;
 if(!decisions.some(d=>d[0]===value))return;
 const previous=Object.assign({},flag(c,url)),next=Object.assign({},previous,{decisionStatus:value,discard:value==="scartato"});
 select.disabled=true;
 try{
  if(window.TurinPippsAuth&&window.TurinPippsAuth.isSignedIn()){
   if(await window.TurinPippsAuth.saveFlag(url,next)!==true)throw Error("Il server non ha confermato il salvataggio");
  }
  c.flags[url]=next;try{localStorage.setItem("turinpipps.v1",JSON.stringify(c.prefs))}catch(_){}
  if(window.TurinPippsUXV3&&window.TurinPippsUXV3.refresh)window.TurinPippsUXV3.refresh();
  render(el("tp-visits-content"));
 }catch(error){select.value=previous.decisionStatus||"valutazione";alert("Salvataggio non riuscito: "+error.message)}
 finally{select.disabled=false}
});
window.TurinPippsOrganize={render};
})();