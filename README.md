# daily_status_public
Dagens status – Simulatoroperatører
Dette repoet inneholder en helautomatisk løsning for å vise daglig status for simulatoroperatører. Løsningen henter arbeidsplan fra SharePoint, prosesserer den til JSON via GitHub Actions, og presenterer dataene i en statisk web‑app (GitHub Pages) med både soft refresh og hard refresh‑strategi.


🎯 Mål

Én sannhetskilde for arbeidsplan (SharePoint)
Ingen manuelle deploy‑steg
Robust drift (tåler manglende input / ingen endringer)
År‑agnostisk (fungerer også ved årsskifte)
Enterprise‑vennlig (ingen admin‑krav, ingen hemmeligheter i kode)


🧩 Arkitektur – oversikt
SharePoint (Excel)
        ↓
Power Automate (Recurrence)
        ↓
GitHub repo (input/Arbeidsplan simulatoroperatører.xlsx)
        ↓
GitHub Actions (cron, parser.py)
        ↓
data/generated/*.json
        ↓
GitHub Pages (HTML/JS)




📁 Repo‑struktur
/
├─ index.html              # Frontend (GitHub Pages)
├─ app.js                  # Hovedlogikk (statusvisning, refresh, change‑log)
├─ drift.js                # Lokal håndtering av driftsmeldinger
├─ drift_sp.js             # Public driftsmeldinger (hentet via raw GitHub JSON)
├─ styles.css              # Styling
├─ parser.py               # Excel → JSON‑parser
├─ input/
│  └─ .gitkeep             # Holder mappen (Excel leveres eksternt)
├─ data/
│  └─ generated/           # ✅ All generert JSON (CI‑output)
├─ .github/
│  └─ workflows/
│     └─ update-data.yml   # GitHub Actions workflow
└─ README.md               # Denne filen




📊 Dataflyt (detaljert)
1) SharePoint → Power Automate

Excel‑filen ligger i SharePoint (kan ha årstall i navnet der)
Power Automate kjører tilbakevendende (Recurrence)
Flyten:

Hent filinnhold (SharePoint)
HTTP GET mot GitHub Contents API (hent sha hvis filen finnes)
HTTP PUT mot GitHub Contents API (opprett/oppdater fil)

Filen skrives alltid som:
input/Arbeidsplan simulatoroperatører.xlsx



Ingen commit hvis innholdet er identisk
2) GitHub Actions (CI)

Workflow kjører på:Manuell trigger (workflow_dispatch)
schedule (cron i UTC, justert til norsk tid GMT+1)
Flyt:Sjekk om Excel finnes (hopper pent over hvis ikke)
Kjør parser.py --excel input/Arbeidsplan simulatoroperatører.xlsx
Parser skriver JSON til:
data/generated/
  ├─ arbeidsplan_<ÅR>_flat.json
  └─ arbeidsplan_<ÅR>_per_dato.json



Commit kun hvis JSON faktisk er endret
3) GitHub Pages (frontend)

Leser JSON direkte fra repo:
data/generated/arbeidsplan_<ÅR>_per_dato.json



Cache‑busting brukes (?_=)
Appen fungerer helt statisk (ingen backend)


⏱️ Tidsstyring (cron og refresh)
GitHub Actions – cron (GMT+1 → UTC)

GitHub Actions cron kjører alltid i UTC.


Ønsket oppførsel (norsk tid, GMT+1):

Hvert 5. min mellom 07:30–08:15
Ellers én gang i timen 09:00–17:00
Ikke etter kl. 18:00
Faktisk cron (UTC):
schedule:
  # 07:30–07:55 norsk tid
  - cron: "30-59/5 6 * * *"

  # 08:00–08:15 norsk tid
  - cron: "0-15/5 7 * * *"

  # 09:00–17:00 norsk tid
  - cron: "0 8-16 * * *"



⚠️ Merk: Sommertid (GMT+2) håndteres ikke automatisk. Cron justeres manuelt ved behov.




🔄 Refresh‑strategi i frontend
Soft refresh (data‑oppdatering)

Hvert 5. min
Kun ny JSON lastes
Beholder valgt dato, filter, sortering
const AUTO_REFRESH_MS = 5 * 60 * 1000;


Hard refresh ("F5") etter midnatt

Én gang rett etter midnatt lokal tid
Sikrer at ny dato velges automatisk
function scheduleMidnightHardReload() {
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5
  );
  setTimeout(() => window.location.reload(),
    Math.max(1000, nextMidnight - now)
  );
}
scheduleMidnightHardReload();




🧠 År‑agnostisk design

Excel i SharePoint kan byttes (2026 → 2027)
Power Automate justeres til ny SharePoint‑fil
Repo, parser, workflow og app endres ikke
Appen bruker automatisk:
const DEFAULT_YEAR = new Date().getFullYear();




🛡️ Robusthet / hardening

✅ Tåler manglende Excel (ingen røde CI‑feil)
✅ Ingen commit ved identisk innhold
✅ git add feiler ikke hvis output mangler
✅ Ingen hemmeligheter i repo (PAT kan lagres sikkert i PA)
✅ All generert data samlet i data/generated/


🧪 Testing / verifikasjon

Endre én celle i Excel i SharePoint
Vent på Power Automate (eller kjør manuelt)
Se ny commit i repo (input/Arbeidsplan simulatoroperatører.xlsx)
Vent på GitHub Actions cron (eller kjør manuelt)
Se ny JSON‑commit i data/generated/
Last GitHub Pages – data oppdatert


📌 Drift / videre forbedringer (valgfritt)

Teams‑varsling ved CI‑feil
Runbook ("hva gjør jeg hvis …")
Manuell sommer/vinter‑cron‑justering
Fallback til siste kjente JSON hvis dagens mangler


✅ Status
Løsningen er produksjonsklar.

Full automasjon
Forutsigbar drift
Lett å vedlikeholde
Klar for årsskifte


Ved spørsmål: se p, s r.py, .github/workflows/update-data.yml og Power Automate‑flyten for detaljer.
