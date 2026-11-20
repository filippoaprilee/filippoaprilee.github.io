/* Read-only browser QA for TurinPipps, with no login or data writes. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../qa-v20');
fs.mkdirSync(root,{recursive:true});
const base=process.env.TURINPIPPS_QA_URL||'http://127.0.0.1:4173/';
const failures=[],observations=[];
async function test(width,height,variant){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.setDefaultTimeout(5000);page.setDefaultNavigationTimeout(15000);
 await page.addInitScript(()=>{try{localStorage.setItem('turinpipps.welcome.seen.v11','1');sessionStorage.setItem('turinpipps-guest-session','1')}catch(_){}});
 page.on('pageerror',error=>errors.push(String(error.message||error)));
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.body.classList.contains('tp-ready'),null,{timeout:12000}).catch(()=>{});
 await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>{try{d.close()}catch(_){}}));
 await page.waitForTimeout(400);
 async function check(name,pass,detail){
  observations.push({variant,name,pass:Boolean(pass),detail});
  if(!pass)failures.push(variant+': '+name+(detail?' — '+detail:''));
 }
 async function geometry(label){
  const g=await page.evaluate(()=>({innerWidth,doc:document.documentElement.scrollWidth,
   body:document.body.scrollWidth,main:document.querySelector('#tp9-main')?.scrollWidth||0}));
  await check(label+' has no document overflow',g.doc<=g.innerWidth+2,JSON.stringify(g));
 }
 await check('home uses authoritative new headline',
  await page.locator('#tp10-home .tp20-hero h1').count()===1,
  (await page.locator('#tp10-home h1').first().textContent().catch(()=>''))?.slice(0,90));
 const total=await page.locator('#tp20-total').textContent().catch(()=>'');
 await check('home displays collected listings',Number(String(total).replace(/[^\d]/g,''))>0,'total='+total);
 await page.screenshot({path:path.join(root,variant+'-home.png'),fullPage:true});
 await geometry('Home');
 await page.evaluate(()=>window.TurinPippsUXV3?.navigate('results'));
 await page.waitForTimeout(300);
 const count=await page.locator('#view-results #list .tp19-property-row').count();
 await check('results have property rows',count>0,'rows='+count);
 await check('result tab is not clipped',await page.evaluate(()=>{
  const selected=document.querySelector('#view-results .tp12-result-tabs .chip.selected');
  if(!selected)return false;
  const r=selected.getBoundingClientRect();
  return r.width>=35&&r.height>=40&&r.right<=innerWidth+3;
 }));
 await page.screenshot({path:path.join(root,variant+'-results.png'),fullPage:width>700});
 await geometry('Results');
 if(count){
  const row=page.locator('#view-results #list .tp19-property-row').first();
  await check('card has primary and save actions',
   await row.locator('[data-action="save"]').count()>0 &&
   await row.locator('.tp19-open').count()>0);
  const details=row.locator('.tp19-property-details');
  await details.locator('summary').click({timeout:5000});
  await check('expanded details visible',await details.evaluate(n=>n.open));
  await page.screenshot({path:path.join(root,variant+'-detail.png'),fullPage:false});
  await details.locator('summary').click({timeout:5000});
  const menu=row.locator('.tp19-more');
  await menu.locator('summary').click({timeout:5000});
  await check('action menu fits viewport',await menu.locator('.tp-card-menu-items').evaluate(el=>{
   const r=el.getBoundingClientRect();
   return r.left>=-1&&r.right<=innerWidth+1&&r.width>100;
  }));
  await page.screenshot({path:path.join(root,variant+'-menu.png'),fullPage:false});
 }
 await page.evaluate(()=>window.TurinPippsUXV3?.navigate('visits'));
 await page.waitForTimeout(150);
 await page.screenshot({path:path.join(root,variant+'-visits.png'),fullPage:false});
 await geometry('Visits');
 await page.evaluate(()=>window.TurinPippsUXV3?.navigate('notifications'));
 await page.waitForTimeout(220);
 const tabs=page.locator('#tp20-notification-tabs [role="tab"]');
 await check('notification tabs present',await tabs.count()===3);
 if(await tabs.count()===3){
  await page.locator('#tp20-tab-preferences').click({timeout:5000});
  await check('preferences tab changes panel',await page.locator('.tp17-preferences-section').evaluate(el=>!el.classList.contains('tp20-tab-hidden')));
  await check('inbox tab gets hidden',await page.locator('.tp17-inbox-section').evaluate(el=>el.classList.contains('tp20-tab-hidden')));
 }
 await page.screenshot({path:path.join(root,variant+'-notifications.png'),fullPage:false});
 await geometry('Notifications');
 await page.evaluate(()=>document.documentElement.setAttribute('data-tp-theme','dark'));
 await page.waitForTimeout(120);
 await geometry('Dark mode');
 await page.screenshot({path:path.join(root,variant+'-dark.png'),fullPage:false});
 await check('no JavaScript runtime exceptions',errors.length===0,errors.join(' | ').slice(0,1000));
 }finally{await browser.close().catch(()=>{})}
}
(async()=>{
 for(const [w,h,name] of [[1440,900,'desktop'],[390,844,'iphone'],[320,700,'small-mobile']]){
  try{await test(w,h,name)}catch(error){failures.push(name+': harness error — '+String(error.stack||error))}
 }
 const report={at:new Date().toISOString(),failures,observations};
 fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2)+'\n');
 for(const observation of observations)console.log((observation.pass?'PASS ':'FAIL ')+observation.variant+' '+observation.name+(observation.detail?' '+observation.detail:''));
 if(failures.length){console.error('QA FAILED:\n'+failures.join('\n'));process.exitCode=1}
 else console.log('QA PASSED: '+observations.length+' browser assertions');
})().catch(error=>{console.error(error);process.exitCode=1});