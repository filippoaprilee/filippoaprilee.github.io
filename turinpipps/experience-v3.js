/* TurinPipps v3 · ricerca estesa e UX, senza credenziali o scraping lato browser. */
(function(){
'use strict';
var zones=['Tutte le zone','Crocetta','Cenisia','San Paolo','Borgo San Paolo','Cit Turin','Santa Rita','Pozzo Strada'];
function $(s){return document.querySelector(s)}
function node(tag,className,text){var n=document.createElement(tag);if(className)n.className=className;if(text)n.textContent=text;return n}
function q(){return String($('#tp-radar-term')&&$('#tp-radar-term').value||'bilocale arredato').trim().slice(0,120)}
function z(){return String($('#tp-radar-zone')&&$('#tp-radar-zone').value||'')}
function queryFor(engine){
 var title='affitto appartamento Torino '+(z()?('"'+z()+'" '):'')+q();
 if(engine==='facebook')return 'site:facebook.com/groups/ Torino "affitto" '+(z()?('"'+z()+'" '):'')+q();
 if(engine==='privati')return '("affitto da privato" OR "senza agenzia") '+title+' -stanza -postoletto';
 return title+' -agenzia -intermediario';
}
function buildURL(engine){
 var query=queryFor(engine);
 if(engine==='bing')return 'https://www.bing.com/search?q='+encodeURIComponent(query)+'&setlang=it';
 if(engine==='duck')return 'https://duckduckgo.com/?q='+encodeURIComponent(query);
 return 'https://www.google.com/search?q='+encodeURIComponent(query)+'&tbs=qdr:w';
}
function refreshLinks(){
 document.querySelectorAll('[data-tp-engine]').forEach(function(a){a.href=buildURL(a.dataset.tpEngine)});
 var info=$('#tp-radar-query-preview');if(info)info.textContent='Zona: '+(z()||'Torino')+' · '+q();
}
function createRadar(){
 var host=$('#view-results'),anchor=$('.tp-search-tools');if(!host||!anchor||$('#tp-radar-v3'))return;
 var panel=node('section','tp-radar-v3');panel.id='tp-radar-v3';
 panel.innerHTML='<div class="tp-radar-intro"><div class="tp-radar-symbol" aria-hidden="true"><i class="fa-solid fa-satellite-dish"></i></div><div><span class="tp-radar-kicker">RICERCA ESTESA</span><h2>Non fermarti agli annunci già raccolti.</h2><p>Esplora più motori e i post Facebook pubblici indicizzati. Alcune fonti potrebbero richiedere l’accesso.</p></div></div>'+
 '<div class="tp-radar-controls"><label class="tp-radar-field"><span>Che casa cerchi?</span><input id="tp-radar-term" maxlength="120" autocomplete="off" value="bilocale arredato" placeholder="Es. bilocale arredato"></label>'+
 '<label class="tp-radar-field"><span>In quale zona?</span><select id="tp-radar-zone"></select></label></div>'+
 '<div class="tp-radar-links">'+
 '<a data-tp-engine="privati" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-google"></i> Privati su Google <i class="fa-solid fa-arrow-up-right-from-square"></i></a>'+
 '<a data-tp-engine="bing" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-magnifying-glass"></i> Bing <i class="fa-solid fa-arrow-up-right-from-square"></i></a>'+
 '<a data-tp-engine="duck" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-compass"></i> DuckDuckGo <i class="fa-solid fa-arrow-up-right-from-square"></i></a>'+
 '<a data-tp-engine="facebook" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-facebook"></i> Gruppi Facebook pubblici <i class="fa-solid fa-arrow-up-right-from-square"></i></a>'+
 '</div><div class="tp-radar-foot"><span id="tp-radar-query-preview"></span><span>Queste ricerche aprono risultati esterni: la disponibilità non è garantita.</span></div>';
 anchor.parentNode.insertBefore(panel,anchor);
 var live=node('div','tp-radar-live-status','Controllo gli annunci aggiuntivi…');
 live.id='tp-radar-live-status';panel.appendChild(live);

 var direct=node('div','tp-radar-direct');
 direct.innerHTML='<div class="tp-radar-direct-heading"><b>Vai direttamente agli annunci da privati</b><span>Filtri già impostati per Torino · scelta manuale sulla fonte</span></div>'+
 '<div class="tp-radar-direct-grid">'+
 '<a target="_blank" rel="noopener noreferrer" href="https://www.immobiliare.it/affitto-case/torino/da-privati/"><span>Immobiliare.it</span><small>Sezione privati</small></a>'+
 '<a target="_blank" rel="noopener noreferrer" href="https://torino.bakeca.it/annunci/offro-casa/inserzionistacase/privato/"><span>Bakeca</span><small>Privati Torino</small></a>'+
 '<a target="_blank" rel="noopener noreferrer" href="https://www.trovacasa.it/appartamenti-in-affitto/torino/borgo-san-paolo-cenisia/da-privati"><span>TrovaCasa</span><small>Cenisia e San Paolo</small></a>'+
 '<a target="_blank" rel="noopener noreferrer" href="https://www.clickcase.it/annunci/affitti-case-privati-torino.html"><span>ClickCase</span><small>Da privato a privato</small></a>'+
 '<a target="_blank" rel="noopener noreferrer" href="https://www.subito.it/annunci-piemonte/affitto/appartamenti/torino/torino/da-privati/"><span>Subito</span><small>Affitti privati</small></a>'+
 '</div>';
 panel.appendChild(direct);


 // L'aggiunta di un annuncio deve rimanere sempre raggiungibile, senza aprire i filtri.
 var add=$('#add');if(add){
   add.innerHTML='<i class="fa-solid fa-link"></i> Aggiungi annuncio';
   var quick=node('div','tp-radar-manual');
   quick.appendChild(add);
   panel.appendChild(quick);
 }

 var select=$('#tp-radar-zone');
 zones.forEach(function(zone,i){var opt=document.createElement('option');opt.value=i?zone:'';opt.textContent=zone;select.appendChild(opt)});
 try{var saved=JSON.parse(localStorage.getItem('tp_radar_v3')||'{}');
   if(saved.term)$('#tp-radar-term').value=saved.term;
   if(saved.zone)select.value=saved.zone;
 }catch(_){}
 function change(){
   refreshLinks();
   try{localStorage.setItem('tp_radar_v3',JSON.stringify({term:q(),zone:z()}))}catch(_){}
 }
 $('#tp-radar-term').addEventListener('input',change);select.addEventListener('change',change);
 $('#tp-radar-term').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();window.open(buildURL('privati'),'_blank','noopener,noreferrer')}});
 change();
}
function brandAndSections(){
 var eyebrow=$('.topline .eyebrow');
 if(eyebrow&&!$('#tp-mobile-brand')){
   var brand=node('div','tp-mobile-brand');brand.id='tp-mobile-brand';
   brand.innerHTML='<img src="./icon.svg" alt="" aria-hidden="true"><span>TurinPipps<small>RICERCA CASA · TORINO</small></span>';
   eyebrow.parentNode.insertBefore(brand,eyebrow);
 }
 var nav=$('.side .nav');if(nav&&!$('.tp-nav-label')){
   var home=nav.querySelector('[data-nav="home"]'),compare=nav.querySelector('[data-nav="compare"]'),
       sources=nav.querySelector('[data-nav="sources"]');
   [ [home,'SCOPRI'],[compare,'ORGANIZZA'],[sources,'IL TUO ACCOUNT'] ].forEach(function(a){
     if(!a[0])return;var label=node('div','tp-nav-label',a[1]);a[0].parentNode.insertBefore(label,a[0]);
   });
 }
 var names={results:'Radar casa',saved:'Salvati',sources:'Monitoraggio',settings:'Impostazioni'};
 Object.keys(names).forEach(function(key){
   var item=$('.side .nav [data-nav="'+key+'"] .nav-label');if(item){
     var count=item.querySelector('span');item.textContent=names[key]+' ';if(count)item.appendChild(count);
   }
 });
 var lead=$('#view-results .tp-page-lead h1');if(lead)lead.textContent='Radar casa';
 var sub=$('#view-results .tp-page-lead p');if(sub)sub.textContent='Gli annunci raccolti e le nuove ricerche su più motori, nello stesso spazio.';
 var searchButton=$('[data-nav="results"].hero-cta');if(searchButton)searchButton.innerHTML='Apri il radar <i class="fa-solid fa-arrow-right"></i>';
}
function decorateHome(){
 var home=$('#view-home .hero');
 if(!home)return;
 var title=home.querySelector('h1');if(title)title.innerHTML='La tua prossima casa.<br>Prima degli altri.';
 var blurb=home.querySelector('p');
 if(blurb)blurb.innerHTML='Torino vicino al Politecnico. Annunci da privati, prezzo e condizioni sotto controllo. <b>Un solo posto in cui cercare.</b>';
 var extra=node('div','tp-home-shortcuts');
 extra.innerHTML='<button type="button" data-nav="results"><i class="fa-solid fa-satellite-dish"></i> Cerca ovunque</button>'+
 '<button type="button" data-nav="saved"><i class="fa-regular fa-heart"></i> I miei salvati</button>'+
 '<button type="button" data-nav="visits"><i class="fa-regular fa-calendar-check"></i> Organizza visite</button>';
 home.insertAdjacentElement('afterend',extra);
}
function improveGuide(){
 var api=window.TurinPippsUXV3;if(!api||!api.guideSlides)return;
 api.guideSlides([
  {icon:'fa-solid fa-sliders',title:'Cominciamo dalle tue esigenze',
   text:'Imposta il canone massimo. Puoi modificarlo in qualsiasi momento.'},
  {icon:'fa-solid fa-location-dot',title:'Scegli i quartieri',
   text:'Seleziona le zone in cui vuoi cercare. Il Politecnico è il punto di riferimento.'},
  {icon:'fa-solid fa-satellite-dish',title:'Il radar è pronto',
   text:'Esplora gli annunci, cerca su altri motori, salva le case migliori e confrontale. Nelle schede troverai sempre ciò che resta da verificare.'}
 ]);
 window.TurinPippsEnhanceGuide=function(step){
   var desc=$('#tp-guide-description');if(!desc)return;
   var existing=$('#tp-guide-fields');if(existing)existing.remove();
   var extra=node('div','tp-guide-fields');extra.id='tp-guide-fields';
   if(step===0){
     var budget=Number(api.getPrefs().budget)||700;
     extra.innerHTML='<label>Canone massimo mensile (€)<input id="tp-guide-budget" type="number" min="150" max="5000" step="50" value="'+budget+'"></label><p>Le spese aggiuntive saranno mostrate separatamente quando disponibili.</p>';
   }else if(step===1){
     var prefs=api.getPrefs(),chosen=Array.isArray(prefs.preferredZones)&&prefs.preferredZones.length?prefs.preferredZones:zones.slice(1);
     extra.innerHTML='<div class="tp-guide-choices">'+zones.slice(1).map(function(area){
       return '<label><input type="checkbox" value="'+area+'" '+(chosen.indexOf(area)!==-1?'checked':'')+'> '+area+'</label>';
     }).join('')+'</div>';
   }else{
     extra.innerHTML='<div class="tp-guide-success"><i class="fa-solid fa-check-circle"></i> Personalizzazione pronta. Nessun collegamento tecnico da configurare nell’app.</div>';
   }
   desc.insertAdjacentElement('afterend',extra);
 };
 document.addEventListener('change',function(e){
   var t=e.target;
   if(t.id==='tp-guide-budget'){
     var value=Math.max(150,Math.min(5000,Number(t.value)||700));t.value=value;
     api.setBudget(value);
   }
   if(t.closest&&t.closest('#tp-guide-fields')&&t.type==='checkbox'){
     var checked=Array.from(document.querySelectorAll('#tp-guide-fields input:checked')).map(function(x){return x.value});
     if(!checked.length){t.checked=true;return;}
     api.setZones(checked);
   }
 });
 // Persist for authenticated profiles through the existing, permission-checked settings workflow.
 var next=$('#tp-guide-next');if(next)next.addEventListener('click',function(){
   if($('#tp-guide-fields .tp-guide-success')&&$('#save-settings'))$('#save-settings').click();
 },true);
}
function initialView(){
 var params=new URLSearchParams(location.search);
 var screen=params.get('screen');
 if(screen==='radar')window.TurinPippsUXV3.navigate('results');
 if(screen==='saved')window.TurinPippsUXV3.navigate('saved');
 if(screen==='visits')window.TurinPippsUXV3.navigate('visits');
 if(screen==='compare')window.TurinPippsUXV3.navigate('compare');
}
function badges(){
 if(!('setAppBadge'in navigator))return;
 var items=window.TurinPippsUXV3.getDiagnostics()||[],active=items.find(function(s){return (s.name||'').indexOf('Google Apps Script')!==-1;});
 var count=active&&Number(active.new)||0;
 if(count>0)navigator.setAppBadge(Math.min(99,count)).catch(function(){});
 else if('clearAppBadge'in navigator)navigator.clearAppBadge().catch(function(){});
}
/* Lettura pubblica Supabase: nessuna chiave segreta né credenziale utente nel browser. */
var liveLoading=false,lastLiveFetch=0;
async function loadLiveListings(force){
 if(liveLoading||!window.TurinPippsUXV3)return;
 if(!force&&Date.now()-lastLiveFetch<120000)return;
 var cfg=window.TURINPIPPS_SUPABASE||{};
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url||'')||!cfg.publishableKey)return;
 liveLoading=true;lastLiveFetch=Date.now();
 var headers={'apikey':cfg.publishableKey,'Accept':'application/json'};
 var root=cfg.url.replace(/\/$/,'')+'/rest/v1/';
 var controller=new AbortController();
 var timeout=setTimeout(function(){controller.abort()},8500);
 try{
   var [a,b]=await Promise.allSettled([
     fetch(root+'turinpipps_discovered_listings?select=listing_url,title,description,source,origin_engine,zone,price,first_seen,last_seen,source_updated,sqm,expenses,address,property_type&order=first_seen.desc&limit=600',{headers:headers,signal:controller.signal,cache:'no-store'})
       .then(function(r){if(!r.ok)throw new Error('Annunci: HTTP '+r.status);return r.json()}),
     fetch(root+'turinpipps_scan_runs?select=started_at,finished_at,status,jobs_checked,jobs_ok,discovered&order=started_at.desc&limit=1',{headers:headers,signal:controller.signal,cache:'no-store'})
       .then(function(r){if(!r.ok)throw new Error('Scansioni: HTTP '+r.status);return r.json()})
   ]);
   if(a.status==='fulfilled'){
     window.TurinPippsUXV3.addDiscovery(a.value,b.status==='fulfilled'?b.value[0]||null:null);
     var live=$('#tp-radar-live-status');
     if(live){
       var run=b.status==='fulfilled'?b.value[0]:null,when=run&&new Date(run.finished_at||run.started_at);
       live.className='tp-radar-live-status';
       live.innerHTML='<i class="fa-solid fa-circle-check"></i> '+a.value.length+' annunci aggiuntivi nell’archivio live'+
         (when&&isFinite(when.getTime())?' · controllo '+when.toLocaleString('it-IT'):'')+
         ' <small>Risultati da verificare sulle fonti originali.</small>';
     }
   }
 }catch(err){
   var status=$('#tp-radar-live-status');
   if(status)status.textContent='Aggiornamento live temporaneamente non disponibile. Puoi continuare a consultare gli annunci già salvati.';
 }finally{clearTimeout(timeout);liveLoading=false;}
}

