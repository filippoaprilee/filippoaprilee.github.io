#!/usr/bin/env node
/* Regression tests for the real TurinPipps classification, not a mock reimplementation. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const begin = html.indexOf("function classification(a){");
const end = html.indexOf("function classify(a)", begin);
assert.ok(begin !== -1 && end > begin, "classification(a) not found");
const src = html.slice(begin, end);

function evaluator(settings = {}, age = null) {
 const sandbox = {
  prefs: Object.assign({budget:700, preferredZones:["Cenisia","San Paolo"],minSqm:0,
   maxWalkMinutes:null,propertyType:"tutte"},settings),
  zones:["Cenisia","San Paolo"],
  listingAgeDays:()=>age
 };
 const ctx = vm.createContext(sandbox);
 vm.runInContext(src, ctx, {timeout:400});
 return (row) => ctx.classification(Object.assign({
   title:"Bilocale arredato",description:"",price:600,
   zone:"Cenisia",private_status:"confirmed",property_type:"bilocale",source_updated:"2026-11-15"
 },row)).status;
}

const check = (label, expected, actual) => {
 assert.equal(actual,expected,label);
 console.log("PASS " + label);
};

const classify = evaluator();
check("canone e quartiere conosciuti", "good", classify({}));
check("annuncio senza canone", "review", classify({price:0}));
check("inserzionista non verificato", "review", classify({private_status:"unverified"}));
check("fonte privata non confermata", "review", classify({private_status:"source"}));
check("data originale non disponibile", "review", classify({source_updated:""}));
check("quartiere sconosciuto", "review", classify({zone:""}));
check("prezzo sopra budget", "excluded", classify({price:750}));
check("fuori dalle zone richieste", "excluded", classify({zone:"Crocetta"}));
check("stanza anziché appartamento", "excluded", classify({title:"Stanza singola in Cenisia"}));
check("box auto", "excluded", classify({title:"Affitto box a Torino"}));
check("restrizione locatario", "review", classify({title:"Solo studenti Bilocale"}));
check("annuncio molto vecchio", "review", evaluator({},90)({}));
check("metratura inferiore alla preferenza", "excluded", evaluator({minSqm:45})({sqm:30}));
check("metratura non dichiarata", "good", evaluator({minSqm:45})({sqm:0}));
check("distanza rilevata oltre limite", "excluded", evaluator({maxWalkMinutes:15})({walking_minutes:22}));
check("distanza non disponibile", "good", evaluator({maxWalkMinutes:15})({walking_minutes:0}));
check("tipologia diversa", "excluded", evaluator({propertyType:"bilocale"})({title:"Trilocale a Cenisia",property_type:"trilocale"}));

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "manifest.webmanifest"),"utf8"));
assert.ok(manifest.name || manifest.short_name,"PWA manifest missing name");
const scripts = ["experience-v3.js","experience-v4.js","experience-v5.js","experience-v8.js","organize-v7.js","auth.js","sw.js"];
scripts.forEach(file => new vm.Script(fs.readFileSync(path.join(__dirname, "..", file), "utf8"),{filename:file}));
console.log("PASS syntax check for " + scripts.length + " scripts and PWA manifest");

assert.ok(html.includes('id="view-map"'),"Missing dedicated map view");
assert.ok(html.includes("mode='candidate'"),"Default search must show relevant candidates");
assert.ok(html.includes("experience-v8.css"),"New design stylesheet missing");
const worker=fs.readFileSync(path.join(__dirname,"..","collector_playwright.py"),"utf8");
assert.ok(worker.includes("def publish_to_supabase("),"Playwright cannot publish to Edge");
console.log("PASS map, candidate mode, UI assets and Playwright upload bridge");
