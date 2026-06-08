"use client";

import Link from "next/link";
import { Trash2, Pencil, AlertTriangle, Plus } from "lucide-react";
import { ALL_FILTERS } from "@/lib/allergens";
import { isIncomplete, incompleteReason } from "@/lib/menu-completeness";
import { cn } from "@/lib/cn";
import type { MenuEditorItem } from "./useMenuEditor";

interface MenuTableProps {
  venueId: string;
  items: MenuEditorItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onUpdate: (
    id: string,
    field: keyof MenuEditorItem,
    value: string | number | boolean | null
  ) => void;
  onToggleAllergen: (id: string, allergenId: string) => void;
  onDelete: (id: string) => void;
  onAddRow: () => void;
}

const cellInput =
  "w-full px-2 py-1.5 text-sm bg-transparent border border-transparent rounded hover:border-border focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-colors";

export function MenuTable({
  venueId,
  items,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onUpdate,
  onToggleAllergen,
  onDelete,
  onAddRow,
}: MenuTableProps) {
  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const colCount = ALL_FILTERS.length + 6;

  return (
    <div className="overflow-x-auto border border-border/60 rounded-2xl bg-surface">
      <table className="w-full border-collapse">
        <thead className="bg-muted-bg/80 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-3 w-10 border-b border-border">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-[#f4c025] cursor-pointer"
                aria-label="Select all"
              />
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider min-w-[180px] border-b border-border">
              Dish
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider min-w-[200px] border-b border-border">
              Ingredients
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider w-24 border-b border-border">
              Price
            </th>
            <th className="px-3 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider w-20 border-b border-border">
              Active
            </th>
            {ALL_FILTERS.map((allergen) => (
              <th
                key={allergen.id}
                className="px-2 py-3 text-center text-xs font-semibold text-text-muted whitespace-nowrap min-w-[56px] border-b border-border"
                title={`${allergen.label} free`}
              >
                <span className="text-base">{allergen.icon}</span>
                <span className="block text-[10px] mt-0.5 normal-case font-normal">
                  {allergen.label}
                </span>
              </th>
            ))}
            <th className="px-3 py-3 border-b border-border sticky right-0 bg-muted-bg/95 w-20" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {items.map((item) => {
            const selected = selectedIds.has(item.id);
            const incomplete = isIncomplete(item);
            return (
              <tr
                key={item.id}
                className={cn(
                  "group transition-colors",
                  selected ? "bg-primary/5" : "hover:bg-muted-bg/40"
                )}
              >
                <td className="px-3 py-2 align-middle">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelect(item.id)}
                    className="w-4 h-4 rounded border-border accent-[#f4c025] cursor-pointer"
                    aria-label={`Select ${item.name || "item"}`}
                  />
                </td>
                <td className="px-2 py-2 align-middle">
                  <div className="flex items-center gap-1.5">
                    {incomplete && (
                      <span title={incompleteReason(item) ?? "Incomplete"}>
                        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                      </span>
                    )}
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => onUpdate(item.id, "name", e.target.value)}
                      placeholder="Dish name..."
                      className={cn(cellInput, "font-medium text-text")}
                    />
                  </div>
                </td>
                <td className="px-2 py-2 align-middle">
                  <input
                    type="text"
                    value={item.ingredients || ""}
                    onChange={(e) =>
                      onUpdate(item.id, "ingredients", e.target.value || null)
                    }
                    placeholder="Ingredients..."
                    className={cn(cellInput, "text-text-muted")}
                  />
                </td>
                <td className="px-2 py-2 align-middle">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.price ?? ""}
                    onChange={(e) =>
                      onUpdate(
                        item.id,
                        "price",
                        e.target.value === "" ? null : parseFloat(e.target.value)
                      )
                    }
                    placeholder="—"
                    className={cn(cellInput, "text-text-muted w-20")}
                  />
                </td>
                <td className="px-3 py-2 text-center align-middle">
                  <input
                    type="checkbox"
                    checked={item.is_active}
                    onChange={(e) => onUpdate(item.id, "is_active", e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-[#f4c025] cursor-pointer"
                    aria-label="Active"
                  />
                </td>
                {ALL_FILTERS.map((allergen) => {
                  const on = item.allergens.includes(allergen.id);
                  return (
                    <td key={allergen.id} className="px-2 py-2 text-center align-middle">
                      <button
                        onClick={() => onToggleAllergen(item.id, allergen.id)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-sm transition-all",
                          on
                            ? "bg-success-bg text-success ring-2 ring-success/30"
                            : "bg-muted-bg text-text-muted/50 hover:bg-border/60"
                        )}
                        title={`${on ? "Free from" : "Not marked free from"} ${allergen.label}`}
                      >
                        {on ? "✓" : ""}
                      </button>
                    </td>
                  );
                })}
                <td className="px-2 py-2 align-middle sticky right-0 bg-surface group-hover:bg-muted-bg/40">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Link
                      href={`/dashboard/venues/${venueId}/menu/${item.id}`}
                      className={cn(
                        "p-1.5 text-text-muted hover:text-text hover:bg-muted-bg rounded transition-colors",
                        item.isNew && "pointer-events-none opacity-30"
                      )}
                      title={item.isNew ? "Save first to edit details" : "Edit details"}
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 text-text-muted hover:text-danger hover:bg-danger-bg rounded transition-colors"
                      title="Delete row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}

          {items.length === 0 && (
            <tr>
              <td colSpan={colCount} className="py-12 text-center text-sm text-text-muted">
                No dishes match. Adjust your filters or add a dish below.
              </td>
            </tr>
          )}

          <tr className="border-t-2 border-dashed border-border">
            <td colSpan={colCount} className="py-2 px-3">
              <button
                onClick={onAddRow}
                className="w-full py-3 flex items-center justify-center gap-2 text-text-muted hover:text-primary-hover hover:bg-primary/5 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="text-sm font-medium">Add new dish</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
