#!/usr/bin/env python3
"""
Set Menu Builder regression battery.

Runs a fixed grid of scenarios (3 venues x dietary mixes x party sizes, plus the
Kisa per-guest allocation cases) against a running builder (`/api/build`) and
asserts the invariants every build must satisfy. Optionally snapshots the full
output and/or compares against a previous snapshot, printing a readable delta.

Usage
  # against a local production build (cd set-menu-builder && npm run build && npm run start)
  python execution/set_menu_battery.py
  # against the live site
  python execution/set_menu_battery.py --base https://set.menukey.co.nz
  # capture a baseline, then later compare a change against it
  python execution/set_menu_battery.py --snapshot execution/battery_baseline_<phase>.json
  python execution/set_menu_battery.py --compare execution/battery_baseline_pre_m.json   # current baseline
  # strict grouping (one line per dish+guest-group among dedicated dishes) — Phase L target
  python execution/set_menu_battery.py --strict-grouping
  # large realistic parties only (12-40 guests) / everything except them
  python execution/set_menu_battery.py --only-large
  python execution/set_menu_battery.py --skip-large
  # only for the OLD phase_k / phase_l baselines (pre-2026-10-23): reproduces the old invalid "nuts"
  # request; without --legacy-nuts those compares show 5 Kisa 7-allergy changes that are not drift
  python execution/set_menu_battery.py --skip-large --legacy-nuts --compare execution/battery_baseline_phase_l.json

Exit code 1 if any invariant fails. Deterministic: no LLM, no randomness.
See directives/set_menu_builder.md §6.
"""
from __future__ import annotations

import argparse
import collections
import json
import sys
import time
import urllib.error
import urllib.request

VENUES = {"kisa": "58", "mr-gos": "44", "ombra": "49"}
PARTIES = [3, 5, 6, 8, 10]
MIXES = {
    "none": [],
    "1 gluten": [["gluten"]],
    "2 gluten + 1 dairy": [["gluten"], ["gluten"], ["dairy"]],
    "gl+garlic & dairy+eggs": [["gluten", "garlic"], ["dairy", "eggs"]],
    "vegan": [["vegan"]],
    # "nuts" was never a valid allergen id (the API silently ignored it); the scenario meant
    # "no nuts of any kind", so it is now peanuts + treenuts. --legacy-nuts restores the old
    # request so a drift check against a pre-fix baseline (phase_k / phase_l) still lines up.
    "7-allergy": [["gluten", "dairy", "eggs", "soy", "peanuts", "treenuts", "shellfish", "fish"]],
}
SEVEN_ALLERGY = MIXES["7-allergy"][0]
LEGACY_SEVEN_ALLERGY = ["gluten", "dairy", "eggs", "soy", "nuts", "shellfish", "fish"]
# Kisa per-guest allocation rules (Phase K) — bread / skewers / boreks.
KISA_EXTRA = [
    ("k: GF guest /5", "kisa", "58", 5, [["gluten"]]),
    ("k: gluten+soy /5", "kisa", "58", 5, [["gluten", "soy"]]),
    ("k: vegetarian /5", "kisa", "58", 5, [["vegetarian"]]),
    ("k: dairy /5 t78", "kisa", "78", 5, [["dairy"]]),
    ("k: none /4 t68", "kisa", "68", 4, []),
]
# Realistic large parties (Release 2 step 0, added 2026-10-23). Mid tier per venue; each size
# runs once with no dietary guests and once with a ~10-25% dietary mix. Additive: the original
# scenarios above keep their ids and order so --compare against older baselines lines up.
LARGE_TIERS = {"kisa": "68", "mr-gos": "44", "ombra": "49"}
V, GF, VG = ["vegetarian"], ["gluten"], ["vegan"]
LARGE_MIXES: dict[int, list[list[str]]] = {
    12: [V, V, GF],
    14: [VG, GF, ["dairy"]],
    16: [V, V, GF, ["shellfish"]],
    20: [VG, GF, GF, ["dairy"], ["halal"]],
    25: [GF, GF, GF, V, V, ["sesame"]],
    30: [VG, VG, GF, GF, ["dairy", "eggs"], ["peanuts"]],
    40: [V, V, V, V, GF, GF, GF, VG, SEVEN_ALLERGY],
}
LARGE_KISA_TIERS = [("68", 16), ("68", 30), ("78", 16), ("78", 30)]  # with the party-20 style mix
STATUS_THRESHOLD = 0.85  # what the UI calls "Covered"
MAX_SAME_DISH_PER_GUEST = 3


