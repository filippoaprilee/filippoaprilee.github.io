/* TurinPipps 13 screenshot-driven UX checks.
 * Run: node --test turinpipps/tests/v13-user-journeys.test.cjs
 * These are deterministic JS/contrast tests, not a Safari/VoiceOver certification.
 */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
 vm=require('node:vm'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const source=read('organize-v7.js'),index=read('index.html'),css=read('experience-v12.css'),
 v10=read('experience-v10.js'),v12=read('experience-v12.js'),sw=read('sw.js');
const url='https://example.invalid/annuncio-a';
function render(flags={}){
 const rows=[{url,title:'Bilocale Torino',zone:'Cenisia',price:650}];
 const window={TurinPippsUXV3:{getListings:()=>rows,getPrefs:()=>({flags})}};
 const document={getElementById:()=>null,addEventListener(){}};
 vm.runInNewContext(source,{window,document,console},{timeout:2000});
 const node={innerHTML:''};window.TurinPippsOrganize.render(node);return node.innerHTML;
}
test('contacted home is treated as waiting for reply, not missing',()=>{
 const html=render({[url]:{contact:true}});
 assert.match(html,/Contatto in attesa di risposta/);
 assert.doesNotMatch(html,/Salva un appartamento/);
 assert.ok(html.indexOf('data-tp7-stage="contact"')<html.indexOf('data-tp7-stage="saved"'));
});
test('pending reply, saved home and no homes receive appropriate actions',()=>{
 assert.match(render({[url]:{replyReceived:true}}),/Hai una risposta da gestire/);
 assert.match(render({[url]:{saved:true}}),/Valuta le case salvate/);
 assert.match(render({}),/Inizia dalla ricerca/);
});
test('empty stages are semantic collapsible details, not five giant cards',()=>{
 assert.match(render({[url]:{contact:true}}),/<details class="tp7-stage tp13-stage-empty"/);
 assert.match(render({[url]:{contact:true}}),/data-tp7-jump="contact"/);
});
test('a visited appointment has an actual calendar action',()=>{
 const at=new Date(Date.now()+2*86400000).toISOString();
 assert.match(render({[url]:{contact:true,visitStatus:'programmata',visitAt:at}}),/data-tp7-ics=/);
});
test('saved vs tracked state and singular are explicit',()=>{
 assert.match(index,/Nessun annuncio contrassegnato come salvato/);
 assert.match(index,/tracked===1\?'Apri la casa seguita'/);
 assert.match(index,/data-nav="visits"/);
});
test('quick filters are moved, not recreated, and reset clears hidden flags',()=>{
 assert.match(v12,/advanced\.prepend\(controls\);quick\.remove\(\)/);
 assert.match(v10,/if\(ev\.target\.closest\("#tp8-reset"\)\)/);
 assert.match(v10,/filterState\.priced=false;filterState\.fresh=false/);
 assert.match(v10,/\$\$\("\[data-tp10-filter\]"\)\.forEach/);
});
test('high-contrast dark surfaces exist for the screenshot defects',()=>{
 for(const selector of [
  '#tp9-profile-privacy','.tp7-metrics>div','.tp7-next','.tp11-empty',
  '#view-results .tp12-card .listing-banner .price','#view-results #tp-filterbar'
 ])assert.ok(css.includes(selector),selector+' is missing');
 assert.match(css,/--tp12-text:#ecf5f8/);
});
function luminance(hex){
 const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return c[0]*.2126+c[1]*.7152+c[2]*.0722;
}
function ratio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
test('dark text, muted labels and primary buttons meet 4.5:1 for tested pairs',()=>{
 for(const [fg,bg] of [
  ['#ecf5f8','#0d1824'],['#ecf5f8','#162737'],['#b9cbd5','#162737'],
  ['#ffffff','#206a78'],['#b9cbd5','#192d40']
 ])assert.ok(ratio(fg,bg)>=4.5,fg+' on '+bg+' lacks normal-text contrast');
});
test('v13 assets match service-worker cache and page sources',()=>{
 for(const file of [
 'organize-v7.js?v=13.0.0','experience-v10.js?v=13.0.1',
 'experience-v12.js?v=14.0.2','experience-v12.css?v=13.0.1'
 ]){
  assert.ok(index.includes(file),'HTML missing '+file);
  assert.ok(sw.includes(file),'Worker missing '+file);
 }
 assert.match(sw,/turinpipps-shell-v14\.0\.3/);
});
test('browser JavaScript remains parsable after integrating changes',()=>{
 for(const [name,code] of [['organization',source],['v10',v10],['v12',v12],['worker',sw]])
  assert.doesNotThrow(()=>new vm.Script(code,{filename:name}));
 for(const match of index.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))
  if(match[1].trim())assert.doesNotThrow(()=>new vm.Script(match[1]));
});
