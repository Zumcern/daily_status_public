/* drift.js – driftsmodul med Aktive/Historikk, flytting til historikk, og permanent slett i historikk */

const DRIFT_KEY = "driftmeldinger";                 // aktive
const DRIFT_HIST_KEY = "driftmeldinger_historikk";  // historikk

/* Enheter (visningslabel) */
const UNIT_LABELS = {
  BR: "Bergen (ENBR)", ZV: "Sola (ENZV)", VA: "Værnes (ENVA)", GM: "Oslo/Gardermoen (ENGM)",
  BO: "Bodø (ENBO)", TC: "Tromsø (ENTC)", KR: "Kirkenes (ENKR)", OL: "Ørland (ENOL)",
  EV: "Evenes (ENEV)", DU: "Bardufoss (ENDU)", AT: "Alta (ENAT)", TO: "Sandefjord/Torp (ENTO)",
  AN: "Andøya (ENAN)", HF: "Hammerfest (ENHF)", FL: "Florø (ENFL)", BN: "Brønnøysund (ENBN)",
  SB: "Svalbard/Longyearbyen (ENSB)", SK: "Stokmarknes/Skagen (ENSK)", OV: "Ørsta–Volda/Hovden (ENOV)",
  HD: "Haugesund/Karmøy (ENHD)", NA: "Lakselv/Banak (ENNA)", RY: "Rygge (ENRY)", KB: "Kristiansund/Kvernberget (ENKB)",
  RA: "ENRA", HV: "Honningsvåg/Valan (ENHV)", TEKNISK: "Teknisk", ANNET: "Annet"
};

function labelForUnit(code) {
  const c = String(code || "").toUpperCase();
  return UNIT_LABELS[c] || "Annet";
}
function extractIcaoFromLabel(label, fallbackCode = "") {
  const m = String(label || "").match(/\((EN[A-ZÆØÅ]{2,3})\)/i);
  if (m) return m[1].toUpperCase();
  return String(fallbackCode || "").toUpperCase();
}
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* Persistens helpers */
function loadJson(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    const val = raw ? JSON.parse(raw) : fallback;
    return Array.isArray(val) ? val : fallback;
  } catch { return fallback; }
}
function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* Load/Save aktive */
function loadDrift() {
  const arr = loadJson(DRIFT_KEY, []);
  return arr.map(x => {
    const code = x?.enhet ? String(x.enhet).toUpperCase() : "ANNET";
    const enhetLabel = x?.enhetLabel || labelForUnit(code);
    const tid = x?.tid || Date.now();
    const alvor = x?.alvor || "info";
    return { ...x, enhet: code, enhetLabel, tid, alvor };
  });
}
function saveDrift(list) {
  // normaliser før lagring
  const norm = list.map(x => {
    const code = x?.enhet ? String(x.enhet).toUpperCase() : "ANNET";
    const enhetLabel = x?.enhetLabel || labelForUnit(code);
    return { ...x, enhet: code, enhetLabel };
  });
  saveJson(DRIFT_KEY, norm);
}

/* Load/Save historikk */
function loadHist() {
  const arr = loadJson(DRIFT_HIST_KEY, []);
  return arr.map(x => {
    const code = x?.enhet ? String(x.enhet).toUpperCase() : "ANNET";
    const enhetLabel = x?.enhetLabel || labelForUnit(code);
    const tid = x?.tid || Date.now();
    const alvor = x?.alvor || "info";
    const archivedAt = x?.archivedAt || x?.tid || Date.now();
    return { ...x, enhet: code, enhetLabel, tid, alvor, archivedAt };
  }).sort((a,b) => (b.archivedAt||0) - (a.archivedAt||0)); // nyeste først
}
function saveHist(list) {
  const norm = list.map(x => {
    const code = x?.enhet ? String(x.enhet).toUpperCase() : "ANNET";
    const enhetLabel = x?.enhetLabel || labelForUnit(code);
    const archivedAt = x?.archivedAt || Date.now();
    return { ...x, enhet: code, enhetLabel, archivedAt };
  });
  saveJson(DRIFT_HIST_KEY, norm);
}

/* Rendering – Aktive */
function renderDrift() {
  const list = loadDrift();
  const ul = document.getElementById("driftListe");
  if (!ul) return;
  ul.innerHTML = "";

  list.forEach((d, idx) => {
    const li = document.createElement("li");
    li.className = "drift-item " + (d.alvor || "info");

    const unitCode = String(d.enhet || "").toUpperCase();
    const icao = extractIcaoFromLabel(d.enhetLabel, unitCode);

    const unitTag = `
      <span class="drift-unit-chip" title="${escapeHtml(d.enhetLabel)}">
        ${escapeHtml(icao)}
      </span>`;

    const rightHtml = `
      <span style="display:inline-flex; gap:8px; align-items:center;">
        <time datetime="${new Date(d.tid).toISOString()}" class="muted-time">
          ${new Date(d.tid).toLocaleString("no-NO")}
        </time>
        ${unitTag}
        <button data-archive="${idx}" class="icon-btn" title="Flytt til historikk">↘</button>
        <button data-del-now="${idx}" class="icon-btn" title="Slett permanent">×</button>
      </span>
    `;

    li.innerHTML = `
      <header>
        <strong>${escapeHtml(d.tittel || "")}</strong>
        ${rightHtml}
      </header>
      <div style="margin-top:6px;">${escapeHtml(d.tekst || "")}</div>
    `;
    ul.appendChild(li);
  });
}

