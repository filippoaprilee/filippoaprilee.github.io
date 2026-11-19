/* TurinPipps 14: feedback-driven comparisons and notifications.
 * Run: node --test turinpipps/tests/v14-user-feedback.test.cjs
 */
const {test}=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),css=read('experience-v14.css'),v5=read('experience-v5.js'),
 v14=read('experience-v14.js'),worker=read('sw.js'),release=JSON.parse(read('release.json')),
 mailer=read('supabase/edge-functions/turinpipps-mailer/index.ts');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const start=html.indexOf('function renderComparison(){'),end=html.indexOf('\nfunction renderVisits(){',start);
assert.ok(start>=0&&end>start);
const compareSource=html.slice(start,end);
function compare(records,flags){
 const node={innerHTML:''},title={textContent:''},button={innerHTML:'',disabled:false};
 const section={querySelector:s=>s==='.tp-page-lead p'?title:s==='.tp-page-lead>button'?button:null};
 const el=id=>id==='tp-compare-content'?node:section;
 const fn=vm.runInNewContext(compareSource+';renderComparison',
   {el,all:()=>records,flag:u=>flags[u]||{},esc,
    recurringCost:a=>({total:Number(a.price||0)+Number(a.expenses||0),unknown:true})},{timeout:1000});
 fn();return {html:node.innerHTML,button,title};
}
const first={url:'https://example.test/a',title:'Monolocale Crocetta contratto transitorio - Appartamenti In affitto a Torino - Subito',
  source:'Subito',zone:'Crocetta',price:0,private_status:'unverified'};
const second={url:'https://example.test/b',title:'Bilocale Pozzo Strada',source:'Bakeca',zone:'Pozzo Strada',
  price:650,expenses:80,sqm:45,private_status:'source'};
test('no selection has a useful empty state',()=>{
 assert.match(compare([],{}).html,/Nessuna casa da confrontare/);
 assert.match(compare([],{}).html,/data-nav="results"/);
});
test('one selection suggests another before a decision',()=>{
 const r=compare([first],{[first.url]:{compare:true}});
 assert.match(r.html,/Aggiungi almeno un’altra casa/);
 assert.equal((r.html.match(/tp14-compare-card"/g)||[]).length,1);
});
test('mobile compares two properties by labels and does not invent unknown values',()=>{
 const r=compare([first,second],{[first.url]:{compare:true},[second.url]:{compare:true}});
 assert.equal((r.html.match(/class="tp14-compare-card"/g)||[]).length,2);
 assert.match(r.html,/Non dichiarato/);
 assert.match(r.html,/650 €/);
 assert.match(r.html,/730 € \+ spese da chiarire/);
 assert.match(r.html,/Privato dichiarato, non verificato/);
 assert.match(r.html,/<dl>/);
 assert.match(r.html,/data-action="compare"/);
 assert.match(r.html,/tp14-compare-desktop/);
 assert.ok(!r.html.includes('Score 34'));
 assert.ok(!r.html.includes('Appartamenti In affitto a Torino - Subito</h2>'));
});
test('at most four selected and CTA disabled at limit',()=>{
 const list=Array.from({length:5},(_,i)=>({...first,url:'https://example.test/'+i,title:'Casa '+i}));
 const flags=Object.fromEntries(list.map(a=>[a.url,{compare:true}]));
 const r=compare(list,flags);
 assert.equal((r.html.match(/class="tp14-compare-card"/g)||[]).length,4);
 assert.equal(r.button.disabled,true);
});
test('comparison handles HTML-like title text as text',()=>{
 const bad={...first,title:'<img src=x onerror=alert(1)>'};
 const r=compare([bad],{[bad.url]:{compare:true}});
 assert.doesNotMatch(r.html,/<img src=x/);
 assert.match(r.html,/&lt;img/);
});
test('both contrast themes and lean typography are explicitly styled',()=>{
 assert.match(css,/html\[data-tp-theme="dark"\]/);
 assert.match(css,/\.tp14-compare-mobile/);
 assert.match(css,/font-weight:690/);
 assert.match(css,/\.tp14-compare-desktop\{display:none!important\}/);
});
test('release channels are opt-in, not auto-activated',()=>{
 assert.match(v5,/release_email_enabled:!!\$\('#tp14-release-email'\)/);
 assert.match(v5,/release_push_enabled:!!\$\('#tp14-release-push'\)/);
 assert.match(mailer,/release_email_opted_in_at/);
 assert.match(mailer,/release_push_opted_in_at/);
 assert.match(mailer,/resolution=ignore-duplicates/);
 assert.match(mailer,/releaseCycle\(\)/);
 assert.match(mailer,/turinpipps_notification_inbox/);
 assert.match(v14,/readRelease/);
});
test('notification release matches cached PWA',()=>{
 assert.equal(release.version,'14.0.1');
 assert.match(worker,/turinpipps-shell-v14\.0\.1/);
 for(const p of ['experience-v14.css?v=14.0.1','experience-v14.js?v=14.0.1','release.json']){
  assert.ok(html.includes(p)||p==='release.json');
  assert.ok(worker.includes(p),p);
 }
});
test('all browser scripts and inline code parse',()=>{
 for(const [name,source] of [['v5',v5],['v14',v14],['sw',worker]])
  assert.doesNotThrow(()=>new vm.Script(source,{filename:name}));
 for(const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))
  if(match[1].trim())assert.doesNotThrow(()=>new vm.Script(match[1]));
});
