// min_visning.js
// ------------------------------------------------------------
// "Min visning" (uten endring av app.js-logikk)
// - Legger inn knapp i .load-controls
// - Første gang: velg navn fra dropdown (bygget fra tabellen)
// - Lagrer valgt navn i localStorage
// - Viser: enhet (ENxx), status, type trening, skift, mappe-lenke,
//         ansvarlig pilot (9), kollegaer på samme enhet,
//         og relevante driftsmeldinger for enheten.
// ------------------------------------------------------------

(() => {
  "use strict";

  const LS_KEY = "minVisningPerson";
  const DRIFT_PUBLIC_URL =
    "https://raw.githubusercontent.com/Zumcern/daily_status_public/main/driftsmeldinger_public.json";

  // ---------- CSS (injiseres, ingen endring i styles.css nødvendig) ----------
  function injectCss() {
    if (document.getElementById("minVisningCss")) return;
    const css = `
      .minvis-btn { margin-left: 6px; }
      .minvis-overlay{
        position: fixed; inset: 0; background: rgba(0,0,0,0.45);
        display: none; z-index: 9998;
      }
      .minvis-drawer{
        position: fixed; top: 0; right: 0; height: 100vh;
        width: min(520px, 92vw);
        background: #152238;
        border-left: 1px solid #223753;
        box-shadow: -10px 0 25px rgba(0,0,0,0.35);
        transform: translateX(102%);
        transition: transform .18s ease;
        z-index: 9999;
        display: flex; flex-direction: column;
      }
      .minvis-drawer.open { transform: translateX(0); }
      .minvis-overlay.open{ display:block; }

      .minvis-header{
        padding: 14px 14px 10px;
        border-bottom: 1px solid #223753;
        display:flex; justify-content:space-between; align-items:center; gap:10px;
      }
      .minvis-title{ font-weight: 700; font-size: 16px; }
      .minvis-close{
        background:#0f2136; border:1px solid #304564; color:#eef2f6;
        border-radius:8px; padding:6px 10px; cursor:pointer;
      }
      .minvis-body{ padding: 12px 14px 16px; overflow:auto; }
      .minvis-row{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
      .minvis-row select{
        padding:8px; border-radius:6px; border:1px solid #304564;
        background:#0f2136; color:#eef2f6;
        min-width: 240px;
      }
      .minvis-chip{
        display:inline-flex; align-items:center; gap:6px;
        padding:4px 8px; border-radius:999px;
        border:1px solid #304564; background:#0f2136;
        font-size:12px;
      }
      .minvis-chip strong{ font-weight:700; }
      .minvis-section{
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid #223753;
      }
      .minvis-h{
        margin: 0 0 8px;
        font-size: 13px;
        color:#9ab;
        font-weight: 700;
        letter-spacing: .2px;
        text-transform: uppercase;
      }
      .minvis-kv{
        display:grid;
        grid-template-columns: 140px 1fr;
        gap:8px 12px;
        align-items:start;
      }
      .minvis-kv .k{ color:#9ab; }
      .minvis-kv .v{ color:#eef2f6; }
      .minvis-attn{
        display:inline-flex; align-items:center; gap:8px;
        padding:8px 10px; border-radius:6px;
        border:1px solid #ef4444;
        background:#3a1210;
        color:#ffd3cf;
        font-weight:700;
        margin-top:10px;
      }
      .minvis-list{ margin:0; padding:0; list-style:none; display:grid; gap:8px; }
      .minvis-item{
        background:#0f2136; border:1px solid #223753;
        border-radius:6px; padding:10px 10px;
      }
      .minvis-item header{
        display:flex; justify-content:space-between; gap:10px; align-items:flex-start;
      }
      .minvis-item .muted{ color:#9ab; font-size:12px; }
      .minvis-a{
        color:#ffffff; text-decoration:none; border:1px solid #304564;
        background:#0f2136; padding:4px 8px; border-radius:6px;
        display:inline-flex; align-items:center; gap:6px;
      }
      .minvis-a:hover{ opacity:.9; text-decoration:underline; }
    `;
    const style = document.createElement("style");
    style.id = "minVisningCss";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------- DOM helpers ----------
  const $ = (s, root = document) => root.querySelector(s);

  function ensureUi() {
    injectCss();

    const controls = $(".load-controls");
    if (controls && !$("#minVisningBtn")) {
      const btn = document.createElement("button");
      btn.id = "minVisningBtn";
      btn.className = "minvis-btn";
      btn.textContent = "Min visning";
      btn.title = "Vis min status";
      controls.appendChild(btn);
      btn.addEventListener("click", open);
    }

    if (!$("#minVisningOverlay")) {
      const overlay = document.createElement("div");
      overlay.id = "minVisningOverlay";
      overlay.className = "minvis-overlay";
      overlay.addEventListener("click", close);
      document.body.appendChild(overlay);
    }

    if (!$("#minVisningDrawer")) {
      const drawer = document.createElement("aside");
      drawer.id = "minVisningDrawer";
      drawer.className = "minvis-drawer";
      drawer.innerHTML = `
        <div class="minvis-header">
          <div class="minvis-title">Min visning</div>
          <button class="minvis-close" id="minVisningClose" title="Lukk (Esc)">×</button>
        </div>
        <div class="minvis-body">
          <div class="minvis-row">
            <label for="minVisningSelect" class="minvis-chip"><strong>Person</strong></label>
            <select id="minVisningSelect"></select>
            <button id="minVisningClear" class="minvis-close" title="Fjern lagret valg">Nullstill</button>
          </div>

          <div id="minVisningContent"></div>
        </div>
      `;
      document.body.appendChild(drawer);

      $("#minVisningClose").addEventListener("click", close);
      $("#minVisningClear").addEventListener("click", () => {
        localStorage.removeItem(LS_KEY);
        populatePeople();   // repopuler uten valgt
        render();           // oppdater view
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && $("#minVisningDrawer").classList.contains("open")) close();
      });

      $("#minVisningSelect").addEventListener("change", () => {
        const name = $("#minVisningSelect").value;
        localStorage.setItem(LS_KEY, name);
        render();
      });
    }
  }

  function open() {
    ensureUi();
    populatePeople();
    render();
    $("#minVisningOverlay").classList.add("open");
    $("#minVisningDrawer").classList.add("open");
  }

  function close() {
    $("#minVisningOverlay")?.classList.remove("open");
    $("#minVisningDrawer")?.classList.remove("open");
  }

  // ---------- Data extraction from table ----------
  function getRowsFromTable() {
    const tbody = $("#statusTabell tbody");
    if (!tbody) return [];
    const rows = [];
    for (const tr of tbody.querySelectorAll("tr")) {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 4) continue;

      const name = (tds[0].textContent || "").trim();

      const badge = tds[1].querySelector(".badge");
      const statusText = (badge ? badge.textContent : tds[1].textContent || "").trim();
      const isLeader = statusText.startsWith("★") || statusText.includes("★");

      const unit = badge?.getAttribute("data-unit") || ""; // VA/BR/...
      const typeText = (tds[3] ? tds[3].textContent : "").trim(); // NOTE: after you added Mappe column, Type trening is td[3]
      const shiftText = (tds[4] ? tds[4].textContent : tds[3]?.textContent || "").trim(); // fallback if old layout

      // Mappe-kolonne (td[2]) inneholder <a> (folderCell) når unit finnes
      const folderLinkEl = tds[2]?.querySelector("a");
      const folderUrl = folderLinkEl?.getAttribute("href") || "";

      rows.push({
        name,
        statusText,
        unit,
        isLeader,
        typeText,
        shiftText,
        folderUrl
      });
    }
    return rows;
  }

  function getDistinctPeople(rows) {
    const set = new Set();
    rows.forEach(r => r.name && set.add(r.name));
    return Array.from(set);
  }

  // ---------- ENxx helper ----------
  function toIcao(unitShort) {
    const u = String(unitShort || "").toUpperCase().trim();
    if (!u) return "";
    if (u === "MØ") return "ENMØ";
    if (u.length === 2) return "EN" + u;
    return u.startsWith("EN") ? u : u;
  }

  // ---------- People dropdown ----------
  function populatePeople() {
    const select = $("#minVisningSelect");
    if (!select) return;

    const rows = getRowsFromTable();
    const people = getDistinctPeople(rows);

    // Hvis tabellen ikke er klar enda:
    if (!people.length) {
      select.innerHTML = `<option value="">(Laster…)</option>`;
      return;
    }

    const saved = localStorage.getItem(LS_KEY);
    const chosen = saved && people.includes(saved) ? saved : people[0];

    select.innerHTML = people.map(p => {
      const sel = p === chosen ? " selected" : "";
      return `<option value="${escapeHtml(p)}"${sel}>${escapeHtml(p)}</option>`;
    }).join("");
  }

  // ---------- Driftsmeldinger filtering ----------
  async function fetchDriftPublic() {
    const res = await fetch(DRIFT_PUBLIC_URL + "?_=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Drift feed ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  function matchesUnitInDriftItem(item, unitShort) {
    const u = String(unitShort || "").toUpperCase().trim();
    if (!u) return false;

    const icao = toIcao(u);

    // 1) Hvis feeden har eksplisitte felt (best)
    const fields = [
      item.enhet, item.unit, item.icao,
      ...(Array.isArray(item.enheter) ? item.enheter : []),
      ...(Array.isArray(item.units) ? item.units : []),
      ...(Array.isArray(item.icaos) ? item.icaos : [])
    ].filter(Boolean).map(x => String(x).toUpperCase());

    if (fields.some(x => x === u || x === icao)) return true;

    // 2) Fallback: tekstmatch i title/melding/status/kategori
    const hay = `${item.title || ""} ${item.melding || ""} ${item.status || ""} ${item.kategori || ""}`.toUpperCase();
    return hay.includes(` ${u} `) || hay.includes(icao) || hay.includes(`(${icao})`) || hay.includes(`EN${u}`);
  }

  // ---------- Render min view ----------
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  async function render() {
    ensureUi();

    const content = $("#minVisningContent");
    if (!content) return;

    const rows = getRowsFromTable();
    populatePeople(); // keep in sync with table

    const select = $("#minVisningSelect");
    const person = select?.value || localStorage.getItem(LS_KEY) || "";

    if (!rows.length) {
      content.innerHTML = `<div class="minvis-section">
        <div class="minvis-h">Status</div>
        <div class="minvis-item">Ingen data i tabellen ennå.</div>
      </div>`;
      return;
    }

    const me = rows.find(r => r.name === person) || rows[0];
    if (!me) return;

    const unitShort = me.unit || "";
    const icao = toIcao(unitShort);

    const folderUrl =
      (window.UnitFolders && window.UnitFolders.getUnitFolderUrl && unitShort)
        ? window.UnitFolders.getUnitFolderUrl(unitShort)
        : (me.folderUrl || "");

    const coworkers = unitShort
      ? rows.filter(r => r.unit === unitShort && r.name !== me.name)
      : [];

    // Driftsmeldinger for enheten (hvis mulig å matche)
    let driftHtml = `<div class="minvis-item">Ingen relevante driftsmeldinger funnet.</div>`;
    try {
      const drift = await fetchDriftPublic();
      const filtered = unitShort ? drift.filter(it => matchesUnitInDriftItem(it, unitShort)) : [];
      if (filtered.length) {
        driftHtml = `<ul class="minvis-list">` + filtered.map(it => {
          const title = escapeHtml(it.title || "");
          const msg = escapeHtml(it.melding || "");
          const cat = escapeHtml(it.kategori || "");
          const status = escapeHtml(it.status || "");
          const dato = it.dato ? new Date(it.dato).toLocaleString("no-NO", { hour12:false }) : "";
          return `<li class="minvis-item">
            <header>
              <strong>${title}</strong>
              <span class="muted">${escapeHtml(dato)}</span>
            </header>
            <div style="margin-top:6px;">${msg}</div>
            <div class="muted" style="margin-top:6px;">
              ${status ? `Status: ${status}` : ""}${cat ? ` • Kategori: ${cat}` : ""}
            </div>
          </li>`;
        }).join("") + `</ul>`;
      }
    } catch {
      driftHtml = `<div class="minvis-item">Kunne ikke hente driftsmeldinger akkurat nå.</div>`;
    }

    const leaderBanner = me.isLeader
      ? `<div class="minvis-attn">★ Ansvarlig pilot (9)</div>`
      : "";

    const coworkersBlock = coworkers.length
      ? `<ul class="minvis-list">` + coworkers.map(c => {
          const leader = c.isLeader ? ` <span class="minvis-chip" style="border-color:#ef4444;background:#3a1210;color:#ffd3cf;"><strong>9</strong></span>` : "";
          return `<li class="minvis-item">
            <header>
              <strong>${escapeHtml(c.name)}${leader}</strong>
              <span class="muted">${escapeHtml(c.shiftText || "")}</span>
            </header>
            <div style="margin-top:6px;">
              <span class="minvis-chip"><strong>Status</strong> ${escapeHtml(c.statusText)}</span>
              ${c.typeText ? `<span class="minvis-chip"><strong>Type</strong> ${escapeHtml(c.typeText)}</span>` : ""}
            </div>
          </li>`;
        }).join("") + `</ul>`
      : `<div class="minvis-item">Ingen andre på samme enhet.</div>`;

    const folderLink = folderUrl
      ? `${folderUrl}-mappen">📁 Mappe ↗</a>`
      : `<span class="minvis-chip"><strong>Mappe</strong> –</span>`;

    content.innerHTML = `
      <div class="minvis-section">
        <div class="minvis-h">Min status</div>

        <div class="minvis-kv">
          <div class="k">Navn</div>
          <div class="v"><strong>${escapeHtml(me.name)}</strong></div>

          <div class="k">Enhet</div>
          <div class="v">${icao ? `<span class="minvis-chip"><strong>${escapeHtml(icao)}</strong></span>` : "–"}</div>

          <div class="k">Status</div>
          <div class="v">${escapeHtml(me.statusText)}</div>

          <div class="k">Type trening</div>
          <div class="v">${escapeHtml(me.typeText || "")}</div>

          <div class="k">Skift</div>
          <div class="v">${escapeHtml(me.shiftText || "")}</div>

          <div class="k">Mappe</div>
          <div class="v">${folderLink}</div>
        </div>

        ${leaderBanner}
      </div>

      <div class="minvis-section">
        <div class="minvis-h">Samarbeid (samme enhet)</div>
        ${coworkersBlock}
      </div>

      <div class="minvis-section">
        <div class="minvis-h">Driftsmeldinger (relevant for enheten)</div>
        ${driftHtml}
      </div>
    `;
  }

  // ---------- Keep in sync with table changes ----------
  function observeTable() {
    const tbody = $("#statusTabell tbody");
    if (!tbody) return;

    const obs = new MutationObserver(() => {
      // Oppdater bare hvis drawer er åpen (unngår unødvendig arbeid)
      if ($("#minVisningDrawer")?.classList.contains("open")) {
        render();
      } else {
        // Oppdater dropdown i bakgrunnen hvis valgt ikke finnes
        populatePeople();
      }
    });

    obs.observe(tbody, { childList: true, subtree: true });
  }

  // ---------- init ----------
  document.addEventListener("DOMContentLoaded", () => {
    ensureUi();
    observeTable();
    // Hvis bruker allerede har valgt "min visning", kan du auto-åpne (valgfritt)
    // open();
  });
})();