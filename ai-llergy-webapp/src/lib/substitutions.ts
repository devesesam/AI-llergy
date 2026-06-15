/**
 * Chef-provided substitution / modification logic.
 *
 * The chef maintains a "Substitutions" tab in the menu Google Sheet. Each row
 * describes one way a dish can be modified for an allergy diner — either by
 * REMOVING an ingredient or SUBSTITUTING it for an alternative. We use these
 * deterministically at request time (NO LLM) to "rescue" otherwise-excluded
 * dishes into a "Can be modified" results section.
 *
 * Safety rule: a substitution may itself INTRODUCE an allergen (e.g. swapping
 * wheat flour for almond flour introduces tree nut / almond). We never offer a
 * modification that introduces an allergen the diner has also selected.
 */

import { ALL_FILTERS } from "./allergens";

export type SubstitutionAction = "remove" | "substitute";

export interface Substitution {
  dish: string; // original dish name (as entered by chef)
  action: SubstitutionAction;
  ingredient: string; // what is removed / replaced out
  substitute: string; // replacement ingredient (empty for "remove")
  solves: string[]; // allergen IDs this modification makes safe
  introduces: string[]; // allergen IDs the substitute adds (empty for "remove")
}

// Complete allergen ID -> human label map, derived from the canonical list so
// every allergen renders correctly (unlike the partial map in filter-menu).
const ALLERGEN_LABELS: Record<string, string> = Object.fromEntries(
  ALL_FILTERS.map((a) => [a.id, a.label])
);

const DIETARY_PREFERENCES = new Set(["vegan", "vegetarian"]);

/**
 * Normalise a dish name for joining the Substitutions tab to the menu.
 */
export function normalizeDishName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Parse a comma-separated list of allergen IDs into a clean, lowercased array.
 */
export function parseAllergenList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

/**
 * Find a cell value by tolerant header matching (case/space-insensitive).
 * Tries exact lowercased header names first, then a fuzzy "header includes ALL
 * keywords and NONE of the excludes" match. Returns "" if nothing matches.
 *
 * This keeps the parser working as the chef/Mosaic rename columns (the
 * Substitutions tab has gone Ingredient→Element, Solves→"Solves allergy", etc.).
 */
function pickCell(
  row: Record<string, string | undefined>,
  opts: { exact?: string[]; includes?: string[]; excludes?: string[] }
): string {
  const exact = opts.exact ?? [];
  const includes = opts.includes ?? [];
  const excludes = opts.excludes ?? [];
  const entries = Object.keys(row).map((k) => [k, k.trim().toLowerCase()] as const);

  for (const [key, k] of entries) {
    if (exact.includes(k)) return row[key] ?? "";
  }
  if (includes.length) {
    for (const [key, k] of entries) {
      if (includes.every((t) => k.includes(t)) && !excludes.some((t) => k.includes(t))) {
        return row[key] ?? "";
      }
    }
  }
  return "";
}

/**
 * Build a Substitution from a raw sheet row. Returns null for blank/invalid rows.
 *
 * Column mapping (header-name tolerant — handles both the original template and
 * Mosaic's richer schema):
 *   Dish        ← "Dish"/"Item", else first column
 *   Action      ← "Action"
 *   Ingredient  ← "Ingredient" or "Element"            (what's removed / swapped out)
 *   Substitute  ← "Substitute" / "Substitute Element (name…)", else the substitute
 *                 ingredient(s) column; "NO"/blank = no replacement
 *   Solves      ← "Solves" / "Solves allergy"
 *   Introduces  ← "Introduces" / "Introduces allergy …"
 */
