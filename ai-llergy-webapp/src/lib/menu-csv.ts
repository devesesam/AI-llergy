/**
 * Client-side CSV export for menu items.
 *
 * Column format is symmetric with the importer: Item, Ingredients, Price,
 * Active, then one column per allergen using its `columnName` (e.g. "DAIRY
 * FREE"), with "YES" where the item is free from that allergen.
 */
import { ALL_FILTERS } from "./allergens";

export interface ExportableMenuItem {
  name: string;
  ingredients: string | null;
  price: number | null;
  is_active: boolean;
  allergens: string[]; // allergen ids the item is FREE from
}

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildMenuCSV(items: ExportableMenuItem[]): string {
  const header = [
    "Item",
    "Ingredients",
    "Price",
    "Active",
    ...ALL_FILTERS.map((a) => a.columnName),
  ];

  const rows = items.map((item) => {
    const allergenSet = new Set(item.allergens);
    return [
      item.name,
      item.ingredients ?? "",
      item.price != null ? item.price.toFixed(2) : "",
      item.is_active ? "YES" : "NO",
      ...ALL_FILTERS.map((a) => (allergenSet.has(a.id) ? "YES" : "")),
    ]
      .map((c) => escapeCell(String(c)))
      .join(",");
  });

  return [header.map(escapeCell).join(","), ...rows].join("\n");
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
