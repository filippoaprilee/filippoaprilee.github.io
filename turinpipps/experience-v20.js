/* TurinPipps v20: focused settings and safe mobile actions.
   Presentation only: existing persistence and event handlers remain authoritative. */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
function notificationTabs(){
 const view=$("#view-notifications"),layout=$(".tp17-notification-layout",view||document);
 if(!view||!layout||$("#tp20-notification-tabs"))return;
 const keys=[
  ["inbox","Attività",".tp17-inbox-section"],
  ["preferences","Preferenze",".tp17-preferences-section"],
  ["device","Dispositivi",".tp17-device-section"]
 ];
 const menu=document.createElement("div");
 menu.id="tp20-notification-tabs";menu.className="tp20-notification-tabs";
 menu.setAttribute("role","tablist");menu.setAttribute("aria-label","Sezioni delle notifiche");
 keys.forEach(([key,label,selector],i)=>{
  const panel=$(selector,layout);if(!panel)return;
  panel.classList.add("tp20-notification-panel");
  panel.dataset.tp20Panel=key;
  panel.id=panel.id||"tp20-panel-"+key;
  panel.setAttribute("role","tabpanel");
  panel.setAttribute("aria-labelledby","tp20-tab-"+key);
  const button=document.createElement("button");
  button.type="button";button.id="tp20-tab-"+key;button.className="tp20-tab";
  button.textContent=label;button.dataset.tp20Tab=key;button.setAttribute("role","tab");
  button.setAttribute("aria-controls",panel.id);
  button.setAttribute("aria-selected",i===0?"true":"false");
  button.tabIndex=i===0?0:-1;
  menu.append(button);
 });
 layout.before(menu);
 function activate(key,focus){
  $$(".tp20-tab",menu).forEach(button=>{
   const active=button.dataset.tp20Tab===key;
   button.setAttribute("aria-selected",active?"true":"false");
   button.tabIndex=active?0:-1;
   if(active&&focus)button.focus({preventScroll:true});
  });
  $$(".tp20-notification-panel",layout).forEach(panel=>{
   const active=panel.dataset.tp20Panel===key;
   panel.classList.toggle("tp20-tab-hidden",!active);
   panel.setAttribute("aria-hidden",active?"false":"true");
  });
 }
 menu.addEventListener("click",event=>{
  const button=event.target.closest("button[data-tp20-tab]");
  if(button)activate(button.dataset.tp20Tab,false);
 });
 menu.addEventListener("keydown",event=>{
  if(!["ArrowRight","ArrowLeft","Home","End"].includes(event.key))return;
  const buttons=$$(".tp20-tab",menu);if(!buttons.length)return;
  const current=buttons.findIndex(b=>b.getAttribute("aria-selected")==="true");
  const next=event.key==="Home"?0:event.key==="End"?buttons.length-1:
   (current+(event.key==="ArrowRight"?1:-1)+buttons.length)%buttons.length;
  activate(buttons[next].dataset.tp20Tab,true);event.preventDefault();
 });
 activate("inbox",false);
 window.TurinPippsV20={openNotificationTab:activate};
}
function installationDetails(){
 const view=$("#view-profile"),install=$(".tp17-install",view||document);
 if(!view||!install||install.dataset.tp20Folded)return;
 install.dataset.tp20Folded="1";
 const h=$(".tp17-section-heading",install);
 const content=document.createElement("div");content.className="tp20-install-content";
 while(install.firstChild)content.appendChild(install.firstChild);
 const summary=document.createElement("summary");
 summary.innerHTML='<span><i class="fa-solid fa-mobile-screen-button" aria-hidden="true"></i> Installazione e accesso da iPhone</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
 const wrapper=document.createElement("details");wrapper.className="tp20-install-details";
 wrapper.append(summary,content);install.append(wrapper);
}
function closeOutsideMenus(event){
 const target=event.target;
 $$(".listing.tp19-property-row .tp19-more[open]").forEach(menu=>{
  if(!menu.contains(target))menu.open=false;
 });
}
function init(){
 notificationTabs();installationDetails();
 document.addEventListener("pointerdown",closeOutsideMenus);
 window.addEventListener("turinpipps:ready",()=>{notificationTabs();installationDetails();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();