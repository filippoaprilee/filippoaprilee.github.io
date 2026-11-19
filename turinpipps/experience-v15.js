/* TurinPipps v15: accessible three-step rental journey and focused account UI.
 * Enhances existing elements in place; never duplicates action handlers or user data.
 */
(function(){
"use strict";
const $=(sel,root=document)=>root.querySelector(sel);
const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
let scheduled=false,started=false;
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
  const title=$("h1",heading),eyebrow=$(".tp-v5-kicker",heading),desc=$("p",heading);
  if(title)title.textContent="Account";
  if(eyebrow)eyebrow.textContent="IL TUO ACCOUNT";
  if(desc)desc.textContent="Accesso, notifiche e dati personali. Le preferenze della ricerca sono in una sezione separata.";
 }
 const theme=$(".tp12-theme-settings",view);if(theme)theme.remove();
 const body=$("#tp-v5-profile-body");
 if(body&&$(".tp-v5-identity",body)&&!$(".tp15-account-notifications",body)){
  const identity=$(".tp-v5-identity",body),links=$(".tp-v5-account-links",body);
  if(links){
   links.classList.add("tp15-profile-shortcuts");
   const search=links.querySelector('[data-nav="settings"]');
   if(search)search.textContent="Preferenze di ricerca";
   identity.after(links);
  }
  const details=document.createElement("details");details.className="tp15-account-notifications";
  details.innerHTML='<summary><span><i class="fa-regular fa-bell" aria-hidden="true"></i>'+
    '<b>Notifiche e riepiloghi</b><small>Email sulle case, aggiornamenti e dispositivi</small></span>'+
    '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>'+
    '<div class="tp15-account-notifications-body"></div>';
  const content=$(".tp15-account-notifications-body",details);
  Array.from(body.children).filter(n=>n!==identity&&n!==links).forEach(n=>content.append(n));
  body.append(details);
 }
 const install=$(".tp-v5-quick-install",view);
 if(install&&!install.closest(".tp15-profile-collapse")){
  const fold=document.createElement("details");fold.className="tp15-profile-collapse tp15-install";
  fold.innerHTML='<summary><span><i class="fa-solid fa-mobile-screen-button" aria-hidden="true"></i>'+
   '<b>Installazione e accesso rapido</b><small>Utilizzo su iPhone e collegamenti</small></span>'+
   '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>';
  install.before(fold);fold.append(install);
 }
 const privacy=$("#tp9-profile-privacy");
 if(privacy&&!privacy.closest(".tp15-profile-collapse")){
  const fold=document.createElement("details");fold.className="tp15-profile-collapse tp15-privacy";
  fold.innerHTML='<summary><span><i class="fa-solid fa-shield-halved" aria-hidden="true"></i>'+
    '<b>Privacy e dati personali</b><small>Esporta o elimina il tuo account</small></span>'+
    '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>';
  privacy.before(fold);fold.append(privacy);
  const h=$("h3",privacy);if(h)h.classList.add("tp15-hidden-duplicate-title");
 }
 const settings=$("#view-settings");
 if(settings){
  const title=$(".section-heading h2",settings),p=$(".section-heading p",settings);
  if(title)title.textContent="Preferenze di ricerca";
  if(p)p.textContent="Budget, quartieri e tipologia. Le notifiche e i dati dell’account si gestiscono in Profilo.";
 }
}
function journey(){
 const home=$("#view-home");
 if(!home||$("#tp15-journey"))return;
 const navigation=document.createElement("nav");
 navigation.id="tp15-journey";navigation.className="tp15-journey";
 navigation.setAttribute("aria-label","Le tre tappe per trovare casa");
 navigation.innerHTML='<button type="button" data-nav="results"><span>1</span> Trova una casa</button>'+
 '<button type="button" data-nav="compare"><span>2</span> Confronta</button>'+
 '<button type="button" data-nav="visits"><span>3</span> Contatta e visita</button>';
 const heading=$(".tp10-home-head",home);
 if(heading)heading.after(navigation);
 else home.prepend(navigation);
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