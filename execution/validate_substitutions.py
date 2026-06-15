"""
Validate a chef-provided Substitutions CSV against the menu and the canonical
allergen list. Deterministic checks only (no LLM, no network unless you point it
at a Google Sheet URL).

Checks:
  - Header has the required columns
  - Every `Dish` matches a menu Item (case-insensitive, trimmed)
  - `Action` is "Remove" or "Substitute"
  - Substitute rows have a `Substitute` value; Remove rows leave it blank
  - All ids in `Solves` / `Introduces` are valid allergen ids
  - `Solves` is non-empty

Usage:
  python execution/validate_substitutions.py kisa_substitutions_template.csv kisa_menu.csv

Exit code 0 = valid, 1 = problems found (printed).
"""
import csv
import sys

def pick(row, exact=(), includes=(), excludes=()):
    """Tolerant header lookup mirroring substitutions.ts pickCell — survives
    column renames (Ingredient→Element, Solves→'Solves allergy', etc.)."""
    items = [(k, (k or "").strip().lower()) for k in row.keys()]
    for k, kl in items:
        if kl in set(exact):
            return row.get(k) or ""
    if includes:
        for k, kl in items:
            if all(t in kl for t in includes) and not any(t in kl for t in excludes):
                return row.get(k) or ""
    return ""


def get_solves(row):
    return pick(row, exact={"solves"}, includes=("solve",))


def get_introduced(row):
    return pick(row, exact={"introduces"}, includes=("introduc", "allerg"))


def get_substitute(row):
    v = pick(row, exact={"substitute"}, includes=("substitute", "name")).strip()
    if not v or v.upper() == "NO":
        v = pick(row, includes=("substitute", "ingredient")).strip()
    return "" if v.upper() == "NO" else v

# Canonical allergen ids — must match ai-llergy-webapp/src/lib/allergens.ts
VALID_ALLERGEN_IDS = {
    "vegetarian", "vegan", "peanuts", "treenuts", "gluten", "wheat", "dairy",
    "eggs", "soy", "fish", "shellfish", "sesame", "almond", "walnut", "pistachio",
    "mustard", "sulfites", "garlic", "onion", "celery", "chili", "capsicum",
    "lupin", "molluscs",
}


def load_menu_items(menu_path):
    with open(menu_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        first_col = (reader.fieldnames or [None])[0]
        rows = list(reader)
    # Dish name = first column, whatever it's headed (Item/Dish/Element/...),
    # matching the app. Explicit Item/Dish take priority if present.
    def name(r):
        return (r.get("Item") or r.get("Dish") or (r.get(first_col) if first_col else "") or "").strip()
    return {name(r).lower() for r in rows if name(r)}


def parse_ids(raw):
    return [s.strip().lower() for s in (raw or "").split(",") if s.strip()]


def main():
    if len(sys.argv) < 3:
        print("Usage: python execution/validate_substitutions.py <substitutions.csv> <menu.csv>")
        sys.exit(2)

    subs_path, menu_path = sys.argv[1], sys.argv[2]
    menu_items = load_menu_items(menu_path)
    errors = []
    warnings = []

    with open(subs_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        first_col = (reader.fieldnames or [None])[0]
        # Soft schema check — the parser is header-tolerant, but a missing Solves
        # column means nothing can be parsed, so flag it.
        if not any("solve" in (h or "").lower() for h in (reader.fieldnames or [])):
            print(f"FAIL: no 'Solves' column found. Header: {reader.fieldnames}")
            sys.exit(1)

        row_count = 0
        for i, row in enumerate(reader, start=2):  # row 1 = header
            dish = (pick(row, exact={"dish", "item"}) or (row.get(first_col) if first_col else "") or "").strip()
            if not dish:
                continue  # skip blank lines
            row_count += 1

            action = pick(row, exact={"action"}).strip().lower()
            substitute = get_substitute(row)
            solves = parse_ids(get_solves(row))
            introduces = parse_ids(get_introduced(row))

            if dish.lower() not in menu_items:
                errors.append(f"row {i}: Dish '{dish}' does not match any menu Item")

            if action not in ("remove", "substitute"):
                errors.append(f"row {i} ({dish}): Action must be 'Remove' or 'Substitute', got '{row.get('Action')}'")

            if action == "substitute" and not substitute:
                errors.append(f"row {i} ({dish}): Substitute rows need a Substitute value")
            if action == "remove" and substitute:
                warnings.append(f"row {i} ({dish}): Remove row has a Substitute value '{substitute}' (will be ignored)")
            if action == "remove" and introduces:
                warnings.append(f"row {i} ({dish}): Remove row lists Introduces '{introduces}' (will be ignored)")

            if not solves:
                errors.append(f"row {i} ({dish}): Solves is empty (must list at least one allergen id)")
            for a in solves:
                if a not in VALID_ALLERGEN_IDS:
                    errors.append(f"row {i} ({dish}): unknown allergen id in Solves: '{a}'")
            for a in introduces:
                if a not in VALID_ALLERGEN_IDS:
                    errors.append(f"row {i} ({dish}): unknown allergen id in Introduces: '{a}'")

    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")

    print(f"\nChecked {row_count} substitution row(s) against {len(menu_items)} menu item(s).")
    if errors:
        print(f"RESULT: INVALID — {len(errors)} error(s), {len(warnings)} warning(s).")
        sys.exit(1)
    print(f"RESULT: VALID — {len(warnings)} warning(s).")


if __name__ == "__main__":
    main()
