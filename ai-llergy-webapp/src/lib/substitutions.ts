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
 * Build a Substitution from a raw sheet row. Returns null for blank/invalid rows.
 */
export function parseSubstitutionRow(row: {
  Dish?: string;
  Action?: string;
  Ingredient?: string;
  Substitute?: string;
  Solves?: string;
  Introduces?: string;
}): Substitution | null {
  const dish = (row.Dish || "").trim();
  const actionRaw = (row.Action || "").trim().toLowerCase();
  const solves = parseAllergenList(row.Solves);

  // A usable row needs a dish, a known action, and at least one solved allergen.
  if (!dish || solves.length === 0) return null;
  const action: SubstitutionAction = actionRaw === "substitute" ? "substitute" : "remove";

  return {
    dish,
    action,
    ingredient: (row.Ingredient || "").trim(),
    substitute: (row.Substitute || "").trim(),
    solves,
    introduces: action === "substitute" ? parseAllergenList(row.Introduces) : [],
  };
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
