/* TurinPipps · Organizza */
(function(){
"use strict";
const el=id=>document.getElementById(id);
const escapeHtml=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const stages=[["saved","Da contattare","Case salvate da valutare"],["contact","In contatto","Proprietari già contattati"],["visits","Visite","Appuntamenti e valutazioni"],["decisions","Decisioni","Trattative e case scelte"]];
const decisions=[["valutazione","In valutazione"],["trattativa","In trattativa"],["scelto","Scelto"],["scartato","Scartato"]];
function context(){
 let api=window.TurinPippsUXV3;
 if(!api||!api.getListings||!api.getPrefs)return null;
 let prefs=api.getPrefs();return {rows:api.getListings(),prefs,flags:prefs.flags||{}};
}
function flag(c,url){return c.flags[url]||{}}
function visitDate(s){let d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString("it-IT",{dateStyle:"short",timeStyle:"short"}):"Da definire"}
function group(c){
 let groups={saved:[],contact:[],visits:[],decisions:[]};
 let tracked=c.rows.filter(a=>{let f=flag(c,a.url);return !!(f.saved||f.contact||f.discard||f.visitStatus&&f.visitStatus!=="non_programmata"||f.decisionStatus&&f.decisionStatus!=="valutazione")});
 tracked.forEach(a=>{
  let f=flag(c,a.url);
  let status=f.discard||f.decisionStatus&&f.decisionStatus!=="valutazione"?"decisions":f.visitStatus&&f.visitStatus!=="non_programmata"?"visits":f.contact?"contact":"saved";
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
 let summary='<div class="tp7-summary"><div class="tp7-metrics">'+metrics.map(m=>'<div><strong>'+m[0]+'</strong><span>'+m[1]+'</span></div>').join("")+'</div>'+
 '<div class="tp7-next"><small>PROSSIMA AZIONE</small>'+
 (first?'<strong>'+escapeHtml(first.title)+'</strong><span>'+escapeHtml(visitDate(flag(c,first.url).visitAt))+'</span><button class="button" data-tp7-ics="'+escapeHtml(first.url)+'">Aggiungi al calendario</button>':
 '<strong>Salva un appartamento</strong><span>Il percorso inizia dai preferiti e prosegue con contatto, visita e decisione.</span><button class="button primary" data-nav="results">Cerca casa</button>')+'</div></div>';
 let cols=stages.map(s=>'<section class="tp7-stage"><header><b>'+s[1]+'</b><span>'+groups[s[0]].length+'</span></header><p>'+s[2]+'</p><div class="tp7-list">'+
 (groups[s[0]].map(a=>card(a,c,s[0])).join("")||'<div class="tp7-empty">Nessuna casa in questa fase. Usa le azioni sulle schede per avanzare.</div>')+'</div></section>').join("");
 node.innerHTML=summary+'<div class="tp7-board">'+cols+'</div><div class="tp7-guide"><b>La tua ricerca, ordinata</b><p>Salva un immobile, registra il contatto, organizza la visita e scegli l’esito. Le modifiche sono sincronizzate con l’account quando effettui l’accesso.</p><button class="button" data-nav="saved">Apri i preferiti</button></div>';
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
  c.flags[url]=next;localStorage.setItem("turinpipps.v1",JSON.stringify(c.prefs));render(el("tp-visits-content"));
 }catch(error){select.value=previous.decisionStatus||"valutazione";alert("Salvataggio non riuscito: "+error.message)}
 finally{select.disabled=false}
});
window.TurinPippsOrganize={render};
})();