/* TurinPipps 14: release notes are public; delivery is strictly user-opt-in.
 * Never request notification permission automatically or from a lifecycle event.
 */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const origin=window.location.origin;
let latest=null;
function readRelease(){
 return fetch("./release.json",{cache:"no-store",headers:{Accept:"application/json"}})
 .then(async r=>r.ok?await r.json():null)
 .then(j=>{
   if(!j||!/^[1-9]\d*\.\d+\.\d+$/.test(String(j.version||"")))return null;
   const text=String(j.title||"").trim();
   const highlights=Array.isArray(j.highlights)?j.highlights.filter(s=>typeof s==="string").slice(0,5):[];
   latest={version:String(j.version),title:text.slice(0,150),summary:String(j.summary||"").slice(0,400),highlights};
   renderNotes();
   return latest;
 }).catch(()=>null);
}
function renderNotes(){
 const view=$("#view-notifications");
 if(!view||!latest)return;
 let card=$("#tp14-release-notes");
 if(!card){
  card=document.createElement("section");
  card.id="tp14-release-notes";card.className="tp14-release-notes";
  view.append(card);
 }
 card.innerHTML='<div class="tp14-notes-head"><div><span class="tp14-eyebrow">NOVITÀ DELL’APP · v'+esc(latest.version)+'</span>'+
 '<h2>'+esc(latest.title)+'</h2><p>'+esc(latest.summary)+'</p></div></div>'+
 (latest.highlights.length?'<details><summary>Che cosa è cambiato <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>'+
 '<ul>'+latest.highlights.map(s=>'<li>'+esc(s)+'</li>').join("")+'</ul></details>':'')+
 '<div class="tp14-notes-footer"><span>Vuoi ricevere queste novità automaticamente?</span>'+
 '<button type="button" class="button" data-nav="profile">Scegli email o push</button></div>';
}
function improveNotifications(){
 const view=$("#view-notifications");if(!view)return;
 const title=$(".tp-v5-screen-header h1",view);if(title)title.textContent="Notifiche e novità";
 const intro=$(".tp-v5-screen-header p",view);
 if(intro)intro.textContent="Avvisi sugli immobili e aggiornamenti dell’app, con preferenze separate e modificabili.";
 const btn=$("#tp-v5-push-enable");
 if(btn){btn.textContent="Attiva push sul dispositivo";btn.setAttribute("aria-describedby","tp14-ios-instructions");}
 const note=$("#tp14-ios-instructions");
 if(!note){
  const explanation=document.createElement("p");explanation.id="tp14-ios-instructions";explanation.className="tp14-ios-instructions";
  explanation.textContent="Su iPhone, apri TurinPipps dalla schermata Home. Il permesso viene richiesto solo quando tocchi Attiva push.";
  const status=$("#tp-v5-push-message");if(status)status.before(explanation);
 }
}
function inviteNewAccount(){ /* La scelta facoltativa è sempre accessibile in Notifiche; nessun banner sulla Home. */ }
function init(){improveNotifications();readRelease();inviteNewAccount();}
window.TurinPippsV14={readRelease,renderNotes};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.addEventListener("turinpipps:ready",()=>{improveNotifications();inviteNewAccount()});
window.addEventListener("turinpipps:profile-loaded",inviteNewAccount);
})();