#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Portable parser for 'Arbeidsplan simulatoroperatører 2026.xlsx' (blokk-basert)

Viktige endringer:
- Oppdager uke-hoder (rader med datoer).
- For hver blokk velges ÉN felles offset mellom dato-kolonner og aktivitetskolonner
  ved å summere score på tvers av alle dato-kolonner i blokken. Dette hindrer at
  enkelte dager havner forskjøvet (f.eks. 2026-04-07 -> 2026-04-08).
- Kolonne 0 (navn) brukes aldri som aktivitetskolonne.
- Filtrerer bort «aktivitet == person» og celler som er datoer.
- Dedupliserer (dato, person).

Portable:
- Ingen admin nødvendig. Legg tredjepart i ./vendor (pandas, numpy, openpyxl).
- Parseren legger KUN vendor-roten på sys.path for å unngå stdlib-skygge.

Utdata:
  - arbeidsplan_YYYY_flat.json
  - arbeidsplan_YYYY_per_dato.json
"""

from __future__ import annotations

import sys
from pathlib import Path

# ---------------- Portable path patching: legg KUN vendor-roten på sys.path ---
HERE = Path(__file__).resolve().parent
VENDOR = HERE / "vendor"
if VENDOR.exists():
    sys.path.insert(0, str(VENDOR))

# Etter patching kan vi importere tredjepartsbibliotekene
import argparse
import json
import re
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import pandas as pd
from pandas import Timestamp


# ---------------- Konfig ------------------------------------------------------
NAMES_DEFAULT = [
    "Trine", "Stein", "Håkon", "Odd Rune", "Magnus",
    "Jon Håvard", "Patrick", "Marjolein", "Bjørnar", "Rune",
    "Connor", "Ole", "Beate", "Kosti", "Gudmund"
]

# Offset-kandidater: (dato_col - aktivitet_col)
# POSITIV betyr at dato ligger til høyre for aktivitet (vanligst i filen).
OFFSET_CANDIDATES = [1, 2, 3, 4, 5, 0, -1]


# ---------------- CLI ---------------------------------------------------------
def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Parse arbeidsplan-Excel til JSON (blokk-basert).")
    # Bruk denne for lokal testing med Excel i samme katalog som parser.py
    """ap.add_argument("--excel", "-e", default="Arbeidsplan simulatoroperatører 2026.xlsx",
                    help="Filnavn på Excel (standard: %(default)s)")"""
    # bruk denne for å hente excel fil fra OneDrive, da den kan være i en mappe som ikke er i samme katalog som parser.py
    ap.add_argument("--excel", "-e",
        default=r"C:\Users\vamsu\OneDrive - Avinor\Documents\Daily_status\Arbeidsplan simulatoroperatører 2026.xlsx",
        help="Filnavn på Excel (standard: %(default)s)")

    ap.add_argument("--year", "-y", type=int, default=2026,
                    help="Filtrer til dette året (standard: %(default)s)")
    ap.add_argument("--exclude", default="",
                    help="Kommaseparert liste over aktiviteter som skal filtreres bort (f.eks. 'A,Ferie,Fri')")
    ap.add_argument("--names", default=",".join(NAMES_DEFAULT),
                    help="Kommaseparert liste over navn (standard er preutfylt).")
    ap.add_argument("--debug", action="store_true", help="Skriv ekstra info per ark/blokk/offset.")
    return ap.parse_args()


# ---------------- Hjelpere ----------------------------------------------------
def parse_date_cell(val) -> Optional[datetime.date]:
    """Tolerant tolkning av datoceller (Excel-dato, ISO, US, NO)."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, (datetime, Timestamp)):
        try:
            return val.date()
        except Exception:
            return None

    s = str(val).strip()
    if not s:
        return None

    # ISO: YYYY-MM-DD
    m_iso = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", s)
    if m_iso:
        y, mm, dd = map(int, m_iso.groups())
        try:
            return datetime(y, mm, dd).date()
        except ValueError:
            return None

    # US: MM/DD/YYYY
    m_us = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", s)
    if m_us:
        mm, dd, y = map(int, m_us.groups())
        try:
            return datetime(y, mm, dd).date()
        except ValueError:
            return None

    # NO: DD.MM.YYYY
    m_no = re.match(r"^(\d{1,2})\.(\d{1,2})\.(\d{4})$", s)
    if m_no:
        dd, mm, y = map(int, m_no.groups())
        try:
            return datetime(y, mm, dd).date()
        except ValueError:
            return None

    return None


