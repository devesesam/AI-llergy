/**
 * Google Sheets integration for fetching menu data
 * Uses public CSV export - no authentication required
 */

const SHEET_ID = process.env.GOOGLE_SHEET_ID || "1HNWCErJzCBRfy-oPOqPgg1UYYbhOkD5tuVrLWevryeU";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// Every venue is a tab in this same spreadsheet. Which menu/substitutions tab to
// read is now passed in per call (see src/lib/venues.ts), not read from a global
// env var, so one deployment can serve many venues.

export interface RawMenuItem {
  Item: string;
  Ingredients: string;
  Price: string;
  Vegetarian: string;
  Vegan: string;
  "DAIRY FREE": string;
  "PISTACHIO FREE": string;
  "WALNUT FREE": string;
  "ALMOND FREE": string;
  "SOY FREE": string;
  "GLUTEN FREE": string;
  "SESAME FREE": string;
  "GARLIC FREE": string;
  "ONION FREE": string;
  "CAPSICUM FREE": string;
  "CHILI FREE": string;
  [key: string]: string; // Allow dynamic access
}

/**
 * A generic parsed sheet row (header -> cell value).
 */
export type RawSheetRow = Record<string, string>;

/**
 * Parse CSV string into array of row objects keyed by header.
 */
function parseCSV(csv: string): RawSheetRow[] {
  // Normalise line endings (Google may return \r\n) before splitting.
  const lines = csv.replace(/\r\n/g, "\n").trim().split("\n");
  if (lines.length < 2) return [];

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const items: RawSheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || !values[0]) continue; // Skip empty rows

    const item: RawSheetRow = {};
    headers.forEach((header, index) => {
      item[header] = values[index] || "";
    });
    items.push(item);
  }

  return items;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

/**
 * Fetch and parse a single tab of the spreadsheet via its public CSV export.
 * @param gid - optional tab id; omit (or empty) for the first/default tab.
 */
async function fetchSheetTab(gid?: string): Promise<RawSheetRow[]> {
  const url = gid ? `${CSV_URL}&gid=${gid}` : CSV_URL;
  const response = await fetch(url, {
    next: { revalidate: 0 }, // Don't cache at fetch level, we handle caching ourselves
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet (gid=${gid ?? "default"}): ${response.status} ${response.statusText}`);
  }

  const csv = await response.text();
  return parseCSV(csv);
}

/**
 * Fetch raw menu data from Google Sheets for a given venue's menu tab.
 * @param menuGid - the venue's menu-tab gid; omit/empty for the first/default tab.
 */
export async function fetchMenuFromSheets(menuGid?: string): Promise<RawMenuItem[]> {
  const rows = await fetchSheetTab(menuGid);
  return rows as RawMenuItem[];
}

/**
 * Raw row from the "Substitutions" tab. Headers: Dish, Action, Ingredient,
 * Substitute, Solves, Introduces. (See directives/substitutions.md.)
 */
export interface RawSubstitution {
  Dish: string;
  Action: string;
  Ingredient: string;
  Substitute: string;
  Solves: string;
  Introduces: string;
  [key: string]: string;
}

/**
 * Fetch chef-provided substitution rows from a venue's "Substitutions" tab.
 * Returns [] when no subsGid is given or the fetch fails, so the feature degrades
 * gracefully (app behaves exactly as before substitutions existed).
 * @param subsGid - the venue's substitutions-tab gid; omit when the venue has none.
 */
export async function fetchSubstitutionsFromSheets(subsGid?: string): Promise<RawSubstitution[]> {
  if (!subsGid) return [];
  try {
    const rows = await fetchSheetTab(subsGid);
    return rows as RawSubstitution[];
  } catch (error) {
    console.error("[google-sheets] Failed to fetch substitutions tab:", error);
    return [];
  }
}
