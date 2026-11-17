// TurinPipps Playwright ingestion endpoint. Only server-to-server with secret token.
// Receives public housing links from the optional browser worker, never browser credentials.
const ROOT=Deno.env.get("SUPABASE_URL")||"";
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const SECRET=Deno.env.get("TURINPIPPS_WORKER_TOKEN")||"";
const h=(extra:Record<string,string>={})=>({"apikey":KEY,"Authorization":"Bearer "+KEY,...extra});
const reply=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
function equal(a:string,b:string){
 if(a.length!==b.length)return false;let n=0;
 for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);
 return n===0;
}
function canonical(raw:string){
 try{
  const u=new URL(raw);
  if(u.protocol!=="https:")return null;
  if(!["www.clickcase.it","clickcase.it"].includes(u.hostname.toLowerCase()))return null;
  if(!/[-_]\d+\.html$/i.test(u.pathname))return null;
  u.protocol="https:";u.hostname="www.clickcase.it";u.hash="";u.search="";
  return u.toString();
 }catch(_){return null}
}
const allowedZones=["Crocetta","Cenisia","Borgo San Paolo","San Paolo","Cit Turin","Santa Rita","Pozzo Strada"];
const normalize=(item:any,stamp:string)=>{
 const url=canonical(String(item?.url||""));
 if(!url)return null;
 const title=String(item.title||"").trim().replace(/\s+/g," ").slice(0,220);
 if(title.length<10||/\b(?:stanza|camera|posto letto|garage|box|posto auto|negozio|magazzino)\b/i.test(title))return null;
 const zone=allowedZones.find(z=>z.toLowerCase()===String(item.zone||"").toLowerCase());
 if(!zone)return null;
 const price=Number(item.price)||0;
 return {
  listing_url:url,title,description:String(item.description||"").trim().replace(/\s+/g," ").slice(0,850),
  source:"ClickCase",origin_engine:"Playwright · pagina pubblica",zone,
  price:Number.isFinite(price)&&price>=180&&price<=5000?Math.round(price):0,
  private_status:"unverified",last_seen:stamp
 };
};
async function query(path:string){
 const r=await fetch(ROOT+"/rest/v1/"+path,{headers:h(),signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error("Read failed "+r.status);return await r.json();
}
async function upsert(rows:unknown[]){
 const r=await fetch(ROOT+"/rest/v1/turinpipps_discovered_listings?on_conflict=listing_url",{
  method:"POST",headers:h({"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"}),
  body:JSON.stringify(rows),signal:AbortSignal.timeout(15000)
 });
 if(!r.ok)throw Error("Write failed "+r.status);
}
Deno.serve(async req=>{
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 if(!SECRET||SECRET.length<40||!KEY||!ROOT)return reply({error:"Worker ingest not configured"},503);
 const supplied=req.headers.get("x-tp-worker-token")||"";
 if(supplied.length<40||supplied.length>200||!equal(SECRET,supplied))return reply({error:"Unauthorized"},401);
 if(Number(req.headers.get("content-length")||0)>400000)return reply({error:"Too large"},413);
 try{
  const raw=await req.text();if(raw.length>400000)return reply({error:"Too large"},413);
  const body=JSON.parse(raw);
  if(body.source!=="playwright"||!Array.isArray(body.listings)||body.listings.length>400)
   return reply({error:"Invalid payload"},400);
  const stamp=new Date().toISOString(),newRows=new Map<string,any>();
  for(const x of body.listings){const item=normalize(x,stamp);if(item)newRows.set(item.listing_url,item)}
  const candidates=[...newRows.values()];
  let saved=0;
  if(candidates.length){
    const oldRows=await query("turinpipps_discovered_listings?select=listing_url,title,description,price,expenses,sqm,address,property_type,first_seen,source_updated,published_at,last_verified_at,availability_status,verification_level,verification_reason,price_verified_at,private_status,origin_engine,evidence_url&limit=10000");
    const existing=new Map(oldRows.map((r:any)=>[r.listing_url,r]));
    const prepared=candidates.map(row=>{
      const old:any=existing.get(row.listing_url)||{};
      const rich=old.origin_engine==="ricerca_web_verificata";
      return {
       ...row,first_seen:old.first_seen||stamp,
       title:rich&&old.title?old.title:row.title,
       description:rich&&old.description?old.description:row.description,
       price:Number(old.price)>0?old.price:row.price,
       expenses:Number(old.expenses)||0,sqm:Number(old.sqm)||0,address:old.address||"",
       property_type:old.property_type||"",source_updated:old.source_updated||null,
       published_at:old.published_at||null,last_verified_at:old.last_verified_at||null,
       availability_status:old.availability_status||"unknown",verification_level:old.verification_level||"unverified",
       verification_reason:old.verification_reason||"",price_verified_at:old.price_verified_at||null,
       evidence_url:old.evidence_url||"",origin_engine:rich?old.origin_engine:row.origin_engine,
       private_status:old.private_status==="confirmed"?"confirmed":rich?old.private_status:row.private_status
      };
    });
    for(let i=0;i<prepared.length;i+=60){await upsert(prepared.slice(i,i+60));saved+=Math.min(60,prepared.length-i)}
  }
  const log={started_at:stamp,finished_at:new Date().toISOString(),status:"ok",jobs_checked:1,
   jobs_ok:1,discovered:saved,details:{engines:[{engine:"Playwright · ClickCase pubbliche",ok:true,count:saved,
    status:"Fonte renderizzata; non implica disponibilità"}],browser_runtime:"vps",publication_type:"ingest"}};
  const logged=await fetch(ROOT+"/rest/v1/turinpipps_scan_runs",{method:"POST",
   headers:h({"Content-Type":"application/json","Prefer":"return=minimal"}),body:JSON.stringify(log)});
  if(!logged.ok)console.error("Worker scan logging failed",logged.status);
  return reply({ok:true,received:body.listings.length,accepted:candidates.length,saved,
   note:"Link trovati, disponibilità e inserzionista non verificati"});
 }catch(err){
  console.error("TurinPipps browser import failed",String(err).slice(0,200));
  return reply({error:"Could not process worker results"},500);
 }
});
