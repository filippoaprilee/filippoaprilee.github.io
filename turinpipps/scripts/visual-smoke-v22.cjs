#!/usr/bin/env node
/* Chromium layout smoke test for TurinPipps.
 * Runs against localhost with public sample data. Does not log in or write to Supabase.
 */
"use strict";
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const URL = "http://127.0.0.1:8787/turinpipps/";
const output = path.join(process.cwd(), "turinpipps", "_visual-qa-v22");
fs.mkdirSync(output, { recursive: true });
const targets = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-320", width: 320, height: 740 }
];
const violations = [];
(async () => {
 const browser = await chromium.launch({ headless: true });
 try {
  for (const vp of targets) {
   const context = await browser.newContext({ viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1,reducedMotion:"reduce" });
   const page = await context.newPage();
   await page.addInitScript(() => {
    try { localStorage.setItem("turinpipps.welcome.seen.v11", "1"); localStorage.setItem("turinpipps.onboard.v4", "1"); } catch {}
   });
   const errors=[];
   page.on("pageerror", error => errors.push(error.message));
   await page.goto(URL,{waitUntil:"domcontentloaded",timeout:30000});
   await page.waitForFunction(()=>document.querySelector("#tp20-total-homes")?.textContent?.trim() !== "—",{timeout:25000}).catch(()=>{});
   await page.waitForTimeout(250);
   // The home counter can briefly be 0 while the asynchronous listings request is resolving.
   // Wait for the underlying public collection and the rendered summary, not an arbitrary delay.
   await page.waitForFunction(()=>{
     const count=window.TurinPippsUXV3?.getListings?.()?.length||0;
     const home=Number(document.querySelector("#tp20-total-homes")?.textContent||0);
     return count>=20&&home>=20;
   },{timeout:20000}).catch(()=>{});
   const diagnostic = await page.evaluate(() => {
     const dataCount=window.TurinPippsUXV3?.getListings?.()?.length || 0;
     const beforeRefresh=document.querySelector("#tp20-total-homes")?.textContent;
     let refreshError=null;
     try { window.TurinPippsV10?.refresh?.() } catch(error){refreshError=(error.stack||error.message||String(error)).split("\n").slice(0,8).join(" | ")}
     for(const dialog of document.querySelectorAll('dialog[open]')){try{dialog.close()}catch{}}
     return {dataCount,beforeRefresh,refreshError,homeText:document.querySelector('#tp20-total-homes')?.textContent};
   });
   console.log("DIAGNOSTIC",vp.name,JSON.stringify(diagnostic));
   if(diagnostic.refreshError)violations.push(vp.name+": Home update JS error: "+diagnostic.refreshError);
   const home = await page.evaluate(() => ({
    count: Number(document.querySelector("#tp20-total-homes")?.textContent||0),
    preview: document.querySelectorAll("#tp10-home-options .tp20-shortlist-row").length,
    title: document.querySelector("#tp10-home h1")?.textContent.trim(),
    width: document.documentElement.scrollWidth,
    viewport: innerWidth
   }));
   console.log("HOME",vp.name,JSON.stringify(home));
   if(home.count < 20)violations.push(vp.name+": Home must show loaded listings (got "+home.count+")");
   if(!home.title?.includes("Una casa giusta"))violations.push(vp.name+": wrong v22 Home heading "+home.title);
   if(home.preview < 3)violations.push(vp.name+": Home shortlist is empty despite data ("+home.preview+")");
   if(home.width > vp.width+3)violations.push(vp.name+": horizontal overflow on Home "+home.width+" > "+vp.width);
   await page.screenshot({path:path.join(output,vp.name+"-home.png"),fullPage:false});
   await page.evaluate(()=>window.TurinPippsUXV3?.navigate("results"));
   await page.waitForTimeout(300);
   const results=await page.evaluate(()=>{
     const list=document.querySelector(".listing.tp19-property-row");
     const tabs=[...document.querySelectorAll("#view-results .tp12-result-tabs .chip")].map(n=>({
      text:n.textContent.trim(),width:Math.round(n.getBoundingClientRect().width),scroll:n.scrollWidth
     }));
     return {shown:document.querySelectorAll("#list .tp19-property-row").length,
       width:document.documentElement.scrollWidth,
       viewport:innerWidth,
       tabs,
       listRect:list&&[Math.round(list.getBoundingClientRect().left),Math.round(list.getBoundingClientRect().right)]
     };
   });
   console.log("RESULTS",vp.name,JSON.stringify(results));
   const listingVisual=await page.evaluate(()=>{
    const card=document.querySelector("#list .tp19-property-row");
    if(!card)return null;
    const cardCss=getComputedStyle(card),body=card.querySelector(".tp19-property-main"),
      action=card.querySelector(".tp19-property-actions"),
      source=card.querySelector(".tp19-open");
    const cr=card.getBoundingClientRect(),ar=action?.getBoundingClientRect();
    return {border:cardCss.borderTopWidth,radius:cardCss.borderTopLeftRadius,
      background:cardCss.backgroundColor,width:Math.round(cr.width),
      body:!!body,action:!!action,source:!!source,
      actionInside:!!ar&&ar.left>=cr.left-2&&ar.right<=cr.right+2};
   });
   console.log("CARD_VISUAL",vp.name,JSON.stringify(listingVisual));
   if(!listingVisual||listingVisual.border==="0px"||
       !listingVisual.radius||listingVisual.radius==="0px"||
       !listingVisual.actionInside||!listingVisual.body||!listingVisual.source)
     violations.push(vp.name+": housing card visually unstructured "+JSON.stringify(listingVisual));
   if(results.shown < 2)violations.push(vp.name+": results did not render");
   if(results.width > vp.width+3)violations.push(vp.name+": horizontal overflow on Results "+results.width+" > "+vp.width);
   if(results.tabs.some(t=>t.scroll>t.width+8))violations.push(vp.name+": clipped filter labels "+JSON.stringify(results.tabs));
   await page.screenshot({path:path.join(output,vp.name+"-results.png"),fullPage:false});
   const firstDetails=page.locator("#list .tp19-property-row>.tp19-property-details").first();
   if(await firstDetails.count()){
    await firstDetails.locator(":scope > summary").click();
    const expanded=await page.evaluate(()=>{
     const detail=document.querySelector("#list .tp19-property-details[open]");
     const privateTool=detail?.querySelector("details.tp21-private-tools");
     return {expanded:!!detail,privateTool:!!privateTool,privateToolInitiallyClosed:privateTool?!privateTool.open:null,width:document.documentElement.scrollWidth};
    });
    console.log("DETAILS",vp.name,JSON.stringify(expanded));
    if(!expanded.expanded||!expanded.privateTool||!expanded.privateToolInitiallyClosed||expanded.width>vp.width+3)violations.push(vp.name+": details or private accordion issue "+JSON.stringify(expanded));
    await page.screenshot({path:path.join(output,vp.name+"-details.png"),fullPage:false});
    await firstDetails.locator(":scope > summary").click();
   }

   const other=page.locator("#list .tp19-property-row .tp20-more summary").first();
   if(await other.count()){
    await other.click();
    const menu=await page.evaluate(()=>{
      const n=document.querySelector("#list .tp19-property-row .tp20-more[open] .tp-card-menu-items");
      if(!n)return null;
      const r=n.getBoundingClientRect();
      return {left:r.left,right:r.right,width:r.width,scrollWidth:n.scrollWidth,viewport:innerWidth,display:getComputedStyle(n).display};
    });
    console.log("MENU",vp.name,JSON.stringify(menu));
    if(!menu||menu.left < -3||menu.right > vp.width+3||menu.display==="none")violations.push(vp.name+": actions menu clipped or hidden "+JSON.stringify(menu));
    await page.screenshot({path:path.join(output,vp.name+"-menu.png"),fullPage:false});
   } else violations.push(vp.name+": no More action");
   await page.evaluate(()=>window.TurinPippsUXV3?.navigate("visits"));
   await page.waitForTimeout(150);
   const visits=await page.evaluate(()=>{
    const root=document.querySelector("#tp-visits-content"),empty=root?.querySelector(".tp20-journey-empty");
    return {root:!!root,hasLegacyPanel:!!root?.parentElement?.classList.contains("panel"),
      empty:!!empty,background:empty?getComputedStyle(empty).backgroundColor:null,
      width:document.documentElement.scrollWidth};
   });
   console.log("VISITS",vp.name,JSON.stringify(visits));
   if(visits.hasLegacyPanel)violations.push(vp.name+": visits still wrapped in legacy panel");
   if(visits.width>vp.width+3)violations.push(vp.name+": horizontal overflow on Visits");
   await page.screenshot({path:path.join(output,vp.name+"-visits.png"),fullPage:false});
   await page.evaluate(()=>window.TurinPippsUXV3?.navigate("profile"));
   await page.waitForTimeout(150);
   await page.screenshot({path:path.join(output,vp.name+"-profile.png"),fullPage:false});
   await page.evaluate(()=>window.TurinPippsUXV3?.navigate("settings"));
   await page.waitForTimeout(120);
   const settingsState=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,visible:!document.querySelector("#view-settings")?.classList.contains("hidden"),fields:["budget","tp-min-sqm","tp-property-type","tp-zones"].every(id=>!!document.getElementById(id))}));
   console.log("SETTINGS",vp.name,JSON.stringify(settingsState));
   if(!settingsState.visible||!settingsState.fields||settingsState.width>vp.width+3)violations.push(vp.name+": settings overflow or missing fields");
   await page.screenshot({path:path.join(output,vp.name+"-settings.png"),fullPage:false});
   await page.evaluate(()=>window.TurinPippsUXV3?.navigate("notifications"));
   await page.waitForTimeout(120);
   const notificationState=await page.evaluate(()=>{
     const host=document.querySelector("#view-notifications");
     const items=[".tp17-inbox-section",".tp17-preferences-section",".tp17-device-section"].map(q=>host?.querySelector(q)?.getBoundingClientRect()).filter(Boolean);
     const overlaps=items.some((first,i)=>items.some((second,j)=>i!==j&&Math.min(first.right,second.right)-Math.max(first.left,second.left)>8&&Math.min(first.bottom,second.bottom)-Math.max(first.top,second.top)>8));
     const areas=items.map(r=>({left:Math.round(r.left),top:Math.round(r.top),right:Math.round(r.right),bottom:Math.round(r.bottom)}));
     return {width:document.documentElement.scrollWidth,viewport:innerWidth,visible:!host?.classList.contains("hidden"),prefs:!!document.querySelector("#tp17-prefs-content"),overlaps,areas};
   });
   console.log("NOTIFICATIONS",vp.name,JSON.stringify(notificationState));
   if(!notificationState.visible||!notificationState.prefs||notificationState.overlaps||notificationState.width>vp.width+3)violations.push(vp.name+": notifications overlap or missing preferences "+JSON.stringify(notificationState));
   await page.screenshot({path:path.join(output,vp.name+"-notifications.png"),fullPage:false});
   await page.evaluate(()=>localStorage.setItem("turinpipps.theme.v12","dark"));
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForTimeout(950);
   await page.evaluate(()=>{for(const dialog of document.querySelectorAll('dialog[open]')){try{dialog.close()}catch{}}});
   await page.evaluate(()=>window.TurinPippsUXV3?.navigate("notifications"));
   await page.waitForTimeout(150);
   const darkTheme=await page.evaluate(()=>{
     const style=getComputedStyle(document.documentElement);
     return {bg:style.getPropertyValue("--tp16-bg").trim(),text:style.getPropertyValue("--tp16-text").trim(),theme:document.documentElement.dataset.tpTheme};
   });
   console.log("DARK",vp.name,JSON.stringify(darkTheme));
   if(darkTheme.theme!=="dark"||darkTheme.bg===darkTheme.text)violations.push(vp.name+": dark color tokens invalid "+JSON.stringify(darkTheme));
   if(darkTheme.theme==="dark"&&!/^#0f1b24$/i.test(darkTheme.bg))violations.push(vp.name+": v22 dark palette not loaded "+JSON.stringify(darkTheme));

   await page.screenshot({path:path.join(output,vp.name+"-dark-notifications.png"),fullPage:false});
   await page.evaluate(()=>window.TurinPippsUXV3?.navigate("results"));
   await page.waitForTimeout(100);
   await page.screenshot({path:path.join(output,vp.name+"-dark-results.png"),fullPage:false});
   await page.evaluate(()=>window.TurinPippsUXV3?.navigate("home"));
   await page.waitForTimeout(100);
   await page.screenshot({path:path.join(output,vp.name+"-dark-home.png"),fullPage:false});
   if(errors.length)console.log("PAGEWARN",vp.name,errors.slice(0,5));
   await context.close();
  }
  if(violations.length){console.error("FAILURES\n"+violations.join("\n"));process.exitCode=1}
  else console.log("PASS: loaded Home, tabs, actions, visits, preferences, notifications and dark-mode viewport layouts");
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
