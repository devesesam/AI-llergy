/**
 * Menu item completeness checks.
 *
 * An item is "incomplete" when it lacks the data the public allergen filter
 * needs to be trustworthy: no ingredients listed, or no free-from flags set.
 * Surfaced as per-row warnings + a summary banner in the menu workspace.
 */

export interface CompletenessItem {
  ingredients: string | null;
  allergens: string[];
}

export function isIncomplete(item: CompletenessItem): boolean {
  const hasIngredients = !!item.ingredients && item.ingredients.trim().length > 0;
  const hasAllergens = (item.allergens?.length ?? 0) > 0;
  return !hasIngredients || !hasAllergens;
}

export function incompleteReason(item: CompletenessItem): string | null {
  const hasIngredients = !!item.ingredients && item.ingredients.trim().length > 0;
  const hasAllergens = (item.allergens?.length ?? 0) > 0;
  if (!hasIngredients && !hasAllergens) return "Missing ingredients and allergen flags";
  if (!hasIngredients) return "Missing ingredients";
  if (!hasAllergens) return "No allergen flags set";
  return null;
}

export function countIncomplete(items: CompletenessItem[]): number {
  return items.reduce((n, item) => (isIncomplete(item) ? n + 1 : n), 0);
}
