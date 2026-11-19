/* TurinPipps PWA offline cache. No private account data is cached here. */
const CACHE='turinpipps-shell-v16.0.2';
const CONTENT=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-180.png','./styles-v16.css?v=16.0.2','./experience-v3.js?v=16.0.0','./experience-v4.js?v=15.0.0','./experience-v5.js?v=14.0.1','./organize-v7.js?v=13.0.0','./experience-v8.js?v=8.2.0','./trust-v9.js?v=11.1.0','./experience-v10.js?v=16.0.0','./experience-v12.js?v=16.0.0','./experience-v14.js?v=14.0.3','./experience-v15.js?v=15.0.0','./release.json','./informazioni.html','./widget-iphone.html','./push-config.js?v=5.0.0','./today.html'];
const DATA=['./data/listings.json','./data/diagnostics.json','./data/report_status.json'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    await cache.addAll(CONTENT);
    await Promise.all(DATA.map(path=>cache.add(path).catch(()=>{})));
  }));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys
    .filter(key=>key.startsWith('turinpipps-shell-')&&key!==CACHE)
    .map(key=>caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  // Supabase/GitHub auth tokens never go into Cache Storage.
  if(url.pathname.endsWith('/auth-config.js')||url.pathname.endsWith('/auth.js')||url.pathname.endsWith('/auth-loader.js')||url.pathname.endsWith('/report-config.js'))return;
  if(url.pathname.includes('/data/')){
    const clean=new Request(url.origin+url.pathname);
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const response=await fetch(req);
        if(response.ok)await cache.put(clean,response.clone());
        return response;
      }catch(error){
        const previous=await cache.match(clean);
        return previous||new Response(JSON.stringify({listings:[],sources:[],updated_at:null}),{
          headers:{'Content-Type':'application/json'},status:503
        });
      }
    })());
    return;
  }
  event.respondWith(fetch(req).then(response=>{
    if(response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});
    }
    return response;
  }).catch(()=>caches.match(req)));
});


/* Web Push standard, disponibile anche nelle app Home Screen iOS 16.4+. */
self.addEventListener('push',function(event){
 var payload={title:'TurinPipps',body:'Hai un aggiornamento sulla ricerca casa.',url:'./?screen=notifications'};
 try{if(event.data)payload=Object.assign(payload,event.data.json())}catch(_){}
 var target=new URL('./?screen=notifications',self.registration.scope);
 try{var requested=new URL(payload.url,self.registration.scope);
  if(requested.origin===self.location.origin&&requested.pathname.startsWith(new URL(self.registration.scope).pathname))target=requested;
 }catch(_){}
 event.waitUntil(self.registration.showNotification(String(payload.title||'TurinPipps').slice(0,160),{
  body:String(payload.body||'Nuovo avviso').slice(0,300),
  icon:'./icon-180.png',badge:'./icon-180.png',
  tag:String(payload.tag||'tp-notification').slice(0,150),
  data:{url:target.href},renotify:false
 }));
});
self.addEventListener('notificationclick',function(event){
 event.notification.close();
 var wanted=event.notification.data&&event.notification.data.url||new URL('./?screen=notifications',self.registration.scope).href;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async function(windows){
  for(var i=0;i<windows.length;i++){
   if(windows[i].url.startsWith(self.registration.scope)){
    await windows[i].navigate(wanted);
    return windows[i].focus();
   }
  }
  return self.clients.openWindow(wanted);
 }));
});
