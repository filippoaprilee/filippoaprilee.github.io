// TurinPipps · Collector v3.1
// Scansioni di ricerca pubblica via indice Bing RSS, senza login o scraping dei portali.
// Invocazione server-to-server protetta da chiave casuale conservata in Supabase Vault.
const JOB_SHA256 = "f56439eb86364195905be2060527f091e4404619203a6ce0f55493dc934a3542";
const QUERY_SET = [
  ["Subito", "site:subito.it/appartamenti/ Torino affitto privato bilocale Cenisia San Paolo"],
  ["Immobiliare.it", "site:immobiliare.it/annunci/ Torino affitto privato Politecnico Crocetta"],
  ["Idealista", "site:idealista.it/immobile/ Torino affitto da privato appartamento"],
  ["ClickCase", "site:clickcase.it Torino affitto privato bilocale arredato"],
  ["Bakeca", "site:bakeca.it/dettaglio/offro-casa/ Torino affitto privato"],
  ["Casa.it", "site:casa.it/immobili/ Torino affitto privato"],
  ["Facebook gruppi", "site:facebook.com/groups/ Torino affitto appartamento privato Politecnico"],
  ["Facebook annunci", "site:facebook.com/groups/ Torino bilocale affitto Cenisia Crocetta"]
] as const;
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
    return {engine,ok:true,count:rows.length,status:"ok",rows};
  } catch(e) {return {engine,ok:false,count:0,status:String(e).slice(0,65),rows:[]}}
}
async function scan(time:string){
  const started=Date.now(),outputs:any[]=[];
  // Richieste limitate a gruppi di tre; nessun login Facebook, nessun aggiramento di blocchi.
  for(let i=0;i<QUERY_SET.length;i+=3){
    outputs.push(...await Promise.all(QUERY_SET.slice(i,i+3).map(([e,q])=>scanOne(e,q,time))));
  }
  const found=new Map<string,any>();
  outputs.flatMap(x=>x.rows).forEach(x=>{if(!found.has(x.listing_url))found.set(x.listing_url,x)});
  const all=[...found.values()],ok=outputs.filter(x=>x.ok).length;
  const stats=outputs.map(({engine,ok,count,status})=>({engine,ok,count,status}));
  let saved=0;
  if(all.length){
    const existingRes=await fetch(DB_ROOT+"/turinpipps_discovered_listings?select=listing_url,first_seen&limit=10000",{headers:dbHeaders()});
    if(!existingRes.ok)throw new Error("Database read HTTP "+existingRes.status);
    const existing=new Map((await existingRes.json()).map((v:any)=>[v.listing_url,v.first_seen]));
    const rows=all.map(x=>({...x,first_seen:existing.get(x.listing_url)||time}));
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
    status:ok===0?"failed":ok===QUERY_SET.length?"ok":"partial",
    jobs_checked:QUERY_SET.length,jobs_ok:ok,discovered:saved,
    details:{engines:stats,duration_ms:Date.now()-started}};
  const stored=await fetch(DB_ROOT+"/turinpipps_scan_runs",{
    method:"POST",headers:dbHeaders({"Content-Type":"application/json","Prefer":"return=minimal"}),body:JSON.stringify(entry)
  });
  if(!stored.ok)throw new Error("Scan status HTTP "+stored.status);
  return {success:ok>0,discovered:saved,engines_ok:ok,total_engines:QUERY_SET.length,elapsed_ms:Date.now()-started};
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
  try{return reply(await scan(new Date().toISOString()))}
  catch(e){console.error("TurinPipps collector failure",String(e).slice(0,200));return reply({error:"Scansione non completata"},500)}
});
