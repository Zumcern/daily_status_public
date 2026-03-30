// resources.js
// ------------------------------------------------------------
// Ressurser-meny (slide-in drawer) – Desktop + Mobil/Tablet
// - Knapp "📚 Ressurser" legges automatisk inn i .load-controls
// - "Simulatorøvelser (i bruk)" viser kun enheter i bruk for valgt dato
// - Når du søker: inkluderer også "alle enheter" (selv om de ikke er i bruk i dag)
// - Søket støtter ENVA/ENBR/... uten at vi viser "EN" i label
// ------------------------------------------------------------
(() => {
  "use strict";

  // =========================
  // ROOT mappe (alltid synlig i simulator-gruppen)
  // =========================
  const SIM_ROOT_FOLDER = {
    label: "Simulatorøvelser – alle enheter",
    url: "https://avinor.sharepoint.com/sites/GRP_Simulator_FO_tarn/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FGRP%5FSimulator%5FFO%5Ftarn%2FShared%20Documents%2F1%2E%20Simulator%C3%B8velser&viewid=a02b5163%2Dd4a3%2D4d76%2D8d8a%2Dd0e704c82461&csf=1&CID=98f57b4c%2Dbdbb%2D49f6%2D9319%2D41cf00b06ab0&FolderCTID=0x0120001171102DBEDEE54CA3A16C16C10E6FD2",
    icon: "🗂️",
    external: true,
    desc: "Åpne mappen til alle enheter"
  };

  // =========================
  // Enhets-labels (penere navn i drawer)
  // =========================
  const UNIT_LABEL_MAP = {
    BR: "Bergen",
    ZV: "Sola",
    VA: "Værnes",
    GM: "Oslo/Gardermoen",
    BO: "Bodø",
    TC: "Tromsø",
    KR: "Kirkenes",
    OL: "Ørland",
    EV: "Evenes",
    DU: "Bardufoss",
    AT: "Alta",
    TO: "Sandefjord/Torp",
    AN: "Andøya",
    HF: "Hammerfest",
    FL: "Florø",
    BN: "Brønnøysund",
    SB: "Svalbard/Longyearbyen",
    SK: "Stokmarknes/Skagen",
    OV: "Ørsta–Volda/Hovden",
    HD: "Haugesund/Karmøy",
    NA: "Lakselv/Banak",
    RY: "Rygge",
    KB: "Kristiansund/Kvernberget",
    RA: "Røros/ENRA",
    HV: "Honningsvåg/Valan",
    MØ: "Møre Approach",
    ENMØ: "Møre Approach"
  };

  // ---------- Normaliser unit-kode (fjerner EN-prefix hvis det er gitt) ----------
  function normalizeUnitCode(code) {
    let u = String(code ?? "").toUpperCase().trim().replace(/\s+/g, "");
    if (u.startsWith("EN") && u.length > 2) {
      const rest = u.slice(2);
      // typisk EN + (2-3 tegn), inkl. MØ
      if (rest.length <= 3) u = rest;
    }
    return u;
  }

  function prettyUnitLabel(unitCode) {
    const u = normalizeUnitCode(unitCode);
    const name = UNIT_LABEL_MAP[u] || UNIT_LABEL_MAP[unitCode] || null;
    return name ? `${name} (${u})` : `${u}`;
  }

  // =========================
  // DINE STATISKE RESSURSER (fra din fil)
  // =========================
  const STATIC_RESOURCES = [
    {
      title: "Daglig drift",
      items: [
        {
          label: "Driftsmeldinger (SharePoint)",
          url: "https://avinor.sharepoint.com/sites/GRP_Simulatordrift_avd.Vaernes/Lists/Driftsmeldinger",
          icon: "📣",
          external: true,
          desc: "Åpne og rediger driftsmeldinger"
        }
      ]
    },
    {
      title: "Arbeidsplan & dokumenter",
      items: [
        {
          label: "Arbeidsplan (Excel)",
          url: "https://avinor.sharepoint.com/:x:/r/sites/GRP_Simulatordrift_avd.Vaernes/_layouts/15/Doc2.aspx?action=edit&sourcedoc=%7B80b89553-5aad-4242-8228-ccb90d79f9a5%7D&wdOrigin=TEAMS-WEB.teamsSdk_ns.rwc&wdExp=TEAMS-TREATMENT&wdhostclicktime=1765971883079&web=1",
          icon: "📊",
          external: true,
          desc: "Åpne arbeidsplan"
        },
        {
          label: "Loggføring av øvelser",
          url: "https://avinor.sharepoint.com/:x:/r/sites/GRP_Simulatordrift_avd.Vaernes/Delte%20dokumenter/General/Loggf%C3%B8ring%20simulator%C3%B8velser/Loggf%C3%B8ring%20av%20simulator%C3%B8velser%202026.xlsx?d=w16f089533da646c0b1a9c33607740ee2&csf=1&web=1&e=U76JLw",
          icon: "📊",
          external: true,
          desc: "Åpne loggføring av øvelser"
        },
        {
          label: "Bekreftet booking",
          url: "https://avinor.sharepoint.com/sites/GRP_Simulator_FO_tarn/Shared%20Documents/Forms/AllItems.aspx?FolderCTID=0x0120001171102DBEDEE54CA3A16C16C10E6FD2&id=%2Fsites%2FGRP%5FSimulator%5FFO%5Ftarn%2FShared%20Documents%2F2%2E%20Bookinger",
          icon: "📁",
          external: true,
          desc: "Åpne mappe til bekreftet booking"
        },
        {
          label: "Loggføring programmering",
          url: "https://avinor.sharepoint.com/:x:/r/sites/GRP_Simulatordrift_avd.Vaernes/Delte%20dokumenter/Programmering/Programmering/Loggf%C3%B8ring%20programmering%202026.xlsx?d=w2795975c36c44162baafcd386929e0b0&csf=1&web=1&e=4vpi2L",
          icon: "📊",
          external: true,
          desc: "Åpne loggføring av programmering"
        }
      ]
    },
    {
      title: "Eksterne",
      items: [
        {
          label: "AIP",
          url: "https://aim-prod.avinor.no/no/AIP/View/Index/152/history-no-NO.html",
          icon: "🌐",
          external: true,
          desc: "Åpne AIP (Aeronautical Information Publication)"
        }
      ]
    }
  ];

  // ---------- DOM helpers ----------
  const $ = (s, root = document) => root.querySelector(s);

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== "") node.setAttribute(k, v);
    });
    for (const c of children) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return node;
  }

  // ✅ HTML-safe escape
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ------------------------------------------------------------
  // Søkenormalisering:
  // - ENVA -> VA (og begge blir søkeord)
  // - VA -> ENVA (og begge blir søkeord)
  // - fjerner mellomrom (EN VA -> ENVA)
  // ------------------------------------------------------------
  function normalizeSearchQueries(raw) {
    const base = String(raw ?? "").trim().toLowerCase();
    if (!base) return [];

    const compact = base.replace(/\s+/g, ""); // "en va" -> "enva"
    const queries = new Set([base, compact]);

    // Hvis starter med "en", legg til variant uten "en"
    if (compact.startsWith("en") && compact.length >= 4) {
      queries.add(compact.slice(2)); // enva -> va
    }

    // Hvis brukeren søker på 2-3 tegn (va/br/gm/mø), legg til en-variant
    // (gjør at "va" også matcher url'er/aliases som inneholder "enva")
    if (!compact.startsWith("en") && compact.length >= 2 && compact.length <= 3) {
      queries.add("en" + compact); // va -> enva
    }

    return Array.from(queries).filter(Boolean);
  }

  // ---------- Avhengigheter ----------
  function getCurrentISO() {
    return (window.StatusApp && window.StatusApp.getCurrentDateISO && window.StatusApp.getCurrentDateISO()) || null;
  }

  function getUnitsInUseForISO(iso) {
    return (
      (iso &&
        window.StatusApp &&
        window.StatusApp.getUnitsInUseForDate &&
        window.StatusApp.getUnitsInUseForDate(iso)) ||
      []
    );
  }

  function getUrlForUnit(unitCode) {
    const u = normalizeUnitCode(unitCode);
    return (
      (window.UnitFolders && window.UnitFolders.getUnitFolderUrl && window.UnitFolders.getUnitFolderUrl(u)) ||
      ""
    );
  }

  // ------------------------------------------------------------
  // Katalog over alle enheter som HAR URL (brukes kun ved søk)
  // Vi bruker UNIT_LABEL_MAP som kodeliste, filtrerer på de som faktisk har URL
  // ------------------------------------------------------------
  function buildAllUnitCatalog() {
    const keys = Object.keys(UNIT_LABEL_MAP)
      .map((k) => String(k).toUpperCase().trim())
      .filter((k) => !k.startsWith("EN")); // kun kortkoder her

    const unique = Array.from(new Set(keys));

    const all = [];
    for (const code of unique) {
      const u = normalizeUnitCode(code);
      const url = getUrlForUnit(u);
      if (url) {
        all.push({
          unit: u,
          label: prettyUnitLabel(u), // f.eks "Værnes (VA)"
          url
        });
      }
    }

    all.sort((a, b) => a.label.localeCompare(b.label, "no"));
    return all;
  }

  // ------------------------------------------------------------
  // Matching-funksjon: søk i label/desc/url + aliases
  // - For enhetsmapper legger vi til "en" + unit som søkbart (uten å vise det)
  // ------------------------------------------------------------
  function matchesQueries(item, qList) {
    if (!qList.length) return true;

    const unit = item.unit ? String(item.unit).toLowerCase() : "";
    const unitAlias = unit ? `en${unit}` : "";

    const hay = `${item.label ?? ""} ${item.desc ?? ""} ${item.url ?? ""} ${unit} ${unitAlias}`.toLowerCase();
    return qList.some((q) => hay.includes(q));
  }

  // ------------------------------------------------------------
  // Simulator-gruppe:
  // - uten søk: root + dagens enheter
  // - med søk: root + treff i dagens enheter + "Andre enheter" + treff i katalogen
  // ------------------------------------------------------------
  function buildSimFoldersGroup(qList) {
    const iso = getCurrentISO();
    const unitsInUse = getUnitsInUseForISO(iso).map(normalizeUnitCode);

    const items = [];
    items.push({ ...SIM_ROOT_FOLDER });

    // Bygg dagens enheter
    const todayItems = [];
    for (const u0 of unitsInUse) {
      const u = normalizeUnitCode(u0);
      const url = getUrlForUnit(u);
      if (url) {
        todayItems.push({
          unit: u,
          label: prettyUnitLabel(u),
          url,
          icon: "📁",
          external: true,
          desc: "Enhet i bruk i dag"
        });
      }
    }

    // Ingen søk -> vis root + alle dagens enheter
    if (!qList.length) {
      items.push(...todayItems);

      if (items.length === 1) {
        items.push({
          label: "Ingen enhetsmapper funnet for valgt dato",
          url: "#",
          icon: "ℹ️",
          external: false,
          desc:
            "Tips: Sjekk at dagens aktiviteter inneholder enhetskode (f.eks. 'SF VA 2') og at unit_folders.js har lenke for enheten."
        });
      }

      return {
        title: iso ? `Simulatorøvelser (i bruk – ${iso})` : "Simulatorøvelser (i bruk)",
        items
      };
    }

    // Med søk -> filtrer dagens enheter + legg til treff fra alle enheter
    items.push(...todayItems.filter((it) => matchesQueries(it, qList)));

    const inUseSet = new Set(unitsInUse.map((u) => normalizeUnitCode(u)));
    const catalog = buildAllUnitCatalog();

    const extraMatches = catalog
      .filter((x) => !inUseSet.has(x.unit))
      .map((x) => ({
        unit: x.unit,
        label: x.label,
        url: x.url,
        icon: "📁",
        external: true,
        desc: "Enhet (ikke i bruk i dag)"
      }))
      .filter((it) => matchesQueries(it, qList));

    if (extraMatches.length) {
      items.push({
        label: "— Andre enheter —",
        url: "#",
        icon: "🔎",
        external: false,
        desc: "Treff utenfor dagens plan"
      });
      items.push(...extraMatches);
    }

    return {
      title: iso ? `Simulatorøvelser (søk – ${iso})` : "Simulatorøvelser (søk)",
      items
    };
  }

  // ---------- UI build ----------
  function buildResourcesUI() {
    const controls = $(".load-controls");
    if (controls && !$("#resourcesToggle")) {
      const btn = el(
        "button",
        { id: "resourcesToggle", class: "resources-toggle primary", title: "Åpne ressurser" },
        ["📚 Ressurser"]
      );
      controls.appendChild(btn);
      btn.addEventListener("click", openDrawer);
    }

    if (!$("#resourcesOverlay")) {
      document.body.appendChild(el("div", { id: "resourcesOverlay", class: "resources-overlay", "aria-hidden": "true" }));
    }

    if (!$("#resourcesDrawer")) {
      const drawer = el("aside", {
        id: "resourcesDrawer",
        class: "resources-drawer",
        "aria-hidden": "true",
        role: "dialog",
        "aria-label": "Ressurser"
      });

      const header = el("div", { class: "resources-header" }, [
        el("div", { class: "resources-title" }, ["Ressurser"]),
        el("button", { id: "resourcesClose", class: "resources-close", title: "Lukk (Esc)" }, ["×"])
      ]);

      const search = el("div", { class: "resources-search" }, [
        el("input", {
          id: "resourcesSearch",
          type: "search",
          placeholder: "Søk i ressurser … (f.eks. VA / ENVA / Bergen / ENBR)",
          autocomplete: "off"
        })
      ]);

      const content = el("div", { class: "resources-content" });

      drawer.appendChild(header);
      drawer.appendChild(search);
      drawer.appendChild(content);
      document.body.appendChild(drawer);

      $("#resourcesClose").addEventListener("click", closeDrawer);
      $("#resourcesOverlay").addEventListener("click", closeDrawer);

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && drawer.classList.contains("open")) closeDrawer();
      });

      $("#resourcesSearch").addEventListener("input", renderResources);
    }

    renderResources();

    // Oppdater ved render i app.js (hvis du har status:rendered-hook)
    document.addEventListener("status:rendered", () => renderResources());
  }

  function renderResources() {
    const content = $("#resourcesDrawer .resources-content");
    if (!content) return;

    const rawQ = ($("#resourcesSearch")?.value ?? "");
    const qList = normalizeSearchQueries(rawQ);

    content.innerHTML = "";

    // Dynamisk simulatorgruppe først + statiske
    const RESOURCES = [buildSimFoldersGroup(qList), ...STATIC_RESOURCES];

    // Filtrer alle grupper med samme søk (qList)
    const groups = RESOURCES.map((g) => ({
      title: g.title,
      items: (g.items ?? []).filter((it) => {
        // Bruk samme matcher for alle items (den inkluderer url/label/desc)
        return matchesQueries(it, qList);
      })
    })).filter((g) => g.items.length > 0);

    if (!groups.length) {
      content.appendChild(el("div", { class: "resources-empty" }, ["Ingen treff."]));
      return;
    }

    for (const group of groups) {
      const section = el("section", { class: "resources-group" });
      section.appendChild(el("div", { class: "resources-group-title" }, [group.title]));

      const list = el("div", { class: "resources-list" });

      for (const it of group.items) {
        const isDisabled = !it.url || it.url === "#";

        const a = el("a", {
          class: "resource-item" + (isDisabled ? " is-disabled" : ""),
          href: it.url || "#",
          target: it.external ? "_blank" : "_self",
          rel: it.external ? "noopener" : "",
          title: isDisabled ? "Ikke klikkbar" : it.external ? "Åpne i ny fane" : "Åpne"
        });

        if (isDisabled) a.addEventListener("click", (e) => e.preventDefault());

        const left = el("div", { class: "resource-left" }, [
          el("span", { class: "resource-icon", "aria-hidden": "true" }, [it.icon ?? "🔗"]),
          el("div", { class: "resource-text" }, [
            el("div", { class: "resource-label", html: escapeHtml(it.label ?? "") }),
            it.desc ? el("div", { class: "resource-desc", html: escapeHtml(it.desc) }) : el("div")
          ])
        ]);

        const right = el("div", { class: "resource-right" }, [
          el("span", { class: "resource-arrow", "aria-hidden": "true" }, [it.external ? "↗" : "→"])
        ]);

        a.appendChild(left);
        a.appendChild(right);
        list.appendChild(a);
      }

      section.appendChild(list);
      content.appendChild(section);
    }
  }

  function openDrawer() {
    const drawer = $("#resourcesDrawer");
    const overlay = $("#resourcesOverlay");
    if (!drawer || !overlay) return;

    drawer.classList.add("open");
    overlay.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");

    setTimeout(() => $("#resourcesSearch")?.focus(), 0);
  }

  function closeDrawer() {
    const drawer = $("#resourcesDrawer");
    const overlay = $("#resourcesOverlay");
    if (!drawer || !overlay) return;

    drawer.classList.remove("open");
    overlay.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-hidden", "true");
  }

  document.addEventListener("DOMContentLoaded", buildResourcesUI);
  window.ResourcesMenu = { open: openDrawer, close: closeDrawer };
})();
