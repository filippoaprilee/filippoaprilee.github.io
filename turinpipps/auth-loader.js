/* TurinPipps: resilient Supabase UMD loading; no keys in this file. */
(function(){
  'use strict';
  var sources=[
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'
  ];
  var i=0,loaded=false;
  function startAuth(){
    if(loaded)return;loaded=true;
    var s=document.createElement('script');
    s.src='./auth.js?v=1.4.0';
    s.async=false;
    s.onerror=function(){
      if(window.TurinPippsBoot)window.TurinPippsBoot.authReady(false,false);
      document.dispatchEvent(new CustomEvent('turinpipps:auth-error',{detail:'Impossibile caricare il modulo account'}));
    };
    document.body.appendChild(s);
  }
  function next(){
    if(window.supabase&&typeof window.supabase.createClient==='function'){startAuth();return;}
    if(i>=sources.length){startAuth();return;}
    var s=document.createElement('script');s.src=sources[i++];s.async=true;
    s.onload=next;s.onerror=next;document.head.appendChild(s);
  }
  next();
})();
