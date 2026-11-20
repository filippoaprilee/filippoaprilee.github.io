/* TurinPipps v15: accessible three-step rental journey and focused account UI.
 * Enhances existing elements in place; never duplicates action handlers or user data.
 */
(function(){
"use strict";
const $=(sel,root=document)=>root.querySelector(sel);
const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
let scheduled=false,started=false;
const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value};
function header(){
 const top=$(".topline .top-actions"),old=$("#tp-account-button");
 if(!top||$("#tp15-settings-trigger"))return;
 const btn=document.createElement("button");
 btn.type="button";btn.id="tp15-settings-trigger";btn.className="tp15-header-settings";
 btn.dataset.nav="settings";btn.setAttribute("aria-label","Preferenze della ricerca");
 btn.title="Preferenze della ricerca";
 btn.innerHTML='<i class="fa-solid fa-sliders" aria-hidden="true"></i>';
 if(old&&old.parentElement===top)top.insertBefore(btn,old);
 else top.append(btn);
 if(old)old.setAttribute("aria-label","Accedi o gestisci l’accesso");
}
function card(article){
 if(article.classList.contains("tp15-card")||!article.classList.contains("tp12-card"))return;
 const body=$(".body",article),banner=$(".listing-banner",article),price=$(".price",banner||article),
  micro=$(".micro",body||article),title=$("h3",body||article);
 if(!body||!price||!micro||!title)return;
 article.classList.add("tp15-card");
 const line=document.createElement("div");line.className="tp15-card-topline";
 body.prepend(line);line.append(micro,price);
 banner?.classList.add("tp15-retired-banner");
 const details=$(".tp-card-details",article),expanded=$(".tp-card-expanded",details||article),
  essentials=$(".tp-card-essentials",body);
 if(expanded&&essentials){
  const wrapper=document.createElement("div");
  wrapper.className="tp15-detailed-costs";
  expanded.prepend(wrapper);wrapper.append(essentials);
 }
 const heading=$("summary",details||article);
 if(heading)heading.textContent="Descrizione, spese e dati originali";
 const provenance=$("summary",$(".tp10-evidence",article)||article);
 if(provenance)provenance.setAttribute("aria-label","Apri verifiche e provenienza della fonte");
}
function cards(){
 $$(".listing.tp12-card").forEach(card);
}
function account(){
 const view=$("#view-profile");if(!view)return;
 const heading=$(".tp-v5-screen-header",view);
 if(heading){
  setText($("h1",heading),"Il tuo account");
  setText($(".tp-v5-kicker",heading),"ACCOUNT E SICUREZZA");
  setText($("p",heading),"Gestisci identità, credenziali e dati personali. Preferenze e notifiche hanno sezioni dedicate.");
 }
 const hub=$("#tp8-account-hub");if(hub)hub.remove();
 const privacy=$("#tp9-profile-privacy");
 if(privacy){
  privacy.classList.add("tp17-privacy-section");
  setText($("h3",privacy),"Privacy e dati personali");
 }
 const settings=$("#view-settings");
 if(settings){
  setText($(".section-heading h2",settings),"Preferenze di ricerca");
  setText($(".section-heading p",settings),"Budget, zone e criteri: tutte le scelte relative alla casa sono qui.");
 }
}
function journey(){
 const existing=$("#tp15-journey");
 if(existing)existing.remove();
}
function refresh(){
 scheduled=false;
 header();account();journey();cards();
}
function schedule(){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(refresh);
}
function init(){
 if(started)return;started=true;
 refresh();
 for(const selector of ["#list","#saved-list","#tp-home-list","#view-profile"]){
  const root=$(selector);
  if(root)new MutationObserver(schedule).observe(root,{subtree:true,childList:true});
 }
 window.addEventListener("turinpipps:account-ready",schedule);
 window.addEventListener("turinpipps:profile-loaded",schedule);
 window.addEventListener("turinpipps:ready",schedule);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.TurinPippsV15={refresh:schedule};
})();