SUBMIT_ALL = False  # --submit-all: also send the non-dietary seats as guests (what the UI does)
LEGACY_NUTS = False  # --legacy-nuts: send the pre-fix "nuts" 7-allergy set (drift checks vs old baselines)


def build(base: str, venue: str, tier: str, party: int, allergen_sets: list[list[str]]) -> dict:
    sets = list(allergen_sets)
    if SUBMIT_ALL:
        sets += [[] for _ in range(max(0, party - len(sets)))]
    guests = [{"id": f"g{i + 1}", "allergens": a} for i, a in enumerate(sets)]
    body = json.dumps({"venue": venue, "tier": tier, "guestCount": party, "guests": guests}).encode()
    req = urllib.request.Request(f"{base}/api/build", body, {"Content-Type": "application/json"})
    for attempt in (1, 2):  # one retry on a network timeout (seen once on Netlify, 2026-10-23)
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError:
            raise
        except (TimeoutError, urllib.error.URLError) as e:
            if attempt == 2:
                raise
            print(f"  (retrying {venue} {tier} /{party} after {type(e).__name__})", file=sys.stderr)
    raise AssertionError("unreachable")


def scenarios() -> list[tuple[str, str, str, int, list[list[str]]]]:
    """The original grid + Kisa allocation cases (ids/order frozen since Phase K)."""
    out = []
    for venue, tier in VENUES.items():
        for mix, sets in MIXES.items():
            if LEGACY_NUTS and mix == "7-allergy":
                sets = [LEGACY_SEVEN_ALLERGY]
            for party in PARTIES:
                if len(sets) > party:
                    continue
                out.append((f"{mix} /{party}", venue, tier, party, sets))
    out.extend(KISA_EXTRA)
    return out


def large_scenarios() -> list[tuple[str, str, str, int, list[list[str]]]]:
    """Realistic 12-40 guest parties. Names start with "L:" so they are easy to grep/filter."""
    out = []
    for venue, tier in LARGE_TIERS.items():
        for party, sets in LARGE_MIXES.items():
            out.append((f"L: none /{party}", venue, tier, party, []))
            out.append((f"L: mix /{party}", venue, tier, party, sets))
    for tier, party in LARGE_KISA_TIERS:
        out.append((f"L: mix20 /{party}", "kisa", tier, party, LARGE_MIXES[20]))
    return out


def canonical(res: dict) -> dict:
    """The part of a build result we snapshot and compare (order-independent)."""
    menu = sorted(
        (
            {
                "dish": d["displayName"],
                "key": d["dishKey"],
                "qty": d["qty"],
                "price": round(d["price"], 2),
                "source": d["source"],
                "for": sorted(d.get("intendedFor") or []),
                "locked": bool(d.get("locked")),
            }
            for d in res["sharedMenu"]
        ),
        key=lambda x: (x["source"], x["key"], x["for"], x["qty"]),
    )
    guests = {
        g["id"]: {
            "score": g["coverage"]["score"],
            "met": g["coverage"]["met"],
            "bestEffort": g["coverage"]["bestEffort"],
        }
        for g in res["guests"]
    }
    return {
        "spread": res["budget"]["spreadCost"],
        "budget": res["budget"]["totalBudget"],
        "menu": menu,
        "guests": guests,
        "warnings": res["warnings"],
    }


def party_size(res: dict, requested: int) -> int:
    """The party size the build was for: the response's guestCount if it reports one, else what we
    asked for. Never len(res["guests"]) - that is only the dietary rows unless --submit-all."""
    gc = res.get("guestCount")
    return int(gc) if isinstance(gc, (int, float)) and gc > 0 else requested


