// TurinPipps Widget API · public, read-only aggregate. No user identifiers, tokens or account data.
const ROOT=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ZONES=["Crocetta","Cenisia","Borgo San Paolo","San Paolo","Cit Turin","Santa Rita","Pozzo Strada"];
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,OPTIONS",
 "Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff",
 "Cache-Control":"public, max-age=180, stale-while-revalidate=600"};
function res(json:unknown,status=200){return new Response(JSON.stringify(json),{status,headers})}
function whole(v:any){return !/\b(?:stanza|camera singola|camera doppia|posto letto|garage|box auto|affitto box)\b/i
 .test(String(v.title||"")+" "+String(v.property_type||""))}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="GET")return res({error:"method not allowed"},405);
 try{
  const u=new URL(req.url),raw=Number(u.searchParams.get("budget")||700);
  const budget=Number.isFinite(raw)?Math.max(150,Math.min(5000,Math.round(raw))):700;
  const requested=(u.searchParams.get("zones")||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  const chosen=requested.length?ZONES.filter(z=>requested.includes(z.toLowerCase())):ZONES;
  if(!chosen.length)return res({error:"unknown zones"},400);
  const auth={"apikey":SERVICE,"Authorization":"Bearer "+SERVICE};
  const [source,logs]=await Promise.all([
    fetch(ROOT+"/rest/v1/turinpipps_discovered_listings?select=listing_url,title,source,zone,price,private_status,first_seen,property_type,expired_at&limit=5000",
      {headers:auth,signal:AbortSignal.timeout(10000)}),
    fetch(ROOT+"/rest/v1/turinpipps_scan_runs?select=finished_at,status&order=started_at.desc&limit=1",
      {headers:auth,signal:AbortSignal.timeout(10000)})
  ]);
  if(!source.ok)throw Error("public listings not readable: "+source.status);
  const rows:any[]=await source.json(),history=logs.ok?await logs.json():[];
  const inArea=(r:any)=>chosen.some(z=>String(r.zone||"").toLowerCase().includes(z.toLowerCase()));
  const good=rows.filter(r=>!r.expired_at&&whole(r)&&inArea(r)&&r.price>=150&&r.price<=budget&&
    ["source","confirmed"].includes(r.private_status));
  const uncertain=rows.filter(r=>!r.expired_at&&whole(r)&&(inArea(r)||!r.zone)&&
     (r.price===0||r.private_status==="unverified"||!r.zone));
  good.sort((a,b)=>String(b.first_seen).localeCompare(String(a.first_seen)));
  return res({
    product:"TurinPipps",budget,zones:chosen,matching_count:good.length,
    to_verify_count:uncertain.length,
    scan_at:history[0]?.finished_at||null,scan_status:history[0]?.status||"unknown",
    disclaimer:"Corrispondenza preliminare. Proprietà, prezzo e disponibilità da verificare sulla fonte.",
    latest:good.slice(0,3).map(x=>({title:String(x.title).slice(0,180),zone:x.zone,
      price:x.price,source:x.source,url:x.listing_url}))
  });
 }catch(e){
  console.error("TurinPipps widget API",String(e).slice(0,120));
  return res({error:"temporarily unavailable"},503);
 }
});