function setupIphoneDashboard(){
 var panel=$('#view-settings .panel');if(!panel||$('#tp-ios-quick'))return;
 var section=node('section','tp-ios-quick');section.id='tp-ios-quick';
 section.innerHTML='<div class="tp-ios-quick-title"><i class="fa-solid fa-mobile-screen-button"></i><div><h3>TurinPipps a portata di mano</h3><p>Apri la tua panoramica veloce dal telefono senza attraversare i menu.</p></div></div>'+
 '<div class="tp-ios-quick-actions"><a href="./today.html" class="button primary">Apri panoramica veloce</a><button type="button" class="button" id="tp-ios-copy">Copia link per iPhone</button></div>'+
 '<details><summary>Come aggiungerlo ai widget su iPhone</summary><p>Apri l’app <b>Comandi Rapidi</b> e crea un comando con l’azione <b>Apri URL</b>, incollando il link della panoramica. Aggiungi poi il widget di Comandi Rapidi alla schermata Home e seleziona il comando. Il widget avvia la panoramica, ma non mostra dati aggiornati direttamente sul riquadro.</p></details>';
 panel.appendChild(section);
 $('#tp-ios-copy').addEventListener('click',async function(){
   var url=new URL('./today.html',location.href).href;
   try{await navigator.clipboard.writeText(url);this.textContent='Link copiato';}
   catch(_){this.textContent='Copia dall’indirizzo: '+url}
 });
}

function init(){
 brandAndSections();createRadar();decorateHome();setupIphoneDashboard();
 document.addEventListener('keydown',function(e){
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){
     e.preventDefault();window.TurinPippsUXV3.navigate('results');var input=$('#tp-main-search');if(input)input.focus();
   }
 });
 window.addEventListener('turinpipps:ready',function(){initialView();badges();loadLiveListings(true)},{once:true});
 document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')loadLiveListings(false)});
 setInterval(function(){if(document.visibilityState==='visible')loadLiveListings(false)},180000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();