def check_invariants(name: str, res: dict, strict_grouping: bool, party: int) -> list[str]:
    fails: list[str] = []
    party = party_size(res, party)
    b = res["budget"]
    if b["spreadCost"] > b["totalBudget"] + 1e-6:
        # Documented exception: a party smaller than the tier's design size (4) keeps the full
        # base spread even when it costs more than G x perHead — the app warns "consider a
        # smaller tier" instead of stripping dishes. Anything else over budget is a failure.
        small_party = res["tier"]["designedFor"] > party and any(
            "smaller tier" in w for w in res["warnings"]
        )
        if not small_party:
            fails.append(f"over budget: {b['spreadCost']} > {b['totalBudget']}")
    for d in res["sharedMenu"]:
        if d["source"] == "tier" and d["qty"] < 1:
            fails.append(f"tier dish dropped: {d['displayName']}")
        if d.get("allocation"):
            a = d["allocation"]
            if d["qty"] % 1 != 0:
                fails.append(f"allocation qty not integer: {d['displayName']} {d['qty']}")
            if a["unitsPerDish"] < 1 or a["perGuest"] < 1:
                fails.append(f"bad allocation meta: {d['displayName']} {a}")
    for g in res["guests"]:
        c = g["coverage"]
        if not (c["met"] or c["bestEffort"]):
            fails.append(f"{g['id']} silently under threshold: score {c['score']}")
    # ≤3 portions of the same dish per guest (sum across dedicated lines). A line's qty is
    # shared by everyone on it, so each guest gets qty / len(intendedFor) — counting the whole
    # qty per guest false-fails any line of 4+ guests at 1 portion each (seen at /40, 2026-10-23).
    per = collections.Counter()
    for d in res["sharedMenu"]:
        if d["source"] == "dedicated":
            who = d.get("intendedFor") or []
            for gid in who:
                per[(gid, d["dishKey"])] += d["qty"] / len(who)
    for (gid, key), n in per.items():
        if n > MAX_SAME_DISH_PER_GUEST + 1e-9:
            fails.append(f"{gid} has {n:g}x {key} dedicated (> {MAX_SAME_DISH_PER_GUEST})")
    if strict_grouping:
        lines = collections.Counter(
            (d["dishKey"], tuple(sorted(d.get("intendedFor") or [])))
            for d in res["sharedMenu"]
            if d["source"] == "dedicated"
        )
        for (key, who), n in lines.items():
            if n > 1:
                fails.append(f"duplicate dedicated line: {key} for {','.join(who)} x{n} lines")
    return fails


def summary_row(res: dict) -> dict:
    ded = [d for d in res["sharedMenu"] if d["source"] == "dedicated"]
    keys = collections.Counter((d["dishKey"], tuple(sorted(d.get("intendedFor") or []))) for d in ded)
    return {
        "ded": len(ded),
        "dup": sum(c - 1 for c in keys.values()),
        "added": sum(1 for d in res["sharedMenu"] if d["source"] == "added"),
        "review": sum(1 for g in res["guests"] if g["coverage"]["score"] < STATUS_THRESHOLD),
        "pct": round(100 * res["budget"]["spreadCost"] / max(1e-9, res["budget"]["totalBudget"])),
        "lines": len(res["sharedMenu"]),
        # dishes printed on more than one docket row (any source) - what Release 2/3 merges
        "multi": sum(1 for c in collections.Counter(d["dishKey"] for d in res["sharedMenu"]).values() if c > 1),
    }


def menu_line(m: dict) -> str:
    who = f" ONLY {','.join(m['for'])}" if m["for"] else ""
    return f"{m['dish']} x{m['qty']} ${m['price']}{who}"


