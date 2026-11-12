/* TurinPipps PWA offline cache. No private account data is cached here. */
const CACHE='turinpipps-shell-v1.5.0';
const CONTENT=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-180.png'];
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
  if(url.pathname.endsWith('/auth-config.js')||url.pathname.endsWith('/auth.js')||url.pathname.endsWith('/auth-loader.js'))return;
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
