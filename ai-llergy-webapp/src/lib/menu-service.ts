/**
 * Menu service with in-memory caching, keyed per venue.
 * Fetches each venue's menu/substitutions from its tab in the shared Google
 * Sheet and caches them independently for performance.
 */

import { fetchMenuFromSheets, fetchSubstitutionsFromSheets, RawMenuItem } from "./google-sheets";
import { ALL_FILTERS } from "./allergens";
import { Substitution, parseSubstitutionRow, normalizeDishName } from "./substitutions";
import { VenueConfig } from "./venues";

export interface MenuItem {
  name: string;
  ingredients: string;
  price: number;
  allergenProfile: Record<string, "YES" | "NO" | "CAN BE">;
}

// Cache configuration
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Per-venue menu cache. Each entry also carries the set of allergen columns that
// actually exist in that venue's sheet (used to decide column vs AI filtering).
interface MenuCacheEntry {
  items: MenuItem[];
  timestamp: number;
  columns: Set<string>;
}
const menuCacheByVenue = new Map<string, MenuCacheEntry>();

// Per-venue substitutions cache (normalized dish name -> substitutions).
interface SubsCacheEntry {
  map: Map<string, Substitution[]>;
  timestamp: number;
}
const subsCacheByVenue = new Map<string, SubsCacheEntry>();

const isFresh = (timestamp: number): boolean => Date.now() - timestamp < CACHE_TTL_MS;

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
 * Only adds columns that exist in the sheet (availableColumns for this venue)
 * Missing columns are NOT added (undefined), not defaulted to "NO"
 */
function transformMenuItem(raw: RawMenuItem, availableColumns: Set<string>): MenuItem {
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

  // Dish name: the sheet's first column, whatever it's headed. People keep
  // renaming column A (Item → Dish → Element → ...), so don't depend on the
  // header name — fall back to the first column's value. Explicit "Item"/"Dish"
  // headers still take priority if present.
  const firstColumnValue = raw[Object.keys(raw)[0]] || "";

  return {
    name: (raw.Item || raw.Dish || firstColumnValue || "").trim(),
    ingredients: raw.Ingredients || "",
    price: parseFloat(raw.Price) || 0,
    allergenProfile,
  };
}

/**
 * Get menu items for a venue (from cache or fresh fetch).
 */
export async function getMenu(venue: VenueConfig): Promise<MenuItem[]> {
  const cached = menuCacheByVenue.get(venue.slug);
  if (cached && isFresh(cached.timestamp)) {
    return cached.items;
  }

  const rawItems = await fetchMenuFromSheets(venue.menuGid);

  // Detect which columns exist in this venue's sheet BEFORE transforming items
  const columns = detectAvailableColumns(rawItems);
  console.log(`[menu-service] [${venue.slug}] Available columns:`, Array.from(columns));

  const items = rawItems
    .map((raw) => transformMenuItem(raw, columns))
    .filter((item) => item.name); // Filter out empty items

  menuCacheByVenue.set(venue.slug, { items, timestamp: Date.now(), columns });
  return items;
}

/**
 * Force refresh a venue's cache.
 */
export async function refreshMenu(venue: VenueConfig): Promise<MenuItem[]> {
  menuCacheByVenue.delete(venue.slug);
  return getMenu(venue);
}

/**
 * Get chef-provided substitutions for a venue, keyed by normalized dish name.
 * Cached for the same TTL as the menu. Returns an empty map when the venue has
 * no Substitutions tab configured (feature dormant for that venue).
 */
export async function getSubstitutions(venue: VenueConfig): Promise<Map<string, Substitution[]>> {
  const cached = subsCacheByVenue.get(venue.slug);
  if (cached && isFresh(cached.timestamp)) {
    return cached.map;
  }

  const rawRows = await fetchSubstitutionsFromSheets(venue.substitutionsGid);
  const map = new Map<string, Substitution[]>();

  for (const row of rawRows) {
    const sub = parseSubstitutionRow(row);
    if (!sub) continue;
    const key = normalizeDishName(sub.dish);
    const existing = map.get(key);
    if (existing) {
      existing.push(sub);
    } else {
      map.set(key, [sub]);
    }
  }

  subsCacheByVenue.set(venue.slug, { map, timestamp: Date.now() });
  console.log(`[menu-service] [${venue.slug}] Loaded substitutions for ${map.size} dish(es)`);
  return map;
}

/**
 * Get cache status for a venue (for debugging/monitoring).
 */
export function getCacheStatus(venue: VenueConfig): { cached: boolean; age: number; itemCount: number } {
  const cached = menuCacheByVenue.get(venue.slug);
  return {
    cached: !!cached,
    age: cached ? Date.now() - cached.timestamp : 0,
    itemCount: cached?.items.length || 0,
  };
}

/**
 * Get the set of allergen columns that exist in a venue's sheet.
 * Used by route.ts to determine which allergens need AI filtering.
 * Call after getMenu(venue) so the venue's cache entry is populated.
 */
export function getAvailableColumns(venue: VenueConfig): Set<string> {
  return menuCacheByVenue.get(venue.slug)?.columns ?? new Set();
}
