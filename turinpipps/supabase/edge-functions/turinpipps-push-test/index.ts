import webpush from "npm:web-push@3.6.7";
// TurinPipps push verification: only the signed-in user can test their own subscription.
const ROOT=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const PUBLIC="BPEICMNGID6hxOyQdL8TkX1wtQjdMzDrrOjAJLiMusBaeoJSA42NDH3Qn93JWNEGHvK4r71P6CX1J0QylAE84GM";
const ORIGIN="https://filippoaprilee.github.io";
const cors={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization,apikey,content-type",
"Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"};
const headers=(extra:Record<string,string>={})=>({"apikey":SERVICE,"Authorization":"Bearer "+SERVICE,...extra});
function reply(x:unknown,s=200){return new Response(JSON.stringify(x),{status:s,headers:cors})}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return reply({error:"Metodo non consentito"},405);
 if(req.headers.get("Origin")&&req.headers.get("Origin")!==ORIGIN)return reply({error:"Origine non consentita"},403);
 try{
  const jwt=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!/^[-\w.]{35,}$/.test(jwt))return reply({error:"Effettua l'accesso"},401);
  const auth=await fetch(ROOT+"/auth/v1/user",{headers:{"apikey":SERVICE,"Authorization":"Bearer "+jwt},signal:AbortSignal.timeout(10000)});
  if(!auth.ok)return reply({error:"Sessione scaduta: accedi di nuovo"},401);
  const user=await auth.json();
  const body=await req.json().catch(()=>({}));
  if(body.action!=="test"||typeof body.endpoint!=="string"||body.endpoint.length>1800||!/^https:\/\//.test(body.endpoint))
   return reply({error:"Seleziona una postazione attiva da verificare"},400);
  const resource="turinpipps_push_subscriptions?user_id=eq."+encodeURIComponent(user.id)+"&endpoint=eq."+encodeURIComponent(body.endpoint)+"&enabled=eq.true&select=id,endpoint,p256dh,auth_key,last_test_at&limit=1";
  const r=await fetch(ROOT+"/rest/v1/"+resource,{headers:headers(),signal:AbortSignal.timeout(10000)});
  if(!r.ok)return reply({error:"Non posso verificare la postazione"},502);
  const subs=await r.json();
  if(!subs.length)return reply({error:"Nessuna sottoscrizione attiva su questo dispositivo. Attiva prima le notifiche."},404);
  const sub=subs[0];
  if(sub.last_test_at&&Date.now()-Date.parse(sub.last_test_at)<60000)
   return reply({error:"Attendi almeno 60 secondi tra due prove sullo stesso dispositivo."},429);
  const kr=await fetch(ROOT+"/rest/v1/rpc/turinpipps_service_vapid_private",{
   method:"POST",headers:headers({"Content-Type":"application/json"}),body:"{}",signal:AbortSignal.timeout(10000)});
  if(!kr.ok)return reply({error:"Configurazione push non disponibile"},503);
  const secret=await kr.json();
  if(typeof secret!=="string"||secret.length<20)return reply({error:"Chiave push non configurata"},503);
  const stamp=new Date().toISOString();
  await fetch(ROOT+"/rest/v1/turinpipps_push_subscriptions?id=eq."+encodeURIComponent(sub.id),{
   method:"PATCH",headers:headers({"Content-Type":"application/json","Prefer":"return=minimal"}),body:JSON.stringify({last_test_at:stamp})});
  webpush.setVapidDetails("mailto:info@maben.it",PUBLIC,secret);
  try{
   const result=await webpush.sendNotification(
     {endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_key}},
     JSON.stringify({title:"TurinPipps · Notifica di prova",body:"La connessione push con questo dispositivo funziona. Apri TurinPipps.",
       url:ORIGIN+"/turinpipps/?screen=notifications",tag:"tp-device-test-"+Date.now()}),
     {TTL:300,urgency:"high"}
   );
   await fetch(ROOT+"/rest/v1/turinpipps_push_subscriptions?id=eq."+encodeURIComponent(sub.id),{
    method:"PATCH",headers:headers({"Content-Type":"application/json"}),body:JSON.stringify({last_push_at:stamp,last_error:"",consecutive_failures:0})});
   return reply({ok:true,accepted:true,provider_status:result.statusCode||201,
     message:"Il servizio push ha accettato la notifica. Controlla il centro notifiche del dispositivo."});
  }catch(error){
   const code=Number((error as any)?.statusCode)||0;
   if(code===404||code===410){
    await fetch(ROOT+"/rest/v1/turinpipps_push_subscriptions?id=eq."+encodeURIComponent(sub.id),{
     method:"PATCH",headers:headers({"Content-Type":"application/json"}),body:JSON.stringify({enabled:false,last_error:"Subscription expired"})});
   }
   console.error("Push test delivery",String(error).slice(0,180));
   return reply({ok:false,error:code===404||code===410?"Sottoscrizione scaduta: riattiva le notifiche.":"Il provider push ha rifiutato l'invio",provider_status:code||null},502);
  }
 }catch(error){console.error("Push test",String(error).slice(0,150));return reply({error:"Impossibile completare la prova push"},500)}
});