def detect_name_rows(df: pd.DataFrame, valid_names: List[str]) -> Dict[int, str]:
    """Finn rader som tilhører personer (navn i kolonne 0)."""
    out: Dict[int, str] = {}
    for i in range(df.shape[0]):
        v = df.iloc[i, 0]
        if isinstance(v, str):
            name = v.strip()
            if name in valid_names:
                out[i] = name
    return out


def find_header_rows_with_dates(df: pd.DataFrame, target_year: int) -> List[int]:
    """Finn rader som inneholder 3+ datoer for 'target_year' (uke-hoder)."""
    header_rows: List[int] = []
    nrows, ncols = df.shape
    for r in range(nrows):
        cnt = 0
        for c in range(ncols):
            d = parse_date_cell(df.iloc[r, c])
            if d and d.year == target_year:
                cnt += 1
        if cnt >= 3:
            header_rows.append(r)
    return header_rows


def split_into_blocks(header_rows: List[int], nrows: int) -> List[Tuple[int, int]]:
    """Del arket i vertikale blokker: [header_row, next_header_row) ..."""
    if not header_rows:
        return []
    blocks: List[Tuple[int, int]] = []
    sorted_rows = sorted(set(header_rows))
    for i, r in enumerate(sorted_rows):
        r_next = sorted_rows[i + 1] if i + 1 < len(sorted_rows) else nrows
        blocks.append((r, r_next))
    return blocks


def dates_in_row(df: pd.DataFrame, r: int, target_year: int) -> List[Tuple[int, datetime.date]]:
    """Returner [(col_index, date)] for alle datoer i rad r (valgt år)."""
    out: List[Tuple[int, datetime.date]] = []
    for c in range(df.shape[1]):
        d = parse_date_cell(df.iloc[r, c])
        if d and d.year == target_year:
            out.append((c, d))
    return out


def score_offset_for_block(
    df: pd.DataFrame,
    block_top: int,
    block_bottom: int,
    date_col: int,
    offset: int,
    name_rows: Dict[int, str],
    max_people_to_sample: int = 18,
) -> int:
    """
    Score hvor "bra" en offset er i denne blokken for EN dato-kolonne:
    - Aktivitet forventes i col_act = date_col - offset.
    - Teller antall ikke-tomme, ikke-dato, ikke-selvnavn celler i navneradene
      som ligger i [block_top, block_bottom).
    """
    ncols = df.shape[1]
    col_act = date_col - offset
    if col_act < 1 or col_act >= ncols:  # aldri kol 0 (navn)
        return -1

    people_rows = [ri for ri in name_rows.keys() if block_top < ri < block_bottom]
    people_rows = sorted(people_rows)[:max_people_to_sample]

    score = 0
    for ri in people_rows:
        val = df.iloc[ri, col_act]
        if pd.isna(val):
            continue
        s = str(val).strip()
        if not s:
            continue
        if s.lower() == name_rows[ri].lower():  # ikke "Trine" som aktivitet
            continue
        if parse_date_cell(s):  # ikke dato i aktivitetsfelt
            continue
        score += 1
    return score


def choose_global_offset_for_block(
    df: pd.DataFrame,
    block_top: int,
    block_bottom: int,
    header_row: int,
    target_year: int,
    name_rows: Dict[int, str],
    debug: bool = False,
) -> Optional[int]:
    """
    Velg ÉN offset for hele blokken ved å summere score for alle dato-kolonner
    i blokken. Returnerer offset med høyest totalscore.
    """
    date_cells = dates_in_row(df, header_row, target_year)
    if not date_cells:
        return None

    best_total = -1
    best_off: Optional[int] = None

    for off in OFFSET_CANDIDATES:
        total = 0
        for (c_date, _d) in date_cells:
            total += score_offset_for_block(
                df, block_top, block_bottom, c_date, off, name_rows
            )
        if total > best_total:
            best_total = total
            best_off = off

    if debug:
        print(f"[DEBUG]   valgt global offset={best_off} (score={best_total}) "
              f"for blokk rader [{block_top}, {block_bottom})")

    if best_total <= 0:
        return None
    return best_off


def build_date_to_activity_map_for_block(
    df: pd.DataFrame,
    block_top: int,
    block_bottom: int,
    header_row: int,
    target_year: int,
    name_rows: Dict[int, str],
    debug: bool = False,
) -> Dict[int, datetime.date]:
    """
    Bygg mapping {activity_col -> date} for blokken ved å bruke ÉN global offset.
    """
    mapping: Dict[int, datetime.date] = {}
    date_cells = dates_in_row(df, header_row, target_year)
    if not date_cells:
        return mapping

    global_off = choose_global_offset_for_block(
        df, block_top, block_bottom, header_row, target_year, name_rows, debug=debug
    )
    if global_off is None:
        return mapping

    ncols = df.shape[1]
    for (c_date, d) in date_cells:
        col_act = c_date - global_off
        if 1 <= col_act < ncols:  # aldri 0
            mapping[col_act] = d
            if debug:
                print(f"[DEBUG]     dato {d} @col {c_date} -> akt.col {col_act} (global off={global_off})")
    return mapping


