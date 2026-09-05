#!/usr/bin/env python3
"""
Guard against drift between the allergen libraries COPIED from the allergen
webapp into the Set Menu Builder.

  ai-llergy-webapp/src/lib/allergens.ts      <->  set-menu-builder/src/lib/allergens.ts
  ai-llergy-webapp/src/lib/substitutions.ts  <->  set-menu-builder/src/lib/substitutions.ts

allergens.ts: the (id, columnName, label) triples MUST be identical — both apps
read the same Google Sheet columns, and a mismatch means one app silently
mis-reads an allergen. (The webapp file may carry extra UI-only types; only the
allergen list is compared.)
substitutions.ts: compared ignoring whitespace/formatting — the parsing +
modification logic must match.

Exit 0 = in sync, 1 = drift (diff printed). Run after touching either lib.
See directives/set_menu_builder.md §5.
"""
from __future__ import annotations

import difflib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEBAPP = ROOT / "ai-llergy-webapp" / "src" / "lib"
BUILDER = ROOT / "set-menu-builder" / "src" / "lib"

# One allergen entry: { id: "gluten", label: "Gluten", icon: "🍞", columnName: "GLUTEN FREE" }
TRIPLE = re.compile(
    r'\{\s*id:\s*"(?P<id>[^"]+)"[^}]*?label:\s*"(?P<label>[^"]+)"[^}]*?columnName:\s*"(?P<col>[^"]+)"',
    re.S,
)


def allergen_triples(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    return sorted(f"{m['id']} | {m['col']} | {m['label']}" for m in TRIPLE.finditer(text))


def normalised_code(path: Path) -> list[str]:
    """Strip comments and collapse whitespace so formatting-only changes don't count."""
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"//[^\n]*", "", text)
    tokens = re.sub(r"\s+", " ", text).strip()
    tokens = re.sub(r"\s*([{}()\[\];,=<>:+\-*/&|!?.])\s*", r"\1", tokens)  # keep punctuation, drop spacing
    # one statement per line for a readable diff
    return [s.strip() for s in re.split(r"(?<=[;{}])", tokens) if s.strip()]


def report(title: str, a: list[str], b: list[str]) -> bool:
    if a == b:
        print(f"OK    {title}")
        return True
    print(f"DRIFT {title}")
    for line in difflib.unified_diff(a, b, "ai-llergy-webapp", "set-menu-builder", lineterm="", n=1):
        print("   " + line)
    return False


def main() -> int:
    ok = True
    for f in ("allergens.ts", "substitutions.ts"):
        for base in (WEBAPP, BUILDER):
            if not (base / f).exists():
                print(f"MISSING {base / f}")
                ok = False
    if not ok:
        return 1
    ok &= report(
        "allergens.ts — allergen (id | columnName | label) list",
        allergen_triples(WEBAPP / "allergens.ts"),
        allergen_triples(BUILDER / "allergens.ts"),
    )
    n = len(allergen_triples(WEBAPP / "allergens.ts"))
    print(f"      ({n} allergens compared)")
    ok &= report(
        "substitutions.ts — logic (formatting ignored)",
        normalised_code(WEBAPP / "substitutions.ts"),
        normalised_code(BUILDER / "substitutions.ts"),
    )
    print("\nIN SYNC" if ok else "\nDRIFT DETECTED — re-sync the builder copy (see set_menu_builder.md §5)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
