// TurinPipps Web Push delivery: encrypted VAPID push for subscribed accounts.
// Runs inside Supabase; no ChatGPT automation and no private key in client/repository.
import webpush from "npm:web-push@3.6.7";

const ROOT=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const PUBLIC_KEY="BPEICMNGID6hxOyQdL8TkX1wtQjdMzDrrOjAJLiMusBaeoJSA42NDH3Qn93JWNEGHvK4r71P6CX1J0QylAE84GM";
const HASH="6a1f0414137dcfd1cb1283928c78f83ea052f3dc0c39d553cca86af72d864bb3";
const ORIGIN="https://filippoaprilee.github.io";
function headers(extra:Record<string,string>={}){return {"apikey":SERVICE,"Authorization":"Bearer "+SERVICE,...extra}}
function response(j:unknown,status=200){return new Response(JSON.stringify(j),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}})}
async function sha(s:string){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,"0")).join("")}
function secureEq(a:string,b:string){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
async function fetchRows(path:string){
 const r=await fetch(ROOT+"/rest/v1/"+path,{headers:headers(),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("Data API "+r.status);return r.json();
}
async function patch(path:string,obj:unknown){
 const r=await fetch(ROOT+"/rest/v1/"+path,{method:"PATCH",
  headers:headers({"Content-Type":"application/json","Prefer":"return=minimal"}),body:JSON.stringify(obj)});
 if(!r.ok)throw Error("DB patch "+r.status);
}
async function claim(sub:string,notice:number){
 const r=await fetch(ROOT+"/rest/v1/turinpipps_push_deliveries",{
  method:"POST",
  headers:headers({"Content-Type":"application/json","Prefer":"resolution=ignore-duplicates,return=representation"}),
  body:JSON.stringify({subscription_id:sub,notification_id:notice,status:"pending"})
 });
 if(!r.ok)throw Error("DB delivery "+r.status);
 const j=await r.json();return j.length===1;
}
Deno.serve(async req=>{
 if(req.method!=="POST")return response({error:"method"},405);
 const token=req.headers.get("x-tp-mail-job-secret")||"";
 if(!secureEq(await sha(token),HASH))return response({error:"not authorized"},401);
 try{
  const subscriptions=await fetchRows("turinpipps_push_subscriptions?enabled=eq.true&select=id,user_id,endpoint,p256dh,auth_key,created_at,consecutive_failures&limit=200");
  if(!subscriptions.length)return response({subscriptions:0,delivered:0,failed:0});
  const responseKey=await fetch(ROOT+"/rest/v1/rpc/turinpipps_service_vapid_private",{
   method:"POST",headers:headers({"Content-Type":"application/json"}),body:"{}"
  });
  if(!responseKey.ok)throw Error("Cannot obtain VAPID secret");
  const PRIVATE_KEY=await responseKey.json();
  if(!PRIVATE_KEY||typeof PRIVATE_KEY!=="string")throw Error("VAPID not configured");
  webpush.setVapidDetails("mailto:info@maben.it",PUBLIC_KEY,PRIVATE_KEY);
  let delivered=0,failed=0,skipped=0;
  const since=new Date(Date.now()-86400000).toISOString();
  for(const sub of subscriptions){
   // Never send events predating installation of the subscription.
   const after=new Date(Math.max(Date.parse(sub.created_at)||0,Date.parse(since))).toISOString();
   const rows=await fetchRows("turinpipps_notification_inbox?user_id=eq."+encodeURIComponent(sub.user_id)+
    "&created_at=gte."+encodeURIComponent(after)+"&select=id,title,body,listing_url,created_at&order=created_at.desc&limit=10");
   for(const n of rows.reverse()){
    if(!(await claim(sub.id,n.id))){skipped++;continue}
    try{
     const url=n.listing_url?ORIGIN+"/turinpipps/?screen=radar":ORIGIN+"/turinpipps/?screen=notifications";
     const pushJson=JSON.stringify({title:String(n.title).slice(0,140),
       body:String(n.body).slice(0,240),url,tag:"tp-"+n.id});
     await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_key}},
      pushJson,{TTL:18000,urgency:"normal"});
     await patch("turinpipps_push_deliveries?subscription_id=eq."+sub.id+"&notification_id=eq."+n.id,
       {status:"sent",response_code:201,attempted_at:new Date().toISOString()});
     await patch("turinpipps_push_subscriptions?id=eq."+sub.id,{last_push_at:new Date().toISOString(),last_error:"",consecutive_failures:0});
     delivered++;
    }catch(e){
     const code=Number((e as any)?.statusCode)||0,err=String(e).slice(0,160);
     await patch("turinpipps_push_deliveries?subscription_id=eq."+sub.id+"&notification_id=eq."+n.id,
      {status:"failed",response_code:code||null,error_text:err,attempted_at:new Date().toISOString()});
     await patch("turinpipps_push_subscriptions?id=eq."+sub.id,{
       last_error:err,consecutive_failures:Math.max(0,Number(sub.consecutive_failures)||0)+1,
       ...(code===404||code===410?{enabled:false}:{})
     });
     failed++;
    }
   }
  }
  return response({subscriptions:subscriptions.length,delivered,failed,skipped});
 }catch(e){console.error("tp-push",String(e));return response({error:"Delivery engine failed"},500)}
});