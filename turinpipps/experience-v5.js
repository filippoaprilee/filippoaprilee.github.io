/* TurinPipps 5.0: app shell, account profile, notifications and secured developer console. */
(function(){
'use strict';
var $=function(s,root){return (root||document).querySelector(s)};
var $$=function(s,root){return Array.from((root||document).querySelectorAll(s))};
var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(k){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]})};
var state={profile:null,alerts:[],staff:false,push:false,loadedAt:0,loading:false};
function cfg(){return window.TURINPIPPS_SUPABASE||{}}
function session(){return window.TurinPippsAuth&&window.TurinPippsAuth.getCurrentUser?window.TurinPippsAuth.getCurrentUser():null}
async function token(){return window.TurinPippsAuth&&window.TurinPippsAuth.getAccessToken?window.TurinPippsAuth.getAccessToken():null}
function base(){return String(cfg().url||'').replace(/\/$/,'')}
function note(id,message,type){
 var e=$('#'+id);if(e){e.textContent=message||'';e.dataset.state=type||''}
}
async function rest(path,opts){
 var t=await token();if(!t)throw Error('Accedi per utilizzare questa funzione');
 var r=await fetch(base()+'/rest/v1/'+path,{
  method:opts&&opts.method||'GET',
  headers:{'apikey':cfg().publishableKey,'Authorization':'Bearer '+t,'Content-Type':'application/json',
   'Accept':'application/json','Prefer':opts&&opts.prefer||'return=representation'},
  body:opts&&opts.body?JSON.stringify(opts.body):undefined,cache:'no-store'
 });
 if(!r.ok){var txt=await r.text();throw Error('Sincronizzazione non riuscita ('+r.status+')'+(txt&&r.status<500?': '+txt.slice(0,140):''))}
 return r.status===204?[]:await r.json();
}
async function functionCall(name,action,payload){
 var t=await token();if(!t)throw Error('Accedi per continuare');
 var r=await fetch(base()+'/functions/v1/'+name,{
  method:'POST',headers:{'Authorization':'Bearer '+t,'apikey':cfg().publishableKey,
  'Content-Type':'application/json'},body:JSON.stringify(Object.assign({action:action},payload||{}))
 });
 var j=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(j.error||'Servizio non disponibile ('+r.status+')');
 return j;
}
function section(id,title,kicker,description,content){
 var e=document.createElement('section');e.id='view-'+id;e.className='hidden tp-v5-screen';
 e.innerHTML='<header class="tp-v5-screen-header"><div><div class="tp-v5-kicker">'+esc(kicker)+'</div><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div></header>'+content;
 var contentEl=$('.content');var settings=$('#view-settings');
 contentEl.insertBefore(e,settings||null);
}
function build(){
 var nav=$('.side .nav'),settingsNav=nav&&nav.querySelector('[data-nav="settings"]');
 if(nav&&settingsNav&&!$('#tp-v5-nav-profile')){
  var fragment=document.createDocumentFragment();
  [['notifications','fa-regular fa-bell','Notifiche'],['profile','fa-regular fa-user','Profilo']].forEach(function(entry){
   var b=document.createElement('button');b.type='button';b.id='tp-v5-nav-'+entry[0];b.dataset.nav=entry[0];
   b.innerHTML='<i class="'+entry[1]+'" aria-hidden="true"></i><span class="nav-label">'+entry[2]+'</span>';
   fragment.appendChild(b);
  });
  nav.insertBefore(fragment,settingsNav);
 }
 var side=$('.side .nav');
 if(side){
  // Flusso coerente: scopri -> salva -> confronta -> visita. Profilo e impostazioni separati.
  var search=side.querySelector('[data-nav="results"]'),saved=side.querySelector('[data-nav="saved"]');
  var compare=side.querySelector('[data-nav="compare"]'),visits=side.querySelector('[data-nav="visits"]');
  if(search&&saved)search.after(saved);
  if(saved&&compare)saved.after(compare);
  if(compare&&visits)compare.after(visits);
 }
 var mobile=$('.mobile-nav');
 if(mobile){
  // Le cinque destinazioni essenziali su iPhone, senza sesta icona e senza affollamento.
  var compareTab=mobile.querySelector('[data-nav="compare"]');
  if(compareTab){
   compareTab.dataset.nav='visits';
   compareTab.innerHTML='<span><i class="fa-regular fa-calendar-check"></i></span>Organizza';
  }
  var oldBell=mobile.querySelector('#tp-v5-mobile-notifications');
  if(oldBell)oldBell.remove();
 }
 var top=$('.topline .top-actions');
 if(top&&!$('#tp-v5-bell')){
  var b=document.createElement('button');b.type='button';b.id='tp-v5-bell';b.className='tp-v5-bell';b.dataset.nav='notifications';
  b.setAttribute('aria-label','Apri notifiche');
  b.innerHTML='<i class="fa-regular fa-bell"></i><span id="tp-v5-unread" hidden>0</span>';
  top.insertBefore(b,$('#tp-account-button'));
 }
 var more=$('#view-more .tp-home-actions');
 if(more&&!$('#tp-v5-more-profile')){
  var two=document.createElement('div');two.className='tp-v5-more-links';
  two.innerHTML='<button class="button" id="tp-v5-more-notify" data-nav="notifications"><i class="fa-regular fa-bell"></i> Le mie notifiche</button>'+
   '<button class="button" data-nav="compare"><i class="fa-solid fa-scale-balanced"></i> Confronta immobili</button>'+ 
   '<button class="button" id="tp-v5-more-profile" data-nav="profile"><i class="fa-regular fa-user"></i> Profilo e account</button>';
  more.prepend(two);
 }
 section('profile','Il tuo profilo','ACCOUNT PERSONALE',
  'Il tuo account, i riepiloghi automatici e le impostazioni per restare aggiornato.',
  '<div id="tp-v5-profile-body" class="tp-v5-panel"><div class="tp-v5-empty">Accedi per gestire il tuo profilo e i riepiloghi.</div></div>'+
  '<div class="tp-v5-quick-install tp-v5-panel"><h2>TurinPipps sul tuo iPhone</h2><p>In Safari scegli Condividi → Aggiungi alla schermata Home. Le notifiche push richiedono l’app installata e il tuo consenso.</p>'+
  '<div class="tp-v5-row-actions"><a href="./today.html" class="tp-v5-link">Panoramica compatta</a><a href="./widget-iphone.html" class="tp-v5-link">Widget iPhone senza Xcode</a><button data-nav="notifications" class="tp-v5-secondary">Gestisci notifiche</button></div>'+
  '<p class="tp-v5-hint">Widget iPhone con dati aggiornati: usa lo script Scriptable TurinPipps disponibile nel progetto, senza Xcode. La PWA si installa normalmente da Safari.</p></div>');
 section('notifications','Le tue notifiche','AGGIORNAMENTI',
  'Nuovi annunci interessanti, variazioni importanti e promemoria. Solo avvisi rilevanti.',
  '<div class="tp-v5-panel tp-v5-notify-controls"><div><h2>Avvisi personalizzati</h2><p>Le notifiche interne sono associate al tuo account. Puoi scegliere se attivare anche gli avvisi sul dispositivo.</p></div>'+
   '<div class="tp-v6-push-actions"><button id="tp-v5-push-enable" class="tp-v5-primary" type="button">Attiva notifiche sul dispositivo</button><button id="tp-v6-push-disable" class="tp-v5-secondary" type="button">Disattiva su questo dispositivo</button><button id="tp-v7-push-test" class="tp-v5-primary" type="button" hidden><i class="fa-regular fa-paper-plane"></i> Invia notifica di prova</button></div>'+
   '<p id="tp-v5-push-message" class="tp-v5-status" aria-live="polite"></p></div>'+
  '<div class="tp-v5-panel"><div class="tp-v5-list-title"><h2>Centro notifiche</h2><div class="tp-v6-alert-actions"><button id="tp-v6-alert-readall" class="tp-v5-secondary" type="button">Segna tutte lette</button><button id="tp-v5-alert-refresh" class="tp-v5-secondary" type="button">Aggiorna</button></div></div><div id="tp-v5-alert-list" class="tp-v5-empty">Accedi per visualizzare le notifiche.</div></div>');
 section('admin','Console sviluppatore','GESTIONE INTERNA',
  'Stato delle acquisizioni, utenti registrati, report e dispositivi collegati.',
  '<div id="tp-v5-admin-status" class="tp-v5-status" aria-live="polite"></div>'+
  '<div id="tp-v5-admin-content" class="tp-v5-empty">Verifica autorizzazione amministrativa…</div>');
 $('#tp-v5-alert-refresh').addEventListener('click',function(){fetchAlerts(true)});
 $('#tp-v5-push-enable').addEventListener('click',enablePush);
 $('#tp-v6-push-disable').addEventListener('click',disablePush);
 $('#tp-v7-push-test').addEventListener('click',testPush);
 $('#tp-v6-alert-readall').addEventListener('click',markAllRead);
}
function renderProfile(){
 var root=$('#tp-v5-profile-body'),s=session(),p=state.profile;
 if(!root)return;
 if(!s){root.innerHTML='<div class="tp-v5-empty"><i class="fa-regular fa-user"></i><h2>Accedi al tuo account</h2><p>Preferiti, notifiche e riepiloghi vengono gestiti separatamente per ogni utente.</p><button id="tp-v5-login" class="tp-v5-primary">Accedi o registrati</button></div>';
  $('#tp-v5-login').addEventListener('click',function(){if(window.TurinPippsAuth)window.TurinPippsAuth.open()});
  return;
 }
 if(!p){root.innerHTML='<div class="tp-v5-empty">Caricamento profilo…</div>';return}
 root.innerHTML='<div class="tp-v5-identity"><div class="tp-v5-avatar"><i class="fa-solid fa-user"></i></div><div><span>ACCOUNT TURINPIPPS</span><h2>'+esc(s.email||p.email)+'</h2><small>'+(p.email_confirmed?'Email verificata':'Email da verificare')+'</small></div></div>'+
 '<div class="tp-v5-rule"></div><h3>Riepiloghi via email</h3><p class="tp-v5-subtitle">I report usano gli annunci compatibili con il tuo budget e le tue zone. Non inviamo mail ad indirizzi non verificati.</p>'+
 '<label class="tp-v5-check"><input type="checkbox" id="tp-v5-digest-on" '+(p.digest_enabled?'checked':'')+'><span><b>Ricevi il riepilogo automatico</b><small>Puoi disattivarlo quando vuoi.</small></span></label>'+
 '<label class="tp-v5-form-label">Frequenza del riepilogo<select id="tp-v5-frequency" class="tp-v5-input"><option value="daily">Ogni giorno</option><option value="weekly">Una volta a settimana</option><option value="off">Disattivato</option></select></label>'+
 '<label class="tp-v5-check"><input type="checkbox" id="tp-v5-new-on" '+(p.notify_new_listings?'checked':'')+'><span><b>Segnalami nuove case compatibili</b><small>Solo per annunci con canone e quartiere riconoscibili.</small></span></label>'+
 '<label class="tp-v5-check"><input type="checkbox" id="tp-v5-drop-on" '+(p.notify_price_drops?'checked':'')+'><span><b>Avvisami dei ribassi verificati</b><small>La funzione richiede uno storico prezzi affidabile.</small></span></label>'+
 '<div class="tp-v5-row-actions"><button class="tp-v5-primary" id="tp-v5-profile-save">Salva preferenze</button><button class="tp-v5-secondary" id="tp-v5-send-mail">Invia riepilogo adesso</button></div>'+
 '<p id="tp-v5-profile-message" class="tp-v5-status" aria-live="polite"></p><div class="tp-v5-rule"></div>'+
 '<div class="tp-v5-account-links"><button class="tp-v5-link" data-nav="settings">Budget, zone e ricerca</button><button class="tp-v5-link" id="tp-v5-account-open">Password e accesso</button></div>';
 $('#tp-v5-frequency').value=p.digest_frequency||'daily';
 $('#tp-v5-profile-save').addEventListener('click',saveProfile);
 $('#tp-v5-send-mail').addEventListener('click',requestMail);
 $('#tp-v5-account-open').addEventListener('click',function(){window.TurinPippsAuth.open()});
}
async function loadProfile(){
 var s=session();if(!s){state.profile=null;renderProfile();return}
 try{
  var rows=await rest('turinpipps_profiles?select=*&user_id=eq.'+encodeURIComponent(s.id)+'&limit=1');
  state.profile=rows[0]||null;renderProfile();
 }catch(err){note('tp-v5-profile-message',err.message,'error')}
}
async function saveProfile(){
 var p=state.profile;if(!p)return;
 var btn=$('#tp-v5-profile-save');btn.disabled=true;
 try{
  var body={digest_enabled:$('#tp-v5-digest-on').checked,
   digest_frequency:$('#tp-v5-frequency').value,
   notify_new_listings:$('#tp-v5-new-on').checked,
   notify_price_drops:$('#tp-v5-drop-on').checked};
  if(!body.digest_enabled)body.digest_frequency='off';
  var rows=await rest('turinpipps_profiles?user_id=eq.'+encodeURIComponent(p.user_id),
   {method:'PATCH',body:body});
  if(!rows.length)throw Error('Il server non ha confermato il salvataggio');
  state.profile=rows[0];note('tp-v5-profile-message','Preferenze salvate e confermate dal server.','ok');
 }catch(e){note('tp-v5-profile-message',e.message,'error')}
 finally{btn.disabled=false}
}
async function requestMail(){
 var b=$('#tp-v5-send-mail');b.disabled=true;note('tp-v5-profile-message','Richiesta in corso…');
 try{
  var result=await functionCall('turinpipps-mailer','manual',{});
  note('tp-v5-profile-message',result.sent?'Riepilogo inviato all’indirizzo del tuo account.':'Richiesta acquisita, invio non confermato.',result.sent?'ok':'warn');
 }catch(e){note('tp-v5-profile-message',e.message,'error')}
 finally{b.disabled=false}
}
function renderAlerts(){
 var root=$('#tp-v5-alert-list'),count=state.alerts.filter(function(x){return !x.read_at}).length;
 if(!root)return;
 var badge=$('#tp-v5-unread');if(badge){badge.hidden=count===0;badge.textContent=Math.min(count,99)}
 if(!session()){root.innerHTML='<div class="tp-v5-empty">Accedi per vedere i tuoi avvisi.</div>';return}
 if(!state.alerts.length){root.innerHTML='<div class="tp-v5-empty"><i class="fa-regular fa-bell-slash"></i><h3>Nessuna notifica</h3><p>Qui compariranno gli avvisi pertinenti alla tua ricerca.</p></div>';return}
 root.innerHTML=state.alerts.map(function(a){
  var at=new Date(a.created_at),date=isFinite(at.getTime())?at.toLocaleString('it-IT'):'';
  return '<div class="tp-v5-alert '+(a.read_at?'':'unread')+'"><div class="tp-v5-alert-symbol"><i class="'+(a.type==='new_listing'?'fa-solid fa-house':'fa-regular fa-bell')+'"></i></div><div><div class="tp-v5-alert-meta">'+esc(date)+(a.read_at?'':' · Non letta')+'</div><b>'+esc(a.title)+'</b><p>'+esc(a.body)+'</p><div class="tp-v5-alert-actions">'+(a.listing_url?'<a target="_blank" rel="noopener noreferrer" href="'+esc(a.listing_url)+'">Apri annuncio</a>':'')+
    (a.read_at?'':'<button data-tp-v5-read="'+Number(a.id)+'">Segna come letta</button>')+'</div></div></div>';
 }).join('');
}
async function fetchAlerts(force){
 if(!session()){state.alerts=[];renderAlerts();return}
 if(!force&&Date.now()-state.loadedAt<90000)return;
 try{
  var data=await rest('turinpipps_notification_inbox?select=id,type,title,body,listing_url,read_at,created_at&order=created_at.desc&limit=50');
  state.alerts=Array.isArray(data)?data:[];state.loadedAt=Date.now();renderAlerts();
 }catch(e){var n=$('#tp-v5-alert-list');if(n)n.textContent=e.message}
}
async function markRead(id){
 try{
  await rest('turinpipps_notification_inbox?id=eq.'+id,{method:'PATCH',body:{read_at:new Date().toISOString()}});
  state.loadedAt=0;await fetchAlerts(true);
 }catch(e){var n=$('#tp-v5-alert-list');if(n)n.prepend(document.createTextNode('Errore: '+e.message+' '))}
}
async function markAllRead(){
 if(!session())return;
 var b=$('#tp-v6-alert-readall');if(b)b.disabled=true;
 try{
   await rest('turinpipps_notification_inbox?read_at=is.null',{method:'PATCH',body:{read_at:new Date().toISOString()}});
   state.loadedAt=0;await fetchAlerts(true);
 }catch(e){var n=$('#tp-v5-alert-list');if(n)n.prepend(document.createTextNode('Impossibile aggiornare le notifiche: '+e.message+' '))}
 finally{if(b)b.disabled=false}
}
async function disablePush(){
 var b=$('#tp-v6-push-disable');if(b)b.disabled=true;
 try{
   if(!session())throw Error('Accedi al tuo account per gestire le notifiche.');
   var registration=await navigator.serviceWorker.ready;
   var sub=await registration.pushManager.getSubscription();
   if(!sub){note('tp-v5-push-message','Nessuna notifica attiva su questo dispositivo.','ok');return}
   var endpoint=sub.endpoint;
   var t=await token();
   if(!t)throw Error('Sessione scaduta');
   var user=session();
   // Prima revoca lato server (RLS per l'utente), poi annulla l'iscrizione del browser.
   await rest('turinpipps_push_subscriptions?endpoint=eq.'+encodeURIComponent(endpoint)+'&user_id=eq.'+encodeURIComponent(user.id),
      {method:'PATCH',body:{enabled:false}});
   await sub.unsubscribe();
   state.push=false;note('tp-v5-push-message','Notifiche disattivate su questo dispositivo.','ok');
   await refreshPushTestButton();
 }catch(e){note('tp-v5-push-message',e.message,'error')}
 finally{if(b)b.disabled=false}
}
function encodeKey(base64){
 var padded=base64.replace(/-/g,'+').replace(/_/g,'/');
 var raw=atob(padded+'='.repeat((4-padded.length%4)%4));
 return Uint8Array.from(raw,function(c){return c.charCodeAt(0)});
}
async function refreshPushTestButton(){
 var button=$('#tp-v7-push-test');if(!button)return;
 button.hidden=true;
 if(!session()||!('serviceWorker' in navigator)||!('PushManager' in window))return;
 try{
  var reg=await navigator.serviceWorker.getRegistration('./');
  var sub=reg&&await reg.pushManager.getSubscription();
  if(!sub)return;
  var rows=await rest('turinpipps_push_subscriptions?endpoint=eq.'+
    encodeURIComponent(sub.endpoint)+'&enabled=eq.true&select=id&limit=1');
  button.hidden=!Array.isArray(rows)||rows.length===0;
 }catch(error){button.hidden=true}
}
async function testPush(){
 var button=$('#tp-v7-push-test');if(button)button.disabled=true;
 note('tp-v5-push-message','Invio una notifica push reale a questo dispositivo…');
 try{
  if(!session())throw Error('Accedi al tuo account');
  var reg=await navigator.serviceWorker.getRegistration('./');
  var sub=reg&&await reg.pushManager.getSubscription();
  if(!sub)throw Error('Notifiche non attive sul dispositivo. Attivale prima.');
  var result=await functionCall('turinpipps-push-test','test',{endpoint:sub.endpoint});
  if(!result.ok)throw Error(result.error||'Il servizio push ha rifiutato l’invio.');
  note('tp-v5-push-message','Invio accettato dal servizio push (HTTP '+result.provider_status+'). Controlla le notifiche di sistema. Per testare la comparsa, metti l’app in background.','ok');
 }catch(error){note('tp-v5-push-message','Prova non riuscita: '+error.message,'error')}
 finally{if(button)button.disabled=false;refreshPushTestButton()}
}
async function enablePush(){
 var button=$('#tp-v5-push-enable');button.disabled=true;note('tp-v5-push-message','Controllo requisiti…');
 try{
  if(!session())throw Error('Accedi prima di attivare le notifiche.');
  if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window))
   throw Error('Le notifiche push non sono supportate da questo browser.');
  var standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!standalone)
   throw Error('Su iPhone apri TurinPipps dalla schermata Home, dopo averla aggiunta da Safari.');
  var publicKey=String(window.TURINPIPPS_VAPID_PUBLIC_KEY||'');
  if(!publicKey)throw Error('Servizio push non ancora configurato sul server. Le notifiche interne sono disponibili.');
  if(Notification.permission==='denied')throw Error('Le notifiche sono bloccate nelle impostazioni del dispositivo.');
  // Safari iOS richiede che il prompt sia invocato direttamente dal gesto dell'utente.
  var permissionRequest=Notification.permission==='default'?Notification.requestPermission():Promise.resolve(Notification.permission);
  var permission=await permissionRequest;
  if(permission!=='granted')throw Error('Non hai autorizzato le notifiche.');
  var registration=await navigator.serviceWorker.ready;
  var subscription=await registration.pushManager.getSubscription();
  if(!subscription){
   subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:encodeKey(publicKey)});
  }
  var j=subscription.toJSON(),u=session();
  var rows=await rest('turinpipps_push_subscriptions?on_conflict=endpoint',{method:'POST',
   body:{user_id:u.id,endpoint:j.endpoint,p256dh:j.keys.p256dh,auth_key:j.keys.auth,enabled:true,
     device_name:/iPhone/i.test(navigator.userAgent)?'iPhone':/iPad/i.test(navigator.userAgent)?'iPad':/Android/i.test(navigator.userAgent)?'Android':/Macintosh/i.test(navigator.userAgent)?'Mac':/Windows/i.test(navigator.userAgent)?'PC Windows':'Browser',
     platform:/iPhone|iPad/i.test(navigator.userAgent)?'iOS':/Android/i.test(navigator.userAgent)?'Android':/Macintosh/i.test(navigator.userAgent)?'macOS':/Windows/i.test(navigator.userAgent)?'Windows':'Web',
     last_seen_at:new Date().toISOString()},prefer:'resolution=merge-duplicates,return=representation'});
  if(!rows.length)throw Error('Il server non ha confermato la registrazione del dispositivo');
  state.push=true;note('tp-v5-push-message','Dispositivo registrato. Riceverai gli avvisi consentiti dalle tue preferenze.','ok');
  await refreshPushTestButton();
 }catch(e){note('tp-v5-push-message',e.message,'error')}
 finally{button.disabled=false}
}
function adminButton(){
 var nav=$('.side .nav');if(!nav||$('#tp-v5-nav-admin'))return;
 var b=document.createElement('button');b.type='button';b.id='tp-v5-nav-admin';b.dataset.nav='admin';
 b.innerHTML='<i class="fa-solid fa-screwdriver-wrench"></i><span class="nav-label">Sviluppatore</span>';
 nav.appendChild(b);
 var more=$('.tp-v5-more-links');if(more&&!$('#tp-v5-more-admin')){
  var extra=document.createElement('button');extra.id='tp-v5-more-admin';extra.className='button';
  extra.dataset.nav='admin';extra.innerHTML='<i class="fa-solid fa-screwdriver-wrench"></i> Console sviluppatore';more.append(extra);
 }
}
async function checkStaff(){
 var user=session();if(!user){state.staff=false;$('#tp-v5-nav-admin')?.remove();$('#tp-v5-more-admin')?.remove();return}
 try{
  var d=await rest('turinpipps_staff?select=role&user_id=eq.'+encodeURIComponent(user.id));
  state.staff=!!(d.length&&d[0].role==='owner'&&String(user.email||'').toLowerCase()==='filippo@maben.it'&&user.email_confirmed_at);
  if(state.staff)adminButton();
  else{$('#tp-v5-nav-admin')?.remove();$('#tp-v5-more-admin')?.remove()}
 }catch(_){state.staff=false}
}
async function renderAdmin(){
 if(!state.staff){$('#tp-v5-admin-content').textContent='Accesso riservato agli amministratori autorizzati.';return}
 note('tp-v5-admin-status','Aggiornamento dati amministrativi…');
 try{
  var data=await functionCall('turinpipps-admin','overview');
  var root=$('#tp-v5-admin-content');
  root.innerHTML='<div class="tp-v5-admin-metrics">'+
    [['Utenti',data.counts.users],['Email verificate',data.counts.verified],['Annunci',data.counts.listings],['Dispositivi push',data.counts.devices]]
    .map(function(k){return '<div class="tp-v5-metric"><b>'+Number(k[1]||0)+'</b><span>'+esc(k[0])+'</span></div>'}).join('')+'</div>'+
   '<section class="tp-v5-panel"><h2>Motori di ricerca</h2><div class="tp-v5-admin-health"><div><b>Supabase collector</b><small>Scansione ricorrente · indipendente da ChatGPT</small></div><span class="tp-v5-status-inline">Attivo su pg_cron</span></div>'+
   '<div class="tp-v5-admin-health"><div><b>Riepiloghi email</b><small>Invio tramite backend, per account verificati</small></div><span class="tp-v5-status-inline '+(data.email_provider_configured?'':'warning')+'">'+(data.email_provider_configured?'Provider configurato':'Provider da configurare')+'</span></div>'+
   '<h3>Ultime scansioni Supabase</h3><div class="tp-v5-scans">'+(data.scans||[]).slice(0,8).map(function(s){
      return '<div><span>'+esc(new Date(s.started_at).toLocaleString('it-IT'))+'</span><b>'+esc(s.status)+'</b><span>'+Number(s.jobs_ok)+'/'+Number(s.jobs_checked)+' fonti · '+Number(s.discovered)+' link</span></div>';
   }).join('')+'</div></section>'+
   '<section class="tp-v5-panel"><div class="tp-v5-list-title"><h2>Utenti registrati</h2><button class="tp-v5-secondary" id="tp-v5-admin-refresh">Ricarica</button></div>'+
   '<div class="tp-v5-users">'+(data.users||[]).map(function(u){
      return '<div class="tp-v5-user" data-user="'+esc(u.user_id)+'"><div><b>'+esc(u.email)+'</b><small>'+(u.email_confirmed?'Email verificata':'Da verificare')+' · '+Number(u.devices)+' dispositivi</small></div>'+
      '<label><span>Riepilogo</span><select data-field="frequency"><option value="daily">Giornaliero</option><option value="weekly">Settimanale</option><option value="off">Disattivato</option></select></label>'+
      '<label class="tp-v5-check-slim"><input type="checkbox" data-field="enabled" '+(u.digest_enabled?'checked':'')+'> Attivo</label>'+
      '<button class="tp-v5-secondary" data-tp-v5-save-user="'+esc(u.user_id)+'">Salva</button>'+
      '<button class="tp-v5-secondary" data-tp-v6-mail-user="'+esc(u.user_id)+'" '+(!data.email_provider_configured||!u.email_confirmed||!u.digest_enabled||u.digest_frequency==='off'?'disabled title="Provider, email verificata e consenso ai riepiloghi richiesti"':'')+'>Invia report</button></div>';
   }).join('')+'</div></section>'+
   '<section class="tp-v5-panel"><div class="tp-v5-list-title"><h2>Report email</h2><span class="tp-v5-status-inline '+(data.email_provider_configured?'':'warning')+'">'+(data.email_provider_configured?'Mittente configurato':'Provider non configurato')+'</span></div>'+
   '<p>Stato reale dei riepiloghi degli utenti. Il sistema pianifica gli invii da Supabase, non da ChatGPT.</p>'+
   '<div class="tp-v6-mail-logs">'+((data.mail_logs||[]).length?(data.mail_logs||[]).map(function(m){
      var u=(data.users||[]).find(function(x){return x.user_id===m.user_id});
      return '<div class="tp-v6-mail-row"><div><b>'+esc(u&&u.email||'Utente')+'</b><small>'+esc(m.kind)+' · '+esc(new Date(m.created_at).toLocaleString('it-IT'))+'</small></div>'+
        '<span class="tp-v5-status-inline '+(m.status==='sent'?'':'warning')+'">'+esc(m.status)+'</span>'+
        (m.status==='failed'&&m.error_text?'<small>'+esc(String(m.error_text).slice(0,110))+'</small>':'')+'</div>';
   }).join(''):'<p class="tp-v5-empty">Non risultano ancora report elaborati dal backend.</p>')+'</div></section>'+
   '<section class="tp-v5-panel"><h2>Postazioni e dispositivi</h2><p>Elenco dei dispositivi autorizzati alle notifiche. Le chiavi di sottoscrizione non vengono mostrate.</p>'+
   '<div class="tp-v5-devices">'+((data.devices||[]).length?(data.devices||[]).map(function(device){
     var owner=(data.users||[]).find(function(u){return u.user_id===device.user_id});
     return '<div class="tp-v5-device"><div><b>'+esc(device.device_name||device.platform||'Dispositivo')+'</b><small>'+esc(owner&&owner.email||'Account')+' · Registrato '+esc(new Date(device.created_at).toLocaleDateString('it-IT'))+
       ' · '+(device.enabled?'Attivo':'Disattivato')+(device.last_push_at?' · ultimo invio '+esc(new Date(device.last_push_at).toLocaleDateString('it-IT')):'')+'</small></div>'+
       '<div class="tp-v6-device-actions"><button class="tp-v5-secondary" data-tp-v6-rename-device="'+esc(device.id)+'" data-device-label="'+esc(device.device_name||device.platform||'Dispositivo')+'">Rinomina</button>'+
       (device.enabled?'<button class="tp-v5-secondary" data-tp-v5-disable-device="'+esc(device.id)+'">Disattiva</button>':'')+'</div></div>';
   }).join(''):'<p class="tp-v5-empty">Nessun dispositivo ha ancora autorizzato le notifiche.</p>')+'</div></section>';
  (data.users||[]).forEach(function(u){
    var e=$('[data-user="'+u.user_id+'"] select');if(e)e.value=u.digest_frequency||'daily';
  });
  $('#tp-v5-admin-refresh').addEventListener('click',renderAdmin);
  note('tp-v5-admin-status','Console aggiornata. Le modifiche sono registrate nel log amministrativo.','ok');
 }catch(e){note('tp-v5-admin-status',e.message,'error')}
}
async function saveUser(uuid){
 var row=$('[data-user="'+uuid+'"]');if(!row)return;
 var b=$('[data-tp-v5-save-user="'+uuid+'"]');b.disabled=true;
 try{
  await functionCall('turinpipps-admin','update_digest',{user_id:uuid,
   digest_enabled:$('[data-field="enabled"]',row).checked,
   digest_frequency:$('[data-field="frequency"]',row).value});
  note('tp-v5-admin-status','Preferenze dell’utente salvate con verifica server.','ok');
 }catch(e){note('tp-v5-admin-status',e.message,'error')}
 finally{b.disabled=false}
}
async function adminManualMail(uuid){
 var btn=$('[data-tp-v6-mail-user="'+uuid+'"]');
 if(!btn||btn.disabled)return;
 if(!confirm('Inviare adesso un riepilogo all’indirizzo verificato di questo utente?'))return;
 btn.disabled=true;
 note('tp-v5-admin-status','Preparazione del riepilogo per l’utente…');
 try{
  var response=await functionCall('turinpipps-mailer','admin_manual',{user_id:uuid});
  if(!response.sent)throw Error('Invio non confermato dal provider');
  note('tp-v5-admin-status','Report inviato e registrato nel log.','ok');
  await renderAdmin();
 }catch(e){note('tp-v5-admin-status',e.message,'error')}
 finally{btn.disabled=false}
}
function onNavigate(view){
 if(view==='profile')loadProfile();
 if(view==='notifications')fetchAlerts(true);
 if(view==='admin'&&state.staff)renderAdmin();
}
function init(){
 if(!$('#view-home')||$('#view-profile'))return;
 build();
 window.TurinPippsV5={onNavigate:onNavigate,canAdmin:function(){return state.staff===true&&!!session()&&String(session().email||'').toLowerCase()==='filippo@maben.it'}};
 document.addEventListener('click',function(e){
   var a=e.target.closest('[data-tp-v5-read]');if(a){e.preventDefault();markRead(Number(a.dataset.tpV5Read))}
   var b=e.target.closest('[data-tp-v5-save-user]');if(b){e.preventDefault();saveUser(b.dataset.tpV5SaveUser)}
   var mail=e.target.closest('[data-tp-v6-mail-user]');if(mail){e.preventDefault();adminManualMail(mail.dataset.tpV6MailUser)}
   var ren=e.target.closest('[data-tp-v6-rename-device]');
   if(ren){
     e.preventDefault();
     var label=prompt('Nome della postazione (es. iPhone lavoro, MacBook)',ren.dataset.deviceLabel||'');
     if(!label||!label.trim())return;
     ren.disabled=true;
     functionCall('turinpipps-admin','rename_device',{device_id:ren.dataset.tpV6RenameDevice,device_name:label.trim().slice(0,70)})
      .then(function(){note('tp-v5-admin-status','Postazione rinominata.','ok');renderAdmin()})
      .catch(function(error){note('tp-v5-admin-status',error.message,'error');ren.disabled=false});
   }
   var device=e.target.closest('[data-tp-v5-disable-device]');
   if(device){
     e.preventDefault();
     if(!confirm('Disattivare questa postazione per le notifiche?'))return;
     device.disabled=true;
     functionCall('turinpipps-admin','disable_device',{device_id:device.dataset.tpV5DisableDevice})
      .then(function(){note('tp-v5-admin-status','Postazione disattivata.','ok');renderAdmin()})
      .catch(function(error){note('tp-v5-admin-status',error.message,'error');device.disabled=false});
   }
 });
 var ready=function(){checkStaff();loadProfile();fetchAlerts(true);refreshPushTestButton()};
 window.addEventListener('turinpipps:account-ready',ready);
 window.addEventListener('turinpipps:account-signed-out',function(){
  state.profile=null;state.alerts=[];state.staff=false;state.loadedAt=0;
  $('#tp-v5-nav-admin')?.remove();$('#tp-v5-more-admin')?.remove();
  renderProfile();renderAlerts();
  if(!$('#view-admin').classList.contains('hidden'))window.TurinPippsUXV3.navigate('home');
 });
 window.addEventListener('turinpipps:ready',ready,{once:true});
 setTimeout(ready,1500);
 setInterval(function(){if(document.visibilityState==='visible')fetchAlerts(false)},120000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();