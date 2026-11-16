// TurinPipps Radar — Scriptable iPhone widget, senza Xcode.
// Impostazioni widget (facoltativo): "700" oppure "700|Cenisia,San Paolo,Crocetta".
// Dati: endpoint pubblico Supabase, nessuna credenziale utente richiesta.
const API = "https://akgnxjwkrnuckgxscjdz.supabase.co/functions/v1/turinpipps-widget";
const APP = "https://filippoaprilee.github.io/turinpipps/?screen=radar";
const raw = String(args.widgetParameter || "").trim();
const parts = raw.split("|");
const budget = Math.max(150, Math.min(5000, Number(parts[0]) || 700));
const zones = (parts[1] || "").split(",").map(x => x.trim()).filter(Boolean);
const params = "?budget=" + encodeURIComponent(Math.round(budget)) +
  (zones.length ? "&zones=" + encodeURIComponent(zones.join(",")) : "");
const widget = new ListWidget();
widget.setPadding(17, 17, 17, 17);
widget.backgroundColor = new Color("#12384B");
const gradient = new LinearGradient();
gradient.colors = [new Color("#12384B"), new Color("#205B6E")];
gradient.locations = [0, 1];
widget.backgroundGradient = gradient;
widget.url = APP;
widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
function text(s, size, color, weight) {
  const t = widget.addText(String(s));
  t.font = weight === "bold" ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = new Color(color);
  t.lineLimit = 2;
  return t;
}
let data = null, error = "";
try {
  const request = new Request(API + params);
  request.timeoutInterval = 12;
  const result = await request.loadJSON();
  if (typeof result.matching_count !== "number") throw new Error("Risposta non valida");
  data = result;
} catch (e) {
  error = String(e.message || e);
}
const bar = widget.addStack();
bar.centerAlignContent();
const logo = bar.addImage(SFSymbol.named("house.fill").image);
logo.imageSize = new Size(15, 15);
logo.tintColor = new Color("#B9EFE2");
bar.addSpacer(7);
const brand = bar.addText("TURINPIPPS");
brand.font = Font.boldSystemFont(12);
brand.textColor = new Color("#FFFFFF");
bar.addSpacer();
widget.addSpacer(15);
if (data) {
  const line = widget.addStack();
  line.bottomAlignContent();
  const big = line.addText(String(Math.max(0, data.matching_count)));
  big.font = Font.boldRoundedSystemFont(38);
  big.textColor = Color.white();
  line.addSpacer(9);
  const label = line.addText("da valutare");
  label.font = Font.mediumSystemFont(11);
  label.textColor = new Color("#BFE2E9");
  widget.addSpacer(3);
  text(Math.max(0, data.to_verify_count) + " da verificare", 11, "#BDE5DC");
  if (config.widgetFamily !== "small") {
    widget.addSpacer(10);
    const latest = (data.latest || [])[0];
    if (latest) {
      text("ULTIMA OPPORTUNITÀ", 9, "#B4D8DF", "bold");
      widget.addSpacer(4);
      text(latest.zone + " · " + latest.price + " €/mese", 13, "#FFFFFF", "bold");
      widget.addSpacer(3);
      text(latest.title, 11, "#D5EAF0");
    }
  }
  widget.addSpacer();
  text("Torino · fino a " + budget + " € · dati da verificare", 9, "#BCD7E0");
} else {
  text("Radar non disponibile", 16, "#FFFFFF", "bold");
  widget.addSpacer(8);
  text("Controlla la connessione o apri TurinPipps.", 11, "#C9E0E7");
  if (!config.runsInWidget) console.warn(error);
  widget.addSpacer();
}
Script.setWidget(widget);
if (!config.runsInWidget) await widget.presentMedium();
Script.complete();
