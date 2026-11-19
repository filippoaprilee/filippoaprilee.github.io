// TurinPipps · Collector v11: source-safe enrichment, provenance and quality metrics
// Scansioni di ricerca pubblica via indice Bing RSS, senza login o scraping dei portali.
// Invocazione server-to-server protetta da chiave casuale conservata in Supabase Vault.
import {extractClickCaseDetails,sourceIdentity} from "./listing-extractor.js";
const ROBOTS_CACHE=new Map<string,Promise<{status:number,ok:boolean,content:string}>>();
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
    if(h==="clickcase.it"||h==="immobiliare.it"||h==="subito.it"||h==="idealista.it")u.hostname="www."+h;
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
  for(const zone of ["Crocetta","Cenisia","Borgo San Paolo","San Paolo","Cit Turin","Santa Rita"])
    if(text.toLowerCase().includes(zone.toLowerCase()))return zone;
  return "";
}
const place=/torino|torinese|politecnico|cenisia|crocetta|san paolo|cit turin|santa rita/i;
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
  let robotsFile:{status:number,ok:boolean,content:string};
  try {
    if(!ROBOTS_CACHE.has(origin)){
      ROBOTS_CACHE.set(origin,(async()=>{
        const response=await fetch(origin+"/robots.txt",{signal:AbortSignal.timeout(6000)});
        return {status:response.status,ok:response.ok,content:response.ok?(await response.text()).slice(0,300000):""};
      })());
    }
    robotsFile=await ROBOTS_CACHE.get(origin)!;
  }catch(_) {return {allowed:false,reason:"robots non raggiungibile"};}
  if(robotsFile.status===404)return {allowed:true,reason:"robots assente"};
  if(!robotsFile.ok)return {allowed:false,reason:"robots HTTP "+robotsFile.status};
  const robots=robotsFile.content;
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
  const origin="https://www.clickcase.it";
  const paths=[
    "/annunci/affitti-case-privati-torino.html",
    "/annunci/affitti-appartamenti-privati-torino.html",
    "/annunci/appartamenti-in-affitto-privati-torino.html"
  ];
  const found=new Map<string,any>();let pagesRead=0,denied=0,attempts=0;
  // Consultazione graduale di pagine pubbliche, solo se autorizzate. Nessuna autenticazione.
  for(const path of paths){
    for(let page=1;page<=5;page++){
      const requested=path+(page>1?"?pagina="+page:"");
      const allowed=await robotsPermits(origin,requested);
      if(!allowed.allowed){denied++;break}
      try{
        const response=await fetch(origin+requested,{signal:AbortSignal.timeout(7500),
          headers:{"User-Agent":"TurinPipps/4.0 (+public housing index)","Accept":"text/html"}});
        if(!response.ok)break;
        const html=(await response.text()).slice(0,1400000);
        if(!/<html/i.test(html))break;
        pagesRead++;
        const re=/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let m:RegExpExecArray|null,newOnPage=0,localCount=0;
        while((m=re.exec(html))!==null&&localCount++<550){
          let full:string;try{full=new URL(m[1],origin).toString()}catch(_){continue}
          const item=canonical(full);
          if(!item||item.source!=="ClickCase"||found.has(item.url))continue;
          const headline=unescapeXml(m[2]).slice(0,220);
          if(!headline||headline.length<10||/^(?:affitto|cenisia|appartamento|disponibile)$/i.test(headline)||/\b(?:camera|posto letto|stanza|doppia per ragazze|box|garage|posto auto|autorimessa|magazzino|negozio)\b/i.test(headline))continue;
          const snippet=unescapeXml(html.slice(Math.max(0,m.index-160),Math.min(html.length,m.index+750)));
          const zone=zoneOf(headline+" "+snippet);
          if(!zone)continue;
          // A price near the link can belong to an adjacent card: no amount is trusted here.
          // Monthly rent is extracted only from an explicit label on a permitted detail page.
          found.set(item.url,{
            listing_url:item.url,title:headline,description:snippet.slice(0,450),
            source:"ClickCase",origin_engine:"ClickCase: pagine pubbliche",zone,
            price:0,private_status:"source",last_seen:time
          });
          newOnPage++;
        }
        attempts++;
        if(newOnPage===0&&page>2)break;
      }catch(e){console.warn("ClickCase source error",String(e).slice(0,90));break}
    }
  }
  return {engine:"ClickCase diretto",ok:pagesRead>0,count:found.size,items:attempts,
    status:pagesRead+" pagine consultate"+(denied?", "+denied+" escluse da robots.txt":""),
    rows:[...found.values()]};
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


