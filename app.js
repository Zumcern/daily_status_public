/* Dagens status – app.js (Endringer-fane, uten JS-duplikater av Oppdater/Sortering) */

/* --- Konstanter / oppsett --- */
const NAMES = ["Trine","Stein","Håkon","Odd Rune","Magnus","Jon Håvard","Patrick","Marjolein","Bjørnar","Rune","Connor","Ole","Beate","Kosti","Gudmund"];
const FRAVAER_KEYWORDS = ["ferie","fri"];
const TYPEKODER = { "1":"Refresh","2":"Overf./X-utsj","3":"Prosjekt/nye prosedyrer etc","4":"Elev","5":"Validering","6":"Pre-ojt" };

// ENxx -> kortkode (brukes i parsing)
const ICAO_TO_UNIT = {
  ENBR:"BR", ENZV:"ZV", ENVA:"VA", ENGM:"GM", ENBO:"BO", ENTC:"TC", ENKR:"KR", ENOL:"OL", ENEV:"EV",
  ENDU:"DU", ENAT:"AT", ENTO:"TO", ENAN:"AN", ENHF:"HF", ENFL:"FL", ENBN:"BN", ENSB:"SB", ENSK:"SK",
  ENOV:"OV", ENHD:"HD", ENNA:"NA", ENRY:"RY", ENKB:"KB", ENRA:"RA", ENHV:"HV"
};
const UNIT_CODE_LABEL = {
  BR:"Bergen (ENBR)", ZV:"Sola (ENZV)", VA:"Værnes (ENVA)", GM:"Oslo/Gardermoen (ENGM)", BO:"Bodø (ENBO)", TC:"Tromsø (ENTC)",
  KR:"Kirkenes (ENKR)", OL:"Ørland (ENOL)", EV:"Evenes (ENEV)", DU:"Bardufoss (ENDU)", AT:"Alta (ENAT)", TO:"Sandefjord/Torp (ENTO)",
  AN:"Andøya (ENAN)", HF:"Hammerfest (ENHF)", FL:"Florø (ENFL)", BN:"Brønnøysund (ENBN)", SB:"Svalbard/Longyearbyen (ENSB)",
  SK:"Stokmarknes/Skagen (ENSK)", OV:"Ørsta–Volda/Hovden (ENOV)", HD:"Haugesund/Karmøy (ENHD)", NA:"Lakselv/Banak (ENNA)",
  RY:"Rygge (ENRY)", KB:"Kristiansund/Kvernberget (ENKB)", RA:"ENRA", HV:"Honningsvåg/Valan (ENHV)"
};
const UNIT_CODE_COLOR = {
  BR:"#8E24AA", ZV:"#6d5c64", VA:"#707070", GM:"#27e6b6", BO:"#4a8091", TC:"#fbff02", KR:"#3f7ccc", OL:"#11e8f0",
  EV:"#1E88E5", DU:"#00897B", AT:"#6c8308", TO:"#8D6E63", AN:"#5E92F3", HF:"#26A69A", FL:"#7CB342", BN:"#26C6DA",
  SB:"#c58701", SK:"#c58701", OV:"#FF7043", HD:"#29B6F6", NA:"#66BB6A", RY:"#b33071", KB:"#FFCA28", RA:"#90A4AE", HV:"#AB47BC", MØ:"#797979"
};

const COLOR_WHITE_BG="#ffffff", COLOR_WHITE_TEXT="#0b1726";
const COLOR_AFIS_BG="#FFD8A8", COLOR_AFIS_TEXT="#5A3A00";
const COLOR_ORANGE_BG="#FFA94D", COLOR_ORANGE_TEXT="#5A3A00";

const NOW = new Date();
const DEFAULT_YEAR = NOW.getFullYear();
const DEFAULT_PLAN_FILE = `arbeidsplan_${DEFAULT_YEAR}_per_dato.json`;
const AUTO_REFRESH_MS = 5 * 60 * 1000;

