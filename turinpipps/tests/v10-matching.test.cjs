/* TurinPipps v10 regression checks. Run: node --test turinpipps/tests/v10-matching.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'experience-v10.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const prefs={budget:700,propertyType:'bilocale',preferredZones:['Cenisia'],minSqm:35,maxWalkMinutes:30};
const environment={
  window:{TurinPippsUXV3:{getPrefs:()=>prefs}},
  document:{readyState:'loading',addEventListener:()=>{}}
};
vm.runInNewContext(source,environment,{timeout:2000});
const evaluation=environment.window.TurinPippsV10;
const base={title:'Bilocale arredato',zone:'Cenisia',price:560,sqm:45,walking_minutes:20,route_checked_at:'2026-11-18'};
test('full match requires documented relevant criteria',()=>{
 assert.equal(evaluation.match(base).score,100);
 assert.equal(evaluation.match(base).unknown.length,0);
});
test('unknown price is never assumed compatible',()=>{
 const result=evaluation.match({...base,price:0});
 assert.ok(result.score<100);
 assert.ok(result.unknown.includes('Canone'));
});
test('incompatible price reduces compatibility',()=>{
 assert.ok(evaluation.match({...base,price:900}).score<evaluation.match(base).score);
});
test('walking estimates without checked route are treated as unknown',()=>{
 const result=evaluation.match({...base,route_checked_at:''});
 assert.ok(result.unknown.includes('Percorso reale'));
});
test('source verification does not affect the personal match score',()=>{
 const owner=evaluation.match({...base,private_status:'confirmed',verification_level:'owner_confirmed'});
 const unknown=evaluation.match({...base,private_status:'unverified',verification_level:'unverified'});
 assert.equal(owner.score,unknown.score);
});
test('client exposes the essential preservation, account and UI modules',()=>{
 assert.ok(html.includes('experience-v10.js?v=10.0.0'));
 assert.ok(html.includes('experience-v10.css?v=10.0.0'));
 assert.ok(html.includes('applyPersonalFlag:function(url,next)'));
 assert.ok(html.includes('auth-loader.js'));
 assert.ok(html.includes('trust-v9.js'));
});
test('no app library grants a false general claim about verified private rentals',()=>{
 assert.ok(!/<meta name="description" content="Trova affitti da privati/i.test(html));
});
