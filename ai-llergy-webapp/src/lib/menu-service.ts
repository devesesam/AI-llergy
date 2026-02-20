/**
 * Menu service with in-memory caching
 * Fetches from Google Sheets and caches for performance
 */

import { fetchMenuFromSheets, RawMenuItem } from "./google-sheets";
import { ALL_FILTERS } from "./allergens";

export interface MenuItem {
  name: string;
  ingredients: string;
  price: number;
  allergenProfile: Record<string, "YES" | "NO" | "CAN BE">;
}

// Cache configuration
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// In-memory cache
let menuCache: MenuItem[] | null = null;
let cacheTimestamp: number = 0;

// Track which allergen columns actually exist in the Google Sheet
// This is populated during menu fetch and used to determine hybrid filtering
let availableColumns: Set<string> = new Set();

/**
 * Detect which allergen columns exist in the sheet
 * A column "exists" if any item has a non-empty value for it
 */
function detectAvailableColumns(rawItems: RawMenuItem[]): Set<string> {
  const columns = new Set<string>();

  for (const raw of rawItems) {
    for (const allergen of ALL_FILTERS) {
      const col = allergen.columnName;
      const value = raw[col]?.trim();
      if (value && value !== "") {
        columns.add(col);
      }
    }
  }

  return columns;
}

/**
 * Transform raw sheet data into structured MenuItem
 * Only adds columns that exist in the sheet (availableColumns)
 * Missing columns are NOT added (undefined), not defaulted to "NO"
 */
function transformMenuItem(raw: RawMenuItem): MenuItem {
  const allergenProfile: Record<string, "YES" | "NO" | "CAN BE"> = {};

  for (const allergen of ALL_FILTERS) {
    const col = allergen.columnName;

    // Only process columns that exist in the sheet
    if (!availableColumns.has(col)) {
      continue; // Skip - column doesn't exist, will be handled by AI
    }

    const value = raw[col]?.toUpperCase().trim() || "";
    if (value === "YES") {
      allergenProfile[col] = "YES";
    } else if (value === "CAN BE") {
      allergenProfile[col] = "CAN BE";
    } else {
      allergenProfile[col] = "NO";
    }
  }

  return {
    name: raw.Item || "",
    ingredients: raw.Ingredients || "",
    price: parseFloat(raw.Price) || 0,
    allergenProfile,
  };
}

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
  if (!menuCache) return false;
  return Date.now() - cacheTimestamp < CACHE_TTL_MS;
}

/**
 * Get menu items (from cache or fresh fetch)
 */
export async function getMenu(): Promise<MenuItem[]> {
  if (isCacheValid() && menuCache) {
    return menuCache;
  }

  const rawItems = await fetchMenuFromSheets();

  // Detect which columns exist in the sheet BEFORE transforming items
  availableColumns = detectAvailableColumns(rawItems);
  console.log("[menu-service] Available columns:", Array.from(availableColumns));

  menuCache = rawItems.map(transformMenuItem).filter((item) => item.name); // Filter out empty items
  cacheTimestamp = Date.now();

  return menuCache;
}

/**
 * Force refresh the cache
 */
export async function refreshMenu(): Promise<MenuItem[]> {
  menuCache = null;
  cacheTimestamp = 0;
  availableColumns = new Set();
  return getMenu();
}

/**
 * Get cache status (for debugging/monitoring)
 */
export function getCacheStatus(): { cached: boolean; age: number; itemCount: number } {
  return {
    cached: menuCache !== null,
    age: menuCache ? Date.now() - cacheTimestamp : 0,
    itemCount: menuCache?.length || 0,
  };
}

/**
 * Get the set of allergen columns that exist in the Google Sheet
 * Used by route.ts to determine which allergens need AI filtering
 */
export function getAvailableColumns(): Set<string> {
  return availableColumns;
}