def diff_scenario(name: str, old: dict, new: dict) -> list[str]:
    out: list[str] = []
    om = collections.Counter(menu_line(m) for m in old["menu"])
    nm = collections.Counter(menu_line(m) for m in new["menu"])
    removed = list((om - nm).elements())
    added = list((nm - om).elements())
    if removed or added:
        out.append(f"  {name}: spread {old['spread']} -> {new['spread']} / {new['budget']}")
        for r in removed:
            out.append(f"     - {r}")
        for a in added:
            out.append(f"     + {a}")
    for gid, og in old["guests"].items():
        ng = new["guests"].get(gid)
        if ng and (og["score"] != ng["score"] or og["bestEffort"] != ng["bestEffort"]):
            out.append(
                f"     {gid}: {og['score']}{'*' if og['bestEffort'] else ''} -> "
                f"{ng['score']}{'*' if ng['bestEffort'] else ''}"
            )
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", default="http://localhost:3000")
    ap.add_argument("--snapshot", help="write full canonical results to this JSON file")
    ap.add_argument("--compare", help="compare against a previous --snapshot file")
    ap.add_argument("--venues", help="comma-separated subset, e.g. kisa,ombra")
    ap.add_argument("--strict-grouping", action="store_true",
                    help="fail on duplicate (dish, guest-group) dedicated lines (Phase L target)")
    ap.add_argument("--no-determinism", action="store_true", help="skip the second run per scenario")
    ap.add_argument("--submit-all", action="store_true",
                    help="submit every seat as a guest (non-dietary ones with no allergens), as the UI does — "
                         "asserts the whole-party threshold on real rows")
    grp = ap.add_mutually_exclusive_group()
    grp.add_argument("--only-large", action="store_true", help="run only the 12-40 guest scenarios")
    grp.add_argument("--skip-large", action="store_true", help="run only the original scenarios")
    ap.add_argument("--legacy-nuts", action="store_true",
                    help='send the pre-fix 7-allergy set with the invalid "nuts" id (drift check vs phase_k/l baselines)')
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()
    global SUBMIT_ALL, LEGACY_NUTS
    SUBMIT_ALL = args.submit_all
    LEGACY_NUTS = args.legacy_nuts

    wanted = set(args.venues.split(",")) if args.venues else set(VENUES)
    results: dict[str, dict] = {}
    failures: list[tuple[str, str]] = []
    rows: list[tuple[str, str, dict]] = []

    try:
        urllib.request.urlopen(f"{args.base}/api/health", timeout=30).read()
    except urllib.error.URLError as e:
        print(f"cannot reach {args.base}: {e}")
        return 2

    todo = ([] if args.only_large else scenarios()) + ([] if args.skip_large else large_scenarios())
    for name, venue, tier, party, sets in todo:
        if venue not in wanted:
            continue
        key = f"{venue} {tier} | {name}"
        try:
            t0 = time.perf_counter()
            res = build(args.base, venue, tier, party, sets)
            ms = round(1000 * (time.perf_counter() - t0))
        except urllib.error.HTTPError as e:
            failures.append((key, f"HTTP {e.code}: {e.read()[:200]!r}"))
            continue
        except (TimeoutError, urllib.error.URLError) as e:  # after build()'s one retry
            failures.append((key, f"network error: {type(e).__name__}: {e}"))
            continue
        for f in check_invariants(key, res, args.strict_grouping, party):
            failures.append((key, f))
        if not args.no_determinism:
            try:
                again = build(args.base, venue, tier, party, sets)
            except urllib.error.HTTPError as e:
                failures.append((key, f"determinism re-run HTTP {e.code}"))
            except (TimeoutError, urllib.error.URLError) as e:
                failures.append((key, f"determinism re-run network error: {type(e).__name__}"))
            else:
                if canonical(again) != canonical(res):
                    failures.append((key, "non-deterministic (second run differs)"))
        results[key] = canonical(res)
        rows.append((venue, name, summary_row(res)))
        rows[-1][2]["ms"] = ms
        if not args.quiet:
            s = rows[-1][2]
            print(f"{venue:7} {tier:>3} {name:26} lines {s['lines']:>2}  ded {s['ded']:>2}  dup {s['dup']:>2}"
                  f"  multi {s['multi']:>2}  added {s['added']:>2}  review {s['review']:>2}  spend {s['pct']:>3}%"
                  f"  {ms:>5}ms")

    if args.snapshot:
        with open(args.snapshot, "w", encoding="utf-8") as fh:
            json.dump(results, fh, indent=1, sort_keys=True)
        print(f"\nsnapshot written: {args.snapshot} ({len(results)} scenarios)")

    if args.compare:
        with open(args.compare, encoding="utf-8") as fh:
            old = json.load(fh)
        print(f"\n== delta vs {args.compare} ==")
        changed = 0
        for key, new in results.items():
            if key not in old:
                print(f"  {key}: (new scenario)")
                continue
            lines = diff_scenario(key, old[key], new)
            if lines:
                changed += 1
                print("\n".join(lines))
        print(f"{changed} of {len(results)} scenarios changed" if changed else "no differences")

    tot = {"ded": 0, "dup": 0, "added": 0, "review": 0}
    for _, _, s in rows:
        for k in tot:
            tot[k] += s[k]
    print(f"\n{len(rows)} scenarios | dedicated lines {tot['ded']} | duplicate lines {tot['dup']} | "
          f"off-menu adds {tot['added']} | guests needing review {tot['review']}")

    if failures:
        print(f"\n{len(failures)} INVARIANT FAILURES:")
        for key, f in failures:
            print(f"  [{key}] {f}")
        return 1
    print("\nALL INVARIANTS PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
