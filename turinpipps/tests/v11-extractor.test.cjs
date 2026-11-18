/* Run with node --test turinpipps/tests/v11-extractor.test.cjs
 * Pure parser tests: no live portal requests and no database writes. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../supabase/edge-functions/turinpipps-collector/listing-extractor.js'),'utf8');
const sandbox={URL,Date,console};
vm.runInNewContext(source.replace(/^export /gm,'')+
 '\nglobalThis.tpTest={extractClickCaseDetails,sourceIdentity,plainText};',sandbox,{timeout:2000});
const api=sandbox.tpTest;
const stamp='2026-11-18T16:00:00Z';
const url='https://www.clickcase.it/trilocale-arredato-412245.html';
const page='<html><script>var price="€ 100 mensili";</script>'+
 '<h1>Trilocale Arredato Via Amedeo Peyron 36, Cit Turin, Torino</h1>'+
 '<h2>Appartamento in Affitto da Privato - Via Amedeo Peyron 36, Torino</h2>'+
 '106 m² | 3 locali | 2 bagni | € 1.650 mensili'+
 '<h3>Descrizione</h3>Privato affitta. Disponibile dal 01 agosto 2026. Intero appartamento arredato, due bagni e tre camere da letto.'+
 '<h3>Caratteristiche</h3>Spese: € 100 mensili a parte'+
 '<h3>Contatti</h3>Aggiornato il 14 agosto 2026</html>';
test('one canonical listing ID across tracking URLs and domains',()=>{
 assert.equal(api.sourceIdentity(url+'?utm_source=google'),api.sourceIdentity('https://clickcase.it/altro-titolo-412245.html'));
 assert.notEqual(api.sourceIdentity(url),api.sourceIdentity('https://www.subito.it/appartamenti/casa-412245.htm'));
});
test('explicit rent, charges, street, surface, type and area',()=>{
 const data=api.extractClickCaseDetails(page,url,stamp);
 assert.equal(data.fields.price,1650);
 assert.equal(data.fields.expenses,100);
 assert.equal(data.fields.sqm,106);
 assert.equal(data.fields.address,'Via Amedeo Peyron 36, Torino');
 assert.equal(data.fields.zone,'Cit Turin');
 assert.equal(data.fields.property_type,'trilocale');
 assert.equal(data.fields.private_status,'source');
});
test('source information is a claim, never independent verification',()=>{
 const p=api.extractClickCaseDetails(page,url,stamp);
 for(const key of Object.keys(p.field_provenance)){
  assert.equal(p.field_provenance[key].state,'claimed');
  assert.equal(p.field_provenance[key].origin,'public_listing_page');
 }
});
test('date of availability is not misinterpreted as publication date',()=>{
 const p=api.extractClickCaseDetails(page,url,stamp);
 assert.equal(p.fields.published_at,undefined);
 assert.match(p.fields.source_updated,/^2026-08-14/);
});
test('no rent or dates invented when absent',()=>{
 const p=api.extractClickCaseDetails('<h1>Casa in Torino</h1><div>Disponibile da aprile 2027</div>',url,stamp);
 assert.equal(p.fields.price,undefined);
 assert.equal(p.fields.published_at,undefined);
 assert.equal(p.fields.source_updated,undefined);
});
test('scripts cannot inject apparent prices or dates',()=>{
 const p=api.extractClickCaseDetails('<script>€ 200 mensili; aggiornato il 8 novembre 2026</script><h1>Casa Torino</h1>',url,stamp);
 assert.equal(p.fields.price,undefined);
 assert.equal(p.fields.source_updated,undefined);
});
