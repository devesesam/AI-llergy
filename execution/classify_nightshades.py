"""
Classify the NIGHTSHADE FREE column (AB) for the Kisa menu Google Sheet.

Reads the menu via the public CSV export, scans each item's Ingredients for
nightshade-family ingredients, and emits YES (free of nightshades) / NO
(contains a nightshade) for every row — in sheet row order — so the values can
be pasted straight into column AB (starting at AB2).

We have no Google write credentials in this project (the app only ever READS
the sheet via CSV export), so this script produces a paste-ready column rather
than writing cells directly.

Usage:
  python execution/classify_nightshades.py

Output:
  .tmp/nightshade_free_AB.txt   <- one value per data row, paste into AB2

Edge cases handled:
  - "black pepper" / "white pepper" / "peppercorn" are NOT nightshades (Piper).
  - "sweet potato" / "kumara" are NOT nightshades (only true potato is).
  - paprika, cayenne, aleppo pepper, chili/chilli, capsicum, bell/red peppers,
    tomato, eggplant/aubergine ARE nightshades.
  - Sanity guard: if the sheet already marks CAPSICUM FREE = NO or
    CHILI FREE = NO, the item definitely contains a nightshade, so we force NO
    and flag any disagreement with the ingredient scan for manual review.
"""

import csv
import io
import os
import re
import sys
import requests

SHEET_ID = "1xxS6NRa16fptx3c4CJ5-V6mp-yDIHDGb7RnLx03isaw"
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv"

# Phrases that contain a nightshade trigger word but are NOT nightshades.
# Stripped from the text before scanning so they can't cause false positives.
SAFE_PHRASES = [
    "black pepper",
    "white pepper",
    "peppercorn",
    "peppercorns",
    "sweet potato",
]

# Nightshade indicators (substring match, case-insensitive).
NIGHTSHADE_KEYWORDS = [
    "tomato",
    "capsicum",
    "eggplant",
    "aubergine",
    "paprika",
    "cayenne",
    "pimento",
    "tomatillo",
    "goji",
    "chili",
    "chilli",
    "chilly",
    "aleppo",        # aleppo pepper / aleppo chili — always capsicum-derived
    "red pepper",
    "green pepper",
    "yellow pepper",
    "bell pepper",
    "sweet pepper",
    "tinned pepper",
    "chili pepper",
    "chilli pepper",
    "potato",         # true potato; "sweet potato" already stripped above
]


def fetch_rows() -> list[dict]:
    resp = requests.get(CSV_URL)
    resp.raise_for_status()
    rows = list(csv.DictReader(io.StringIO(resp.text)))
    return [r for r in rows if (r.get("Dish") or "").strip()]


def find_nightshades(ingredients: str) -> list[str]:
    text = (ingredients or "").lower()
    for safe in SAFE_PHRASES:
        text = text.replace(safe, " ")
    hits = []
    for kw in NIGHTSHADE_KEYWORDS:
        if re.search(r"\b" + re.escape(kw), text):
            hits.append(kw)
    # De-dupe while keeping order
    seen = set()
    return [h for h in hits if not (h in seen or seen.add(h))]


def main():
    rows = fetch_rows()
    print(f"[fetch] {len(rows)} menu items\n")

    values = []
    flags = []
    print(f"{'Row':>4}  {'NS FREE':<8} {'Dish':<26} matched / notes")
    print("-" * 100)

    for i, row in enumerate(rows, start=2):  # sheet row 2 = first data row
        dish = (row.get("Dish") or "").strip()
        hits = find_nightshades(row.get("Ingredients", ""))

        capsicum_no = (row.get("CAPSICUM FREE") or "").strip().upper() == "NO"
        chili_no = (row.get("CHILI FREE") or "").strip().upper() == "NO"
        sheet_says_contains = capsicum_no or chili_no

        contains = bool(hits) or sheet_says_contains
        value = "NO" if contains else "YES"
        values.append(value)

        note = ", ".join(hits) if hits else ""
        # Flag cases where the existing columns imply a nightshade but the
        # ingredient scan found none (worth a human eyeball).
        if sheet_says_contains and not hits:
            note = (note + " " if note else "") + "[forced NO via CAPSICUM/CHILI col]"
            flags.append((i, dish, "sheet col says contains, scan found none"))

        print(f"{i:>4}  {value:<8} {dish[:26]:<26} {note}")

    yes_n = values.count("YES")
    no_n = values.count("NO")
    print("\n" + "-" * 100)
    print(f"Totals: YES (nightshade-free)={yes_n}  NO (contains)={no_n}  total={len(values)}")

    if flags:
        print("\n[review] rows to double-check manually:")
        for r, d, why in flags:
            print(f"   row {r} {d}: {why}")

    out_dir = os.path.join(os.path.dirname(__file__), "..", ".tmp")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "nightshade_free_AB.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(values) + "\n")
    print(f"\n[output] paste-ready column written to {os.path.abspath(out_path)}")
    print("[output] Select cell AB2 in the sheet and paste — values are in row order.")


if __name__ == "__main__":
    main()