/** Small, rotating link-health audit. A reachable URL is NOT evidence that the home is available.
    Check at most four links per scan; respect robots.txt; never work around access controls. */
async function checkListingLinks(){
 const result={checked:0,reachable:0,missing:0,blocked:0,errors:0};
 const url=DB_ROOT+"/turinpipps_discovered_listings?select=listing_url,link_status,link_failure_count,link_checked_at&order=link_checked_at.asc.nullsfirst&limit=4";
 const response=await fetch(url,{headers:dbHeaders(),signal:AbortSignal.timeout(9000)});
 if(!response.ok)throw Error("Link audit read "+response.status);
 const candidates=await response.json();
 await Promise.all(candidates.map(async (item:any)=>{
   const normalized=canonical(String(item.listing_url||""));
   if(!normalized)return;
   let status="error",code:number|null=null;
   const previous=Math.max(0,Number(item.link_failure_count)||0);
   let failures=previous;
   try{
     const target=new URL(normalized.url);
     const permission=await robotsPermits(target.origin,target.pathname);
     if(!permission.allowed){status="blocked";failures=0;}
     else{
       const head=await fetch(normalized.url,{method:"HEAD",redirect:"manual",
         headers:{"User-Agent":"TurinPipps/3.1 (link check; respects robots.txt)"},
         signal:AbortSignal.timeout(6500)});
       code=head.status;
       if(code>=200&&code<300){status="reachable";failures=0;}
       else if(code===404||code===410){
         failures=Math.min(1000,previous+1);
         status=failures>=2?"missing":"error";
       }else if([401,403,405,429].includes(code)||code>=300&&code<400){status="blocked";failures=0;}
       else {status="error";failures=0;}
     }
   }catch(_){status="error";failures=0;}
   const update=await fetch(DB_ROOT+"/turinpipps_discovered_listings?listing_url=eq."+encodeURIComponent(item.listing_url),{
     method:"PATCH",headers:dbHeaders({"Content-Type":"application/json","Prefer":"return=minimal"}),
     body:JSON.stringify({link_status:status,link_checked_at:new Date().toISOString(),
       link_http_status:code,link_failure_count:failures}),
     signal:AbortSignal.timeout(7000)
   });
   if(!update.ok){result.errors++;return;}
   result.checked++;
   if(status==="reachable")result.reachable++;
   else if(status==="missing")result.missing++;
   else if(status==="blocked")result.blocked++;
   else result.errors++;
 }));
 return result;
}

/** A small rotating detail-page queue, never a mass scraper.
    No fetch without a robots.txt allowance. No blind assertion of availability. */
