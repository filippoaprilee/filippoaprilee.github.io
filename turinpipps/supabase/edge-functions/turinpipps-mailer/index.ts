// TurinPipps mailer: per-user verified digests and explicit manual sends.
// Requires RESEND_API_KEY and TURINPIPPS_MAIL_FROM as server-only function secrets.
const ROOT=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const KEY=Deno.env.get("RESEND_API_KEY")||"";
const FROM=Deno.env.get("TURINPIPPS_MAIL_FROM")||"";
const HASH="6a1f0414137dcfd1cb1283928c78f83ea052f3dc0c39d553cca86af72d864bb3";
const ORIGIN="https://filippoaprilee.github.io";
const CORS={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"};
const baseUrl="https://filippoaprilee.github.io/turinpipps/";
function reply(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json",...CORS,"Cache-Control":"no-store"}})}
function headers(extra:Record<string,string>={}){return {"apikey":SERVICE,"Authorization":"Bearer "+SERVICE,...extra}}
async function hash(text:string){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,"0")).join("")}
function same(a:string,b:string){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
async function getUser(req:Request){
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!/^[-\w.]+$/.test(token)||token.length<32)return null;
 const r=await fetch(ROOT+"/auth/v1/user",{headers:{"Authorization":"Bearer "+token,"apikey":SERVICE}});
 if(!r.ok)return null;const user=await r.json();return typeof user.id==="string"?user:null;
}
async function query(path:string){const r=await fetch(ROOT+"/rest/v1/"+path,{headers:headers()});if(!r.ok)throw Error("DB read "+r.status);return r.json()}
async function insert(table:string,obj:any,prefer="return=representation"){
 const r=await fetch(ROOT+"/rest/v1/"+table,{method:"POST",
 headers:headers({"Content-Type":"application/json","Prefer":prefer}),body:JSON.stringify(obj)});
 if(!r.ok)throw Error("DB insert "+r.status);return r.status===204?[]:r.json();
}
async function patch(table:string,filter:string,obj:any){
 const r=await fetch(ROOT+"/rest/v1/"+table+"?"+filter,{method:"PATCH",headers:headers({"Content-Type":"application/json","Prefer":"return=minimal"}),body:JSON.stringify(obj)});
 if(!r.ok)throw Error("DB update "+r.status);
}
function esc(text:unknown){return String(text==null?"":text).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]||ch))}
function isWhole(row:any){return !/\b(?:stanza|camera singola|posto letto|box|garage|camera doppia)\b/i.test(String(row.title||"")+" "+String(row.property_type||""))}
function candidates(data:any[],p:any){
 const zones=Array.isArray(p.preferred_zones)?p.preferred_zones:[];
 return data.filter((x:any)=>{
  return x.private_status==="source"&&x.price>=150&&x.price<=p.budget&&x.zone&&zones.some((z:string)=>x.zone.toLowerCase().includes(z.toLowerCase()))&&isWhole(x);
 }).sort((a:any,b:any)=>String(b.first_seen).localeCompare(String(a.first_seen))).slice(0,9);
}
async function email(user:any,kind:"daily"|"weekly"|"manual",localDay:string,rows:any[],settings:any){
 if(!user.email_confirmed||!user.email)return {sent:false,skipped:"unverified"};
 const data=candidates(rows,settings);
 const dateKey=kind==="manual"?new Date().toISOString().slice(0,16).replace(/\d$/,"0"):kind==="weekly"?localDay.slice(0,7)+"-week-"+Math.ceil(Number(localDay.slice(8))/7):localDay;
 const previous=await query("turinpipps_email_dispatches?user_id=eq."+user.user_id+"&kind=eq."+kind+"&period_key=eq."+encodeURIComponent(dateKey)+"&select=id,status&limit=1");
 if(previous.length)return {sent:false,skipped:"already_recorded"};
 const inserted=await insert("turinpipps_email_dispatches",{user_id:user.user_id,kind,period_key:dateKey,status:"sending"},"resolution=ignore-duplicates,return=representation");
 if(!inserted.length)return {sent:false,skipped:"duplicate"};
 const id=inserted[0].id;
 const title="TurinPipps · "+(kind==="manual"?"Il tuo riepilogo":"Nuove opportunità a Torino");
 const cards=data.map((x:any)=>'<tr><td style="padding:13px 0;border-bottom:1px solid #e5edf0"><a href="'+esc(x.listing_url)+'" style="color:#205a71;font-weight:700">'+esc(x.title)+'</a><br><span style="font-size:12px;color:#627d8c">'+esc(x.zone)+' · '+Number(x.price).toLocaleString("it-IT")+' €/mese · disponibilità da verificare</span></td></tr>').join("");
 const html='<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#193a4c"><div style="background:#12394f;color:white;padding:24px;border-radius:10px"><b style="font-size:25px">TurinPipps</b><p style="color:#d3e4e8">Il tuo radar casa a Torino</p></div><h2 style="margin-top:28px">Le case da valutare</h2><p>Hai '+data.length+' opportunità con prezzo e quartiere pertinenti alle tue preferenze. Le informazioni vanno sempre confermate con la fonte.</p><table style="width:100%;border-collapse:collapse">'+(cards||'<tr><td style="padding:20px 0">Nessuna nuova corrispondenza documentata in questa raccolta.</td></tr>')+'</table><p style="margin-top:24px"><a href="'+baseUrl+'" style="background:#1f6477;padding:13px 18px;color:white;text-decoration:none;border-radius:8px">Apri TurinPipps</a></p><p style="font-size:11px;color:#82949e;margin-top:29px">Ricevi questo riepilogo perché hai un account TurinPipps con email verificata. Puoi disattivarlo in Profilo e Impostazioni.</p></div>';
 try{
  const sent=await fetch("https://api.resend.com/emails",{
    method:"POST",headers:{"Authorization":"Bearer "+KEY,"Content-Type":"application/json"},
    body:JSON.stringify({from:FROM,to:[user.email],subject:title,html,
     headers:{"List-Unsubscribe":"<"+baseUrl+"?screen=profile>"},
     tags:[{name:"app",value:"turinpipps"},{name:"type",value:kind}]})
  });
  const j=await sent.json().catch(()=>({}));
  if(!sent.ok)throw Error("Provider email HTTP "+sent.status+" "+String(j.message||"").slice(0,90));
  await patch("turinpipps_email_dispatches","id=eq."+id,{status:"sent",provider_id:String(j.id||""),completed_at:new Date().toISOString()});
  const update:any={last_digest_at:new Date().toISOString(),last_digest_status:"sent"};
  if(kind==="manual")update.last_manual_report_at=new Date().toISOString();
  await patch("turinpipps_profiles","user_id=eq."+user.user_id,update);
  return {sent:true,count:data.length};
 }catch(e){
  await patch("turinpipps_email_dispatches","id=eq."+id,{status:"failed",error_text:String(e).slice(0,400),completed_at:new Date().toISOString()});
  await patch("turinpipps_profiles","user_id=eq."+user.user_id,{last_digest_status:"failed"});
  return {sent:false,error:String(e)};
 }
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
 if(req.method!=="POST")return reply({error:"Metodo non consentito"},405);
 if(req.headers.get("Origin")&&req.headers.get("Origin")!==ORIGIN)return reply({error:"Origine non ammessa"},403);
 try{
  const body=await req.json().catch(()=>({})),action=String(body.action||"");
  let current:any=null;
  if(action==="cron"){
   const candidate=req.headers.get("x-tp-mail-job-secret")||"";
   if(!same(await hash(candidate),HASH))return reply({error:"Non autorizzato"},401);
  } else if(action==="manual"||action==="admin_manual"){
   current=await getUser(req);if(!current)return reply({error:"Accedi al tuo account"},401);
   if(action==="admin_manual"){
     const staff=await query("turinpipps_staff?select=role&user_id=eq."+encodeURIComponent(current.id)+"&limit=1");
     if(!staff.length||staff[0].role!=="owner")
       return reply({error:"Solo l'amministratore può inviare report ad altri utenti"},403);
     const target=String(body.user_id||"");
     if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target))
       return reply({error:"Utente non valido"},400);
   }
  }else return reply({error:"Azione non supportata"},400);
  if(!KEY||!FROM)return reply({error:"Invio email non configurato: collega un provider di posta verificato al backend TurinPipps.",provider_ready:false},503);
  const all=await query("turinpipps_discovered_listings?select=listing_url,title,zone,price,first_seen,property_type,private_status&order=first_seen.desc&limit=2500");
  let people:any[];
  if(current)people=await query("turinpipps_profiles?user_id=eq."+encodeURIComponent(action==="admin_manual"?String(body.user_id):current.id)+"&select=user_id,email,email_confirmed,digest_enabled,digest_frequency,last_digest_at&limit=1");
  else people=await query("turinpipps_profiles?email_confirmed=eq.true&digest_enabled=eq.true&select=user_id,email,email_confirmed,digest_enabled,digest_frequency,last_digest_at&limit=250");
  if(current&&!people.length)return reply({error:"Profilo non inizializzato"},404);
  if(action==="admin_manual"&&(!people.length||!people[0].digest_enabled||people[0].digest_frequency==="off"))
    return reply({error:"L'utente ha disattivato i riepiloghi email"},409);
  const now=new Date(),local=now.toLocaleString("sv-SE",{timeZone:"Europe/Rome"}).slice(0,10);
  const hour=Number(now.toLocaleString("en-GB",{timeZone:"Europe/Rome",hour:"2-digit",hourCycle:"h23"}));
  const dow=new Intl.DateTimeFormat("en-US",{timeZone:"Europe/Rome",weekday:"short"}).format(now);
  if(action==="cron"&&(hour<8||hour>10))return reply({checked:0,skipped:"outside_delivery_window"});
  const outcomes:any[]=[];
  for(const person of people){
   if(action==="cron"&&(!person.digest_enabled||person.digest_frequency==="off"||(person.digest_frequency==="weekly"&&dow!=="Mon")))continue;
   const k=action==="manual"||action==="admin_manual"?"manual":person.digest_frequency==="weekly"?"weekly":"daily";
   const p=await query("turinpipps_preferences?user_id=eq."+person.user_id+"&select=budget,preferred_zones&limit=1");
   const outcome=await email(person,k,local,all,p[0]||{budget:700,preferred_zones:["Crocetta","Cenisia","San Paolo","Borgo San Paolo","Cit Turin","Santa Rita","Pozzo Strada"]});
   outcomes.push(outcome);
  }
  if(current){
   const o=outcomes[0]||{sent:false};
   if(o.sent&&action==="admin_manual"){
     await insert("turinpipps_admin_actions",{actor_id:current.id,target_user_id:String(body.user_id),
       action:"admin_manual_report",details:{sent:true,count:o.count}}, "return=minimal");
   }
   return o.sent?reply(o):reply({error:o.error||"Riepilogo già richiesto in questa fascia oraria",sent:false},o.error?502:429);
  }
  return reply({checked:outcomes.length,sent:outcomes.filter(x=>x.sent).length,failed:outcomes.filter(x=>x.error).length});
 }catch(e){console.error("mail job",String(e));return reply({error:"Errore di elaborazione report"},500)}
});