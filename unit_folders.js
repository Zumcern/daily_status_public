// unit_folders.js
// ------------------------------------------------------------
// Enhetsmapper (Teams / SharePoint)
// Denne fila er eneste sted der mapper og lenker vedlikeholdes.
// app.js bruker kun window.UnitFolders.renderUnitFolderCell(unit)
// ------------------------------------------------------------

(() => {
  "use strict";

  // 🔧 FYLL INN RIKTIGE LENKER HER
  // Bruk "Kopier lenke" fra Teams / SharePoint på mappen
  const UNIT_FOLDER_LINKS = {
    VA: "LIM_INN_LENKE_TIL_VA_MAPPE",
    BR: "LIM_INN_LENKE_TIL_BR_MAPPE",
    GM: "LIM_INN_LENKE_TIL_GM_MAPPE",
    ZV: "LIM_INN_LENKE_TIL_ZV_MAPPE",
    BO: "LIM_INN_LENKE_TIL_BO_MAPPE",
    TC: "LIM_INN_LENKE_TIL_TC_MAPPE",
    KR: "LIM_INN_LENKE_TIL_KR_MAPPE",
    OL: "LIM_INN_LENKE_TIL_OL_MAPPE",
    EV: "LIM_INN_LENKE_TIL_EV_MAPPE",
    DU: "LIM_INN_LENKE_TIL_DU_MAPPE",
    AT: "LIM_INN_LENKE_TIL_AT_MAPPE",
    TO: "LIM_INN_LENKE_TIL_TO_MAPPE",
    AN: "LIM_INN_LENKE_TIL_AN_MAPPE",
    HF: "LIM_INN_LENKE_TIL_HF_MAPPE",
    FL: "LIM_INN_LENKE_TIL_FL_MAPPE",
    BN: "https://avinor.sharepoint.com/sites/GRP_Simulator_FO_tarn/Shared%20Documents/Forms/AllItems.aspx?csf=1&web=1&e=p9cJ3p&CID=6190d279%2Dc073%2D41dd%2Db65f%2Df891b1b8673e&FolderCTID=0x0120001171102DBEDEE54CA3A16C16C10E6FD2&startedResponseCatch=true&id=%2Fsites%2FGRP%5FSimulator%5FFO%5Ftarn%2FShared%20Documents%2F1%2E%20Simulator%C3%B8velser%2FENBN",
    SB: "LIM_INN_LENKE_TIL_SB_MAPPE",
    SK: "LIM_INN_LENKE_TIL_SK_MAPPE",
    OV: "LIM_INN_LENKE_TIL_OV_MAPPE",
    HD: "LIM_INN_LENKE_TIL_HD_MAPPE",
    NA: "LIM_INN_LENKE_TIL_NA_MAPPE",
    RY: "LIM_INN_LENKE_TIL_RY_MAPPE",
    KB: "LIM_INN_LENKE_TIL_KB_MAPPE",
    RA: "LIM_INN_LENKE_TIL_RA_MAPPE",
    MØ: "LIM_INN_LENKE_TIL_RA_MAPPE",
    RA: "LIM_INN_LENKE_TIL_RA_MAPPE",
    HV: "LIM_INN_LENKE_TIL_HV_MAPPE"
  };

  function normalizeUnit(u) {
    return String(u || "").toUpperCase().trim();
  }

  function getUnitFolderUrl(unitCode) {
    const u = normalizeUnit(unitCode);
    return UNIT_FOLDER_LINKS[u] || "";
  }

  // Returnerer ferdig HTML til tabellcelle
  function renderUnitFolderCell(unitCode) {
    const u = normalizeUnit(unitCode);
    const url = getUnitFolderUrl(u);
    if (!url) return "";

    return `
  <a
    href="${url}"
    target="_blank"
    rel="noopener"
    class="unit-folder-link"
    title="Åpne ${u}-mappen i Teams"
  >
    <span class="icon">📁</span>
    <span>Åpne</span>
    <span class="arrow">↗</span>
  </a>
`;
  }

  // Eksporter minimalt API
  window.UnitFolders = {
    getUnitFolderUrl,
    renderUnitFolderCell
  };
})();