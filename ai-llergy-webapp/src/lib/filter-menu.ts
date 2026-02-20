/**
 * Menu filtering logic based on allergen selections
 * Handles YES/NO/CAN BE values from the sheet
 * Also supports confidence-based filtering for Supabase venues
 */

import { MenuItem } from "./menu-service";
import { ALLERGEN_TO_COLUMN, SeverityType } from "./allergens";
import {
  SEVERITY_THRESHOLDS,
  DEFAULT_NO_DATA_CONFIDENCE,
  AllergenWithSeverity,
  getFilterCategory,
} from "./confidence";

export interface FilteredItem {
  item: MenuItem;
  safe: boolean;
  warnings: string[]; // Allergens marked as "CAN BE"
  excluded: string[]; // Allergens that caused exclusion (for debugging)
}

export interface FilterResult {
  safeItems: FilteredItem[];
  cautionItems: FilteredItem[]; // Items with "CAN BE" warnings
  excludedCount: number;
}

/**
 * Filter menu based on user's allergen selections
 *
 * Logic:
 * - YES = item is safe for this allergen (passes)
 * - NO = item contains this allergen (excluded)
 * - CAN BE = item may be made safe (included with warning)
 *
 * @param menu - Full menu from the cache
 * @param selectedAllergens - Array of allergen IDs the user selected
 * @returns Filtered results with safe items, caution items, and excluded count
 */
export function filterMenu(menu: MenuItem[], selectedAllergens: string[]): FilterResult {
  if (selectedAllergens.length === 0) {
    // No filters selected - return all items as safe
    return {
      safeItems: menu.map((item) => ({ item, safe: true, warnings: [], excluded: [] })),
      cautionItems: [],
      excludedCount: 0,
    };
  }

  const safeItems: FilteredItem[] = [];
  const cautionItems: FilteredItem[] = [];
  let excludedCount = 0;

  for (const item of menu) {
    const warnings: string[] = [];
    const excluded: string[] = [];
    let isExcluded = false;

    for (const allergenId of selectedAllergens) {
      const columnName = ALLERGEN_TO_COLUMN[allergenId];
      if (!columnName) continue; // Unknown allergen ID

      const value = item.allergenProfile[columnName];

      // If column doesn't exist in sheet, value is undefined
      // Skip this allergen - it will be handled by AI filtering in route.ts
      if (value === undefined) {
        continue;
      }

      if (value === "NO") {
        // Item is NOT safe for this allergen
        isExcluded = true;
        excluded.push(allergenId);
      } else if (value === "CAN BE") {
        // Item CAN BE made safe - add warning
        warnings.push(allergenId);
      }
      // value === "YES" means safe, no action needed
    }

    if (isExcluded) {
      excludedCount++;
    } else if (warnings.length > 0) {
      cautionItems.push({ item, safe: false, warnings, excluded });
    } else {
      safeItems.push({ item, safe: true, warnings: [], excluded: [] });
    }
  }

  return { safeItems, cautionItems, excludedCount };
}

/**
 * Format warnings for display
 * Converts allergen IDs to human-readable messages
 */
export function formatWarnings(warnings: string[]): string[] {
  const allergenLabels: Record<string, string> = {
    dairy: "Dairy",
    pistachio: "Pistachio",
    walnut: "Walnut",
    almond: "Almond",
    soy: "Soy",
    gluten: "Gluten",
    sesame: "Sesame",
    garlic: "Garlic",
    onion: "Onion",
    capsicum: "Capsicum",
    chili: "Chili",
    vegetarian: "Vegetarian",
    vegan: "Vegan",
  };

  // Dietary preferences don't use "-free" suffix
  const dietaryPreferences = new Set(["vegan", "vegetarian"]);

  return warnings.map((w) => {
    const label = allergenLabels[w] || w;
    if (dietaryPreferences.has(w)) {
      return `Can be made ${label} on request`;
    }
    return `Can be made ${label}-free on request`;
  });
}

/**
 * Extended menu item interface with confidence scores
 */
export interface MenuItemWithConfidence extends MenuItem {
  allergenConfidence?: Record<string, number>;
}

/**
 * Filter menu using pre-computed confidence scores and severity-based thresholds
 *
 * This is used for Supabase-backed venues that have allergen_confidence stored.
 * Uses severity to determine threshold:
 * - preference: >25% confidence required
 * - allergy: >80% confidence required
 * - life_threatening: >95% confidence required
 *
 * @param menu - Menu items with pre-computed confidence scores
 * @param selectedAllergens - Allergens with severity levels
 * @returns Filtered results with safe items, caution items, and excluded count
 */
export function filterMenuWithConfidence(
  menu: MenuItemWithConfidence[],
  selectedAllergens: AllergenWithSeverity[]
): FilterResult {
  if (selectedAllergens.length === 0) {
    return {
      safeItems: menu.map((item) => ({ item, safe: true, warnings: [], excluded: [] })),
      cautionItems: [],
      excludedCount: 0,
    };
  }

  const safeItems: FilteredItem[] = [];
  const cautionItems: FilteredItem[] = [];
  let excludedCount = 0;

  for (const item of menu) {
    const confidenceScores = item.allergenConfidence || {};
    const warnings: string[] = [];
    const excluded: string[] = [];
    let isExcluded = false;
    let isCaution = false;

    for (const { id: allergenId, type: severity } of selectedAllergens) {
      const threshold = SEVERITY_THRESHOLDS[severity];
      const itemConfidence = confidenceScores[allergenId] ?? DEFAULT_NO_DATA_CONFIDENCE;

      const category = getFilterCategory(itemConfidence, threshold);

      if (category === "excluded") {
        isExcluded = true;
        excluded.push(allergenId);
        break; // No need to check more allergens
      } else if (category === "caution") {
        isCaution = true;
        warnings.push(allergenId);
      }
      // "safe" means this allergen passes, continue checking others
    }

    if (isExcluded) {
      excludedCount++;
    } else if (isCaution) {
      cautionItems.push({ item, safe: false, warnings, excluded });
    } else {
      safeItems.push({ item, safe: true, warnings: [], excluded: [] });
    }
  }

  return { safeItems, cautionItems, excludedCount };
}

/**
 * Check if a menu has pre-computed confidence scores
 */
export function hasConfidenceScores(menu: MenuItem[]): boolean {
  if (menu.length === 0) return false;
  // Check first item for allergenConfidence
  const firstItem = menu[0] as MenuItemWithConfidence;
  return (
    firstItem.allergenConfidence !== undefined &&
    Object.keys(firstItem.allergenConfidence).length > 0
  );
}
