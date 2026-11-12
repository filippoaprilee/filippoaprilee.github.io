/* TurinPipps Auth · Supabase Auth + RLS per utente.
   Le credenziali sono gestite da Supabase Auth, non da GitHub Pages.
   Non usare service_role e non inviare dati personali a repository pubblici. */
(function () {
  'use strict';
  var cfg=window.TURINPIPPS_SUPABASE||{};
  var ready=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url||'')
       && typeof cfg.publishableKey==='string' && cfg.publishableKey.length>20
       && window.supabase && typeof window.supabase.createClient==='function';
  var client=ready?window.supabase.createClient(cfg.url,cfg.publishableKey,{
      auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
    }):null;
  var current=null, loading=false;
  var bridge=window.TurinPippsBridge;
  var dialog=document.getElementById('tp-auth-dialog');
  var button=document.getElementById('tp-account-button');
  var mode='signin';
  function el(id){return document.getElementById(id);}
  function status(msg,type){
    var e=el('tp-auth-status');if(!e)return;
    e.textContent=msg||'';e.className='tp-auth-status '+(type||'');
  }
  function setMode(next){
    mode=next;
    document.querySelectorAll('[data-auth-mode]').forEach(function(b){
      b.classList.toggle('active',b.dataset.authMode===next);
    });
    el('tp-auth-submit').textContent=next==='register'?'Crea account':'Accedi';
    el('tp-auth-password').autocomplete=next==='register'?'new-password':'current-password';
    status('');
  }
  function setButton(){
    var caption=current?(current.email||'Il mio profilo'):(ready?'Accedi / Registrati':'Account');
    var display=caption.length>30?caption.slice(0,27)+'…':caption;
    button.innerHTML='<i class="fa-solid fa-user-circle" aria-hidden="true"></i> <span>'+escapeHtml(display)+'</span>';
    el('tp-auth-logout').hidden=!current;
    el('tp-auth-import').hidden=!current;
    el('tp-auth-form').hidden=!!current;
    el('tp-auth-welcome').hidden=!current;
    if(current)el('tp-auth-welcome').textContent='Accesso effettuato con '+caption+'. I tuoi dati sono associati esclusivamente a questo account.';
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});}
  function open(){
    setButton();
    if(!ready){
      el('tp-auth-form').hidden=true;
      el('tp-auth-config').hidden=false;
      status('La registrazione è predisposta ma non ancora attiva: bisogna collegare il progetto Supabase e installare le regole di sicurezza.','warn');
    }else{
      el('tp-auth-config').hidden=true;
      if(!current)el('tp-auth-form').hidden=false;
    }
    if(dialog.showModal)dialog.showModal();
    else dialog.setAttribute('open','');
  }
  function close(){
    if(dialog.close)dialog.close();
    else dialog.removeAttribute('open');
  }
  async function changeSession(session){
    var next=session&&session.user?session.user:null;
    if(!next){
      current=null;
      if(bridge&&bridge.useGuest)bridge.useGuest();
      setButton();
      return;
    }
    try{
      var uid=next.id;
      var results=await Promise.all([
        client.from('turinpipps_listing_states').select('listing_url,saved,contacted,discarded,notes').eq('user_id',uid),
        client.from('turinpipps_manual_listings').select('payload').eq('user_id',uid),
        client.from('turinpipps_preferences').select('budget,display_name,introduction').eq('user_id',uid).maybeSingle()
      ]);
      for(var i=0;i<results.length;i++){
        if(results[i].error)throw results[i].error;
      }
      var flags={};
      (results[0].data||[]).forEach(function(row){
        flags[row.listing_url]={saved:!!row.saved,contact:!!row.contacted,
           discard:!!row.discarded,notes:row.notes||''};
      });
      var manual=(results[1].data||[]).map(function(x){return x.payload}).filter(Boolean);
      var settings=results[2].data||null;
      if(bridge&&bridge.useAccount)bridge.useAccount({flags:flags,manual:manual,
        settings:settings?{budget:settings.budget,fullname:settings.display_name,intro:settings.introduction}:null});
      current=next;setButton();
      status('Preferiti, note e annunci personali sincronizzati.','ok');
    }catch(err){
      status('Accesso riuscito ma sincronizzazione non disponibile: '+(err.message||'controlla le regole RLS e le tabelle.'),'error');
      // Account remains signed in. Do not silently mix guest favorites with private data.
      current=next;setButton();
      if(bridge&&bridge.useAccount)bridge.useAccount({flags:{},manual:[],settings:null});
    }
  }
  function requireUser(){
    if(!client||!current)return false;
    return true;
  }
  async function saveFlag(url,flag){
    if(!requireUser())return;
    var value={user_id:current.id,listing_url:url,saved:!!flag.saved,
      contacted:!!flag.contact,discarded:!!flag.discard,
      notes:String(flag.notes||'').slice(0,1000),updated_at:new Date().toISOString()};
    var result=await client.from('turinpipps_listing_states')
      .upsert(value,{onConflict:'user_id,listing_url'});
    if(result.error)status('Salvataggio online non riuscito: '+result.error.message,'error');
    else status('Annuncio salvato sul tuo account.','ok');
  }
  async function saveManual(row){
    if(!requireUser())return;
    var result=await client.from('turinpipps_manual_listings')
      .upsert({user_id:current.id,listing_url:row.url,payload:row,updated_at:new Date().toISOString()},
           {onConflict:'user_id,listing_url'});
    if(result.error)status('Annuncio personale non sincronizzato: '+result.error.message,'error');
  }
  async function savePreferences(prefs){
    if(!requireUser())return;
    var result=await client.from('turinpipps_preferences')
      .upsert({user_id:current.id,budget:Number(prefs.budget)||700,
        display_name:String(prefs.fullname||'').slice(0,70),
        introduction:String(prefs.intro||'').slice(0,1200),
        updated_at:new Date().toISOString()}, {onConflict:'user_id'});
    if(result.error)status('Preferenze non sincronizzate: '+result.error.message,'error');
  }
  async function importGuest(){
    if(!requireUser()||!bridge||!bridge.guestSnapshot)return;
    var copy=bridge.guestSnapshot();
    var flags=Object.keys(copy.flags||{}).map(function(url){
      var f=copy.flags[url]||{};
      return {user_id:current.id,listing_url:url,saved:!!f.saved,
        contacted:!!f.contact,discarded:!!f.discard,
        notes:String(f.notes||'').slice(0,1000),updated_at:new Date().toISOString()};
    });
    var manuals=(copy.manual||[]).filter(function(v){return v&&v.url}).map(function(row){
      return {user_id:current.id,listing_url:row.url,payload:row,updated_at:new Date().toISOString()};
    });
    if(flags.length){
      var a=await client.from('turinpipps_listing_states').upsert(flags,{onConflict:'user_id,listing_url'});
      if(a.error)throw a.error;
    }
    if(manuals.length){
      var b=await client.from('turinpipps_manual_listings').upsert(manuals,{onConflict:'user_id,listing_url'});
      if(b.error)throw b.error;
    }
    var session=await client.auth.getSession();
    if(session.data.session)await changeSession(session.data.session);
    status('Dati locali importati nel tuo account.','ok');
  }
  async function submit(e){
    e.preventDefault();
    if(!client)return;
    if(loading)return;
    loading=true;
    el('tp-auth-submit').disabled=true;
    try{
      var user=el('tp-auth-email').value.trim();
      var pass=el('tp-auth-password').value;
      if(!user||pass.length<8)throw new Error('Inserisci email valida e una password di almeno 8 caratteri.');
      var result;
      if(mode==='register'){
        result=await client.auth.signUp({email:user,password:pass,
          options:{emailRedirectTo:location.origin+location.pathname}});
      }else{
        result=await client.auth.signInWithPassword({email:user,password:pass});
      }
      if(result.error)throw result.error;
      if(mode==='register'&&!result.data.session){
        status('Controlla la posta: conferma il tuo indirizzo per completare la registrazione.','ok');
      }else{
        status('Autenticato. Caricamento dei dati personali…','ok');
        await changeSession(result.data.session);
        close();
      }
    }catch(err){status(err.message||'Errore di accesso.','error');}
    finally{loading=false;el('tp-auth-submit').disabled=false;}
  }
  async function resetPassword(){
    if(!client)return;
    var addr=el('tp-auth-email').value.trim();
    if(!addr){status('Inserisci l’indirizzo email, poi seleziona Recupera password.','warn');return;}
    var r=await client.auth.resetPasswordForEmail(addr,{redirectTo:location.origin+location.pathname});
    status(r.error?r.error.message:'Se l’indirizzo esiste, riceverai le istruzioni per reimpostare la password.',r.error?'error':'ok');
  }
  async function saveNewPassword(){
    if(!client||!current)return;
    var newPass=el('tp-auth-new-password').value;
    if(newPass.length<8){status('Servono almeno 8 caratteri.','warn');return;}
    var r=await client.auth.updateUser({password:newPass});
    if(r.error){status(r.error.message,'error');return;}
    el('tp-auth-change-password').hidden=true;
    status('Password aggiornata.','ok');
  }
  button.addEventListener('click',open);
  el('tp-auth-close').addEventListener('click',close);
  el('tp-auth-form').addEventListener('submit',submit);
  el('tp-auth-reset').addEventListener('click',resetPassword);
  el('tp-auth-update-password').addEventListener('click',saveNewPassword);
  el('tp-auth-logout').addEventListener('click',async function(){
    if(client)await client.auth.signOut();current=null;
    if(bridge&&bridge.useGuest)bridge.useGuest();
    setButton();close();
  });
  el('tp-auth-import').addEventListener('click',async function(){
    try{await importGuest();}catch(err){status(err.message||'Importazione non riuscita.','error');}
  });
  document.querySelectorAll('[data-auth-mode]').forEach(function(b){
    b.addEventListener('click',function(){setMode(b.dataset.authMode);});
  });
  window.TurinPippsAuth={isSignedIn:function(){return !!current},
    saveFlag:saveFlag,saveManual:saveManual,savePreferences:savePreferences,open:open};
  setButton();
  if(client){
    client.auth.getSession().then(function(r){
      if(r.error){status(r.error.message,'error');return;}
      return changeSession(r.data.session);
    }).catch(function(err){status(err.message,'error');});
    client.auth.onAuthStateChange(function(evt,session){
      if(evt==='PASSWORD_RECOVERY'){
        setTimeout(function(){open();el('tp-auth-change-password').hidden=false;},0);
      } else if(evt==='SIGNED_IN'||evt==='SIGNED_OUT'||evt==='TOKEN_REFRESHED') {
        setTimeout(function(){changeSession(session);},0);
      }
    });
  }
})();
