// TurinPipps · Collector v3.1
// Scansioni di ricerca pubblica via indice Bing RSS, senza login o scraping dei portali.
// Invocazione server-to-server protetta da chiave casuale conservata in Supabase Vault.
const JOB_SHA256 = "f56439eb86364195905be2060527f091e4404619203a6ce0f55493dc934a3542";
// Bing RSS non fornisce risultati pertinenti in modo affidabile: resta ricerca manuale in UI.
const QUERY_SET = [] as const;
const PROJECT = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const DB_ROOT = PROJECT + "/rest/v1";
const NO_CACHE = {"Cache-Control":"no-store"};
const JSON_HEADERS = {"Content-Type":"application/json; charset=utf-8",...NO_CACHE};
const ALLOWED_ORIGIN = "https://filippoaprilee.github.io";
function reply(data: unknown, status=200) {
  return new Response(JSON.stringify(data), {status, headers:{...JSON_HEADERS,"Access-Control-Allow-Origin":ALLOWED_ORIGIN}});
}
async function sha256(v:string) {
  const bytes = new TextEncoder().encode(v);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function constantTime(a:string,b:string) {
  if(a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
function dbHeaders(extra:Record<string,string>={}):Record<string,string> {
  return {"apikey":SERVICE_KEY,"Authorization":"Bearer "+SERVICE_KEY,...extra};
}
function unescapeXml(s:string) {
  return String(s||"").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1")
    .replace(/&#x([0-9a-f]+);/gi,(_,v)=>String.fromCodePoint(parseInt(v,16)))
    .replace(/&#(\d+);/g,(_,v)=>String.fromCodePoint(parseInt(v,10)))
    .replace(/&(amp|quot|apos|lt|gt|nbsp);/gi,(_,k)=>({amp:"&",quot:'"',apos:"'",lt:"<",gt:">",nbsp:" "})[k.toLowerCase()]||" ")
    .replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
}
function xmlValue(xml:string,key:string) {
  const m=xml.match(new RegExp("<"+key+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+key+">","i"));
  return m?unescapeXml(m[1]):"";
}
function canonical(link:string) {
  try {
    const u=new URL(link.replace(/&amp;/g,"&"));if(u.protocol!=="https:"&&u.protocol!=="http:")return null;
    u.hostname=u.hostname.toLowerCase();let h=u.hostname.replace(/^www\./,"");
    let source="";
    if(h==="subito.it"&&/^\/appartamenti\/[^/]+\.htm$/i.test(u.pathname))source="Subito";
    if(h==="immobiliare.it"&&/^\/annunci\/\d+\/?$/i.test(u.pathname))source="Immobiliare.it";
    if(h==="idealista.it"&&/^\/immobile\/\d+\/?$/i.test(u.pathname))source="Idealista";
    if(h==="clickcase.it"&&/^\/.*-\d+\.html$/i.test(u.pathname))source="ClickCase";
    if(h.endsWith(".bakeca.it")&&/^\/dettaglio\//i.test(u.pathname))source="Bakeca";
    if(h==="casa.it"&&/^\/immobili\//i.test(u.pathname))source="Casa.it";
    if((h==="facebook.com"||h==="m.facebook.com"||h==="web.facebook.com")
       &&/^\/groups\/[^/]+\/(?:posts|permalink)\/[^/]+\/?$/i.test(u.pathname))
       source="Facebook gruppi pubblici (indice)";
    if(!source)return null;
    u.protocol="https:";u.hash="";u.search="";
    return {url:u.toString().replace(/\/$/,""),source};
  } catch(_) {return null}
}
function zoneOf(text:string){
  for(const zone of ["Crocetta","Cenisia","Borgo San Paolo","San Paolo","Cit Turin","Santa Rita","Pozzo Strada"])
    if(text.toLowerCase().includes(zone.toLowerCase()))return zone;
  return "";
}
const place=/torino|torinese|politecnico|cenisia|crocetta|san paolo|cit turin|santa rita|pozzo strada/i;
function parseRss(xml:string,engine:string,time:string) {
  const items=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];
  const rows:any[]=[];
  for(const item of items.slice(0,40)){
    const linked=canonical(xmlValue(item,"link"));if(!linked)continue;
    const title=xmlValue(item,"title").slice(0,220);
    const description=xmlValue(item,"description").slice(0,1100);
    const context=title+" "+description;
    if(!place.test(context))continue;
    if(/(?:\bstanza\b|\bposto letto\b|\bcamera singola\b)/i.test(title))continue;
    rows.push({
      listing_url:linked.url,
      title:title||("Annuncio "+linked.source+" da verificare"),
      description:description||"Annuncio indicizzato pubblicamente. Canone e condizioni da confermare.",
      source:linked.source,origin_engine:engine,zone:zoneOf(context),
      price:0,private_status:"unverified",last_seen:time
    });
  }
  return rows;
}
async function scanOne(engine:string,query:string,time:string) {
  const endpoint="https://www.bing.com/search?q="+encodeURIComponent(query)+"&format=rss&setlang=it-IT";
  try {
    const resp=await fetch(endpoint,{
      headers:{"User-Agent":"TurinPipps Public Home Search/3.1","Accept":"application/rss+xml,application/xml,text/xml;q=0.8"},
      signal:AbortSignal.timeout(9500)
    });
    if(!resp.ok)return {engine,ok:false,count:0,status:"HTTP "+resp.status,rows:[]};
    const body=await resp.text();
    if(body.length>1200000||!/<rss\b/i.test(body)||!/<item[\s>]/i.test(body))
      return {engine,ok:false,count:0,status:"Non RSS/nessun elemento",rows:[]};
    const rows=parseRss(body,engine,time);
    const itemCount=body.toLowerCase().split("<item>").length-1;
    const pos=body.toLowerCase().indexOf("<item>");
    const end=pos<0?-1:body.toLowerCase().indexOf("</item>",pos);
    const sample=pos<0||end<0?"":body.slice(pos,end+7);
    // Non pubblicare esempi di URL nella diagnostica.
    return {engine,ok:true,count:rows.length,items:itemCount,sample:xmlValue(sample,"link").slice(0,180),status:"ok",rows};
  } catch(e) {return {engine,ok:false,count:0,status:String(e).slice(0,65),rows:[]}}
}

/** Lettura delle pagine pubbliche ClickCase soltanto dove permesso da robots.txt. */
async function robotsPermits(origin:string,path:string) {
  let response:Response;
  try {response=await fetch(origin+"/robots.txt",{signal:AbortSignal.timeout(6000)});}
  catch(_) {return {allowed:false,reason:"robots non raggiungibile"};}
  if(response.status===404)return {allowed:true,reason:"robots assente"};
  if(!response.ok)return {allowed:false,reason:"robots HTTP "+response.status};
  const robots=(await response.text()).slice(0,300000);
  const groups:{agents:string[],rules:{type:string,pattern:string}[]}[]=[];
  let agents:string[]=[],rules:{type:string,pattern:string}[]=[];
  const flush=()=>{if(agents.length)groups.push({agents,rules});agents=[];rules=[]};
  for(const raw of robots.split(/\r?\n/)){
    const line=raw.split("#")[0].trim();
    if(!line){flush();continue}
    const idx=line.indexOf(":");if(idx<0)continue;
    const key=line.slice(0,idx).trim().toLowerCase(),value=line.slice(idx+1).trim();
    if(key==="user-agent"){
      if(rules.length)flush();
      agents.push(value.toLowerCase());
    } else if(key==="disallow"||key==="allow") {
      if(!agents.length)continue;
      rules.push({type:key,pattern:value});
    }
  }
  flush();
  const specific=groups.filter(g=>g.agents.some(a=>a==="turinpipps"||a==="turinpipps/3.1"));
  const applicable=specific.length?specific:groups.filter(g=>g.agents.includes("*"));
  let best=-1,grant=true;
  for(const g of applicable)for(const r of g.rules){
    if(!r.pattern)continue;
    const prefix=r.pattern.split("*")[0].replace(/\$/,"");
    if(path.startsWith(prefix)&&prefix.length>=best){best=prefix.length;grant=r.type==="allow"}
  }
  return {allowed:grant,reason:grant?"consentito":"vietato da robots.txt"};
}
async function collectClickCase(time:string){
  const origin="https://www.clickcase.it",pages=[
    "/annunci/affitti-case-privati-torino.html",
    "/annunci/affitti-appartamenti-privati-torino.html"
  ];
  const first=await robotsPermits(origin,pages[0]);
  if(!first.allowed)return {engine:"ClickCase diretto",ok:false,count:0,items:0,status:first.reason,rows:[]};
  const found=new Map<string,any>();let success=0;
  for(const path of pages){
    const allow=await robotsPermits(origin,path);if(!allow.allowed)continue;
    try{
      const response=await fetch(origin+path,{signal:AbortSignal.timeout(7000),
        headers:{"User-Agent":"TurinPipps/3.1 (+public rental listings)"}});
      if(!response.ok)continue;
      const html=(await response.text()).slice(0,1200000);
      if(!/<html/i.test(html))continue;
      success++;
      const re=/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let m:RegExpExecArray|null,seenHere=0;
      while((m=re.exec(html))!==null&&seenHere<70){
        let u:string;try{u=new URL(m[1],origin).toString()}catch(_){continue}
        const link=canonical(u);if(!link||link.source!=="ClickCase"||found.has(link.url))continue;
        const context=unescapeXml(html.slice(Math.max(0,m.index-250),Math.min(html.length,m.index+600)));
        const area=zoneOf(context);
        if(!area)continue;
        const title=unescapeXml(m[2]).slice(0,210);
        if(!title||title.length<7||/camera|posto letto|stanza/i.test(title))continue;
        found.set(link.url,{
          listing_url:link.url,title,description:"Annuncio da pagina pubblica ClickCase, da confermare con il proprietario.",
          source:"ClickCase",origin_engine:"pagina_pubblica_clickcase",zone:area,
          price:0,private_status:"source",last_seen:time
        });
        seenHere++;
      }
    }catch(e){console.warn("ClickCase read",String(e).slice(0,90))}
  }
  return {engine:"ClickCase diretto",ok:success>0,count:found.size,items:found.size,
    status:success?success+" pagine lette":first.reason+"; pagina non leggibile",rows:[...found.values()]};
}


function unwrapGoogle(link:string){
  let value=unescapeXml(link);
  for(let n=0;n<3;n++){
    try{
      const u=new URL(value),host=u.hostname.toLowerCase();
      if(!/(?:^|\.)google\.(?:com|it)$/.test(host))return value;
      const next=u.searchParams.get("url")||u.searchParams.get("q")||u.searchParams.get("u");
      if(!next||!next.startsWith("http"))return value;
      value=next;
    }catch(_){return value}
  }
  return value;
}
/** Lettura di Google Alerts RSS già creati dall'utente; ricevuti solo via cron autenticato. */
async function readGoogleAlerts(feedURLs:string[],time:string){
  const feeds=feedURLs.filter(x=>/^https:\/\/(?:www\.)?google\.com\/alerts\/feeds\/[0-9]+\/[0-9]+$/.test(x)).slice(0,20);
  const reports:any[]=[];
  for(let offset=0;offset<feeds.length;offset+=4){
    const out=await Promise.all(feeds.slice(offset,offset+4).map(async feed=>{
      try{
        const r=await fetch(feed,{signal:AbortSignal.timeout(7000),
          headers:{"Accept":"application/atom+xml,application/xml;q=0.9"}});
        if(!r.ok)return {engine:"Google Alerts",ok:false,count:0,items:0,status:"HTTP "+r.status,rows:[]};
        const body=(await r.text()).slice(0,1500000);
        if(!/<feed[\s>]/i.test(body))return {engine:"Google Alerts",ok:false,count:0,items:0,status:"Risposta non Atom",rows:[]};
        const entries=body.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi)||[];
        const rows=new Map<string,any>();
        for(const block of entries){
          const title=xmlValue(block,"title").slice(0,220);
          const snippet=xmlValue(block,"content")||xmlValue(block,"summary");
          const linkMatch=block.match(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\/?>/i);
          const raw=linkMatch?linkMatch[1]:"";
          let found=canonical(unwrapGoogle(raw));
          if(!found){
            const candidates=[...snippet.matchAll(/href\s*=\s*["'](https?:[^"']+)["']/gi)];
            for(const match of candidates){found=canonical(unwrapGoogle(match[1]));if(found)break;}
          }
          if(!found)continue;
          if(!place.test(title+" "+snippet))continue;
          if(/(?:\bstanza\b|\bcamera singola\b|\bposto letto\b)/i.test(title))continue;
          rows.set(found.url,{
            listing_url:found.url,title:title||"Annuncio da verificare",description:snippet.slice(0,1250),
            source:found.source,origin_engine:"Google Alerts RSS",zone:zoneOf(title+" "+snippet),
            price:0,private_status:"unverified",last_seen:time
          });
        }
        return {engine:"Google Alerts",ok:true,count:rows.size,items:entries.length,status:"ok",rows:[...rows.values()]};
      }catch(e){return {engine:"Google Alerts",ok:false,count:0,items:0,status:String(e).slice(0,70),rows:[]};}
    }));
    reports.push(...out);
  }
  return reports;
}


async function collectOtherPublicPages(time:string){
 const sites=[
  {engine:"Bakeca privati",origin:"https://torino.bakeca.it",path:"/annunci/offro-casa/inserzionistacase/privato/",expected:"Bakeca"},
  {engine:"Immobiliare privati",origin:"https://www.immobiliare.it",path:"/affitto-case/torino/da-privati/",expected:"Immobiliare.it"}
 ];
 const outputs:any[]=[];
 for(const site of sites){
  try{
   const robots=await robotsPermits(site.origin,site.path);
   if(!robots.allowed){outputs.push({engine:site.engine,ok:false,count:0,items:0,status:robots.reason,rows:[]});continue}
   const response=await fetch(site.origin+site.path,{signal:AbortSignal.timeout(9000),
    headers:{"User-Agent":"TurinPipps/3.1 (public listing collector, respects robots.txt)"}});
   if(!response.ok){outputs.push({engine:site.engine,ok:false,count:0,items:0,status:"HTTP "+response.status,rows:[]});continue}
   const html=(await response.text()).slice(0,1800000);
   if(!/<html/i.test(html)){outputs.push({engine:site.engine,ok:false,count:0,items:0,status:"HTML assente",rows:[]});continue}
   const regex=/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
   const rows=new Map<string,any>();let m:RegExpExecArray|null,attempts=0;
   while((m=regex.exec(html))!==null&&attempts<650){
     attempts++;
     let absolute:string;try{absolute=new URL(m[1],site.origin).toString()}catch(_){continue}
     const data=canonical(absolute);
     if(!data||data.source!==site.expected||rows.has(data.url))continue;
     const title=unescapeXml(m[2]).slice(0,200);
     if(!title||title.length<8||/^(?:info|mappa|foto|dettagli|annuncio|apri)$/i.test(title))continue;
     const near=unescapeXml(html.slice(Math.max(0,m.index-220),Math.min(html.length,m.index+430)));
     const zone=zoneOf(title+" "+near);if(!zone)continue;
     if(/\b(?:stanza|camera singola|posto letto)\b/i.test(title))continue;
     rows.set(data.url,{
       listing_url:data.url,title,description:"Annuncio trovato nella sezione pubblica dei privati. Condizioni e disponibilità da verificare.",
       source:site.engine,origin_engine:"pagina_pubblica",zone,price:0,
       private_status:"unverified",last_seen:time
     });
     if(rows.size>=60)break;
   }
   outputs.push({engine:site.engine,ok:true,count:rows.size,items:attempts,status:"pagina consultata",rows:[...rows.values()]});
  }catch(e){outputs.push({engine:site.engine,ok:false,count:0,items:0,status:String(e).slice(0,75),rows:[]})}
 }
 return outputs;
}

async function scan(time:string,feeds:string[]){
  const started=Date.now(),outputs:any[]=[];
  // Richieste limitate a gruppi di tre; nessun login Facebook, nessun aggiramento di blocchi.
  for(let i=0;i<QUERY_SET.length;i+=3){
    outputs.push(...await Promise.all(QUERY_SET.slice(i,i+3).map(([e,q])=>scanOne(e,q,time))));
  }
  outputs.push(await collectClickCase(time));
  // Bakeca e Immobiliare.it: robots.txt ne vieta la lettura automatica; consultabili manualmente dal Radar.
  outputs.push(...await readGoogleAlerts(feeds,time));
  const found=new Map<string,any>();
  outputs.flatMap(x=>x.rows).forEach(x=>{if(!found.has(x.listing_url))found.set(x.listing_url,x)});
  const all=[...found.values()],ok=outputs.filter(x=>x.ok).length;
  const stats=outputs.map(({engine,ok,count,items,status})=>({engine,ok,count,items:items||0,status}));
  let saved=0;
  if(all.length){
    const existingRes=await fetch(DB_ROOT+"/turinpipps_discovered_listings?select=listing_url,first_seen,title,description,price,expenses,source_updated,sqm,address,property_type,origin_engine,evidence_url,private_status&limit=10000",{headers:dbHeaders()});
    if(!existingRes.ok)throw new Error("Database read HTTP "+existingRes.status);
    const existing=new Map((await existingRes.json()).map((v:any)=>[v.listing_url,v]));
    const rows=all.map(x=>{
      const old:any=existing.get(x.listing_url)||{};
      // Non cancellare canone, data originale e informazioni verificate quando un feed
      // contiene soltanto titolo e URL. Il feed rinnova last_seen, non published_at.
      const richer=old.origin_engine==="ricerca_web_verificata";
      return {...x,
        first_seen:old.first_seen||time,
        title:richer&&old.title?old.title:x.title,
        description:richer&&old.description?old.description:x.description,
        price:Number(old.price)>0?old.price:x.price,
        expenses:Number(old.expenses)||0,
        sqm:Number(old.sqm)||0,
        address:old.address||"",
        property_type:old.property_type||"",
        source_updated:old.source_updated||null,
        evidence_url:old.evidence_url||"",
        origin_engine:richer?old.origin_engine:x.origin_engine,
        private_status:richer?old.private_status:x.private_status
      }
    });
    for(let i=0;i<rows.length;i+=100){
      const r=await fetch(DB_ROOT+"/turinpipps_discovered_listings?on_conflict=listing_url",{
        method:"POST",headers:dbHeaders({"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"}),
        body:JSON.stringify(rows.slice(i,i+100))
      });
      if(!r.ok)throw new Error("Database upsert HTTP "+r.status+" "+(await r.text()).slice(0,150));
      saved+=Math.min(100,rows.length-i);
    }
  }
  const entry={started_at:time,finished_at:new Date().toISOString(),
    status:ok===0?"failed":ok===outputs.length?"ok":"partial",
    jobs_checked:outputs.length,jobs_ok:ok,discovered:saved,
    details:{engines:stats,duration_ms:Date.now()-started}};
  const stored=await fetch(DB_ROOT+"/turinpipps_scan_runs",{
    method:"POST",headers:dbHeaders({"Content-Type":"application/json","Prefer":"return=minimal"}),body:JSON.stringify(entry)
  });
  if(!stored.ok)throw new Error("Scan status HTTP "+stored.status);
  return {success:ok>0,discovered:saved,engines_ok:ok,total_engines:outputs.length,elapsed_ms:Date.now()-started};
}
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
    "Access-Control-Allow-Origin":ALLOWED_ORIGIN,"Access-Control-Allow-Methods":"GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type,x-tp-scan-secret"
  }});
  if(req.method==="GET")return reply({name:"TurinPipps collector",version:"3.1",status:"ready"});
  if(req.method!=="POST")return reply({error:"Method not allowed"},405);
  const given=req.headers.get("x-tp-scan-secret")||"";
  if(given.length<40||given.length>256||!constantTime(await sha256(given),JOB_SHA256))
    return reply({error:"Unauthorized"},401);
  if(!SERVICE_KEY||!PROJECT)return reply({error:"Backend non configurato"},503);
  try{
    let body:any={};try{body=await req.json()}catch(_){}
    const feeds=Array.isArray(body.rss_feeds)?body.rss_feeds.filter((v:any)=>typeof v==='string'):[];
    return reply(await scan(new Date().toISOString(),feeds));
  }
  catch(e){console.error("TurinPipps collector failure",String(e).slice(0,200));return reply({error:"Scansione non completata"},500)}
});