def extract_block_records(
    df: pd.DataFrame,
    sheet_name: str,
    block_top: int,
    block_bottom: int,
    actcol_to_date: Dict[int, datetime.date],
    name_rows: Dict[int, str],
) -> List[Dict]:
    """
    Høst [{dato, person, aktivitet, ark}] for alle navnerader i blokken ved å
    bruke actcol_to_date (kolonne -> dato).
    """
    records: List[Dict] = []
    ncols = df.shape[1]
    people_rows = [ri for ri in name_rows.keys() if block_top < ri < block_bottom]

    for ri in sorted(people_rows):
        person = name_rows[ri]
        for col_act, d in actcol_to_date.items():
            if 1 <= col_act < ncols:
                val = df.iloc[ri, col_act]
                if pd.isna(val):
                    continue
                s = str(val).strip()
                if not s:
                    continue
                if s.lower() == person.lower():  # ikke "navn" som aktivitet
                    continue
                if parse_date_cell(s):  # ikke dato i aktivitetsfelt
                    continue
                records.append({
                    "dato": d.isoformat(),
                    "person": person,
                    "aktivitet": s,
                    "ark": sheet_name
                })
    return records


# ---------------- Hovedløp ----------------------------------------------------
def main():
    args = parse_args()
    excel_path = Path(args.excel)
    if not excel_path.exists():
        raise SystemExit(f"Finner ikke fil: {excel_path}")

    valid_names = [n.strip() for n in args.names.split(",") if n.strip()]
    exclude = set([x.strip() for x in args.exclude.split(",") if x.strip()])
    target_year = int(args.year)
    debug = bool(args.debug)

    xl = pd.ExcelFile(excel_path, engine="openpyxl")

    all_rows: List[Dict] = []
    for sn in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name=sn, header=None, engine="openpyxl")

        name_rows = detect_name_rows(df, valid_names)
        header_rows = find_header_rows_with_dates(df, target_year)
        blocks = split_into_blocks(header_rows, df.shape[0])

        if debug:
            print(f"[DEBUG] Ark='{sn}': navnerader={len(name_rows)}, "
                  f"header-rader={len(header_rows)}, blokker={len(blocks)}")

        for (top, bottom) in blocks:
            actcol_to_date = build_date_to_activity_map_for_block(
                df, top, bottom, top, target_year, name_rows, debug=debug
            )
            block_records = extract_block_records(
                df, sn, top, bottom, actcol_to_date, name_rows
            )
            all_rows.extend(block_records)

    # Filtrer til valgt år
    rows_year = [r for r in all_rows if r["dato"].startswith(f"{target_year}-")]

    # Filtrer bort uønskede statuser (hvis oppgitt)
    if exclude:
        rows_year = [r for r in rows_year if r["aktivitet"] not in exclude]

    # Dedupliser (dato, person) – behold første funn
    seen = set()
    deduped = []
    for r in rows_year:
        key = (r["dato"], r["person"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(r)
    rows_year = deduped

    # Sortering (dato, så i definert navne-rekkefølge)
    name_index = {n: i for i, n in enumerate(valid_names)}
    rows_year.sort(key=lambda r: (r["dato"], name_index.get(r["person"], 999), r["person"]))

    # Flat JSON
    flat_out = Path(f"arbeidsplan_{target_year}_flat.json")
    flat_out.write_text(json.dumps(rows_year, ensure_ascii=False, indent=2), encoding="utf-8")

    # Per dato JSON
    per_dato = defaultdict(list)
    for r in rows_year:
        per_dato[r["dato"]].append({"person": r["person"], "aktivitet": r["aktivitet"]})

    per_dato_sorted = {
        d: sorted(lst, key=lambda x: name_index.get(x["person"], 999))
        for d, lst in sorted(per_dato.items(), key=lambda kv: kv[0])
    }
    per_out = Path(f"arbeidsplan_{target_year}_per_dato.json")
    per_out.write_text(json.dumps(per_dato_sorted, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"OK: {len(rows_year)} poster over {len(per_dato_sorted)} datoer")
    print(f"Skrev: {flat_out.name} og {per_out.name}")
    if exclude:
        print(f"Filtrert bort aktiviteter: {', '.join(sorted(exclude))}")


if __name__ == "__main__":
    main()
