#!/usr/bin/env python3
"""
Ingest Tom's set-menu spreadsheet into the normalized per-venue format the Set
Menu Builder reads.

Layer-3 execution tool (see CLAUDE.md). Reads:
  - resources/Mosaic Set Menu's*.xlsx       (tier -> dish -> price, side-by-side)
  - the LIVE Google Sheet menu tabs          (exact dish names, for the Dish Key)

Writes:
  - set-menu-builder/src/data/set-menus/<slug>.csv      (paste into the Sheet tab)
  - set-menu-builder/src/data/set-menus.generated.ts    (bundled dev fallback)

And prints a reconciliation report: which set-menu dishes resolved to a live menu
dish (Dish Key) and which need chef confirmation (left blank = allergen-unknown).

Dish Key = normalizeDishName(live menu name) = live_name.strip().lower(), copied
verbatim from the live sheet so en-dashes / accents match exactly at runtime.
"""

import csv
import io
import json
import os
import re
import unicodedata
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, "resources", "Mosaic Set Menu's - Friday 26 Jun 2026.xlsx")
OUT_DIR = os.path.join(ROOT, "set-menu-builder", "src", "data", "set-menus")
OUT_TS = os.path.join(ROOT, "set-menu-builder", "src", "data", "set-menus.generated.ts")

SHEET_ID = "1xxS6NRa16fptx3c4CJ5-V6mp-yDIHDGb7RnLx03isaw"

# xlsx sheet name -> (slug, menu tab gid)
VENUES = {
    "Mr Go's": ("mr-gos", "361708590"),
    "Ombra": ("ombra", "1466155614"),
    "Kisa ": ("kisa", "1377599134"),
}

HEADERS = ["Tier", "Tier Per Head", "Dish", "Dish Key", "Qty", "Price", "Course", "Notes"]


def normalize(name: str) -> str:
    return name.strip().lower()