/* --- Tilstand --- */
let planData = {};
let dates = [];
let currentDateISO = null;
let lastLoadedSource = null;
let activeUnitFilter = null;
let currentSortMode = "navn";
let refreshTimerId = null;
let lastJsonFingerprint = "";
let lastCheckedAt = null;
let lastUpdatedAt = null;

/* ---- Change Log state & helpers ---- */
const CHANGELOG_PREFIX = "status_changelog_";
let previousStatusSnapshot = {}; // {Navn: "aktivitet"}

function changeLogKey(iso) { return `${CHANGELOG_PREFIX}${iso || ""}`; }
function loadChangeLog(iso) {
  try {
    const raw = localStorage.getItem(changeLogKey(iso));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveChangeLog(iso, list) {
  localStorage.setItem(changeLogKey(iso), JSON.stringify(list));
}
function buildSnapshotForCurrentDate() {
  if (!currentDateISO) return {};
  const map = buildPersonMapForDate(currentDateISO);
  return Object.fromEntries([...map.entries()]); // Map -> plain object
}
function initSnapshotForCurrentDate() {
  previousStatusSnapshot = buildSnapshotForCurrentDate();
}
function detectAndRecordChanges() {
  if (!currentDateISO) return [];
  const nowMap = buildPersonMapForDate(currentDateISO);
  const nowObj = Object.fromEntries([...nowMap.entries()]);

  // Første runde for dagen: sett snapshot og logg ingenting
  if (!previousStatusSnapshot || Object.keys(previousStatusSnapshot).length === 0) {
    previousStatusSnapshot = nowObj;
    return [];
  }

  const changes = [];
  for (const name of NAMES) {
    const before = previousStatusSnapshot[name] ?? null;
    const after  = nowObj[name] ?? null;
    if (before !== null && after !== null && before !== after) {
      changes.push({
        at: new Date().toISOString(),
        person: name,
        before: before || "-",
        after:  after  || "-"
      });
    }
  }

  previousStatusSnapshot = nowObj;

  if (changes.length) {
    const list = loadChangeLog(currentDateISO);
    saveChangeLog(currentDateISO, list.concat(changes)); // append
  }
  return changes;
}
function renderChangeLog() {
  const ul = document.getElementById("changeLogList");
  const meta = document.getElementById("changeLogMeta");
  const countSpan = document.getElementById("changelogCount"); // valgfritt i HTML
  if (!ul) return;

  const list = loadChangeLog(currentDateISO);
  ul.innerHTML = "";

  const items = [...list].reverse(); // nyeste øverst
  for (const e of items) {
    const when = new Date(e.at);
    const li = document.createElement("li");
    li.className = "drift-item";
    li.innerHTML = `
      <header>
        <strong>${escapeHtml(e.person)}</strong>
        <span style="display:inline-flex; gap:8px; align-items:center;">
          <time datetime="${when.toISOString()}" class="muted-time">
            ${when.toLocaleString("no-NO")}
          </time>
        </span>
      </header>
      <div style="margin-top:6px;">
        <span style="color:#ffd3cf;">${escapeHtml(e.before || "-")}</span>
        &nbsp;→&nbsp;
        <span style="color:#cfeeda;">${escapeHtml(e.after || "-")}</span>
      </div>
    `;
    ul.appendChild(li);
  }

  const count = list.length;
  if (meta) {
    meta.textContent = currentDateISO
      ? `${count} endring${count === 1 ? "" : "er"} • Dato: ${currentDateISO}`
      : `${count} endringer`;
  }
  // Marker Endringer-fanen rødt hvis det finnes endringer
  const tab = document.querySelector('.drift-tab[data-tab="endringer"]');
  if (tab) {
    if (count > 0) tab.classList.add("has-changes");
    else tab.classList.remove("has-changes");
  }
  if (countSpan) {
    countSpan.textContent = count ? `(${count})` : "";
  }
}
window.__renderChangeLog = renderChangeLog;

/* --- DOM --- */
const $ = s => document.querySelector(s);
const elDate   = $("#dato");
const elSearch = $("#sok");
const elView   = $("#visning");
const elTable  = $("#statusTabell");
const elTbody  = $("#statusTabell tbody");
const elCount  = $("#teller");
const headerControls = document.querySelector(".date-controls");

// Viktig: VI BRUKER EKSISTERENDE HTML-ELEMENTER (ingen JS-duplikat)
const btnOppdaterNaa = document.getElementById("oppdaterNaa");
const selSort        = document.getElementById("sortering");
let   unitChip       = document.getElementById("unitChip");

/* --- Toppkontroller (kun prev/next lages i JS) --- */
function ensurePrevNextButtons() {
  // Lag "Forrige dag" / "Neste dag" hvis de ikke allerede finnes i HTML
  let btnPrev = document.getElementById("forrigeDag");
  let btnNext = document.getElementById("nesteDag");

  if (!btnPrev) {
    btnPrev = document.createElement("button");
    btnPrev.id = "forrigeDag";
    btnPrev.textContent = "Forrige dag";
    headerControls?.appendChild(btnPrev);
  }
  if (!btnNext) {
    btnNext = document.createElement("button");
    btnNext.id = "nesteDag";
    btnNext.textContent = "Neste dag";
    headerControls?.appendChild(btnNext);
  }

  // unitChip: bruk eksisterende hvis finnes, ellers opprett
  if (!unitChip) {
    unitChip = document.createElement("button");
    unitChip.id = "unitChip";
    unitChip.style.display = "none";
    unitChip.title = "Klikk for å fjerne enhetsfilter";
    headerControls?.appendChild(unitChip);
  }

  // Knytt hendelser
  btnPrev.addEventListener("click", ()=>{
    if(!currentDateISO || !dates.length) return;
    const idx=dates.indexOf(currentDateISO);
    if(idx>0) setDateISO(dates[idx-1],{snapToNearest:false});
  });
  btnNext.addEventListener("click", ()=>{
    if(!currentDateISO || !dates.length) return;
    const idx=dates.indexOf(currentDateISO);
    if(idx>=0 && idx<dates.length-1) setDateISO(dates[idx+1],{snapToNearest:false});
  });
}

/* --- Hjelpere --- */
function ensureTableHeader(){
  const thead = elTable.querySelector("thead"); if(!thead) return;
  const ths = thead.querySelectorAll("th");
  if(ths.length!==4){
    thead.innerHTML = `<tr>
      <th>Navn</th>
      <th>Status</th>
      <th>Type trening</th>
      <th>Skift</th>
    </tr>`;
  }
}
function toISODate(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), dd=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function parseISODate(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
function nearestDateISO(targetISO){
  if(!dates.length) return null;
  if(dates.includes(targetISO)) return targetISO;
  const t = parseISODate(targetISO).getTime();
  let best = dates[0], bestDist = Math.abs(parseISODate(best).getTime() - t);
  for(const d of dates){
    const dist = Math.abs(parseISODate(d).getTime() - t);
    if(dist < bestDist){ best = d; bestDist = dist; }
  }
  return best;
}
/** Viktig: initSnapshot kan slås av ved programmatisk refresh for å bevare "før"-verdier */
function setDateISO(iso, { snapToNearest = true, initSnapshot = true } = {}){
  if(!iso) return;
  const finalISO = snapToNearest ? nearestDateISO(iso) : iso;
  if(!finalISO) return;
  currentDateISO = finalISO;
  if(elDate) elDate.value = finalISO;

  if (initSnapshot) {
    initSnapshotForCurrentDate();
  }

  render();
  renderChangeLog();
}
function setMinMaxForDateInput(){
  if(!elDate || !dates.length) return;
  elDate.min=dates[0]; elDate.max=dates[dates.length-1];
}
function isFravaer(a){
  if(!a) return false;
  const s=String(a).toLowerCase();
  return FRAVAER_KEYWORDS.some(k=>s.includes(k));
}
function isTilstede(a){ return Boolean(a && a.trim() && !isFravaer(a)); }
function fmtTime(d){ return d ? d.toLocaleTimeString("no-NO",{hour12:false}) : "–"; }
function updateLastInfo(){
  const elLastInfo = document.getElementById("lastInfo");
  if(!elLastInfo) return;
  elLastInfo.textContent=`Sist oppdatert: ${lastUpdatedAt?fmtTime(lastUpdatedAt):"–"} • Sist sjekket: ${lastCheckedAt?fmtTime(lastCheckedAt):"–"}`;
}
function hexToRgb(hex){
  const m=hex.replace("#","").match(/^([0-9a-f]{6})$/i);
  if(!m) return {r:47,g:174,b:102};
  const int=parseInt(m[1],16);
  return {r:(int>>16)&255,g:(int>>8)&255,b:int&255};
}
function rgbToHex(r,g,b){ return "#"+[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join(""); }
function hslToHex(h,s,l){
  const c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2; let [r,g,b]=[0,0,0];
  if(0<=h&&h<60)[r,g,b]=[c,x,0]; else if(60<=h&&h<120)[r,g,b]=[x,c,0]; else if(120<=h&&h<180)[r,g,b]=[0,c,x];
  else if(180<=h&&h<240)[r,g,b]=[0,x,c]; else if(240<=h&&h<300)[r,g,b]=[x,0,c]; else[r,g,b]=[c,0,x];
  const R=Math.round((r+m)*255), G=Math.round((g+m)*255), B=Math.round((b+m)*255);
  return rgbToHex(R,G,B);
}
function textOn(bg){
  const {r,g,b} = hexToRgb(bg);
  const lum=(0.2126*r+0.7152*g+0.0722*b)/255;
  return lum>0.6?"#0b1726":"#ffffff";
}
function shade(hex,f=-0.25){
  const {r,g,b} = hexToRgb(hex);
  const mix=v=>Math.max(0,Math.min(255,Math.round(v+(255-v)*f)));
  return rgbToHex(mix(r),mix(g),mix(b));
}
function colorForUnit(u){
  if(!u) return null;
  if(UNIT_CODE_COLOR[u]) return UNIT_CODE_COLOR[u];
  const h=(hashStr(u)%300)+30;
  return hslToHex(h,0.60,0.46);
}
function hashStr(str){
  let h=2166136261>>>0;
  for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619);}
  return h>>>0;
}

/* --- Datahåndtering --- */
async function fetchPlanJsonWithCacheBust(url){
  const res = await fetch(`${url}${url.includes("?")?"&":"?"}_=${Date.now()}`, {cache:"no-store"});
  if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
function fingerprintOf(obj){ try{return JSON.stringify(obj);}catch{return "";} }

async function tryLoadDefault(initial=false){
  try{
    const json = await fetchPlanJsonWithCacheBust(DEFAULT_PLAN_FILE);
    lastCheckedAt = new Date();
    const fp = fingerprintOf(json);
    const changed = initial || fp !== lastJsonFingerprint;

    if(changed){
      lastJsonFingerprint = fp;
      lastUpdatedAt = new Date();

      applyPlanJson(json, `fetched:${DEFAULT_PLAN_FILE}`);

      // Behold dato uten å nullstille snapshot ved programmatisk refresh
      if (!initial) {
        const keepISO = currentDateISO || toISODate(new Date());
        setDateISO(keepISO, { snapToNearest: true, initSnapshot: false });
      }

      // Change Log
      const newChanges = detectAndRecordChanges();

      // Oppdater Endringer-fanen ved behov
      const activeTab = document.querySelector('.drift-tab.active')?.dataset.tab;
      if (activeTab === 'endringer' || newChanges.length > 0) {
        renderChangeLog();
      }
    }

    updateLastInfo();
    return true;
  }catch(err){
    console.warn(`[WARN] Klarte ikke å laste ${DEFAULT_PLAN_FILE}:`, err);
    lastCheckedAt = new Date();
    updateLastInfo();
    return false;
  }
}

function applyPlanJson(json, sourceLabel="unknown"){
  if(!json || typeof json!=="object" || Array.isArray(json))
    throw new Error("Ugyldig plan-JSON: Forventer objekt pr dato.");
  planData = json;
  dates = Object.keys(planData).sort();
  lastLoadedSource = sourceLabel;
  setMinMaxForDateInput();

  if(!currentDateISO){
    const iso = nearestDateISO(toISODate(new Date())) || dates[0];
    setDateISO(iso, {snapToNearest:false});
  } else {
    render();
  }
}

function buildPersonMapForDate(iso){
  const dayList = planData[iso] || [];
  const map = new Map();
  for(const {person, aktivitet} of dayList){
    map.set(person, aktivitet || "-");
  }
  return map;
}

/* --- Parsing aktivitet --- */
function classifyGeneric(raw){
  const s = String(raw||"").trim();
  if(!s) return {isA:false,isAFIS:false};
  if(/^a$/i.test(s)) return {isA:true,isAFIS:false};
  if(/afis/i.test(s)) return {isA:false,isAFIS:true};
  return {isA:false,isAFIS:false};
}
function normalizeUnitToken(t){
  if(!t) return null;
  const u = String(t).toUpperCase();
  if(/^EN[A-ZÆØÅ]{2}$/.test(u)) return ICAO_TO_UNIT[u] || null; // ENBR -> BR
  if(/^[A-ZÆØÅ]{2,3}$/.test(u)) return u.length<=3 ? u : null; // BR, ZV, VA ...
  return null;
}
function parseActivity(raw){
  const s = String(raw||"").trim();
  const tokens = s.split(/\s+/).filter(Boolean);
  let isLeader=false, shift=null, unit2=null, typekode=null;

  if(tokens.length && tokens[0]==="9") isLeader=true;

  for(const tok of tokens){
    const t = tok.toUpperCase();
    if(t==="SF"||t==="SE"){ shift=t; continue; }
    if(/^[1-6]$/.test(t)){ typekode=t; continue; }
    const n = normalizeUnitToken(t); if(n) unit2=n;
  }

  const typeText = typekode && TYPEKODER[typekode] ? TYPEKODER[typekode] : "";
  let shiftText="Formiddag"; if(shift==="SE") shiftText="Ettermiddag";

  const parts=[];
  if(isLeader) parts.push("Ansvarlig enhet (9)");
  if(shift) parts.push(shift==="SF"?"Simulator formiddag":"Simulator ettermiddag");
  if(unit2) parts.push(`Enhet: ${UNIT_CODE_LABEL[unit2]||unit2}`);
  if(typeText) parts.push(typeText);
  const g = classifyGeneric(s);
  if(g.isA)    parts.push("A (hvit)");
  if(g.isAFIS) parts.push("AFIS (lys oransje)");
  const tooltip = parts.length ? `${parts.join(" • ")}\n${s}` : s;

  return { isLeader, shift, unit2, typekode, typeText, shiftText, tooltip, raw:s };
}

/* --- Sortering --- */
function sortRows(rows, mode){
  const idx = new Map(NAMES.map((n,i)=>[n,i]));
  const byName = (a,b)=>(idx.get(a.name)??999)-(idx.get(b.name)??999);

  if(mode==="navn") return rows.sort(byName);

  if(mode==="enhet-ansvarlig-navn"){
    return rows.sort((a,b)=>{
      const ua=a.meta.unit2||"Øvrig", ub=b.meta.unit2||"Øvrig";
      if(ua!==ub) return ua.localeCompare(ub,"no");
      if(a.meta.isLeader!==b.meta.isLeader) return a.meta.isLeader?-1:1;
      return byName(a,b);
    });
  }
  if(mode==="ansvarlig"){
    return rows.sort((a,b)=>{
      if(a.meta.isLeader!==b.meta.isLeader) return a.meta.isLeader?-1:1;
      return byName(a,b);
    });
  }
  if(mode==="aktivitet"){
    return rows.sort((a,b)=>{
      const aa=(a.aktivitet||"").toLowerCase(), bb=(b.aktivitet||"").toLowerCase();
      if(aa!==bb) return aa.localeCompare(bb,"no");
      return byName(a,b);
    });
  }
  return rows.sort(byName);
}

/* --- Rendering --- */
function escapeHtml(s){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

function render(){
  ensureTableHeader();
  if(!currentDateISO){
    elTbody.innerHTML="";
    elCount.textContent="Ingen data.";
    return;
  }

  const q=(elSearch?.value??"").trim().toLowerCase();
  const view=(elView?.value??"alle");
  const pmap = buildPersonMapForDate(currentDateISO);

  let rows = NAMES.map(name=>{
    const aktivitet = pmap.get(name) ?? "-";
    const meta = parseActivity(aktivitet);
    return { name, aktivitet, meta };
  });

  if(view==="tilstede") rows=rows.filter(r=>isTilstede(r.aktivitet));
  else if(view==="fravaer") rows=rows.filter(r=>isFravaer(r.aktivitet));

  if(activeUnitFilter) rows=rows.filter(r=>r.meta.unit2===activeUnitFilter);
  if(q) rows=rows.filter(r=>
    r.name.toLowerCase().includes(q) || String(r.aktivitet).toLowerCase().includes(q)
  );

  rows = sortRows(rows, currentSortMode);

  const html = rows.map(r=>{
    const { isLeader, unit2, tooltip, typeText, shiftText } = r.meta;
    const frav = isFravaer(r.aktivitet);
    const tilst = isTilstede(r.aktivitet);
    const { isA, isAFIS } = classifyGeneric(r.aktivitet);

    let style="", badgeClass="badge", label=r.aktivitet && r.aktivitet.trim()? r.aktivitet : "-";

    if(frav){
      badgeClass += " fravaer";
    } else if(tilst && unit2){
      const base = colorForUnit(unit2);
      const bg = isLeader ? shade(base,-0.25) : base;
      const fg = textOn(bg);
      style = `style="background:${bg}; color:${fg}; cursor:pointer"`;
    } else if(tilst && isA){
      style = `style="background:${COLOR_WHITE_BG}; color:${COLOR_WHITE_TEXT}; cursor:default"`;
    } else if(tilst && isAFIS){
      style = `style="background:${COLOR_AFIS_BG}; color:${COLOR_AFIS_TEXT}; cursor:default"`;
    } else if(tilst){
      style = `style="background:${COLOR_ORANGE_BG}; color:${COLOR_ORANGE_TEXT}; cursor:default"`;
    }

    if(isLeader && !/★/.test(label)) label=`★ ${label}`;
    const titleAttr = tooltip ? ` title="${escapeHtml(tooltip)}"` : "";
    const dataUnit = unit2 ? ` data-unit="${unit2}"` : "";
    const skiftCell = (shiftText==="Ettermiddag")
      ? `<span style="color:#e74c3c">${shiftText}</span>` : `${escapeHtml(shiftText)}`;

    return `<tr>
      <td>${r.name}</td>
      <td>
        <span class="badge ${badgeClass}" ${style}${titleAttr}${dataUnit}
              onclick="window.__onBadgeClick(event)">${escapeHtml(label)}</span>
      </td>
      <td>${escapeHtml(typeText||"")}</td>
      <td>${skiftCell}</td>
    </tr>`;
  }).join("");

  elTbody.innerHTML = html;

  const baseCount = `${rows.length} personer vist av ${NAMES.length} • Dato: ${currentDateISO}`;
  const src = lastLoadedSource ? ` • Kilde: ${lastLoadedSource}` : "";
  const filt = activeUnitFilter ? ` • Filter: enhet ${activeUnitFilter}` : "";
  elCount.textContent = baseCount + filt + src;

  if(unitChip){
    if(activeUnitFilter){
      unitChip.style.display="inline-block";
      unitChip.textContent=`Enhet: ${activeUnitFilter} ×`;
    } else {
      unitChip.style.display="none";
    }
  }
}

/* Klikk på enhets-badge -> filter */
window.__onBadgeClick = (ev)=>{
  const unit = ev.currentTarget.getAttribute("data-unit");
  if(unit){
    activeUnitFilter = (activeUnitFilter===unit) ? null : unit;
    render();
  }else if(activeUnitFilter){
    activeUnitFilter = null; render();
  }
};

/* --- Auto-refresh / hendelser / init --- */
function startAutoRefresh(){ stopAutoRefresh(); refreshTimerId=setInterval(async()=>{ await tryLoadDefault(false); }, AUTO_REFRESH_MS); }
function stopAutoRefresh(){ if(refreshTimerId){ clearInterval(refreshTimerId); refreshTimerId=null; } }

function wireEvents(){
  // Dato
  elDate?.addEventListener("change", ()=> setDateISO(elDate.value,{snapToNearest:true}) );

  // Oppdater nå (fra HTML)
  btnOppdaterNaa?.addEventListener("click", async()=>{ await tryLoadDefault(false); });

  // I dag (fra HTML)
  document.getElementById("iDag")?.addEventListener("click", ()=> setDateISO(toISODate(new Date()),{snapToNearest:true}) );

  // Prev/Next – opprettes og bindes i ensurePrevNextButtons()
  ensurePrevNextButtons();

  // Søk/visning
  elSearch?.addEventListener("input", render);
  elView?.addEventListener("change", render);

  // Sortering (fra HTML)
  if (selSort) {
    selSort.addEventListener("change", ()=>{
      currentSortMode = selSort.value;
      render();
    });
  }

  // unitChip (kan være i HTML – hvis ikke, ble den laget i ensurePrevNextButtons)
  unitChip?.addEventListener("click", ()=>{
    activeUnitFilter = null; render();
  });

  // "Tøm logg"-knapp i Endringer-fanen
  document.getElementById("clearChangeLog")?.addEventListener("click", () => {
    if (!currentDateISO) return;
    if (confirm(`Tømme Change Log for ${currentDateISO}?`)) {
      saveChangeLog(currentDateISO, []);
      initSnapshotForCurrentDate();
      renderChangeLog();
    }
  });
}

/* Interaksjonsfeedback: pressed + loading */
(function enhanceButtons() {
  // Kort "pressed"-klasse ved klikk/tastatur
  const press = (btn) => {
    btn.classList.add("is-pressed");
    setTimeout(() => btn.classList.remove("is-pressed"), 120);
  };
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, .icon-btn, .file-btn");
    if (t) press(t);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      const t = document.activeElement;
      if (t && (t.matches("button") || t.matches(".icon-btn") || t.matches(".file-btn"))) {
        press(t);
      }
    }
  });

  // Hjelper for å sette loading-state rundt async funksjoner
  const withLoading = (btn, asyncFn) => async (...args) => {
    try {
      btn.classList.add("is-loading");
      btn.disabled = true;
      await asyncFn(...args);
    } finally {
      btn.disabled = false;
      btn.classList.remove("is-loading");
    }
  };

  // Knytter loading til Oppdater nå (fra HTML) hvis tilstede
  if (btnOppdaterNaa) {
    if (btnOppdaterNaa.__enhanced) {
      btnOppdaterNaa.removeEventListener("click", btnOppdaterNaa.__enhanced);
    }
    btnOppdaterNaa.__enhanced = withLoading(btnOppdaterNaa, async () => {
      await tryLoadDefault(false);
    });
    btnOppdaterNaa.addEventListener("click", btnOppdaterNaa.__enhanced);
  }
})();

/* Init */
async function init(){
  ensureTableHeader();
  wireEvents();

  const ok = await tryLoadDefault(true);
  if(!ok){
    planData={}; dates=[]; currentDateISO=null;
    if(elTbody) elTbody.innerHTML="";
    const t=document.getElementById("teller");
    if(t) t.textContent = `Fant ikke ${DEFAULT_PLAN_FILE}. Kontroller at parseren har skrevet ut JSON i samme mappe.`;
  }

  startAutoRefresh();
  updateLastInfo();

  // Initier snapshot for valgt dato slik at første lasting ikke genererer falske endringer
  initSnapshotForCurrentDate();
  renderChangeLog();
}

document.addEventListener("DOMContentLoaded", init);