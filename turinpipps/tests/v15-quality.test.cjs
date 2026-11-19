/* TurinPipps 15.1 - beta quality and three user journeys.
 * Run: node --test turinpipps/tests/v15-quality.test.cjs
 * Static/code-level tests do not replace real Safari / VoiceOver E2E.
 */
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const html=read("index.html"),css=read("experience-v15.css"),js=read("experience-v15.js");
const sw=read("sw.js"),release=JSON.parse(read("release.json"));
const staticData=JSON.parse(read("data/listings.json"));
const extractor=read("supabase/edge-functions/turinpipps-collector/listing-extractor.js");
const coll=read("supabase/edge-functions/turinpipps-collector/index.ts"),
 ingest=read("supabase/edge-functions/turinpipps-ingest/index.ts"),
 mailer=read("supabase/edge-functions/turinpipps-mailer/index.ts"),
 widget=read("supabase/edge-functions/turinpipps-widget/index.ts");
const banned=/pozzo[\s./_-]*strada/i;
const unwanted=/(?:^|[-_/\s])(?:stanza|camera(?:\s+singola|\s+doppia)?|posto[\s-]*letto)(?:[-_/\s.]|$)/i;
function normalizeForTest(){
 const start=html.indexOf("function normalize(item){"),end=html.indexOf("\nfunction all(){",start);
 assert.ok(start>=0&&end>start);
 const script=html.slice(start,end)+"\nnormalize;";
 return vm.runInNewContext(script,{
  canonical:u=>{try{return new URL(u).toString()}catch{return ""}},
  cleanTitle:s=>String(s||""),
  zones:["crocetta","cenisia","san paolo","borgo san paolo","cit turin","santa rita"]
 },{timeout:500});
}
test("all zone selectors and onboarding omit the removed neighborhood",()=>{
 for(const p of ["index.html","experience-v3.js","experience-v4.js",
  "today.html","supabase/edge-functions/turinpipps-widget/index.ts"]){
  assert.doesNotMatch(read(p),/\bPozzo Strada\b|\bpozzo strada\b/i,p);
 }
});
test("static archive contains 20 whole-home candidates, not the seven removed irrelevant rows",()=>{
 assert.equal(staticData.listings.length,20);
 for(const a of staticData.listings){
  const text=[a.zone,a.title,a.description,a.address,a.url].join(" ");
  assert.doesNotMatch(text,banned,a.url);
  assert.doesNotMatch([a.title,a.url].join(" "),unwanted,a.url);
 }
});
test("incoming listings excluded by zone, excluded RLS flag or permanent missing link",()=>{
 const normalize=normalizeForTest();
 const good={url:"https://example.org/appartamento",title:"Bilocale in Cenisia",zone:"Cenisia",
  price:650,source:"Portale",link_status:"blocked"};
 assert.ok(normalize(good),"Anti-bot blocked links must not be declared expired");
 assert.equal(normalize({...good,zone:"Pozzo Strada"}),null);
 assert.equal(normalize({...good,title:"Bilocale Pozzo Strada"}),null);
 assert.equal(normalize({...good,excluded_from_search:true}),null);
 assert.equal(normalize({...good,link_status:"missing",link_failure_count:2}),null);
 assert.equal(normalize({...good,availability_status:"expired"}),null);
 assert.equal(normalize({...good,url:"https://www.clickcase.it/camera-bagno-torino-12345.html"}),null);
});
test("collector, signed worker ingestion and automated digests enforce exclusion",()=>{
 assert.match(coll,/const disallowed=/);
 assert.match(coll,/excluded_zone_observations/);
 assert.match(ingest,/pozzo\[\\s/);
 assert.match(mailer,/pozzo\[\\s/);
 assert.match(widget,/safeListing/);
 assert.match(widget,/excluded_from_search/);
});
test("source identifiers deduplicate tracking variants while preserving distinct publishers",()=>{
 const code=extractor.replace(/export function /g,"function ");
 const identity=vm.runInNewContext(code+";sourceIdentity;",{URL},{timeout:500});
 assert.equal(identity("https://www.clickcase.it/alloggio-torino-425573.html?utm_source=google"),
  identity("https://clickcase.it/altro-titolo-torino-425573.html"));
 assert.notEqual(identity("https://www.clickcase.it/alloggio-torino-425573.html"),
  identity("https://www.subito.it/appartamenti/alloggio-torino-425573.htm"));
});
test("detail enrichment only extracts values explicitly shown in the listing",()=>{
 const ex=vm.runInNewContext(extractor.replace(/export function /g,"function ")+";extractClickCaseDetails;",{URL},{timeout:500});
 const known='<html><h1>Bilocale luminoso in Cenisia</h1><p>Bilocale in Cenisia - € 650 /mese</p>'+
  '<h2>Descrizione</h2><p>Affitto direttamente da privato un bilocale arredato vicino ai servizi universitari.</p>'+
  '<h2>Caratteristiche</h2><p>Superficie: 48 mq</p><p>Spese condominiali: 80 € al mese</p><h2>Contatti</h2></html>';
 const v=ex(known,"https://clickcase.it/bilocale-cenisia-425573.html","2026-11-19T07:00:00Z");
 assert.equal(v.fields.price,650);assert.equal(v.fields.sqm,48);assert.equal(v.fields.expenses,80);
 assert.equal(v.field_provenance.sqm.state,"claimed");
 const unknown='<html><h1>Bilocale a Torino</h1><p>Descrizione</p>'+
 '<p>Un bilocale luminoso, libero forse a dicembre, in zona tranquilla.</p>'+
 '<h2>Caratteristiche</h2><p>Arredato</p><h2>Contatti</h2></html>';
 const u=ex(unknown,"https://clickcase.it/casa-425572.html","2026-11-19T07:00:00Z");
 assert.equal(u.fields.price,undefined);assert.equal(u.fields.sqm,undefined);assert.equal(u.fields.expenses,undefined);
});
test("every mobile card has one continuous surface and preserves all actions",()=>{
 assert.match(js,/body\.prepend\(line\);line\.append\(micro,price\)/);
 assert.match(js,/tp15-retired-banner/);
 assert.match(css,/\.listing\.tp15-card>\.body/);
 assert.match(css,/\.listing\.tp15-card>\.actions/);
 assert.match(css,/background:var\(--tp15-surface\)!important/);
 assert.match(html,/data-action="compare"/);
 assert.match(html,/data-action="contact"/);
});
test("Account and Search Preferences have separate navigation and account groups",()=>{
 assert.match(js,/textContent="Account"|setText\(title,"Account"\)/);
 assert.match(js,/tp15-settings-trigger/);
 assert.match(js,/data-nav="settings"/);
 assert.match(js,/tp15-account-notifications/);
 assert.match(js,/tp15-privacy/);
 assert.match(js,/tp15-install/);
 assert.match(js,/tp15-journey/);
 for(const x of ['data-nav="results"','data-nav="compare"','data-nav="visits"'])
  assert.ok(js.includes(x));
});
test("release file, service worker and new assets are aligned",()=>{
 assert.equal(release.version,"16.0.2");
 assert.match(sw,/turinpipps-shell-v16\.0\.2/);
 for(const asset of ["experience-v15.js?v=15.0.0","styles-v16.css?v=16.0.2",
   "experience-v12.js?v=16.0.0","experience-v3.js?v=16.0.0"]){
  assert.ok(html.includes(asset),"missing "+asset+" in HTML");
  assert.ok(sw.includes(asset),"missing "+asset+" in service worker");
 }
});
test("scripts and inline JS parse after final composition",()=>{
 for(const [name,code] of [["v15",js],["sw",sw]])
  assert.doesNotThrow(()=>new vm.Script(code,{filename:name}));
 for(const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))
  if(m[1].trim())assert.doesNotThrow(()=>new vm.Script(m[1]));
});
