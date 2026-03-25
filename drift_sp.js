<!-- Legg denne filen i repoet ditt ved siden av app.js -->
<!-- drift_sp.js -->
<script>
// ====== KONFIG ======
const SP_SITE_URL = "https://avinor.sharepoint.com/sites/GRP_Simulatordrift_avd.Vaernes";
const LIST_TITLE  = "Driftsmeldinger"; // må matche listetittelen
// Kolonne-internal names i SharePoint (endre ved behov):
const COL_TITLE   = "Title";
const COL_MESSAGE = "Melding";      // multiline text
const COL_DATE    = "Dato";         // DateTime
const COL_STATUS  = "Status";       // Choice: "Aktiv" | "Lukket" | ...
const COL_KAT     = "Kategori";     // Choice (valgfri)

const AUTO_REFRESH_MS = 60 * 1000;  // hent på nytt hvert minutt

// ====== HJELPERE ======
function $(sel){ return document.querySelector(sel); }
function escapeHtml(s){
  return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}
function fmtDateTime(iso){
  try{
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("no-NO");
  }catch{ return "-"; }
}

// ====== HENT FRA SHAREPOINT ======
// NB: SPO REST krever at sluttbrukeren er innlogget i O365 i samme nettleserøkt.
// Endepunkt returnerer JSON (OData verbose).
async function fetchDriftFromSharePoint() {
  const url = `${SP_SITE_URL}/_api/web/lists/getbytitle('${encodeURIComponent(LIST_TITLE)}')/items?$orderby=Id desc`;
  const res = await fetch(url, { headers: { "Accept":"application/json;odata=verbose" }, credentials: "include" });
  if (!res.ok) {
    const t = await res.text().catch(()=> "");
    throw new Error(`SharePoint GET failed: ${res.status} ${res.statusText}. ${t.slice(0,300)}`);
  }
  const json = await res.json();
  return Array.isArray(json?.d?.results) ? json.d.results : [];
}

// ====== RENDER ======
function renderDriftLists(items){
  const ulAktive = $("#driftListe");
  const ulHist   = $("#driftHistorikkListe");
  if (!ulAktive || !ulHist) return;

  ulAktive.innerHTML = "";
  ulHist.innerHTML   = "";

  // del i aktive/historikk
  const aktive = [];
  const hist   = [];
  for(const it of items){
    const st = String(it[COL_STATUS] ?? "").toLowerCase();
    (st === "aktiv") ? aktive.push(it) : hist.push(it);
  }

  // tegn aktiv
  aktive.forEach(it => ulAktive.appendChild(makeItemLi(it, /*isHist=*/false)));
  // tegn historikk
  hist.forEach(it => ulHist.appendChild(makeItemLi(it, /*isHist=*/true)));
}

function makeItemLi(it, isHist){
  const li = document.createElement("li");
  li.className = "drift-item" + (isHist ? " hist" : "");

  // alvor/kategori-til fargestripe (valgfritt)
  const kat = String(it[COL_KAT] ?? "").toLowerCase();
  if (kat.includes("kritisk")) li.className += " kritisk";
  else if (kat.includes("varsel")) li.className += " varsel";

  const title = escapeHtml(it[COL_TITLE] ?? "");
  const msg   = escapeHtml(it[COL_MESSAGE] ?? "");
  const dt    = fmtDateTime(it[COL_DATE] ?? it["Created"] ?? it["Modified"]);
  const by    = escapeHtml(it?.Author?.Title ?? it?.Editor?.Title ?? "");

  li.innerHTML = `
    <header>
      <strong>${title || "(uten tittel)"}</strong>
      <span style="display:inline-flex; gap:8px; align-items:center;">
        <time class="muted-time">${dt}</time>
      </span>
    </header>
    <div style="margin-top:6px;">${msg || ""}</div>
    <div class="muted" style="margin-top:6px; font-size:12px;">
      ${by ? "Opprettet av: " + by : ""}
      ${it[COL_KAT] ? " • Kategori: " + escapeHtml(it[COL_KAT]) : ""}
      ${it[COL_STATUS] ? " • Status: " + escapeHtml(it[COL_STATUS]) : ""}
      ${typeof it["ID"] !== "undefined" ? " • ID: " + it["ID"] : ""}
    </div>
  `;
  return li;
}

// ====== INIT + AUTO-REFRESH ======
let driftTimer = null;
async function refreshDriftNow(){
  try{
    const items = await fetchDriftFromSharePoint();
    renderDriftLists(items);
  }catch(err){
    console.warn("[drift_sp] kan ikke hente driftsmeldinger:", err);
    // Vis en diskret feilmelding i historikk-listen
    const hist = $("#driftHistorikkListe");
    if (hist && !hist.childElementCount){
      const li = document.createElement("li");
      li.className = "drift-item";
      li.innerHTML = `<div style="color:#f6c; font-size:13px;">
        Kunne ikke hente driftsmeldinger fra SharePoint (${escapeHtml(err.message)}).
        Er du innlogget i O365? Har du tilgang til listen?
      </div>`;
      hist.appendChild(li);
    }
  }
}

function startDriftAutoRefresh(){
  if (driftTimer) clearInterval(driftTimer);
  driftTimer = setInterval(refreshDriftNow, AUTO_REFRESH_MS);
}

// Kjør når DOM er klar (uten å endre eksisterende app.js):
document.addEventListener("DOMContentLoaded", () => {
  refreshDriftNow();
  startDriftAutoRefresh();
});
</script>
