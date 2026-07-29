"use client";

import { useMemo, useState } from "react";
import { Save, AlertTriangle } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { buildMenuCSV, downloadCSV } from "@/lib/menu-csv";
import { isIncomplete, countIncomplete } from "@/lib/menu-completeness";
import { useMenuEditor, type MenuItemDB } from "./useMenuEditor";
import { MenuToolbar, type StatusFilter, type SortKey } from "./MenuToolbar";
import { MenuBulkBar } from "./MenuBulkBar";
import { MenuTable } from "./MenuTable";

interface MenuWorkspaceProps {
  venueId: string;
  venueSlug: string;
  menuItems: MenuItemDB[];
}

export function MenuWorkspace({ venueId, venueSlug, menuItems }: MenuWorkspaceProps) {
  const toast = useToast();
  const editor = useMenuEditor(venueId, menuItems);
  const {
    items,
    isDirty,
    isSaving,
    selectedIds,
    updateItem,
    toggleAllergen,
    addRow,
    deleteRow,
    toggleSelect,
    setSelection,
    clearSelection,
    bulkSetActive,
    bulkDelete,
    bulkSetAllergens,
    save,
  } = editor;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [allergen, setAllergen] = useState("");
  const [sort, setSort] = useState<SortKey>("name-asc");

  const incompleteCount = useMemo(() => countIncomplete(items), [items]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = items.filter((item) => {
      if (q) {
        const hay = `${item.name} ${item.ingredients ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status === "active" && !item.is_active) return false;
      if (status === "inactive" && item.is_active) return false;
      if (status === "incomplete" && !isIncomplete(item)) return false;
      if (allergen && !item.allergens.includes(allergen)) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sort) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return (a.price ?? Infinity) - (b.price ?? Infinity);
        case "price-desc":
          return (b.price ?? -Infinity) - (a.price ?? -Infinity);
        case "incomplete-first":
          return Number(isIncomplete(b)) - Number(isIncomplete(a));
        case "name-asc":
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [items, search, status, allergen, sort]);

  const handleSave = async () => {
    try {
      await save();
      toast.success("Menu saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save menu");
    }
  };

  const handleExport = () => {
    if (items.length === 0) {
      toast.error("Nothing to export yet");
      return;
    }
    downloadCSV(`menukey-${venueSlug || "menu"}.csv`, buildMenuCSV(items));
    toast.success("Menu exported");
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) setSelection(visibleItems.map((i) => i.id));
    else clearSelection();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-text-muted">
          {items.length} {items.length === 1 ? "dish" : "dishes"}
          {isDirty && (
            <span className="text-warning font-medium"> · Unsaved changes</span>
          )}
        </p>
        <Button
          onClick={handleSave}
          disabled={!isDirty}
          loading={isSaving}
          icon={<Save className="w-4 h-4" />}
        >
          Save changes
        </Button>
      </div>

      <MenuToolbar
        venueId={venueId}
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        allergen={allergen}
        onAllergen={setAllergen}
        sort={sort}
        onSort={setSort}
        onExport={handleExport}
        onAddRow={addRow}
      />

      {incompleteCount > 0 && status !== "incomplete" && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-bg px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
          <p className="text-sm text-text flex-1">
            {incompleteCount} {incompleteCount === 1 ? "item is" : "items are"}{" "}
            missing ingredients or allergen flags.
          </p>
          <button
            onClick={() => setStatus("incomplete")}
            className="text-sm font-medium text-warning hover:underline"
          >
            Review
          </button>
        </div>
      )}

      {selectedIds.size > 0 && (
        <MenuBulkBar
          count={selectedIds.size}
          onActivate={() => bulkSetActive(true)}
          onDeactivate={() => bulkSetActive(false)}
          onDelete={bulkDelete}
          onSetAllergens={bulkSetAllergens}
          onClear={clearSelection}
        />
      )}

      <MenuTable
        venueId={venueId}
        items={visibleItems}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onUpdate={updateItem}
        onToggleAllergen={toggleAllergen}
        onDelete={deleteRow}
        onAddRow={addRow}
      />
    </div>
  );
}