def loose_key(name: str) -> str:
    """Match the TS looseKey() in set-menu.ts: strip accents, lowercase, fold dash
    variants to '-', collapse whitespace. Produces clean ASCII so the Sheet's Dish
    Key column has no en-dashes/accents to mangle on copy-paste."""
    s = unicodedata.normalize("NFKD", name or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[‐-―−]", "-", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def clean_dish(raw: str):
    """Strip quantity markers from a dish name. Returns (display, qty, note)."""
    name = re.sub(r"\s+", " ", str(raw)).strip()
    qty, note = 1, ""
    m = re.search(r"\s*[xX]\s*2\s*$", name)
    if m:
        qty = 2
        name = name[: m.start()].strip()
    if re.search(r"\s*\+\s*1\s*$", name):
        note = "+1 portion included"
        name = re.sub(r"\s*\+\s*1\s*$", "", name).strip()
    return name, qty, note


def per_head_num(v) -> float:
    if v is None:
        return 0.0
    s = re.sub(r"[^0-9.]", "", str(v))
    return float(s) if s else 0.0


def fetch_live_names(gid: str):
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={gid}"
    data = urllib.request.urlopen(url, timeout=30).read().decode("utf-8")
    rows = list(csv.reader(io.StringIO(data)))
    names = []
    for r in rows[1:]:
        if r and r[0].strip():
            names.append(r[0].strip())
    return names


# ── Curated alias map: cleaned set-menu dish (marker-stripped) -> matcher ─────
# matcher: ("exact", live_name) | ("contains", keyword) | None (unresolved).
# keyword matching is case-insensitive and must hit exactly one live name.
ALIASES = {
    "mr-gos": {
        "CREAM CHEESE WONTONS": ("contains", "cream cheese wontons"),
        "PORK DUMPLINGS": ("contains", "pork dumplings"),
        "KUNG PAO CAULIFLOWER": ("contains", "kung pao"),
        "CALAMARI TOAST": ("contains", "calamari toast"),
        "AVOCADO & NORI SALAD": ("contains", "avocado & nori"),
        "TAIWANESE POPCORN CHICKEN": ("contains", "taiwanese popcorn"),
        "MUSHROOM 'XO' FRIED RICE": None,  # ambiguous vs "Vege Fried Rice" — chef confirm
        "CHILLI & COCONUT CHICKEN SALAD": None,  # ambiguous vs "Chicken Salad" — chef confirm
        "CARAMEL CHILLI PORK BELLY": ("contains", "chilli caramel pork belly"),
        "YUM PLA DIB (THAI-STYLE CURED FISH)": ("contains", "yum pla dib"),
    },
    "ombra": {
        "Arancini-cacio pepe- cheese spuma": ("contains", "arancini"),
        "Beetroot panzanella-olives-fresh ricotta": ("contains", "beetroot panzanella"),
        "Gnocchi-sage chilli butter-hazelnuts": ("contains", "gnocchi"),
        "Rocket salad-chicory-olives - balsamic": ("contains", "rocket salad"),
        "Fried brussels sprouts-lemon-chilli aioli-pistacchios": ("contains", "brussel"),
        "Peperoni pizzette-mozzarella-stracciatella-fresh oregano": ("contains", "pepperoni"),
        "Pork polpette-pomodoro-stracciatella-gremolata": ("contains", "pork meatballs"),
        "Slow cook lamb-creamy polenta-cavolonero agrodulce": None,  # not on live Ombra menu — chef confirm
        "Market fish-celeriac pure-radicchio-apple mustarda": ("contains", "market fish"),
    },
    "kisa": {
        "HUMMUS": ("exact", "Hummus"),
        "MUHAMMARA": ("exact", "Muhammara"),
        "DATE LABNEH": ("exact", "Date Labneh"),
        "PITA/YUFKA": ("exact", "Pita"),  # representative (also served as Yufka) — chef confirm
        "BOREKS": ("contains", "boreks"),
        "POTATO": ("contains", "confit potato"),
        "BRUSSELS": ("exact", "Brussel Sprouts"),
        "URFA": None,  # ambiguous: "Lamb Urfa Kebab" vs "Lamb Urfa (Lunch Plate)" — chef confirm
        "WAPITI": ("contains", "wapiti"),
        "BEETROOT": ("contains", "beetroot salad"),
        "SHORT RIB": ("contains", "short rib"),
        "LAMB SHOULDER": ("contains", "lamb shoulder"),
        "FALAFEL": ("exact", "Falafel"),
        "TURSU": ("contains", "tursu"),
    },
}


def resolve_key(slug, cleaned_display, live_names, report):
    matcher = ALIASES.get(slug, {}).get(cleaned_display, "MISSING")
    if matcher == "MISSING":
        report.append((cleaned_display, "", "NO MAPPING — add to ALIASES or confirm with chef"))
        return ""
    if matcher is None:
        report.append((cleaned_display, "", "UNRESOLVED — chef must confirm the matching menu dish"))
        return ""
    kind, val = matcher
    if kind == "exact":
        hits = [n for n in live_names if n.strip().lower() == val.strip().lower()]
    else:  # contains
        hits = [n for n in live_names if val.lower() in n.lower()]
    if len(hits) == 1:
        report.append((cleaned_display, hits[0], "ok"))
        return loose_key(hits[0])
    if len(hits) == 0:
        report.append((cleaned_display, "", f"NO LIVE MATCH for {matcher!r}"))
        return ""
    report.append((cleaned_display, "", f"AMBIGUOUS ({len(hits)}): {hits}"))
    return ""


def parse_xlsx():
    import openpyxl

    wb = openpyxl.load_workbook(XLSX, data_only=True)
    out = {}  # slug -> list of dish dicts
    for sheet_name, (slug, gid) in VENUES.items():
        ws = wb[sheet_name]
        grid = [list(r) for r in ws.iter_rows(values_only=True)]

        # Find header row (the one whose first cell is ITEM-ish).
        hdr_idx = next(
            i for i, row in enumerate(grid)
            if row and str(row[0] or "").strip().upper().startswith("ITEM")
        )
        # Tier blocks = columns where header cell starts with ITEM; price col = +1.
        item_cols = [
            c for c, v in enumerate(grid[hdr_idx])
            if str(v or "").strip().upper().startswith("ITEM")
        ]
        per_head_row = grid[hdr_idx - 1]
        # Data rows run until the TOTAL row.
        total_idx = next(
            i for i in range(hdr_idx + 1, len(grid))
            if grid[i] and str(grid[i][0] or "").strip().upper() == "TOTAL"
        )

        dishes = []
        for c in item_cols:
            per_head = per_head_num(per_head_row[c]) if c < len(per_head_row) else 0.0
            tier_id = str(int(per_head)) if per_head == int(per_head) else str(per_head)
            for r in range(hdr_idx + 1, total_idx):
                row = grid[r]
                if c >= len(row):
                    continue
                raw = row[c]
                if raw is None or str(raw).strip() == "":
                    continue
                price = row[c + 1] if c + 1 < len(row) else None
                display, qty, note = clean_dish(raw)
                dishes.append({
                    "tier": tier_id,
                    "per_head": per_head,
                    "display": display,
                    "qty": qty,
                    "price": float(price) if isinstance(price, (int, float)) else per_head_num(price),
                    "note": note,
                })
        out[slug] = (dishes, gid)
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    parsed = parse_xlsx()

    bundled = {}  # slug -> list[ row dict with HEADERS ]
    print("\n================ SET-MENU RECONCILIATION ================\n")
    for slug, (dishes, gid) in parsed.items():
        print(f"---- {slug} (live gid {gid}) ----")
        live_names = fetch_live_names(gid)
        report = []
        rows = []
        seen_keys = set()
        for d in dishes:
            display = d["display"]
            if display not in seen_keys:
                dish_key = resolve_key(slug, display, live_names, report)
                seen_keys.add(display)
            else:
                # Reuse the key resolved for the same dish in a lower tier.
                dish_key = next((r["Dish Key"] for r in rows if r["Dish"] == display), "")
            rows.append({
                "Tier": d["tier"],
                "Tier Per Head": f'{d["per_head"]:g}',
                "Dish": display,
                "Dish Key": dish_key,
                "Qty": str(d["qty"]),
                "Price": f'{d["price"]:g}',
                "Course": "",
                "Notes": d["note"],
            })

        # Per-tier total sanity check vs the spreadsheet.
        tiers = {}
        for r in rows:
            tiers.setdefault(r["Tier"], 0.0)
            tiers[r["Tier"]] += float(r["Price"])
        for tier_id, total in tiers.items():
            print(f"   tier {tier_id}: {sum(1 for r in rows if r['Tier']==tier_id)} dishes, "
                  f"total ${total:g}, per-person(÷4) ${total/4:g}")

        resolved = sum(1 for r in seen_distinct(report) if r[2] == "ok")
        unresolved = [r for r in seen_distinct(report) if r[2] != "ok"]
        print(f"   dish keys: {resolved} resolved, {len(unresolved)} need attention")
        for disp, live, status in unresolved:
            print(f"      ! {disp!r} -> {status}")
        print()

        # Write per-venue CSV
        csv_path = os.path.join(OUT_DIR, f"{slug}.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=HEADERS)
            w.writeheader()
            w.writerows(rows)
        bundled[slug] = rows

    # Write the generated TS bundle
    ts = (
        "// AUTO-GENERATED by execution/ingest_set_menus.py — DO NOT EDIT BY HAND.\n"
        "// Bundled dev/offline fallback for set-menu data. In production each venue\n"
        "// should have a setMenuGid in venues.ts pointing at its Sheet tab; this is\n"
        "// the exact content to paste into those tabs (also in src/data/set-menus/*.csv).\n\n"
        'import { RawSheetRow } from "../lib/google-sheets";\n\n'
        "export const BUNDLED_SET_MENUS: Record<string, RawSheetRow[]> = "
        + json.dumps(bundled, ensure_ascii=False, indent=2)
        + ";\n"
    )
    with open(OUT_TS, "w", encoding="utf-8") as fh:
        fh.write(ts)

    print("Wrote:")
    print(f"  {OUT_TS}")
    for slug in parsed:
        print(f"  {os.path.join(OUT_DIR, slug + '.csv')}")


def seen_distinct(report):
    """De-dupe the report by dish display (first occurrence wins)."""
    seen = set()
    out = []
    for row in report:
        if row[0] in seen:
            continue
        seen.add(row[0])
        out.append(row)
    return out


if __name__ == "__main__":
    main()
