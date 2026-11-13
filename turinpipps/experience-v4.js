/* TurinPipps 4.0 — onboarding completo, dati reali, zero interruzioni al flusso. */
(function(){
'use strict';
var $=function(sel,root){return (root||document).querySelector(sel)};
var $$=function(sel,root){return Array.from((root||document).querySelectorAll(sel))};
var zones=['Crocetta','Cenisia','San Paolo','Borgo San Paolo','Cit Turin','Santa Rita','Pozzo Strada'];
var steps=[
 {icon:'fa-solid fa-sparkles',eyebrow:'LA TUA RICERCA COMINCIA QUI',title:'Finalmente una casa che risponde alle tue esigenze.',
  text:'In pochi passaggi impostiamo il tuo radar: meno annunci irrilevanti, più tempo per le case che meritano davvero.'},
 {icon:'fa-solid fa-wallet',eyebrow:'01 · BUDGET',title:'Quanto vuoi spendere ogni mese?',
  text:'Imposta il canone massimo, escluse le spese. Il budget non è un obbligo: puoi modificarlo quando vuoi.'},
 {icon:'fa-solid fa-location-dot',eyebrow:'02 · QUARTIERI',title:'In quali zone ti piacerebbe abitare?',
  text:'Seleziona più quartieri. L’app darà priorità a quelli che scegli e ti segnalerà gli annunci con zona incerta.'},
 {icon:'fa-solid fa-building',eyebrow:'03 · CASA IDEALE',title:'Che tipo di casa stai cercando?',
  text:'Le tue preferenze affinano il radar, senza nascondere a priori opportunità che potrebbero sorprenderti.'},
 {icon:'fa-solid fa-person-walking',eyebrow:'04 · DISTANZE',title:'Quanto lontano dal Politecnico?',
  text:'Le distanze a piedi vengono considerate solo quando sono note: non inventiamo tempi di percorrenza.'},
 {icon:'fa-solid fa-shield-halved',eyebrow:'05 · PREFERENZE',title:'Cosa conta di più nella scelta?',
  text:'Impostiamo le tue priorità e ti mostriamo sempre le informazioni che devono essere controllate.'},
 {icon:'fa-regular fa-message',eyebrow:'06 · PRESENTAZIONE',title:'Prepariamo un messaggio per i proprietari.',
  text:'Nome e presentazione sono facoltativi. Il testo resta privato e non viene inviato automaticamente.'},
 {icon:'fa-solid fa-route',eyebrow:'07 · COME FUNZIONA',title:'Un percorso semplice, dalla scoperta alla visita.',
  text:'Ogni casa diventa un piccolo progetto: la trovi, la confronti, chiedi informazioni e organizzi una visita.'},
 {icon:'fa-solid fa-check-circle',eyebrow:'08 · TUTTO PRONTO',title:'Il tuo radar è configurato.',
  text:'Controlla le impostazioni e inizia a esplorare. Gli annunci pubblici non sono disponibilità confermate.'}
];
var draft=null,active=-1,rendered=false;
function clamp(n,min,max){return Math.max(min,Math.min(max,Number(n)||0))}
function plain(value){return String(value||'').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/&/g,'&amp;')}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(k){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[k]})}
function defaults(){
 var p=window.TurinPippsUXV3.getPrefs(),s={};
 try{s=JSON.parse(sessionStorage.getItem('tp-onboard-v4-draft')||'{}')}catch(_){}
 return Object.assign({
  budget:clamp(p.budget||700,150,5000),zones:p.preferredZones&&p.preferredZones.length?p.preferredZones.slice():zones.slice(),
  type:p.propertyType||'tutte',sqm:clamp(p.minSqm||0,0,400),walk:p.maxWalkMinutes||0,
  furnishing:'preferibilmente_arredato',topPriority:'no_agency',
  name:p.fullname||'',intro:p.intro||''
 },s);
}
function cache(){try{sessionStorage.setItem('tp-onboard-v4-draft',JSON.stringify(draft))}catch(_){}}
function money(n){return Number(n).toLocaleString('it-IT')+' €'}
function body(step){
 switch(step){
 case 0:return '<div class="tp-ob-intro"><div class="tp-ob-illustration" aria-hidden="true"><div class="tp-ob-sun"></div><div class="tp-ob-house hp1"><i class="fa-solid fa-house"></i></div><div class="tp-ob-house hp2"><i class="fa-solid fa-building"></i></div><div class="tp-ob-house hp3"><i class="fa-solid fa-house-chimney-window"></i></div></div>'+
   '<div class="tp-ob-benefits"><div><i class="fa-solid fa-magnifying-glass-location"></i><b>Ricerca su più fonti</b><span>Raccolta e ricerche esterne in un solo posto.</span></div>'+
   '<div><i class="fa-solid fa-scale-balanced"></i><b>Confronti intelligenti</b><span>Prezzo, spese, zona e informazioni mancanti.</span></div>'+
   '<div><i class="fa-regular fa-calendar-check"></i><b>Visite sotto controllo</b><span>Salvati, note e visite senza perdere nulla.</span></div></div></div>';
 case 1:return '<div class="tp-ob-budget"><div class="tp-ob-budget-value"><span>Canone massimo</span><output id="tp-ob-money">'+money(draft.budget)+'</output><small>al mese · escluse spese condominiali e utenze</small></div>'+
   '<input id="tp-ob-budget-range" type="range" min="250" max="1500" step="25" value="'+draft.budget+'" aria-label="Canone massimo">'+
   '<div class="tp-ob-range-ends"><span>250 €</span><span>1.500 €</span></div>'+
   '<div class="tp-ob-suggest"><span>Oppure scegli</span><button type="button" data-budget="550">550 €</button><button type="button" data-budget="650">650 €</button><button type="button" data-budget="700">700 €</button><button type="button" data-budget="800">800 €</button></div>'+
   '<label class="tp-ob-field tp-ob-budget-manual">Importo preciso (€) <input id="tp-ob-budget-number" type="number" inputmode="numeric" min="150" max="5000" step="25" value="'+draft.budget+'"></label>'+
   '<p class="tp-ob-hint"><i class="fa-solid fa-circle-info"></i> Quando un annuncio non indica il prezzo, lo vedrai come “da verificare”, non come se rientrasse certamente nel budget.</p></div>';
 case 2:return '<div class="tp-ob-zone-tools"><button type="button" data-choose-zone="all">Seleziona tutte</button><button type="button" data-choose-zone="none">Deseleziona</button><strong id="tp-ob-zone-count">'+draft.zones.length+' zone scelte</strong></div>'+
  '<div class="tp-ob-zone-grid">'+zones.map(function(z,i){
   return '<label class="tp-ob-zone '+(draft.zones.includes(z)?'selected':'')+'"><input type="checkbox" name="tp-ob-zone" value="'+esc(z)+'" '+(draft.zones.includes(z)?'checked':'')+'>'+
   '<span class="tp-ob-zone-icon"><i class="fa-solid fa-location-dot"></i></span><span><b>'+esc(z)+'</b><small>'+(['Residenziale, centrale','Vicino al campus','Università e servizi','Collegamenti comodi','Metropolitana e centro','Spazi e servizi','Residenziale e metro'][i])+'</small></span><i class="fa-solid fa-check tp-ob-tick"></i></label>';
  }).join('')+'</div><p class="tp-ob-hint">Puoi selezionare più zone; almeno una è necessaria.</p>';
 case 3:return '<div class="tp-ob-types">'+[
  ['tutte','fa-solid fa-layer-group','Valuto tutto','Non escludere immobili in partenza'],
  ['monolocale','fa-solid fa-door-open','Monolocale','Un ambiente principale'],
  ['bilocale','fa-solid fa-house','Bilocale','Soggiorno + camera separata'],
  ['trilocale','fa-solid fa-building','Trilocale','Più spazio per vivere e studiare']
  ].map(function(v){return '<label class="tp-ob-type '+(draft.type===v[0]?'selected':'')+'"><input type="radio" name="tp-ob-type" value="'+v[0]+'" '+(draft.type===v[0]?'checked':'')+'><i class="'+v[1]+'"></i><span><b>'+v[2]+'</b><small>'+v[3]+'</small></span><i class="fa-regular fa-circle-check"></i></label>'}).join('')+'</div>';
 case 4:return '<div class="tp-ob-block"><label class="tp-ob-field">Superficie minima preferita <div class="tp-ob-inline"><input id="tp-ob-sqm" type="number" min="0" max="400" step="5" value="'+draft.sqm+'"><span>m²</span></div></label>'+
  '<div class="tp-ob-divider"></div><label class="tp-ob-field">Tempo massimo a piedi dal Politecnico</label>'+
  '<div class="tp-ob-pills">'+[[0,'Non importa'],[10,'10 min'],[15,'15 min'],[20,'20 min'],[30,'30 min'],[45,'45 min']].map(function(o){return '<button type="button" data-walk="'+o[0]+'" class="'+(Number(draft.walk)===o[0]?'selected':'')+'">'+o[1]+'</button>'}).join('')+'</div>'+
  '<p class="tp-ob-hint"><i class="fa-solid fa-person-walking"></i> Riferimento: Politecnico di Torino, Corso Duca degli Abruzzi 24. Gli immobili senza tempo a piedi noto restano consultabili.</p></div>';
 case 5:return '<div class="tp-ob-block"><span class="tp-ob-field-title">Cosa preferisci?</span><div class="tp-ob-priority-grid">'+[
  ['no_agency','fa-solid fa-handshake','Solo proprietari','Preferisco evitare le commissioni'],
  ['balanced','fa-solid fa-list-check','Flessibilità','Valuto tutte le offerte utili'],
  ['transparent','fa-solid fa-receipt','Costi chiari','Voglio conoscere anche spese ed extra']
  ].map(function(o){return '<button type="button" data-priority="'+o[0]+'" class="'+(draft.topPriority===o[0]?'selected':'')+'"><i class="'+o[1]+'"></i><span><b>'+o[2]+'</b><small>'+o[3]+'</small></span></button>'}).join('')+'</div>'+
  '<span class="tp-ob-field-title">Arredamento</span><div class="tp-ob-pills">'+[
   ['preferibilmente_arredato','Arredato'],['indifferente','Indifferente'],['non_arredato','Anche vuoto']
  ].map(function(o){return '<button type="button" data-furnish="'+o[0]+'" class="'+(draft.furnishing===o[0]?'selected':'')+'">'+o[1]+'</button>'}).join('')+'</div>'+
  '<p class="tp-ob-hint">Queste ultime preferenze aiutano a precompilare le ricerche esterne; non vengono attribuite caratteristiche inesistenti agli immobili.</p></div>';
 case 6:return '<div class="tp-ob-block"><label class="tp-ob-field">Come ti chiami? <small>Facoltativo</small><input id="tp-ob-name" type="text" maxlength="70" placeholder="Come vuoi presentarti" value="'+esc(draft.name)+'"></label>'+
  '<label class="tp-ob-field">Cosa vuoi dire al proprietario? <small>Facoltativo</small><textarea id="tp-ob-intro" rows="5" maxlength="1200" placeholder="Studio/lavoro a Torino, da quando mi serve la casa, che contratto preferisco...">'+esc(draft.intro)+'</textarea></label>'+
  '<div class="tp-ob-template"><span>Spunto per iniziare</span><button type="button" id="tp-ob-intro-template">Usa un modello breve <i class="fa-solid fa-arrow-right"></i></button></div>'+
  '<p class="tp-ob-hint"><i class="fa-solid fa-lock"></i> Non invieremo email o messaggi senza la tua azione esplicita.</p></div>';
 case 7:return '<div class="tp-ob-workflow">'+[
  ['01','fa-solid fa-magnifying-glass','Scopri','Esplora gli immobili raccolti e apri le ricerche pubbliche negli altri portali.'],
  ['02','fa-regular fa-heart','Salva','Ritrova gli annunci interessanti, anche dopo aver chiuso la pagina.'],
  ['03','fa-solid fa-scale-balanced','Confronta','Seleziona almeno due case: confrontale per canone, condizioni e servizi.'],
  ['04','fa-regular fa-calendar-check','Organizza','Segna i contatti, scrivi note e programma visite in calendario.']
  ].map(function(o){return '<div class="tp-ob-flow-item"><span class="tp-ob-flow-num">'+o[0]+'</span><span class="tp-ob-flow-icon"><i class="'+o[1]+'"></i></span><div><b>'+o[2]+'</b><p>'+o[3]+'</p></div></div>'}).join('')+'</div><p class="tp-ob-hint">L’archivio prova a trovare nuovi link periodicamente. L’effettiva disponibilità e l’identità dell’inserzionista devono essere confermate.</p>';
 case 8:return '<div class="tp-ob-ready"><div class="tp-ob-ready-icon"><i class="fa-solid fa-check"></i></div>'+
  '<div class="tp-ob-ready-grid">'+
  '<div><small>Il tuo budget</small><b>'+money(draft.budget)+'/mese</b></div>'+
  '<div><small>Quartieri preferiti</small><b>'+draft.zones.length+' zone</b></div>'+
  '<div><small>Tipologia</small><b>'+({'tutte':'Qualsiasi','monolocale':'Monolocale','bilocale':'Bilocale','trilocale':'Trilocale'}[draft.type]||'Qualsiasi')+'</b></div>'+
  '<div><small>Dal Politecnico</small><b>'+(draft.walk?draft.walk+' min a piedi':'Senza limite')+'</b></div>'+
  '</div><p>Le tue preferenze saranno salvate alla conclusione. Inizia dal Radar casa e aggiungi ai preferiti i primi immobili interessanti.</p></div>';
 }return '';
}
function persistValues(){
 var range=$('#tp-ob-budget-range'),num=$('#tp-ob-budget-number');
 if(num&&Number(num.value)>0)draft.budget=clamp(num.value,150,5000);
 else if(range)draft.budget=clamp(range.value,150,5000);
 var selected=$('input[name="tp-ob-zone"]:checked');if(active===2)draft.zones=selected.map(function(x){return x.value});
 var type=$('input[name="tp-ob-type"]:checked');if(type)draft.type=type.value;
 var sqm=$('#tp-ob-sqm');if(sqm)draft.sqm=clamp(sqm.value,0,400);
 var name=$('#tp-ob-name'),intro=$('#tp-ob-intro');
 if(name)draft.name=name.value.slice(0,70);if(intro)draft.intro=intro.value.slice(0,1200);
 cache();
}
function draw(step){
 if(!draft)draft=defaults();
 active=step;
 var s=steps[step],wrap=$('#tp-guide-dialog'),body=$('.tp-guide-body',wrap);
 if(!rendered){
   body.innerHTML='<div class="tp-ob-shell"><aside class="tp-ob-aside">'+
      '<div class="tp-ob-wordmark"><img src="./icon.svg" alt=""><div><b>TurinPipps</b><small>IL TUO RADAR CASA</small></div></div>'+
      '<div class="tp-ob-aside-center"><div class="tp-ob-aside-eyebrow">UN INIZIO MIGLIORE</div><strong>La tua ricerca.<br>Le tue regole.</strong><p>Ti aiutiamo a trovare una casa a Torino con un percorso chiaro, senza informazioni inutili.</p></div>'+
      '<div class="tp-ob-aside-bottom"><i class="fa-solid fa-location-dot"></i> Torino · Politecnico</div></aside>'+
      '<div class="tp-ob-main"><div class="tp-ob-top"><span id="tp-guide-kicker">INIZIAMO</span><span id="tp-ob-counter">1 / 9</span></div>'+
      '<div class="tp-ob-scroll" id="tp-ob-scroll"><div class="tp-ob-icon" id="tp-guide-icon"></div><h2 id="tp-guide-title"></h2>'+
      '<p id="tp-guide-description"></p><div id="tp-guide-fields" class="tp-ob-fields"></div></div>'+
      '<div class="tp-ob-footer"><div class="tp-ob-progress-track"><span id="tp-guide-progress"></span></div>'+
      '<div class="tp-ob-footer-actions"><button class="tp-ob-secondary" type="button" id="tp-guide-skip">Salta</button>'+
      '<button class="tp-ob-primary" type="button" id="tp-guide-next">Continua <i class="fa-solid fa-arrow-right"></i></button></div>'+
      '<div class="tp-ob-footnote">Le tue preferenze restano sotto il tuo controllo.</div></div></div></div>';
   rendered=true;
   // I pulsanti sono stati ricreati: le azioni originali erano collegate ai vecchi nodi.
   $('#tp-guide-skip').addEventListener('click',function(){
      if(active>0){persistValues();draw(active-1)}
      else {localStorage.setItem('turinpipps.onboard.v4','1');$('#tp-guide-dialog').close();}
   });
   $('#tp-guide-next').addEventListener('click',function(){
      persistValues();
      if(active===2&&draft.zones.length===0){$('#tp-ob-zone-error').hidden=false;return}
      if(active<steps.length-1){draw(active+1);return}
      savePrefs();
      localStorage.setItem('turinpipps.onboard.v4','1');
      localStorage.setItem('turinpipps.onboard.v2','1');
      sessionStorage.removeItem('tp-onboard-v4-draft');
      $('#tp-guide-dialog').close();
      window.TurinPippsUXV3.navigate('results');
   });
 }
 $('#tp-guide-kicker').textContent=s.eyebrow;
 $('#tp-ob-counter').textContent=(step+1)+' / '+steps.length;
 $('#tp-guide-icon').innerHTML='<i class="'+s.icon+'"></i>';
 $('#tp-guide-title').textContent=s.title;
 $('#tp-guide-description').textContent=s.text;
 $('#tp-guide-fields').innerHTML=bodyForStep(step);
 $('#tp-guide-progress').style.width=((step+1)/steps.length*100)+'%';
 $('#tp-guide-skip').textContent=step===0?'Salta configurazione':'Indietro';
 $('#tp-guide-next').innerHTML=step===steps.length-1?'Salva e apri il radar <i class="fa-solid fa-arrow-right"></i>':'Continua <i class="fa-solid fa-arrow-right"></i>';
 var scroll=$('#tp-ob-scroll');if(scroll)scroll.scrollTop=0;
 if(step===2){var error=document.createElement('p');error.id='tp-ob-zone-error';error.className='tp-ob-error';error.hidden=true;error.textContent='Scegli almeno un quartiere per proseguire.';$('#tp-guide-fields').append(error)}
}
function bodyForStep(step){return body(step)}
function savePrefs(){
 var api=window.TurinPippsUXV3;
 var bg=$('#budget'),sqm=$('#tp-min-sqm'),type=$('#tp-property-type'),walk=$('#tp-max-walk'),name=$('#fullname'),intro=$('#intro');
 api.setZones(draft.zones);
 api.setBudget(draft.budget);
 if(bg)bg.value=draft.budget;
 if(sqm)sqm.value=draft.sqm;
 if(type)type.value=draft.type;
 if(walk)walk.value=draft.walk||'';
 if(name)name.value=draft.name;
 if(intro)intro.value=draft.intro;
 // Click through the real settings workflow: guest localStorage or authenticated Supabase.
 $('#save-settings').click();
 try{localStorage.setItem('turinpipps.search-style.v4',JSON.stringify({furnishing:draft.furnishing,priority:draft.topPriority}))}catch(_){}
}
function events(){
 var d=$('#tp-guide-dialog');
 d.addEventListener('input',function(e){
    var el=e.target;if(el.id==='tp-ob-budget-range'||el.id==='tp-ob-budget-number'){
      var v=clamp(el.value,150,5000);
      draft.budget=v;
      var other=$('#'+(el.id==='tp-ob-budget-range'?'tp-ob-budget-number':'tp-ob-budget-range'));
      if(other)other.value=v;
      if($('#tp-ob-money'))$('#tp-ob-money').textContent=money(v);
    }else if(el.id==='tp-ob-name'){draft.name=el.value.slice(0,70)}
    else if(el.id==='tp-ob-intro'){draft.intro=el.value.slice(0,1200)}
    else if(el.id==='tp-ob-sqm'){draft.sqm=clamp(el.value,0,400)}
    cache();
 });
 d.addEventListener('change',function(e){
    if(e.target.name==='tp-ob-zone'){
      draft.zones=$$('input[name="tp-ob-zone"]:checked',d).map(function(x){return x.value});
      $$('.tp-ob-zone',d).forEach(function(l){l.classList.toggle('selected',$('input',l).checked)});
      $('#tp-ob-zone-count').textContent=draft.zones.length+' zone scelte';
      var error=$('#tp-ob-zone-error');if(error)error.hidden=draft.zones.length>0;
    }else if(e.target.name==='tp-ob-type'){
      draft.type=e.target.value;
      $$('.tp-ob-type',d).forEach(function(l){l.classList.toggle('selected',$('input',l).checked)});
    }
    cache();
 });
 d.addEventListener('click',function(e){
   var b=e.target.closest('[data-budget],[data-walk],[data-priority],[data-furnish],[data-choose-zone],#tp-ob-intro-template');if(!b)return;
   if(b.dataset.budget){draft.budget=Number(b.dataset.budget);$('#tp-ob-budget-number').value=draft.budget;$('#tp-ob-budget-range').value=draft.budget;$('#tp-ob-money').textContent=money(draft.budget);}
   if(b.dataset.walk!==undefined){draft.walk=Number(b.dataset.walk);$$('[data-walk]',d).forEach(function(o){o.classList.toggle('selected',Number(o.dataset.walk)===draft.walk)})}
   if(b.dataset.priority){draft.topPriority=b.dataset.priority;$$('[data-priority]',d).forEach(function(o){o.classList.toggle('selected',o.dataset.priority===draft.topPriority)})}
   if(b.dataset.furnish){draft.furnishing=b.dataset.furnish;$$('[data-furnish]',d).forEach(function(o){o.classList.toggle('selected',o.dataset.furnish===draft.furnishing)})}
   if(b.dataset.chooseZone){
     var all=b.dataset.chooseZone==='all';
     $$('input[name="tp-ob-zone"]',d).forEach(function(el){el.checked=all;el.closest('.tp-ob-zone').classList.toggle('selected',all)});
     draft.zones=all?zones.slice():[];
     $('#tp-ob-zone-count').textContent=draft.zones.length+' zone scelte';
   }
   if(b.id==='tp-ob-intro-template'){
     var intro=$('#tp-ob-intro'),name=$('#tp-ob-name');
     intro.value='Buongiorno, mi chiamo '+((name&&name.value.trim())||'[nome]')+'. Sto cercando un appartamento in affitto a Torino, preferibilmente vicino al Politecnico. Sarei interessato/a a conoscere disponibilità, spese e condizioni del contratto. Grazie.';
     draft.intro=intro.value;
   }
   cache();
 });
 // Ogni volta che l'onboarding si apre, riparte dal primo passo ma conserva il draft.
 d.addEventListener('close',function(){rendered=false;active=-1;draft=null});
}
function mobileHome(){
 var home=$('#view-home');if(!home||$('#tp-v4-mobile-home'))return;
 var section=document.createElement('section');section.id='tp-v4-mobile-home';section.className='tp-v4-mobile-home';
 section.innerHTML='<div class="tp-v4-mobile-actions">'+
 '<button type="button" data-nav="results"><i class="fa-solid fa-magnifying-glass"></i><span>Cerca casa</span></button>'+
 '<button type="button" data-nav="saved"><i class="fa-regular fa-heart"></i><span>Salvati</span></button></div>'+
 '<button type="button" class="tp-v4-mobile-scan" data-nav="sources"><span><i class="fa-solid fa-circle-notch"></i><b id="tp-v4-scan-text">Monitoraggio attivo</b></span><span>Dettagli <i class="fa-solid fa-chevron-right"></i></span></button>'+
 '<div class="tp-v4-mobile-title"><div><span>SELEZIONE DI OGGI</span><h2>Da tenere d’occhio</h2></div><button type="button" data-nav="results">Vedi tutti <i class="fa-solid fa-arrow-right"></i></button></div>'+
 '<div id="tp-v4-mobile-list"></div>'+
 '<div class="tp-v4-mobile-tips"><i class="fa-regular fa-lightbulb"></i><div><b>Una casa ti convince?</b><p>Salvala, confrontala con le altre e poi organizza una visita.</p></div></div>';
 var hero=$('.hero',home);hero.insertAdjacentElement('afterend',section);
 var api=window.TurinPippsUXV3;
 function refresh(){
  var rows=typeof api.getListings==='function'?api.getListings():[];
  var zonePrefs=api.getPrefs().preferredZones||[];
  var budget=Number(api.getPrefs().budget)||700;
  rows=rows.filter(function(r){
    var title=(r.title||'').toLowerCase();
    if(r.price&&r.price>budget)return false;
    if(/camera singola|posto letto|solo studentesse|solo ragazze|solo donne|stanza/i.test(title))return false;
    if(Array.isArray(zonePrefs)&&zonePrefs.length&&r.zone&&
       !zonePrefs.some(function(v){return String(v).toLowerCase()===r.zone.toLowerCase()}))return false;
    return !!r.url;
  }).sort(function(a,b){return (Date.parse(b.source_updated||b.seen||'')||0)-(Date.parse(a.source_updated||a.seen||'')||0)}).slice(0,3);
  var list=$('#tp-v4-mobile-list');list.replaceChildren();
  if(!rows.length){var empty=document.createElement('div');empty.className='tp-v4-mobile-empty';empty.innerHTML='<i class="fa-solid fa-house-circle-xmark"></i><b>Ancora nessuna casa pronta</b><p>Apri il Radar per vedere anche gli annunci da confermare e avviare nuove ricerche.</p>';list.appendChild(empty)}
  rows.forEach(function(r){
    var card=document.createElement('a'),head=document.createElement('div'),title=document.createElement('b'),foot=document.createElement('small');
    card.className='tp-v4-mobile-listing';card.href=r.url;card.rel='noopener noreferrer';card.target='_blank';
    head.className='tp-v4-mobile-listing-head';head.textContent=(r.zone||'Torino')+' · '+(r.source||'Web');
    title.textContent=r.title||'Annuncio da verificare';
    foot.textContent=(r.price?Number(r.price).toLocaleString('it-IT')+' €/mese':'Canone da verificare')+' · Disponibilità da confermare';
    card.append(head,title,foot);list.appendChild(card)
  });
  var scan=$('#tp-scan-title');if(scan)$('#tp-v4-scan-text').textContent=scan.textContent||'Controllo in corso';
 }
 refresh();
 window.addEventListener('turinpipps:ready',refresh);
 var source=$('#tp-home-list');
 if(source){var mo=new MutationObserver(function(){requestAnimationFrame(refresh)});mo.observe(source,{childList:true});}
 document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')refresh()});
}
function init(){
 if(!window.TurinPippsUXV3)return;
 events();
 // Mantenere i 9 passi nella guida originale; visualizzazione completamente sostituita.
 window.TurinPippsUXV3.guideSlides(steps.map(function(s){return {icon:s.icon,title:s.title,text:s.text}}));
 window.TurinPippsEnhanceGuide=function(step){draw(step)};
 // Il codice dell'app chiama drawGuide() all'apertura e qui la callback crea il nuovo wizard.
 mobileHome();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();