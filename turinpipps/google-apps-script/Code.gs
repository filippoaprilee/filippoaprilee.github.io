/**
 * TurinPipps · Google Apps Script edition (V8).
 * Scheduled public RSS search and MailApp daily digests without reading the inbox.
 * Tokens MUST be in Script Properties, never in this public source.
 * Does not log into Subito, Immobiliare.it, Facebook or bypass access controls.
 */
var TP = Object.freeze({
  repo:'filippoaprilee/filippoaprilee.github.io',
  branch:'filippoaprilee',
  listings:'turinpipps/data/listings.json',
  diagnostics:'turinpipps/data/diagnostics.json',
  app:'https://filippoaprilee.github.io/turinpipps/',
  clickcase:'https://www.clickcase.it/annunci/affitti-case-privati-torino.html',
  zoneNames:['Crocetta','Cenisia','San Paolo','Borgo San Paolo','Cit Turin','Santa Rita','Pozzo Strada'],
  sources:['subito.it','immobiliare.it','idealista.it','casa.it','bakeca.it','clickcase.it']
});
function props_(){return PropertiesService.getScriptProperties();}
function requireToken_(){
  var token=props_().getProperty('GITHUB_TOKEN');
  if(!token)throw new Error('Manca GITHUB_TOKEN in Project Settings > Script Properties.');
  return token;
}
function githubFile_(path){
  var url='https://api.github.com/repos/'+TP.repo+'/contents/'+path+'?ref='+TP.branch;
  var response=UrlFetchApp.fetch(url,{
    headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+requireToken_(),
      'X-GitHub-Api-Version':'2022-11-28'},
    muteHttpExceptions:true,followRedirects:false
  });
  if(response.getResponseCode()!==200)throw new Error('GitHub GET '+path+': HTTP '+response.getResponseCode());
  var data=JSON.parse(response.getContentText());
  var payload=Utilities.newBlob(Utilities.base64Decode(data.content.replace(/\s/g,''))).getDataAsString('UTF-8');
  return {json:JSON.parse(payload),sha:data.sha};
}
function githubSave_(path,existing,data){
  var json=JSON.stringify(data,null,2)+'\n';
  var payload={
    message:'TurinPipps: raccolta automatica da Google Apps Script',
    content:Utilities.base64Encode(Utilities.newBlob(json,'application/json').getBytes()),
    sha:existing.sha,branch:TP.branch
  };
  var response=UrlFetchApp.fetch('https://api.github.com/repos/'+TP.repo+'/contents/'+path,{
    method:'put',contentType:'application/json',payload:JSON.stringify(payload),
    muteHttpExceptions:true,
    headers:{'Authorization':'Bearer '+requireToken_(),
      'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
  });
  if(response.getResponseCode()!==200&&response.getResponseCode()!==201){
    throw new Error('GitHub PUT '+path+': HTTP '+response.getResponseCode()+
      ' (permessi token o aggiornamenti concorrenti)');
  }
}
function decode_(v){
  return String(v||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"')
    .replace(/&#39;/g,"'").replace(/&euro;/gi,'€').replace(/&nbsp;/g,' ');
}
function text_(v){
  return decode_(String(v||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
}
function zone_(text){
  text=String(text||'').toLowerCase();
  for(var i=0;i<TP.zoneNames.length;i++)
    if(text.indexOf(TP.zoneNames[i].toLowerCase())!==-1)return TP.zoneNames[i];
  return '';
}
function price_(text){
  var m=String(text||'').match(/(?:€|euro)\s*(\d{2,4})\s*(?:mensili|al mese|\/mese)/i);
  if(!m)m=String(text||'').match(/\b(\d{2,4})\s*(?:€|euro)\s*(?:mensili|al mese|\/mese)/i);
  if(!m)return 0;
  var p=Number(m[1]);
  return p>=150&&p<=4000?p:0;
}
function portal_(url){
  url=decode_(url).replace(/\s/g,'');
  for(var hop=0;hop<3;hop++){
    var wrapped=url.match(/[?&](?:url|u|target|q)=([^&#]+)/i);
    var m=url.match(/^https?:\/\/([^/]+)(\/[^?#]*)/i);
    if(!m)return null;
    var host=m[1].toLowerCase(),path=m[2],root='';
    for(var i=0;i<TP.sources.length;i++){
      var d=TP.sources[i];
      if(host===d||host.slice(-d.length-1)==='.'+d){root=d;break;}
    }
    if(root){
      var match=(root==='subito.it'&&/\/appartamenti\/[^/]+\.htm$/i.test(path))||
        (root==='immobiliare.it'&&/\/annunci\/\d+\/?$/i.test(path))||
        (root==='idealista.it'&&/\/immobile\/\d+/i.test(path))||
        (root==='clickcase.it'&&/-\d+\.html$/i.test(path))||
        (root==='bakeca.it'&&/\/dettaglio\//i.test(path))||
        (root==='casa.it'&&/\/immobili\//i.test(path));
      return match?{url:'https://'+host+path.replace(/\/$/,''),source:root}:null;
    }
    if(!wrapped)return null;
    try{url=decodeURIComponent(wrapped[1]);}catch(e){return null;}
  }
  return null;
}
function links_(html){
  var list=[],seen={},m,re=/\bhref\s*=\s*["']([^"']+)["']/gi;
  while((m=re.exec(html))!==null){
    var p=portal_(m[1]);if(!p||seen[p.url])continue;
    seen[p.url]=1;list.push({link:p,near:text_(html.slice(Math.max(0,m.index-180),m.index+650))});
    if(list.length>100)break;
  }
  return list;
}
function row_(url,source,near,now){
  return {url:url,title:'Annuncio '+source+' · da verificare',
    description:'Nuovo link da ricerca pubblica o avviso email. Prezzo, zona, privato e disponibilità da verificare.',
    price:price_(near),zone:zone_(near),sqm:0,source:source,
    private_status:'unverified',expenses:'',property_type:'',seen:now,last_seen:now,
    origin:'automatic_alert'};
}
function rssListings_(now){
  // Inserisci fino a 20 URL RSS da Google Alerts nelle Script Properties,
  // uno per riga o separati da virgole. Zero email degli alert in Gmail.
  var raw=props_().getProperty('ALERT_FEEDS')||'';
  var feeds=raw.split(/[\s,;]+/).map(function(v){return v.trim();}).filter(Boolean).slice(0,20);
  var out=[],seen={};var failures=0;
  feeds.forEach(function(feed){
    if(!/^https:\/\/(?:www\.)?google\.com\/alerts\/feeds\/[a-zA-Z0-9/_%-]+$/.test(feed)){failures++;return;}
    try{
      var response=UrlFetchApp.fetch(feed,{muteHttpExceptions:true,followRedirects:false});
      if(response.getResponseCode()!==200){failures++;return;}
      var xml=XmlService.parse(response.getContentText());
      var root=xml.getRootElement();
      var entries=root.getChildren('entry',XmlService.getNamespace('http://www.w3.org/2005/Atom'));
      entries.slice(0,60).forEach(function(entry){
        var ns=XmlService.getNamespace('http://www.w3.org/2005/Atom');
        var title=entry.getChildText('title',ns)||'';
        var content=entry.getChildText('content',ns)||entry.getChildText('summary',ns)||'';
        var link=entry.getChild('link',ns);
        var href=link?(link.getAttribute('href')||{}).getValue?.():'';
        var found=portal_(href);
        if(!found){
          var candidates=links_(content);
          if(candidates.length)found=candidates[0].link;
        }
        if(!found||seen[found.url])return;
        seen[found.url]=1;
        var row=row_(found.url,found.source+' · Google Alerts RSS',text_(title+' '+content),now);
        row.title=text_(title).slice(0,170)||row.title;
        out.push(row);
      });
    }catch(e){failures++;console.warn('TurinPipps RSS: feed non letto ('+String(e.message||e).slice(0,80)+')');}
  });
  return {rows:out,feeds:feeds.length,failures:failures};
}
/* RSS Google Alerts: nessuna email in arrivo, nessun accesso di lettura Gmail necessario. */
function allowedByRobots_(url){
  var origin=(url.match(/^https?:\/\/[^/]+/)||[])[0];
  if(!origin)return false;
  var rr=UrlFetchApp.fetch(origin+'/robots.txt',{muteHttpExceptions:true,followRedirects:false});
  var status=rr.getResponseCode();
  if(status===404)return true;
  if(status!==200)return false;
  var lines=rr.getContentText().split(/\r?\n/),active=false,rules=[],agents=[];
  for(var i=0;i<lines.length;i++){
    var line=lines[i].split('#')[0].trim(),m=line.match(/^([^:]+)\s*:\s*(.*)$/);
    if(!m)continue;
    var key=m[1].toLowerCase(),value=m[2].trim();
    if(key==='user-agent'){
      if(rules.length){active=false;rules=[];}
      agents.push(value.toLowerCase());active=agents.indexOf('*')!==-1||agents.indexOf('turinpipps')!==-1;
    }else if((key==='allow'||key==='disallow')&&active&&value){
      rules.push({path:value,type:key});
    }
  }
  var path=url.slice(origin.length),best=null;
  rules.forEach(function(r){if(path.indexOf(r.path.replace(/\*.*$/,''))===0&&(!best||r.path.length>best.path.length))best=r;});
  return !best||best.type==='allow';
}
function verifiedRent_(html){
  // Trust only offer prices explicitly attached to housing structured-data objects.
  // Free-form page text often contains prices for other listings and must not
  // generate a fabricated price-change event.
  var scripts=String(html||'').match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)||[];
  for(var i=0;i<scripts.length;i++){
    try{
      var raw=scripts[i].replace(/^<script[^>]*>/i,'').replace(/<\/script>$/i,'');
      var data=JSON.parse(raw);
      var nodes=Array.isArray(data)?data:(data['@graph']||[data]);
      for(var j=0;j<nodes.length;j++){
        var obj=nodes[j];
        if(!obj||typeof obj!=='object')continue;
        var types=[].concat(obj['@type']||[]).map(function(t){return String(t).toLowerCase()});
        if(!types.some(function(t){return /residence|apartment|house|realestatelisting|accommodation|product/.test(t)}))continue;
        var offers=[].concat(obj.offers||[]);
        for(var k=0;k<offers.length;k++){
          var offer=offers[k];if(!offer||typeof offer!=='object')continue;
          if(offer.priceCurrency&&String(offer.priceCurrency).toUpperCase()!=='EUR')continue;
          var val=Number(offer.price);
          if(isFinite(val)&&val>=150&&val<=4000)return val;
        }
      }
    }catch(err){}
  }
  return 0;
}

function publicListings_(now){
  var found=[],why='nessuna scheda letta';
  try{
    if(!allowedByRobots_(TP.clickcase))return {rows:[],status:'robots.txt: lettura non autorizzata'};
    var res=UrlFetchApp.fetch(TP.clickcase,{muteHttpExceptions:true,followRedirects:false});
    if(res.getResponseCode()!==200)return {rows:[],status:'HTTP '+res.getResponseCode()};
    var html=res.getContentText(),matches=links_(html).filter(function(x){return x.link.source==='clickcase.it'});
    matches=matches.slice(0,45);var detailCount=0;
    matches.forEach(function(pair){
      var p=pair.link,row=row_(p.url,'ClickCase',pair.near,now);
      row.private_status='source';
      // Fewer detail requests per run. Never bypass robots.txt, CAPTCHA or restrictions.
      if(detailCount<8&&allowedByRobots_(p.url)){
        detailCount++;Utilities.sleep(650);
        var response=UrlFetchApp.fetch(p.url,{muteHttpExceptions:true,followRedirects:false});
        if(response.getResponseCode()===200){
          var doc=response.getContentText(),h=doc.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
          var body=text_(doc.slice(0,13000));
          if(h)row.title=text_(h[1]).slice(0,170)||row.title;
          var observed=verifiedRent_(doc);
          if(observed){row.price=observed;row.price_verified=true;}
          else row.price=price_(body)||row.price;
          row.zone=zone_(row.title+' '+body.slice(0,2200))||row.zone;
          row.description=(body.slice(0,350)||row.description);
        }
      }
      found.push(row);
    });
    why=matches.length+' schede ClickCase; '+detailCount+' dettagli letti';
  }catch(e){why='Errore fonte: '+String(e.message||e).slice(0,100)}
  return {rows:found,status:why};
}

function enrichWalkingRoutes_(known,now){
  // Google Apps Script Maps Directions; only addresses explicitly supplied by listings.
  // No made-up walking distances from zone centroids.
  var count=0,changed=0;
  Object.keys(known).forEach(function(k){
    if(count>=8)return;
    var row=known[k],address=String(row.address||'').trim();
    if(!/^(?:Via|Corso|Piazza|Viale|Largo)\s+.+\s+\d+[A-Za-z]?,\s*Torino,\s*Italia$/i.test(address))return;
    if(row.route_address===address&&Number(row.walking_km)>0)return;
    count++;
    try{
      var directions=Maps.newDirectionFinder()
        .setOrigin(address)
        .setDestination('Politecnico di Torino, Corso Duca degli Abruzzi 24, Torino, Italia')
        .setMode(Maps.DirectionFinder.Mode.WALKING)
        .setLanguage('it').getDirections();
      var leg=directions.routes&&directions.routes[0]&&directions.routes[0].legs&&directions.routes[0].legs[0];
      if(!leg||!leg.distance||!leg.duration) return;
      var loc=leg.start_location||{};
      if(Number(loc.lat)<44.8||Number(loc.lat)>45.3||Number(loc.lng)<7.3||Number(loc.lng)>8)return;
      var meters=Number(leg.distance.value),seconds=Number(leg.duration.value);
      if(!isFinite(meters)||meters<=0||meters>30000||!isFinite(seconds)||seconds<=0)return;
      row.walking_km=Math.round(meters/100)/10;
      row.walking_minutes=Math.round(seconds/60);
      row.route_checked_at=now;
      row.route_address=address;
      row.route_source='Google Maps Directions (percorso pedonale indicativo)';
      row.lat=Number(loc.lat);
      row.lng=Number(loc.lng);
      changed++;
    }catch(err){console.warn('Percorso non disponibile: '+String(err.message||err).slice(0,90));}
  });
  return {requested:count,updated:changed};
}

function runScan(){
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))return;
  try{
    var timestamp=new Date().toISOString(),stored=githubFile_(TP.listings),
      diagnostics=githubFile_(TP.diagnostics);
    var old=stored.json.listings||[],known={},added=0;
    old.forEach(function(x){if(x&&x.url)known[x.url]=x;});
    var rss=rssListings_(timestamp);
    var publics=publicListings_(timestamp);
    rss.rows.concat(publics.rows).forEach(function(x){
      if(!known[x.url]){
        if(x.price_verified&&x.price>0){
          x.price_history=[{price:x.price,observed_at:timestamp,source:'scheda pubblica'}];
        }
        delete x.price_verified;
        known[x.url]=x;added++;return;
      }
      var oldItem=known[x.url];
      // Solo un canone confermato sulla scheda originale può sostituire il precedente;
      // non usare il prezzo di un risultato Google o di uno snippet.
      if(x.price_verified&&x.price>0){
        var h=Array.isArray(oldItem.price_history)?oldItem.price_history:[];
        if(!h.length&&Number(oldItem.price)>0){
          h.push({price:Number(oldItem.price),observed_at:oldItem.last_seen||oldItem.seen||timestamp,source:'canone inizialmente registrato'});
        }
        if(Number(oldItem.price)!==Number(x.price)){
          h.push({price:x.price,observed_at:timestamp,source:'scheda pubblica'});
          oldItem.price=x.price;
          oldItem.price_last_changed_at=timestamp;
        }
        oldItem.price_history=h.slice(-24);
      }
      if(x.source.indexOf('ClickCase')!==-1&&x.title&&!/^Annuncio /.test(x.title)){
        oldItem.title=x.title;
        if(x.zone)oldItem.zone=x.zone;
      }
      oldItem.last_seen=timestamp;
    });
    var walking=enrichWalkingRoutes_(known,timestamp);
    stored.json.listings=Object.keys(known).map(function(key){return known[key];}).slice(-850);
    stored.json.updated_at=timestamp;
    stored.json.verification='Raccolta automatica: campi non verificati richiedono controllo sulla fonte; nessun contatto inviato.';
    diagnostics.json.updated_at=timestamp;
    var sources=(diagnostics.json.sources||[]).filter(function(x){return x.name!=='Google Apps Script · automatico';});
    sources.push({name:'Google Apps Script · automatico',status:!rss.feeds?'RSS da configurare':rss.failures?'parziale':'ok',
      links_found:rss.rows.length+publics.rows.length,new:added,
      message:'Google Alerts RSS: '+rss.feeds+' feed (errori '+rss.failures+'), link '+rss.rows.length+'. Nessuna email di alert. Percorsi a piedi verificati: '+walking.updated+'. '+publics.status+'. Nessun bypass dei portali.'});
    diagnostics.json.sources=sources;
    githubSave_(TP.listings,stored,stored.json);
    // The previous PUT changed the repository head but not this file's SHA.
    githubSave_(TP.diagnostics,diagnostics,diagnostics.json);
    props_().setProperty('LAST_SCAN_AT',timestamp);
    console.log('TurinPipps raccolta completata. Nuovi: '+added);
  }finally{lock.releaseLock();}
}
function htmlEscape_(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function runDailyDigest(){
  var lock=LockService.getScriptLock();if(!lock.tryLock(20000))return;
  try{
    var timezone='Europe/Rome',today=Utilities.formatDate(new Date(),timezone,'yyyy-MM-dd');
    if(props_().getProperty('LAST_DIGEST_DATE')===today){console.log('Report già inviato oggi');return;}
    try{
      var published=githubFile_('turinpipps/data/report_status.json').json;
      if(published.last_sent_date===today){
        console.log('Report già registrato per oggi da un altro motore; invio saltato.');
        props_().setProperty('LAST_DIGEST_DATE',today);
        return;
      }
    }catch(statusError){console.warn('Impossibile consultare registro report: '+statusError.message);}
    var recipients=(props_().getProperty('EMAIL_TO')||'filippoaprilee@gmail.com')
      .split(/[,;]/).map(function(s){return s.trim();}).filter(Boolean).slice(0,20);
    if(!recipients.length)throw new Error('Nessun destinatario EMAIL_TO configurato');
    var items=githubFile_(TP.listings).json.listings||[];
    var matching=items.filter(function(x){
      return x&&Number(x.price)>0&&Number(x.price)<=700&&x.zone&&
        ['source','confirmed','user'].indexOf(x.private_status)!==-1;
    });
    var newItems=matching.filter(function(x){
      var when=new Date(x.seen||x.last_seen||0);
      return !isNaN(when.getTime())&&Date.now()-when.getTime()<1000*60*60*30;
    });
    var featured=(newItems.length?newItems:matching).slice(0,8);
    var rows=featured.map(function(x){
      return '<tr><td style="padding:12px;border-bottom:1px solid #e7eafa"><a href="'+htmlEscape_(x.url)+
        '">'+htmlEscape_(x.title)+'</a><div style="font-size:12px;color:#77849d">'+
        htmlEscape_(x.zone)+' · '+htmlEscape_(x.source)+'</div></td><td style="text-align:right;white-space:nowrap">'+
        htmlEscape_(x.price)+' €</td></tr>';
    }).join('');
    var subject='TurinPipps | Report affitti Torino '+Utilities.formatDate(new Date(),timezone,'dd/MM/yyyy');
    var html='<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#23314c">'+
      '<div style="background:#13213b;padding:26px;color:white;border-radius:14px 14px 0 0">'+
      '<div style="font-size:11px;letter-spacing:2px">TURINPIPPS · TORINO</div>'+
      '<h1 style="margin:12px 0 0;font-size:25px">Il tuo report affitti</h1></div>'+
      '<div style="padding:24px;border:1px solid #e6ebf5"><p><b>'+matching.length+
      ' compatibili · '+newItems.length+' nuovi nelle ultime 30 ore</b></p>'+
      '<p style="font-size:12px;color:#78849a">Privato e disponibilità sono da confermare. Canone massimo 700 € più spese.</p>'+
      '<table style="width:100%;border-collapse:collapse">'+(rows||'<tr><td>Nessun annuncio da mostrare.</td></tr>')+
      '</table><p><a href="'+TP.app+'" style="display:inline-block;background:#5264db;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">Apri TurinPipps</a></p>'+
      '<p style="font-size:11px;color:#8893a9">Report automatico Google Apps Script. Non vengono contattati i proprietari.</p></div></div>';
    var plain='TurinPipps: '+matching.length+' compatibili, '+newItems.length+
      ' nuovi. Apri: '+TP.app;
    recipients.forEach(function(mail){
      MailApp.sendEmail(mail,subject,plain,{htmlBody:html,name:'TurinPipps'});
    });
    props_().setProperty('LAST_DIGEST_DATE',today);
    try{
      var reportPath='turinpipps/data/report_status.json';
      var state=githubFile_(reportPath);
      state.json={
        last_sent_date:today,last_sent_at:new Date().toISOString(),
        recipient_count:recipients.length,status:'inviato',
        provider:'Google Apps Script / Gmail',total:items.length,
        matching:matching.length,new:newItems.length,
        message:'Invio Gmail completato. Nessun destinatario pubblicato.'
      };
      githubSave_(reportPath,state,state.json);
    }catch(syncError){
      console.warn('Email inviate ma registro pubblico non aggiornato: '+syncError.message);
    }
    console.log('Report TurinPipps inviato a '+recipients.length+' destinatari.');
  }finally{lock.releaseLock();}
}
function sendTestEmail(){
  MailApp.sendEmail(props_().getProperty('EMAIL_TO')||'filippoaprilee@gmail.com',
    'TurinPipps | Test invio','Invio di prova eseguito con Google Apps Script, senza GitHub Actions.');
}
function installTurinPipps(){
  requireToken_();
  // Never delete triggers that do not belong to TurinPipps.
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(['runScan','runDailyDigest'].indexOf(t.getHandlerFunction())!==-1)ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runScan').timeBased().everyHours(6).create();
  ScriptApp.newTrigger('runDailyDigest').timeBased().atHour(19).nearMinute(0)
    .everyDays(1).inTimezone('Europe/Rome').create();
  console.log('TurinPipps installato. Scansione ogni 6 ore, report circa alle 19:00 Europe/Rome.');
}
