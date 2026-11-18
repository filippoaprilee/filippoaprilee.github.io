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
 let c=context();if(!node||!c)return;
 let {groups,tracked}=group(c);
 let future=tracked.filter(a=>{
  let f=flag(c,a.url);return f.visitStatus==="programmata"&&Date.parse(f.visitAt)>Date.now()
 }).sort((a,b)=>Date.parse(flag(c,a.url).visitAt)-Date.parse(flag(c,b.url).visitAt));
 let contactCount=tracked.filter(a=>flag(c,a.url).contact).length;
 let metrics=[[tracked.length,"Case seguite"],[contactCount,"Contatti"],[future.length,"Visite future"],[groups.decisions.length,"Decisioni"]];
 let first=future[0];
 // Never suggest restarting from zero when the user already has a contact or reply.
 let step;
 if(first)step={title:first.title,text:"Prossima visita: "+visitDate(flag(c,first.url).visitAt),label:"Aggiungi al calendario",attr:'data-tp7-ics="'+escapeHtml(first.url)+'"'};
 else if(groups.replies.length)step={title:"Hai una risposta da gestire",text:groups.replies.length+" "+(groups.replies.length===1?"contatto richiede":"contatti richiedono")+" un seguito. Puoi annotare le condizioni o valutare una visita.",label:"Apri risposte",attr:'data-tp7-jump="replies"'};
 else if(groups.saved.length)step={title:"Valuta le case salvate",text:groups.saved.length+" "+(groups.saved.length===1?"casa è pronta":"case sono pronte")+" per controllare costi e proprietario prima di contattare.",label:"Vedi case da contattare",attr:'data-tp7-jump="saved"'};
 else if(groups.contact.length)step={title:"Contatto in attesa di risposta",text:"Hai già contattato "+groups.contact.length+" "+(groups.contact.length===1?"inserzionista.":"inserzionisti.")+" Segna la risposta quando arriva, senza ricominciare dai salvati.",label:"Apri contatti",attr:'data-tp7-jump="contact"'};
 else if(groups.decisions.length||groups.visits.length)step={title:"Rivedi le tue case",text:"Hai già immobili nel percorso. Consulta appuntamenti ed esiti per decidere il prossimo passo.",label:"Apri il percorso",attr:'data-tp7-jump="'+(groups.visits.length?"visits":"decisions")+'"'};
 else step={title:"Inizia dalla ricerca",text:"Trova una casa, salvala e poi segui contatto, risposta e visita. Non devi compilare tutto subito.",label:"Esplora immobili",attr:'data-nav="results"'};
 let summary='<div class="tp7-summary"><div class="tp7-metrics">'+metrics.map(m=>'<div><strong>'+m[0]+'</strong><span>'+m[1]+'</span></div>').join("")+'</div>'+
 '<div class="tp7-next"><small>IL PROSSIMO PASSO</small><strong>'+escapeHtml(step.title)+'</strong><span>'+
 escapeHtml(step.text)+'</span><button type="button" class="button primary" '+step.attr+'>'+escapeHtml(step.label)+'</button></div></div>';
 // Active stages first; empty phases remain available, but condensed.
 const active=stages.filter(x=>groups[x[0]].length),empty=stages.filter(x=>!groups[x[0]].length);
 let cols=active.map(x=>'<section class="tp7-stage tp13-stage-active" data-tp7-stage="'+x[0]+'"><header><b>'+x[1]+'</b><span>'+groups[x[0]].length+'</span></header><p>'+x[2]+'</p><div class="tp7-list">'+groups[x[0]].map(a=>card(a,c,x[0])).join("")+'</div></section>').join("")+
 empty.map(x=>'<details class="tp7-stage tp13-stage-empty" data-tp7-stage="'+x[0]+'"><summary><strong>'+x[1]+'</strong><span>0</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary><p>'+x[2]+'</p><div class="tp7-empty">Non ci sono ancora immobili in questa fase.</div></details>').join("");
 node.innerHTML=summary+'<div class="tp7-board">'+cols+'</div><div class="tp7-guide"><b>Un percorso semplice</b><p>Da contattare → Risposta → Visita → Decisione. Le fasi con zero immobili sono ridotte per lasciare spazio a quelle attive.</p><button class="button" data-nav="results">Cerca altri immobili</button></div>';
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