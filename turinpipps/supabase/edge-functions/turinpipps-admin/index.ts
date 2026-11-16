// TurinPipps staff API: authenticated user + server-side role check.
// No endpoint trusts a user-provided admin flag, email or client-supplied user_id as identity.
const ROOT=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ORIGIN="https://filippoaprilee.github.io";
const CORS={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"};
function answer(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...CORS,"Cache-Control":"no-store"}})}
function dbHeaders(extra:Record<string,string>={}){return {"apikey":SERVICE,"Authorization":"Bearer "+SERVICE,...extra}}
async function getJson(path:string){const r=await fetch(ROOT+"/rest/v1/"+path,{headers:dbHeaders()});if(!r.ok)throw Error("Errore lettura database "+r.status);return await r.json()}
async function patchJson(path:string,obj:unknown){const r=await fetch(ROOT+"/rest/v1/"+path,{method:"PATCH",headers:dbHeaders({"Content-Type":"application/json","Prefer":"return=representation"}),body:JSON.stringify(obj)});if(!r.ok)throw Error("Operazione non riuscita "+r.status);return await r.json()}
async function verify(token:string){if(!/^[-\w.]+$/.test(token)||token.length<30)return null;
 const r=await fetch(ROOT+"/auth/v1/user",{headers:{"Authorization":"Bearer "+token,"apikey":SERVICE}});
 if(!r.ok)return null;const data=await r.json();return typeof data.id==="string"?data:null;
}
async function logAction(actor:string,target:string|null,action:string,details:unknown){
 await fetch(ROOT+"/rest/v1/turinpipps_admin_actions",{method:"POST",
  headers:dbHeaders({"Content-Type":"application/json","Prefer":"return=minimal"}),
  body:JSON.stringify({actor_id:actor,target_user_id:target,action,details})});
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
 if(req.method!=="POST")return answer({error:"Metodo non ammesso"},405);
 if(req.headers.get("Origin")&&req.headers.get("Origin")!==ORIGIN)return answer({error:"Origine non ammessa"},403);
 try{
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  const user=await verify(token);if(!user)return answer({error:"Accesso richiesto"},401);
  const staff=await getJson("turinpipps_staff?user_id=eq."+encodeURIComponent(user.id)+"&select=role&limit=1");
  if(!staff.length||!["owner","admin"].includes(staff[0].role))return answer({error:"Accesso sviluppatore riservato"},403);
  const body=await req.json().catch(()=>({})),action=String(body.action||"overview");
  if(action==="overview"){
    const [profiles,devices,scans,listings,mailLogs,notifications]=await Promise.all([
      getJson("turinpipps_profiles?select=user_id,email,email_confirmed,digest_enabled,digest_frequency,notify_new_listings,last_digest_at,last_digest_status,created_at&order=created_at.desc&limit=200"),
      getJson("turinpipps_push_subscriptions?select=id,user_id,enabled,created_at,last_push_at,consecutive_failures&limit=200"),
      getJson("turinpipps_scan_runs?select=id,started_at,finished_at,status,jobs_checked,jobs_ok,discovered&order=started_at.desc&limit=12"),
      getJson("turinpipps_discovered_listings?select=listing_url&limit=5000"),
      getJson("turinpipps_email_dispatches?select=id,user_id,kind,status,created_at,completed_at,error_text&order=created_at.desc&limit=30"),
      getJson("turinpipps_notification_inbox?select=id,read_at&limit=1000")
    ]);
    let githubRunner:any=null;
    try{
      const r=await fetch("https://api.github.com/repos/filippoaprilee/filippoaprilee.github.io/actions/runs?per_page=50",
       {headers:{"Accept":"application/vnd.github+json","User-Agent":"TurinPipps-Staff-Health"},signal:AbortSignal.timeout(6000)});
      if(r.ok){const j=await r.json();const run=(j.workflow_runs||[]).find((x:any)=>x.name==="TurinPipps - raccolta annunci");
        if(run)githubRunner={id:run.id,status:run.status,conclusion:run.conclusion,url:run.html_url,started_at:run.created_at};
      }
    }catch(_){}
    return answer({role:staff[0].role,
      counts:{users:profiles.length,verified:profiles.filter((p:any)=>p.email_confirmed).length,
       devices:devices.filter((d:any)=>d.enabled).length,listings:listings.length,
       alerts:notifications.length,emails_sent:mailLogs.filter((x:any)=>x.status==="sent").length},
      users:profiles.map((p:any)=>({...p,devices:devices.filter((d:any)=>d.user_id===p.user_id).length})),
      mail_logs:mailLogs.map((m:any)=>({id:m.id,user_id:m.user_id,kind:m.kind,status:m.status,
         created_at:m.created_at,completed_at:m.completed_at,error_text:m.status==="failed"?m.error_text:""})),
      devices:devices.map((d:any)=>({id:d.id,user_id:d.user_id,enabled:d.enabled,
        created_at:d.created_at,last_push_at:d.last_push_at,consecutive_failures:d.consecutive_failures})),
      scans,
      email_provider_configured:!!Deno.env.get("RESEND_API_KEY")&&!!Deno.env.get("TURINPIPPS_MAIL_FROM"),
      github_runner:githubRunner,
      auto_collector:"Supabase pg_cron (30 minuti)",
      python_runner:"GitHub Actions (verificare job e log)"});
  }
  if(action==="update_digest"){
    const uid=String(body.user_id||""),freq=String(body.digest_frequency||"");
    if(!/^[\da-f-]{36}$/i.test(uid)||!["daily","weekly","off"].includes(freq)||typeof body.digest_enabled!=="boolean")
      return answer({error:"Preferenze non valide"},400);
    const rows=await patchJson("turinpipps_profiles?user_id=eq."+encodeURIComponent(uid),
     {digest_enabled:body.digest_enabled,digest_frequency:freq,
      notify_new_listings:body.notify_new_listings!==false,updated_at:new Date().toISOString()});
    if(!rows.length)return answer({error:"Utente non trovato"},404);
    await logAction(user.id,uid,"update_digest",{digest_enabled:body.digest_enabled,digest_frequency:freq});
    return answer({success:true,profile:{user_id:uid,digest_enabled:rows[0].digest_enabled,digest_frequency:rows[0].digest_frequency}});
  }
  if(action==="disable_device"){
    const device=String(body.device_id||"");
    if(!/^[\da-f-]{36}$/i.test(device))return answer({error:"Dispositivo non valido"},400);
    const rows=await patchJson("turinpipps_push_subscriptions?id=eq."+encodeURIComponent(device),{enabled:false});
    await logAction(user.id,rows[0]?.user_id||null,"disable_device",{id:device});
    return answer({success:rows.length===1});
  }
  return answer({error:"Azione sconosciuta"},404);
 }catch(e){console.error("tp-admin",String(e));return answer({error:"Errore interno nel servizio amministrativo"},500)}
});