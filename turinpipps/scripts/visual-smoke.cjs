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
const output = path.join(process.cwd(), "turinpipps", "_visual-qa");
fs.mkdirSync(output, { recursive: true });
const targets = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "mobile-390", width: 390, height: 844 },
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
    try { localStorage.setItem("turinpipps.welcome.seen.v11", "1"); } catch {}
   });
   const errors=[];
   page.on("pageerror", error => errors.push(error.message));
   await page.goto(URL,{waitUntil:"domcontentloaded",timeout:30000});
   await page.waitForFunction(()=>document.querySelector("#tp20-total-homes")?.textContent?.trim() !== "—",{timeout:25000}).catch(()=>{});
   await page.waitForTimeout(1800);
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
   if(results.shown < 2)violations.push(vp.name+": results did not render");
   if(results.width > vp.width+3)violations.push(vp.name+": horizontal overflow on Results "+results.width+" > "+vp.width);
   if(results.tabs.some(t=>t.scroll>t.width+8))violations.push(vp.name+": clipped filter labels "+JSON.stringify(results.tabs));
   await page.screenshot({path:path.join(output,vp.name+"-results.png"),fullPage:false});
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
   if(errors.length)console.log("PAGEWARN",vp.name,errors.slice(0,5));
   await context.close();
  }
  if(violations.length){console.error("FAILURES\n"+violations.join("\n"));process.exitCode=1}
  else console.log("PASS: viewport layout, loaded Home, tabs, actions menu, and visits state");
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