export function parseSubstitutionRow(row: Record<string, string | undefined>): Substitution | null {
  const keys = Object.keys(row);
  const firstColValue = keys.length ? (row[keys[0]] ?? "") : "";

  const dish = (pickCell(row, { exact: ["dish", "item"] }) || firstColValue).trim();
  const actionRaw = pickCell(row, { exact: ["action"] }).trim().toLowerCase();
  const solves = parseAllergenList(pickCell(row, { exact: ["solves"], includes: ["solve"] }));

  // A usable row needs a dish and at least one solved allergen.
  if (!dish || solves.length === 0) return null;
  const action: SubstitutionAction = actionRaw === "substitute" ? "substitute" : "remove";

  const ingredient = pickCell(row, { exact: ["ingredient", "element"] }).trim();

  // Replacement: prefer a name column; fall back to the substitute ingredient(s)
  // column (some rows put the replacement name there). "NO"/blank => none.
  let substitute = pickCell(row, { exact: ["substitute"], includes: ["substitute", "name"] }).trim();
  if (!substitute || substitute.toUpperCase() === "NO") {
    substitute = pickCell(row, { includes: ["substitute", "ingredient"] }).trim();
  }
  if (substitute.toUpperCase() === "NO") substitute = "";

  const introduces =
    action === "substitute"
      ? parseAllergenList(pickCell(row, { exact: ["introduces"], includes: ["introduc", "allerg"] }))
      : [];

  return { dish, action, ingredient, substitute, solves, introduces };
}

function allergenLabel(id: string): string {
  return ALLERGEN_LABELS[id] || id;
}

/**
 * Render a single human-readable instruction for a modification, framed around
 * the allergen(s) it solves for THIS request.
 */
export function formatModification(sub: Substitution, solvedForRequest: string[]): string {
  const freed = solvedForRequest.map(allergenLabel);
  const freedPhrase = freed
    .map((label) => (DIETARY_PREFERENCES.has(label.toLowerCase()) ? `${label}` : `${label}-free`))
    .join(" & ");

  if (sub.action === "remove") {
    const what = sub.ingredient || "the relevant ingredient";
    return `Ask to remove ${what} (makes it ${freedPhrase})`;
  }

  const from = sub.ingredient || "ingredient";
  const to = sub.substitute || "an alternative";
  let line = `Swap ${from} → ${to} (makes it ${freedPhrase})`;
  if (sub.introduces.length > 0) {
    line += ` — note: adds ${sub.introduces.map(allergenLabel).join(", ")}`;
  }
  return line;
}

/**
 * Determine whether an excluded dish can be fully rescued by the chef's
 * substitutions for the diner's selections.
 *
 * @param dishSubs - substitutions available for this dish
 * @param triggeringAllergenIds - allergen IDs that caused the dish to be excluded
 * @param allSelectedAllergenIds - the diner's FULL selection (used for the
 *        "introduces" conflict guard)
 * @returns ordered, de-duped instruction strings if EVERY triggering allergen
 *          can be solved without introducing a selected allergen; otherwise null.
 */
export function findViableModifications(
  dishSubs: Substitution[],
  triggeringAllergenIds: string[],
  allSelectedAllergenIds: string[]
): string[] | null {
  if (dishSubs.length === 0) return null;

  const selectedSet = new Set(allSelectedAllergenIds.map((a) => a.toLowerCase()));
  // Track which substitution row solves which triggering allergen, so one row
  // covering several allergens (e.g. GF flour -> gluten + wheat) is shown once.
  const chosen = new Map<Substitution, string[]>();

  for (const allergenId of triggeringAllergenIds) {
    const id = allergenId.toLowerCase();

    // A viable sub solves this allergen AND introduces nothing the diner avoids.
    const viable = dishSubs.find(
      (s) =>
        s.solves.includes(id) &&
        !s.introduces.some((intro) => selectedSet.has(intro))
    );

    if (!viable) return null; // this triggering allergen can't be safely solved

    const existing = chosen.get(viable) || [];
    existing.push(id);
    chosen.set(viable, existing);
  }

  return Array.from(chosen.entries()).map(([sub, solvedIds]) =>
    formatModification(sub, solvedIds)
  );
}
