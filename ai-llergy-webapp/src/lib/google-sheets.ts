/**
 * Google Sheets integration for fetching menu data
 * Uses public CSV export - no authentication required
 */

const SHEET_ID = process.env.GOOGLE_SHEET_ID || "1HNWCErJzCBRfy-oPOqPgg1UYYbhOkD5tuVrLWevryeU";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

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
 * Parse CSV string into array of objects
 */
function parseCSV(csv: string): RawMenuItem[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const items: RawMenuItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || !values[0]) continue; // Skip empty rows

    const item: Record<string, string> = {};
    headers.forEach((header, index) => {
      item[header] = values[index] || "";
    });
    items.push(item as RawMenuItem);
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
 * Fetch raw menu data from Google Sheets
 */
export async function fetchMenuFromSheets(): Promise<RawMenuItem[]> {
  const response = await fetch(CSV_URL, {
    next: { revalidate: 0 }, // Don't cache at fetch level, we handle caching ourselves
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch menu: ${response.status} ${response.statusText}`);
  }

  const csv = await response.text();
  return parseCSV(csv);
}
