"""
Migration script: Google Sheet → Supabase menu_items

Fetches menu data from the public Google Sheet CSV export and inserts
it into the Supabase `menu_items` table for a specific venue.

Usage:
  python execution/migrate_gsheet_to_supabase.py <venue_id> [--dry-run]

Requires .env with:
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
"""

import sys
import os
import csv
import io
import argparse
import requests
from dotenv import load_dotenv
from supabase import create_client


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SHEET_ID = "1HNWCErJzCBRfy-oPOqPgg1UYYbhOkD5tuVrLWevryeU"
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv"

# All allergen column names we look for in the Google Sheet.
# Must match the columnName values in allergens.ts exactly.
ALLERGEN_COLUMNS = [
    "Vegetarian",
    "Vegan",
    "DAIRY FREE",
    "GLUTEN FREE",
    "SOY FREE",
    "SESAME FREE",
    "GARLIC FREE",
    "ONION FREE",
    "CAPSICUM FREE",
    "CHILI FREE",
    "PISTACHIO FREE",
    "WALNUT FREE",
    "ALMOND FREE",
    "PEANUT FREE",
    "TREE NUT FREE",
    "EGG FREE",
    "FISH FREE",
    "SHELLFISH FREE",
    "WHEAT FREE",
    "MUSTARD FREE",
    "SULFITE FREE",
    "CELERY FREE",
    "LUPIN FREE",
    "MOLLUSC FREE",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fetch_csv() -> list[dict]:
    """Fetch and parse the Google Sheet as CSV."""
    print(f"[fetch] Downloading CSV from Google Sheets...")
    resp = requests.get(CSV_URL)
    resp.raise_for_status()
    print(f"[fetch] Downloaded {len(resp.text)} bytes")

    reader = csv.DictReader(io.StringIO(resp.text))
    rows = [row for row in reader if row.get("Item", "").strip()]
    print(f"[fetch] Parsed {len(rows)} menu items")
    return rows


def transform_row(row: dict, index: int) -> dict:
    """Transform a CSV row into a Supabase menu_items record."""

    # Build allergen_profile JSONB: column_name → bool
    allergen_profile = {}
    for col in ALLERGEN_COLUMNS:
        value = row.get(col, "").strip().upper()
        if value == "YES":
            allergen_profile[col] = True
        elif value == "CAN BE":
            allergen_profile[col] = "CAN BE"  # preserve CAN BE as string
        elif value == "NO" or value == "":
            allergen_profile[col] = False
        else:
            allergen_profile[col] = False  # unexpected value → treat as NO

    # Parse price
    price_str = row.get("Price", "").strip().replace("$", "").replace(",", "")
    try:
        price = float(price_str) if price_str else None
    except ValueError:
        price = None

    return {
        "name": row.get("Item", "").strip(),
        "description": None,
        "price": price,
        "ingredients": row.get("Ingredients", "").strip() or None,
        "allergen_profile": allergen_profile,
        "allergen_confidence": {},
        "is_active": True,
        "sort_order": index,
    }


def print_sample(records: list[dict], n: int = 3):
    """Print a sample of records for verification."""
    print(f"\n--- Sample ({min(n, len(records))} of {len(records)} items) ---")
    for rec in records[:n]:
        allergens_true = [k for k, v in rec["allergen_profile"].items() if v is True]
        allergens_canbe = [k for k, v in rec["allergen_profile"].items() if v == "CAN BE"]
        print(f"  {rec['name']}")
        print(f"    Price: ${rec['price']}")
        print(f"    Ingredients: {(rec['ingredients'] or '')[:80]}...")
        print(f"    [Y] FREE OF: {', '.join(allergens_true) if allergens_true else '(none)'}")
        print(f"    [?] CAN BE:  {', '.join(allergens_canbe) if allergens_canbe else '(none)'}")
        print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Migrate Google Sheet menu → Supabase")
    parser.add_argument("venue_id", help="UUID of the target venue in Supabase")
    parser.add_argument("--dry-run", action="store_true", help="Parse and print only, don't insert")
    args = parser.parse_args()

    # 1. Fetch
    rows = fetch_csv()
    if not rows:
        print("ERROR: No menu items found in Google Sheet")
        sys.exit(1)

    # 2. Transform
    records = [transform_row(row, i) for i, row in enumerate(rows)]

    # Add venue_id to each record
    for rec in records:
        rec["venue_id"] = args.venue_id

    print_sample(records)

    if args.dry_run:
        print(f"[dry-run] Would insert {len(records)} items for venue {args.venue_id}")
        print("[dry-run] Done. No changes made.")
        return

    # 3. Load env & connect to Supabase
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
        sys.exit(1)
    print(f"[supabase] Connecting to {supabase_url}...")
    supabase = create_client(supabase_url, supabase_key)

    # 4. Clear existing menu items for this venue
    print(f"[supabase] Deleting existing menu items for venue {args.venue_id}...")
    delete_result = supabase.table("menu_items").delete().eq("venue_id", args.venue_id).execute()
    deleted_count = len(delete_result.data) if delete_result.data else 0
    print(f"[supabase] Deleted {deleted_count} existing items")

    # 5. Bulk insert
    print(f"[supabase] Inserting {len(records)} menu items...")
    # Insert in batches of 50 to avoid request size limits
    batch_size = 50
    total_inserted = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        result = supabase.table("menu_items").insert(batch).execute()
        inserted = len(result.data) if result.data else 0
        total_inserted += inserted
        print(f"  Batch {i // batch_size + 1}: inserted {inserted} items")

    print(f"\nDONE: Migration complete! {total_inserted} menu items inserted for venue {args.venue_id}")

    # 6. Verify count
    count_result = supabase.table("menu_items").select("id", count="exact").eq("venue_id", args.venue_id).execute()
    db_count = count_result.count if count_result.count is not None else len(count_result.data)
    print(f"[verify] CSV rows: {len(records)} | DB rows: {db_count}")
    if db_count == len(records):
        print("[verify] OK - Counts match!")
    else:
        print("[verify] WARNING - Count mismatch, check for issues")


if __name__ == "__main__":
    main()
