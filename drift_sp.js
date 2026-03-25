/* drift_sp.js
   Leser driftsmeldinger fra SharePoint via Power Automate proxy (POST),
   og renderer til eksisterende UI-elementer:
   - #driftListe (Aktive)
   - #driftHistorikkListe (Historikk)
   - .drift-tab faner (aktive/historikk/endringer) beholdes som de er
*/

(() => {
  // ========= KONFIG =========
  const DRIFT_PROXY_URL = "https://raw.githubusercontent.com/Zumcern/daily_status_public/main/driftsmeldinger_public.json";
      
    if (!DRIFT_PROXY_URL) {
      console.error("DRIFT_PROXY_URL mangler (config.local.js er ikke lastet)");
    }

  const AUTO_REFRESH_MS = 60 * 1000; // 1 min (kan endres)
  const STATUS_ACTIVE_VALUE = "Aktiv"; // SharePoint "Status" verdi for aktive

  // Hvis du vil mappe kategori til CSS-stripe:
  // drift.js/styles.css har allerede .drift-item.varsel og .drift-item.kritisk
  const CATEGORY_TO_CLASS = (kategori) => {
    const k = String(kategori || "").toLowerCase();
    if (k.includes("krit")) return "kritisk";
    if (k.includes("vars")) return "varsel";
    return "info";
  };

  // ========= HJELPERE =========
  const $ = (s) => document.querySelector(s);

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function fmtDateTime(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "-";
      return d.toLocaleString("no-NO");
    } catch {
      return "-";
    }
  }

  function setMeta(text) {
    // Gjenbruker meta-felt i UI hvis det finnes (du har #lastInfo i header).
    const el = document.getElementById("lastInfo");
    if (el) el.textContent = text;
  }

  function ensureStatusBanner(msg, isError = false) {
    // Legg en liten statuslinje i høyre panel om ønskelig
    let banner = document.getElementById("driftSpBanner");
    const right = document.querySelector(".right-panel");
    if (!right) return;

    if (!banner) {
      banner = document.createElement("div");
      banner.id = "driftSpBanner";
      banner.style.margin = "8px 0 12px 0";
      banner.style.padding = "8px 10px";
      banner.style.borderRadius = "6px";
      banner.style.fontSize = "13px";
      right.insertBefore(banner, right.firstChild?.nextSibling || right.firstChild);
    }

    banner.style.border = isError ? "1px solid #e74c3c" : "1px solid #304564";
    banner.style.background = isError ? "#3a1210" : "#0f2136";
    banner.style.color = isError ? "#ffd3cf" : "#eef2f6";
    banner.innerHTML = escapeHtml(msg);
  }

  // ========= HENT DATA =========
  async function fetchDriftItems() {
    const res = await fetch(DRIFT_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Proxy-feil: ${res.status} ${res.statusText} ${txt}`.slice(0, 500));
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      // Power Automate bør returnere array
      throw new Error("Uventet format fra proxy (forventer JSON-array).");
    }

    return data;
  }

  // ========= RENDER =========
  function makeLi(item, isHist) {
    const title = item.Title ?? item.title ?? "(uten tittel)";
    const text = item.Melding ?? item.melding ?? "";
    const status = item.Status ?? item.status ?? "";
    const kategori = item.Kategori ?? item.kategori ?? "";
    const dato = item.Dato ?? item.dato ?? item.Created ?? item.Modified ?? "";

    const cssClass = CATEGORY_TO_CLASS(kategori);
    const li = document.createElement("li");
    li.className = `drift-item ${cssClass}` + (isHist ? " hist" : "");

    li.innerHTML = `
      <header>
        <strong>${escapeHtml(title)}</strong>
        <span style="display:inline-flex; gap:8px; align-items:center;">
          <time class="muted-time">${escapeHtml(fmtDateTime(dato))}</time>
        </span>
      </header>
      <div style="margin-top:6px;">${escapeHtml(text)}</div>
      <div class="muted" style="margin-top:6px; font-size:12px; color:#9ab;">
        ${status ? `Status: ${escapeHtml(status)}` : ""}
        ${kategori ? ` • Kategori: ${escapeHtml(kategori)}` : ""}
        ${typeof item.ID !== "undefined" ? ` • ID: ${escapeHtml(item.ID)}` : ""}
      </div>
    `;
    return li;
  }

  function render(items) {
    const ulAktive = document.getElementById("driftListe");
    const ulHist = document.getElementById("driftHistorikkListe");

    if (!ulAktive || !ulHist) {
      console.warn("[drift_sp] Fant ikke #driftListe eller #driftHistorikkListe i DOM.");
      return;
    }

    ulAktive.innerHTML = "";
    ulHist.innerHTML = "";

    // Del i aktive/historikk
    const aktive = [];
    const historikk = [];

    for (const it of items) {
      const st = String(it.Status ?? it.status ?? "").trim();
      if (st.toLowerCase() === STATUS_ACTIVE_VALUE.toLowerCase()) aktive.push(it);
      else historikk.push(it);
    }

    // Sorter nyeste først basert på Id eller Modified/Created
    aktive.sort((a, b) => (b.ID ?? b.Id ?? 0) - (a.ID ?? a.Id ?? 0));
    historikk.sort((a, b) => (b.ID ?? b.Id ?? 0) - (a.ID ?? a.Id ?? 0));

    aktive.forEach((it) => ulAktive.appendChild(makeLi(it, false)));
    historikk.forEach((it) => ulHist.appendChild(makeLi(it, true)));

    // Oppdater en liten teller/info
    ensureStatusBanner(
      `SharePoint drift: ${aktive.length} aktive, ${historikk.length} i historikk.`
    );
  }

  // ========= LOOP / INIT =========
  let timer = null;

  async function refreshNow() {
    try {
      const items = await fetchDriftItems();
      render(items);

      const now = new Date();
      setMeta(`Drift oppdatert: ${now.toLocaleTimeString("no-NO", { hour12: false })}`);
      ensureStatusBanner("Driftsmeldinger lastet fra SharePoint (via Power Automate).");
    } catch (err) {
      console.warn("[drift_sp] Feil ved lasting:", err);
      ensureStatusBanner(
        `Kunne ikke hente driftsmeldinger (via proxy). ${err.message || err}`,
        true
      );
    }
  }


  function startAutoRefresh() {
    if (timer) clearInterval(timer);
    timer = setInterval(refreshNow, AUTO_REFRESH_MS);
  }

  // Scriptet lastes med `defer`, så DOM er allerede klar her.
  // Kjør init direkte (ikke vent på DOMContentLoaded).
  refreshNow();
  startAutoRefresh();

})();
