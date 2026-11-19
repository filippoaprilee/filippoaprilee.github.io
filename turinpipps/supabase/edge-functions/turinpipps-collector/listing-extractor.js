/* TurinPipps v11 — public-page extraction with source provenance.
 * Never infer a rent, owner identity, date or address from proximity alone.
 * This module contains no network calls and can be tested independently.
 */
const HTML_ENTITIES={amp:"&",quot:'"',apos:"'",lt:"<",gt:">",nbsp:" ",euro:"€",agrave:"à",egrave:"è",eacute:"é",igrave:"ì",ograve:"ò",ugrave:"ù"};
export function plainText(html){
 return String(html||"").replace(/<!--[\s\S]*?-->/g," ").replace(/<(?:script|style|svg|noscript|iframe)\b[^>]*>[\s\S]*?<\/(?:script|style|svg|noscript|iframe)\s*>/gi," ")
   .replace(/<[^>]*>/g," ").replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi,(_,code)=>{
     if(code[0]==="#"){try{const n=code[1]?.toLowerCase()==="x"?parseInt(code.slice(2),16):parseInt(code.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):" ";}catch(_){return " "}}
     return HTML_ENTITIES[code.toLowerCase()]??" ";
   }).replace(/\s+/g," ").trim();
}
export function sourceIdentity(raw){
 try{
  const u=new URL(raw);const host=u.hostname.toLowerCase().replace(/^www\./,"");
  const path=u.pathname.toLowerCase();
  let id="";
  if(host==="clickcase.it"){const m=path.match(/-(\d+)\.html$/);if(m)id=m[1];}
  else if(host==="subito.it"){const m=path.match(/-(\d+)\.htm$/);if(m)id=m[1];}
  else if(host==="immobiliare.it"){const m=path.match(/^\/annunci\/(\d+)\/?$/);if(m)id=m[1];}
  else if(host==="idealista.it"){const m=path.match(/^\/immobile\/(\d+)\/?$/);if(m)id=m[1];}
  else if(host.endsWith(".bakeca.it")){const m=path.match(/^\/dettaglio\/[^/]+\/[^/]+-([a-z0-9]{8,})\/?$/);if(m)id=m[1];}
  if(id)return host.replace(/^[^.]+\.(bakeca\.it)$/,"$1")+":"+id;
  return host+":"+path.replace(/\/$/,"");
 }catch(_){return "";}
}
function parseMoney(raw){
 if(raw==null)return null;
 const value=String(raw).trim().replace(/\s/g,"");
 // Supports 1.650 / 1650 / 1.650,00. Never treat fractional Euro as whole rent.
 if(!/^\d{2,5}(?:[.,]\d{2})?$|^\d{1,2}(?:\.\d{3}){1,2}(?:,\d{2})?$/.test(value))return null;
 const n=Number(value.replace(/\.(?=\d{3}(?:[,.]|$))/g,"").replace(",","."));
 return Number.isFinite(n)?Math.round(n):null;
}
const MONTHS={gennaio:0,febbraio:1,marzo:2,aprile:3,maggio:4,giugno:5,luglio:6,agosto:7,settembre:8,ottobre:9,novembre:10,dicembre:11};
function dateFromWords(day,month,year,now){
 const m=MONTHS[String(month||"").toLowerCase()],d=Number(day),y=Number(year);
 if(m===undefined||d<1||d>31||y<2010||y>now.getUTCFullYear()+1)return null;
 const parsed=new Date(Date.UTC(y,m,d,12,0,0));
 return parsed.getUTCDate()===d&&parsed.getUTCMonth()===m?parsed.toISOString():null;
}
function firstDate(text,expression,now){
 const m=text.match(expression);
 return m?dateFromWords(m[1],m[2],m[3],now):null;
}
function explicitStreet(text){
 const m=text.match(/\b(via|viale|corso|piazza|largo)\s+([A-ZÀ-Ýa-zà-ÿ'’. ]{3,60}?)\s*,?\s+(\d{1,4}[a-zA-Z]?)\s*(?:,|[-–]|Torino\b)/i);
 if(!m)return null;
 const street=(m[1]+" "+m[2].trim()+" "+m[3]).replace(/\s+/g," ");
 // No address without a civic number.
 return street.length<95?street+", Torino":null;
}
export function extractClickCaseDetails(html,listingUrl,stamp){
 const raw=String(html||"").slice(0,1450000);
 const match=raw.match(/<h1\b[^>]*>([\s\S]{4,600}?)<\/h1>/i);
 if(!match)return {status:"inconclusive",fields:{},field_provenance:{}};
 const heading=plainText(match[1]).slice(0,220);
 const body=plainText(raw);
 const start=body.indexOf(heading);
 if(start<0)return {status:"inconclusive",fields:{},field_provenance:{}};
 const content=body.slice(start,Math.min(body.length,start+12500));
 const prefix=content.split(/\bDescrizione\b/i)[0].slice(0,1300);
 const descriptionPart=content.match(/\bDescrizione\b([\s\S]{10,2500}?)\bCaratteristiche\b/i);
 const characteristics=content.match(/\bCaratteristiche\b([\s\S]{10,1500}?)\bContatti\b/i);
 const details=(characteristics?.[1]||"").slice(0,1500);
 const now=new Date(stamp||new Date().toISOString());
 const fields={},provenance={};
 const put=(key,value,cue)=>{
  if(value===null||value===undefined||value==="")return;
  fields[key]=value;
  provenance[key]={state:"claimed",origin:"public_listing_page",observed_at:now.toISOString(),
     evidence_url:String(listingUrl).slice(0,400),cue:String(cue||"").slice(0,90)};
 };
 const headerRent=prefix.match(/(?:€|EUR)\s*([\d.,]+)\s*(?:mensili|al mese|\/mese)/i);
 const labeledRent=(descriptionPart?.[1]||"").match(/\b(?:canone|prezzo|affitto\s+mensile)\s*(?:richiesto)?\s*[:\-]?\s*(?:€|euro)\s*([\d.,]+)/i);
 const rent=parseMoney(headerRent?.[1]||labeledRent?.[1]);
 if(rent!==null&&rent>=150&&rent<=10000)put("price",rent,headerRent?"Canone mensile nella testata":"Canone esplicito nella descrizione");
 const expenseText=details.match(/\bspese\s*:\s*(?:€|euro)?\s*([\d.,]+)\s*(?:mensili|al mese|\/mese)/i)
    ||(descriptionPart?.[1]||"").match(/\bspese\s+(?:condominiali)\s*(?:di|pari\s+a|:)?\s*(?:€|euro)\s*([\d.,]+)/i);
 const expenses=parseMoney(expenseText?.[1]);
 if(expenses!==null&&expenses>=0&&expenses<=3000)put("expenses",expenses,"Spese mensili esplicitamente indicate");
 const sqm=prefix.match(/\b(\d{2,4})\s*(?:m²|mq|m2)(?=\s|[|·,]|$)/i);
 if(sqm&&+sqm[1]>=12&&+sqm[1]<=650)put("sqm",Number(sqm[1]),"Superficie indicata nella testata");
 const street=explicitStreet(prefix);
 if(street)put("address",street,"Indirizzo con numero civico esplicitato");
 const zones=["Borgo San Paolo","Cit Turin","San Paolo","Cenisia","Crocetta","Santa Rita"];
 const namedZone=zones.find(z=>new RegExp("(^|[^a-zà-ÿ])"+z+"([^a-zà-ÿ]|$)","i").test(heading));
 if(namedZone)put("zone",namedZone,"Quartiere dichiarato nel titolo dell'immobile");
 const namedType=heading.toLowerCase().match(/\b(monolocale|bilocale|trilocale|quadrilocale)\b/);
 if(namedType)put("property_type",namedType[1],"Tipologia indicata nel titolo originale");
 const privato=/\b(?:affitto|locazione)\s+da\s+privato\b/i.test(prefix)
   ||/\b(?:privato\s+affitta|no\s+intermediari)\b/i.test((descriptionPart?.[1]||"").slice(0,250));
 if(privato)put("private_status","source","La fonte si presenta come annuncio da privato, identità non verificata");
 const explicitUpdated=firstDate(content,/\b(?:aggiornato|modificato)\s+il\s+(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i,now);
 const published=firstDate(content,/\b(?:annuncio\s+del|pubblicato\s+il)\s+(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i,now);
 // A generic date could be the availability date, not the publication date: do not use it.
 if(explicitUpdated&&Date.parse(explicitUpdated)<=now.getTime()+86400000)put("source_updated",explicitUpdated,"Data di aggiornamento dichiarata dalla fonte");
 if(published&&Date.parse(published)<=now.getTime()+86400000)put("published_at",published,"Data di pubblicazione dichiarata dalla fonte");
 const realDescription=plainText(descriptionPart?.[1]||"").slice(0,750);
 if(realDescription.length>=35)put("description",realDescription,"Descrizione pubblicata dall'inserzionista");
 return {status:Object.keys(fields).length?"source_read":"inconclusive",fields,field_provenance:provenance,heading};
}
