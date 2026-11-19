/* TurinPipps v12 static/frontend smoke tests.
 * Run from repo root: node --test turinpipps/tests/v12-ui.test.cjs
 * These do not replace Safari/VoiceOver or end-to-end account checks.
 */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const js=read('experience-v12.js'),css=read('experience-v12.css');
const v4=read('experience-v4.js'),v10=read('experience-v10.js');
const html=read('index.html'),sw=read('sw.js');
test('all new browser scripts and inline scripts parse',()=>{
 for(const [name,code] of [['v12',js],['v4',v4],['v10',v10],['sw',sw]])assert.doesNotThrow(()=>new vm.Script(code,{filename:name}));
 for(const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))if(match[1].trim())assert.doesNotThrow(()=>new vm.Script(match[1]));
});
test('PWA precaches matching v12 UI files and invalidates old shell',()=>{
 for(const file of ['experience-v12.css?v=13.0.1','experience-v12.js?v=14.0.0']){
  assert.ok(html.includes(file),file+' absent from document');
  assert.ok(sw.includes(file),file+' absent from service worker');
 }
 assert.match(sw,/turinpipps-shell-v14\.0\.1/);
});
function harness(){
 const root={dataset:{tpThemeChoice:'system'},style:{}};
 const meta={value:'',setAttribute(k,v){this.value=v;}};
 const doc={documentElement:root,readyState:'loading',addEventListener(){},querySelector(s){return s==='meta[name="theme-color"]'?meta:null},querySelectorAll(){return []}};
 let dark=false;
 const memory=new Map();
 const localStorage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 const win={matchMedia:()=>({get matches(){return dark;},addEventListener(){}})};
 vm.runInNewContext(js,{document:doc,window:win,localStorage,console},{timeout:2000});
 return {root,meta,memory,win,dark:next=>{dark=next}};
}
test('system theme follows OS and manual themes override it',()=>{
 const h=harness(),change=h.win.TurinPippsV12.applyTheme;
 change('system',true);assert.equal(h.root.dataset.tpTheme,'light');
 h.dark(true);change('system',false);assert.equal(h.root.dataset.tpTheme,'dark');
 change('light',true);assert.equal(h.root.dataset.tpTheme,'light');
 change('dark',true);assert.equal(h.root.dataset.tpTheme,'dark');
 assert.equal(h.memory.get('turinpipps.theme.v12'),'dark');
 assert.equal(h.meta.value,'#101c29');
});
test('light and dark are styled as independent color schemes',()=>{
 assert.match(css,/html\[data-tp-theme="dark"\]/);
 assert.match(css,/--tp12-bg:#0d1824/);
 assert.match(css,/--tp12-card:#162737/);
 assert.match(css,/color-scheme:dark/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(html,/id="tp12-theme-preflight"/);
});
test('mobile controls are not four narrow, clipped chips',()=>{
 assert.match(css,/\.tp12-result-tabs\{display:grid/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/\.tp12-search-actions/);
 assert.match(js,/Altre opzioni/);
 assert.match(js,/Compatibili/);
 assert.match(js,/Da verificare/);
});
test('data evidence must live inside a collapsible element',()=>{
 assert.match(js,/const trust=\$\("\.tp9-evaluation",article\)/);
 assert.match(js,/evidence\.append\(trust\)/);
 assert.match(js,/evidence\.open=false/);
 assert.match(css,/\.tp12-card \.tp10-evidence:not\(\[open\]\) \.tp9-evaluation/);
});
test('onboarding has five steps and preserves the five-step authority',()=>{
 assert.match(v4,/PRONTO · 5 DI 5/);
 assert.match(v4,/body\(\[0,1,2,3,8\]\[step\]/);
 assert.match(v10,/if\(!window\.TurinPippsEnhanceGuide\)api\(\)\.guideSlides/);
});
