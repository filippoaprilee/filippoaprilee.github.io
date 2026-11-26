/* TurinPipps collector v23 — deterministic source-quality regression tests.
 * Run: node --test turinpipps/tests/v23-collector-quality.test.cjs
 */
"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const base=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(base,p),"utf8");
const extractor=read("supabase/edge-functions/turinpipps-collector/listing-extractor.js");
const collector=read("supabase/edge-functions/turinpipps-collector/index.ts");
const sandbox={URL,Date,console};
vm.runInNewContext(extractor.replace(/^export /gm,"")+
 "\nglobalThis.quality={indexedHousingIsRelevant,indexedMonthlyRent};",sandbox,{timeout:2000});
const q=sandbox.quality;
test("out-of-scope office, sale, room and other city do not become a housing opportunity",()=>{
 for(const [title,zone] of [
  ["Ufficio in Affitto in Via Torino 105 a Venezia","Cenisia"],
  ["Trilocale in vendita in Cenisia, Torino","Cenisia"],
  ["Camera singola per studente a Torino","Cenisia"],
  ["Bilocale in affitto a Milano Crocetta","Crocetta"],
  ["Box auto San Paolo Torino","San Paolo"],
  ["Monolocale Torino",""]]){
  assert.equal(q.indexedHousingIsRelevant(title,zone),false,title);
 }
 assert.equal(q.indexedHousingIsRelevant("Bilocale arredato zona Cenisia Torino","Cenisia"),true);
 assert.equal(q.indexedHousingIsRelevant("Trilocale Santa Rita 48 mq","Santa Rita"),true);
});
test("only explicit month-based rents from short index snippets qualify",()=>{
 for(const [title,description,want] of [
  ["Bilocale a Torino","Canone € 650 al mese",650],
  ["Casa arredata in Cenisia","Affitto 750€ /mese",750],
  ["Trilocale in Crocetta","€ 1.650 mensili",1650],
  ["Bilocale a Torino","Richiesti 800 €",null],
  ["Trilocale in Crocetta","800 ...",null],
  ["Appartamento in Torino","€ 75 al giorno",null],
  ["Bilocale a Torino","€ 50 mensili",null],
  ["Bilocale a Torino","Informazioni sul sito. ".repeat(22)+"€ 900 al mese",null]
 ]){
  assert.equal(q.indexedMonthlyRent(title,description),want,description.slice(0,50));
 }
});
test("collector reads one additional permitted public rental index, does not expand portal bypass",()=>{
 assert.match(collector,/case-in-affitto-privati-torino\.html/);
 assert.match(collector,/robotsPermits\(origin,requested\)/);
 assert.match(collector,/indexedHousingIsRelevant\(title,zone\)/);
 assert.match(collector,/indexedMonthlyRent\(title,snippet\)/);
 assert.match(collector,/origin:"public_search_index"/);
 assert.match(collector,/state:"claimed"/);
 assert.match(collector,/QUERY_SET = \[\] as const/);
 assert.match(collector,/const disallowed=/);
});
