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
    VA: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENVA?csf=1&web=1&e=bAt1aCE",
    BR: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENBR?csf=1&web=1&e=3DcrzcE",
    GM: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENGM?csf=1&web=1&e=ZvXQqxE",
    ZV: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENZV?csf=1&web=1&e=ZvXQqxE",
    BO: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENBO?csf=1&web=1&e=ZvXQqxE",
    TC: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENTC?csf=1&web=1&e=ZvXQqxE",
    KR: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENKR?csf=1&web=1&e=ZvXQqxE",
    OL: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENOL?csf=1&web=1&e=RySdsE",
    EV: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENEV?csf=1&web=1&e=ZvXQqxE",
    DU: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENDU?csf=1&web=1&e=ZvXQqxE",
    AT: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENAT?csf=1&web=1&e=ZvXQqxE",
    TO: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENTO?csf=1&web=1&e=ZvXQqxE",
    AN: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENAN?csf=1&web=1&e=ZvXQqxE",
    HF: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENHF?csf=1&web=1&e=ZvXQqxE",
    FL: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENFL?csf=1&web=1&e=ZvXQqxE",
    BN: "https://avinor.sharepoint.com/sites/GRP_Simulator_FO_tarn/Shared%20Documents/Forms/AllItems.aspx?csf=1&web=1&e=p9cJ3p&CID=6190d279%2Dc073%2D41dd%2Db65f%2Df891b1b8673e&FolderCTID=0x0120001171102DBEDEE54CA3A16C16C10E6FD2&startedResponseCatch=true&id=%2Fsites%2FGRP%5FSimulator%5FFO%5Ftarn%2FShared%20Documents%2F1%2E%20Simulator%C3%B8velser%2FENBN",
    SB: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENSB?csf=1&web=1&e=ZvXQqxE",
    SK: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENSK?csf=1&web=1&e=ZvXQqxE",
    OV: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENOV?csf=1&web=1&e=ZvXQqxE",
    HD: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENHD?csf=1&web=1&e=ZvXQqxE",
    NA: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENNA?csf=1&web=1&e=ZvXQqxE",
    RY: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENRY?csf=1&web=1&e=ZvXQqxE",
    KB: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENKB?csf=1&web=1&e=u1gWg4",
    RA: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENRA?csf=1&web=1&e=ZvXQqxE",
    MØ: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENM%C3%98?csf=1&web=1&e=izgr1V",
    RA: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENRA?csf=1&web=1&e=ZvXQqxE",
    HV: "https://avinor.sharepoint.com/:f:/r/sites/GRP_Simulator_FO_tarn/Shared%20Documents/1.%20Simulator%C3%B8velser/ENHV?csf=1&web=1&e=ZvXQqxE"
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