async function enrichClickCase(rows:any[],existing:Map<string,any>,time:string){
 const totals={checked:0,read:0,blocked:0,errors:0,new_fields:0};
 const found=new Map<string,any>();
 const choices=rows.filter(a=>a.source==="ClickCase").map(a=>({row:a,old:existing.get(a.listing_url)||{}}))
 .filter(({old})=>{
   if(!old.detail_checked_at)return true;
   // Respect repeated blocking: no aggressive retries against a closed source.
   const nextMs=old.detail_status==="blocked"?14*86400000:
     old.detail_status==="not_found"?14*86400000:
     Number(old.price)<=0?72*3600000:
     (!Number(old.sqm)||!old.address||!old.published_at)?4*86400000:21*86400000;
   return Date.now()-Date.parse(old.detail_checked_at)>nextMs;
 })
 .sort((a,b)=>(a.old.detail_checked_at?1:0)-(b.old.detail_checked_at?1:0)
    ||(Date.parse(a.old.detail_checked_at||"")||0)-(Date.parse(b.old.detail_checked_at||"")||0))
 .slice(0,3);
 await Promise.all(choices.map(async ({row})=>{
   const now=new Date().toISOString();
   const out:any={status:"error",checked_at:now,fields:{},field_provenance:{}};
   try{
     const target=new URL(row.listing_url);
     const permission=await robotsPermits(target.origin,target.pathname);
     if(!permission.allowed){out.status="blocked";totals.blocked++;}
     else{
       const response=await fetch(row.listing_url,{signal:AbortSignal.timeout(7500),redirect:"manual",
         headers:{"User-Agent":"TurinPipps/4.1 (public details, respects robots.txt)","Accept":"text/html"}});
       if(response.status===404||response.status===410){out.status="not_found";totals.errors++;}
       else if(response.status===401||response.status===403||response.status===429||response.status>=300&&response.status<400){out.status="blocked";totals.blocked++;}
       else if(!response.ok){out.status="error";totals.errors++;}
       else{
         const text=(await response.text()).slice(0,1450000);
         if(!/<html\b/i.test(text)){totals.errors++;}
         else{
           const parsed=extractClickCaseDetails(text,row.listing_url,now);
           out.status=parsed.status==="source_read"?"source_read":"error";
           out.fields=parsed.fields;out.field_provenance=parsed.field_provenance;
           if(out.status==="source_read"){totals.read++;totals.new_fields+=Object.keys(out.fields).length;}
           else totals.errors++;
         }
       }
     }
   }catch(e){totals.errors++;console.warn("Detail read inconclusive",String(e).slice(0,85));}
   totals.checked++;
   found.set(row.listing_url,out);
 }));
 return {found,totals};
}
function mergeSourceDetail(row:any,old:any,detail:any,time:string){
 let combined:any={...row};
 const metadata:any={...(old.field_provenance&&typeof old.field_provenance==="object"?old.field_provenance:{})};
 if(detail&&detail.status==="source_read"){
  for(const [key,value] of Object.entries(detail.fields||{})){
   const prior:any=metadata[key]||{};
   const sameSource=prior.origin==="public_listing_page"&&prior.evidence_url===row.listing_url;
   const independent=old.verification_level==="owner_confirmed";
   const external=old.origin_engine==="ricerca_web_verificata";
   let use=false;
   if(key==="price")use=!independent&&!external&&(
     !(Number(old.price)>0)||(sameSource&&Number(old.price)!==Number(value)));
   else if(key==="expenses"||key==="sqm")use=!independent&&!external&&(
     !(Number(old[key])>0)||(sameSource&&Number(old[key])!==Number(value)));
   else if(key==="address")use=!independent&&!external&&(!old.address||sameSource);
   else if(key==="zone"||key==="property_type")use=!independent&&!external&&(!old[key]||sameSource||key==="zone");
   else if(key==="description")use=!independent&&!external&&(!old.description||old.description.length<60||sameSource);
   else if(key==="source_updated")use=!!value&&(!old.source_updated||sameSource&&Date.parse(String(value))>=Date.parse(old.source_updated));
   else if(key==="published_at")use=!!value&&!old.published_at;
   else if(key==="private_status")use=old.private_status!=="confirmed"&&old.verification_level!=="owner_confirmed";
   if(use){
     combined[key]=value;
     metadata[key]=detail.field_provenance[key];
   }
  }
  if(Object.keys(detail.fields).length&&(!old.evidence_url||old.evidence_url===row.listing_url))
    combined.evidence_url=row.listing_url;
 }
 combined.field_provenance=metadata;
 combined.detail_checked_at=detail?.checked_at||old.detail_checked_at||null;
 combined.detail_status=detail?.status||old.detail_status||"unchecked";
 // Never call a source claim independently confirmed.
 combined.verification_level=old.verification_level||"unverified";
 combined.verification_reason=old.verification_reason||"";
 combined.last_verified_at=old.last_verified_at||null;
 combined.price_verified_at=old.price_verified_at||null;
 combined.availability_status=old.availability_status||"unknown";
 combined.expired_at=old.expired_at||null;
 combined.published_at=combined.published_at||old.published_at||null;
 combined.source_updated=combined.source_updated||old.source_updated||null;
 return combined;
}