/* Rendering – Historikk */
function renderHist() {
  const list = loadHist();
  const ul = document.getElementById("driftHistorikkListe");
  if (!ul) return;
  ul.innerHTML = "";

  list.forEach((d, idx) => {
    const li = document.createElement("li");
    li.className = "drift-item hist " + (d.alvor || "info");

    const unitCode = String(d.enhet || "").toUpperCase();
    const icao = extractIcaoFromLabel(d.enhetLabel, unitCode);

    const unitTag = `
      <span class="drift-unit-chip" title="${escapeHtml(d.enhetLabel)}">
        ${escapeHtml(icao)}
      </span>`;

    const rightHtml = `
      <span style="display:inline-flex; gap:8px; align-items:center;">
        <time datetime="${new Date(d.archivedAt).toISOString()}" class="muted-time">
          Arkivert: ${new Date(d.archivedAt).toLocaleString("no-NO")}
        </time>
        ${unitTag}
        <button data-restore="${idx}" class="icon-btn" title="Gjenopprett til Aktive">↖</button>
        <button data-del-hist="${idx}" class="icon-btn" title="Slett PERMANENT">×</button>
      </span>
    `;

    li.innerHTML = `
      <header>
        <strong>${escapeHtml(d.tittel || "")}</strong>
        ${rightHtml}
      </header>
      <div style="margin-top:6px;">${escapeHtml(d.tekst || "")}</div>
    `;
    ul.appendChild(li);
  });
}

/* Tabs: Aktive / Historikk / Endringer */
function initDriftTabs() {
  const tabs = document.querySelectorAll(".drift-tab");
  const listAktiv = document.getElementById("driftListe");
  const listHistorikk = document.getElementById("driftHistorikkListe");
  const formContainer = document.getElementById("driftAktivContainer");
  const changeLogContainer = document.getElementById("changeLogContainer");

  function show(which) {
    // default: skjul alt
    listAktiv.style.display = "none";
    listHistorikk.style.display = "none";
    formContainer.style.display = "none";
    if (changeLogContainer) changeLogContainer.style.display = "none";

    if (which === "aktive") {
      listAktiv.style.display = "block";
      formContainer.style.display = "block";
    } else if (which === "historikk") {
      listHistorikk.style.display = "block";
    } else if (which === "endringer") {
      if (changeLogContainer) changeLogContainer.style.display = "block";
      // Be app.js tegne loggen på nytt (hvis funksjon finnes)
      if (window.__renderChangeLog) window.__renderChangeLog();
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      show(tab.dataset.tab);
    });
  });
}


/* Init / hendelser */
function initDrift() {
  const form = document.getElementById("driftForm");
  const exportBtn = document.getElementById("eksporterDrift");
  const importInput = document.getElementById("importDrift");
  const emptyBtn = document.getElementById("tømDrift");

  // Opprett
  form.addEventListener("submit", e => {
    e.preventDefault();
    const tittel = document.getElementById("driftTittel").value.trim();
    const tekst = document.getElementById("driftTekst").value.trim();
    const alvor = document.getElementById("driftAlvor").value;
    const enhet = String(document.getElementById("driftEnhet").value || "").toUpperCase();

    if (!tittel || !tekst || !alvor || !enhet) return;

    const list = loadDrift();
    list.unshift({
      tittel, tekst, alvor, enhet,
      enhetLabel: labelForUnit(enhet),
      tid: Date.now()
    });
    saveDrift(list);
    renderDrift();
    form.reset();
  });

  // Klikk i Aktive-liste
  document.getElementById("driftListe").addEventListener("click", e => {
    const archiveIdx = e.target.getAttribute("data-archive");
    const delNowIdx = e.target.getAttribute("data-del-now");
    if (archiveIdx !== null) {
      const idx = Number(archiveIdx);
      const list = loadDrift();
      const item = list.splice(idx, 1)[0];
      saveDrift(list);

      // Flytt til historikk
      const hist = loadHist();
      hist.unshift({ ...item, archivedAt: Date.now() });
      saveHist(hist);

      renderDrift();
      renderHist();
      return;
    }
    if (delNowIdx !== null) {
      const idx = Number(delNowIdx);
      const list = loadDrift();
      list.splice(idx, 1);
      saveDrift(list);
      renderDrift();
      return;
    }
  });

  // Klikk i Historikk-liste
  document.getElementById("driftHistorikkListe").addEventListener("click", e => {
    const delIdx = e.target.getAttribute("data-del-hist");
    const restoreIdx = e.target.getAttribute("data-restore");

    if (restoreIdx !== null) {
      const idx = Number(restoreIdx);
      const hist = loadHist();
      const item = hist.splice(idx, 1)[0];
      saveHist(hist);

      // Tilbake til aktive
      const list = loadDrift();
      list.unshift({ ...item }); // behold original tid/alvor/enhet
      saveDrift(list);

      renderDrift();
      renderHist();
      return;
    }

    if (delIdx !== null) {
      const idx = Number(delIdx);
      const hist = loadHist();
      hist.splice(idx, 1); // permanent slett
      saveHist(hist);
      renderHist();
      return;
    }
  });

  // Eksport/Import/Tøm (gjelder aktive – historikk beholdes ved "Tøm")
  exportBtn.addEventListener("click", () => {
    const data = JSON.stringify(loadDrift(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "driftsmeldinger.json";
    a.click();
  });

  importInput.addEventListener("change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const list = JSON.parse(text);
      if (!Array.isArray(list)) throw new Error("format");
      saveDrift(list);
      renderDrift();
    } catch {
      alert("Ugyldig driftsmelding-fil");
    }
    importInput.value = "";
  });

  emptyBtn.addEventListener("click", () => {
    if (confirm("Tømme AKTIVE driftsmeldinger? (Historikk beholdes)")) {
      saveDrift([]);
      renderDrift();
    }
  });

  // Første render
  renderDrift();
  renderHist();
  initDriftTabs();
}

document.addEventListener("DOMContentLoaded", initDrift);