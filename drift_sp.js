// drift_sp.js
// Public-versjon: henter driftsmeldinger fra GitHub raw JSON (ingen proxy, ingen secrets)
// Kilde: driftsmeldinger_public.json oppdatert av Power Automate

(() => {
  "use strict";

  // ================== KONFIG ==================
  const DRIFT_PUBLIC_URL =
    "https://raw.githubusercontent.com/Zumcern/daily_status_public/main/driftsmeldinger_public.json";

  const AUTO_REFRESH_MS = 60 * 1000; // 1 min

  // ================== HJELPERE ==================
  const $ = (sel) => document.querySelector(sel);

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleString("no-NO", { hour12: false });
    } catch {
      return "";
    }
  }

  function setMeta(text) {
    const el = document.getElementById("lastInfo");
    if (el) el.textContent = text;
  }

  function showBanner(msg, isError = false) {
    let banner = document.getElementById("driftPublicBanner");
    const host = document.querySelector(".right-panel");
    if (!host) return;

    if (!banner) {
      banner = document.createElement("div");
      banner.id = "driftPublicBanner";
      banner.style.margin = "8px 0 12px";
      banner.style.padding = "8px 10px";
      banner.style.borderRadius = "6px";
      banner.style.fontSize = "13px";
      host.insertBefore(banner, host.firstChild);
    }

    banner.style.border = isError ? "1px solid #e74c3c" : "1px solid #304564";
    banner.style.background = isError ? "#3a1210" : "#0f2136";
    banner.style.color = isError ? "#ffd3cf" : "#eef2f6";
    banner.textContent = msg;
  }

  // ================== DATA ==================
  async function hentDriftsmeldingerPublic() {
    const res = await fetch(DRIFT_PUBLIC_URL + "?_=" + Date.now(), {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Kunne ikke hente public drift (${res.status})`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("Uventet format (forventer array)");
    }
    return data;
  }

  // ================== RENDER ==================
  function makeLi(item) {
    const li = document.createElement("li");
    li.className = "drift-item";

    const title = escapeHtml(item.title ?? "");
    const msg = escapeHtml(item.melding ?? "");
    const cat = escapeHtml(item.kategori ?? "");
    const status = escapeHtml(item.status ?? "");
    const dato = fmtDate(item.dato);

    li.innerHTML = `
      <header style="display:flex;justify-content:space-between;gap:8px;">
        <strong>${title}</strong>
        <span class="muted-time">${dato}</span>
      </header>
      <div style="margin-top:6px;">${msg}</div>
      <div style="margin-top:6px;font-size:12px;color:#9ab;">
        ${status ? `Status: ${status}` : ""}
        ${cat ? ` • Kategori: ${cat}` : ""}
      </div>
    `;

    return li;
  }

  function render(items) {
    const ul = document.getElementById("driftListe");
    if (!ul) return;

    ul.innerHTML = "";

    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "Ingen aktive driftsmeldinger.";
      ul.appendChild(li);
      return;
    }

    items.forEach((it) => ul.appendChild(makeLi(it)));
  }

  // ================== LOOP ==================
  let timer = null;

  async function refreshNow() {
    try {
      const items = await hentDriftsmeldingerPublic();
      render(items);

      const now = new Date();
      setMeta(`Drift oppdatert: ${now.toLocaleTimeString("no-NO", { hour12: false })}`);
      showBanner(`Public driftsfeed lastet (${items.length} aktive).`);
    } catch (err) {
      console.warn("[drift_sp]", err);
      showBanner("Kunne ikke hente public driftsmeldinger.", true);
    }
  }

  function startAutoRefresh() {
    if (timer) clearInterval(timer);
    timer = setInterval(refreshNow, AUTO_REFRESH_MS);
  }

  // Scriptet lastes med defer – DOM er klar
  refreshNow();
  startAutoRefresh();

})();