async function scan(time:string,feeds:string[]){
  // Refresh robots.txt permissions on every scan; cache only within this run.
  ROBOTS_CACHE.clear();
  const started=Date.now(),outputs:any[]=[];
  // Richieste limitate a gruppi di tre; nessun login Facebook, nessun aggiramento di blocchi.
  for(let i=0;i<QUERY_SET.length;i+=3){
    outputs.push(...await Promise.all(QUERY_SET.slice(i,i+3).map(([e,q])=>scanOne(e,q,time))));
  }
  outputs.push(await collectClickCase(time));
  // Bakeca e Immobiliare.it: robots.txt ne vieta la lettura automatica; consultabili manualmente dal Radar.
  outputs.push(...await readGoogleAlerts(feeds,time));
  const found=new Map<string,any>();
  let duplicateSightings=0;
  // Only retain requested districts before deduplication and database writes.
  const disallowed=/pozzo[\s./_-]*strada/i;
  let excludedObservations=0;
  outputs.flatMap(x=>x.rows).forEach(x=>{
    if(disallowed.test([x.zone,x.title,x.description,x.address,x.listing_url].join(" "))){
      excludedObservations++;return;
    }
    const key=sourceIdentity(x.listing_url)||x.listing_url;
    if(found.has(key)){
      duplicateSightings++;
      const old=found.get(key);
      if((!old.price&&x.price)||(String(x.description||"").length>String(old.description||"").length&&x.source===old.source)){
        found.set(key,{...old,...x,listing_url:old.listing_url});
      }
    }else found.set(key,x);
  });
  const all=[...found.values()],ok=outputs.filter(x=>x.ok).length;
  const stats=outputs.map(({engine,ok,count,items,status})=>({engine,ok,count,items:items||0,status}));
  let saved=0,newLinks=0;
  let quality:any[]=[];let enrichmentStats:any={checked:0,read:0,blocked:0,errors:0,new_fields:0};
  if(all.length){
    const existingRes=await fetch(DB_ROOT+"/turinpipps_discovered_listings?select=listing_url,first_seen,title,description,price,expenses,source_updated,sqm,address,property_type,origin_engine,evidence_url,private_status,published_at,last_verified_at,price_verified_at,verification_level,verification_reason,availability_status,expired_at,field_provenance,detail_checked_at,detail_status&limit=10000",{headers:dbHeaders()});
    if(!existingRes.ok)throw new Error("Database read HTTP "+existingRes.status);
    const previous=await existingRes.json();
    const existing=new Map(previous.map((v:any)=>[v.listing_url,v]));
    const identityKeys=new Map(previous.map((v:any)=>[sourceIdentity(v.listing_url),v.listing_url]));
    // Keep the existing primary URL when an alternate URL points to the same source ID.
    for(const row of all){
      if(!existing.has(row.listing_url)){
        const original=identityKeys.get(sourceIdentity(row.listing_url));
        if(original&&original!==row.listing_url){
          duplicateSightings++;
          row.listing_url=original;
        }
      }
    }
    const combined=new Map<string,any>();
    for(const x of all)if(!combined.has(x.listing_url))combined.set(x.listing_url,x);
    const unique=[...combined.values()];
    newLinks=unique.filter(x=>!existing.has(x.listing_url)).length;
    const enriched=await enrichClickCase(unique,existing,time);
    enrichmentStats=enriched.totals;
    const rows=unique.map(x=>{
      const old:any=existing.get(x.listing_url)||{};
      const richer=old.origin_engine==="ricerca_web_verificata";
      const baseline:any={...x,
        first_seen:old.first_seen||time,
        title:richer&&old.title?old.title:x.title,
        description:richer&&old.description?old.description:x.description,
        price:Number(old.price)>0?old.price:x.price,
        expenses:Number(old.expenses)||0,
        sqm:Number(old.sqm)||0,
        address:old.address||"",
        property_type:old.property_type||"",
        source_updated:old.source_updated||null,
        published_at:old.published_at||null,
        evidence_url:old.evidence_url||"",
        origin_engine:richer?old.origin_engine:x.origin_engine,
        private_status:old.private_status==="confirmed"?"confirmed":richer?old.private_status:x.private_status
      };
      return mergeSourceDetail(baseline,old,enriched.found.get(x.listing_url),time);
    });
    const grouped=new Map<string,any>();
    for(const o of outputs){
      const group=grouped.get(o.engine)||{source:o.engine,checks:0,ok:0,found:0,unique:0,new:0,errors:0,blocked:0};
      group.checks++;if(o.ok)group.ok++;else group.errors++;
      group.found+=(o.rows||[]).length;
      if(/robots|bloccato|403|429/i.test(String(o.status||"")))group.blocked++;
      grouped.set(o.engine,group);
    }
    for(const row of unique){
      const engine=row.origin_engine?.startsWith("ClickCase")?"ClickCase diretto":
        row.origin_engine==="Google Alerts RSS"?"Google Alerts":row.origin_engine;
      const group=grouped.get(engine);
      if(group){group.unique++;if(!existing.has(row.listing_url))group.new++;}
    }
    quality=[...grouped.values()];
    for(let i=0;i<rows.length;i+=100){
      const r=await fetch(DB_ROOT+"/turinpipps_discovered_listings?on_conflict=listing_url",{
        method:"POST",headers:dbHeaders({"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"}),
        body:JSON.stringify(rows.slice(i,i+100))
      });
      if(!r.ok)throw new Error("Database upsert HTTP "+r.status+" "+(await r.text()).slice(0,150));
      saved+=Math.min(100,rows.length-i);
    }
  }
  const health=await checkListingLinks().catch(e=>{console.warn("Link audit partial",String(e).slice(0,90));return {checked:0,errors:1}});
  const entry={started_at:time,finished_at:new Date().toISOString(),
    status:ok===0?"failed":ok===outputs.length?"ok":"partial",
    jobs_checked:outputs.length,jobs_ok:ok,discovered:newLinks,
    details:{engines:stats,source_quality:quality,detail_enrichment:enrichmentStats,
      dedup:{raw:outputs.reduce((n,x)=>n+(x.rows||[]).length,0),unique:all.length,
        duplicate_observations:duplicateSightings,excluded_zone_observations:excludedObservations,new_unique:newLinks},
      link_health:health,duration_ms:Date.now()-started}};
  const stored=await fetch(DB_ROOT+"/turinpipps_scan_runs",{
    method:"POST",headers:dbHeaders({"Content-Type":"application/json","Prefer":"return=minimal"}),body:JSON.stringify(entry)
  });
  if(!stored.ok)throw new Error("Scan status HTTP "+stored.status);
  return {success:ok>0,discovered:newLinks,processed:saved,engines_ok:ok,total_engines:outputs.length,elapsed_ms:Date.now()-started};
}
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
    "Access-Control-Allow-Origin":ALLOWED_ORIGIN,"Access-Control-Allow-Methods":"GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type,x-tp-scan-secret"
  }});
  if(req.method==="GET")return reply({name:"TurinPipps collector",version:"11.0",status:"ready"});
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
