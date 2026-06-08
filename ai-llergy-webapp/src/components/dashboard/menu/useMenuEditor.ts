"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ALL_FILTERS } from "@/lib/allergens";

// ---- allergen_profile <-> allergen-id-array conversion ----------------------

export const allergenIdToProfileKey = (id: string): string => {
  if (id === "treenuts") return "tree_nut_free";
  if (id === "peanuts") return "peanut_free";
  return `${id}_free`;
};

const profileKeyToAllergenId = (key: string): string | null => {
  if (!key.endsWith("_free")) return null;
  const base = key.replace(/_free$/, "");
  if (base === "tree_nut") return "treenuts";
  if (base === "peanut") return "peanuts";
  return base;
};

export const profileToArray = (
  profile: Record<string, boolean> | null | undefined
): string[] => {
  if (!profile || typeof profile !== "object") return [];
  return Object.entries(profile)
    .filter(([, value]) => value === true)
    .map(([key]) => profileKeyToAllergenId(key))
    .filter((id): id is string => id !== null);
};

export const arrayToProfile = (allergenIds: string[]): Record<string, boolean> => {
  const profile: Record<string, boolean> = {};
  ALL_FILTERS.forEach((allergen) => {
    profile[allergenIdToProfileKey(allergen.id)] = false;
  });
  allergenIds.forEach((id) => {
    profile[allergenIdToProfileKey(id)] = true;
  });
  return profile;
};

// ---- types ------------------------------------------------------------------

export interface MenuItemDB {
  id: string;
  name: string;
  ingredients: string | null;
  allergen_profile: Record<string, boolean> | null;
  price: number | null;
  is_active: boolean;
}

export interface MenuEditorItem {
  id: string;
  name: string;
  ingredients: string | null;
  allergens: string[];
  price: number | null;
  is_active: boolean;
  isNew?: boolean;
}

const convertFromDB = (dbItems: MenuItemDB[]): MenuEditorItem[] =>
  dbItems.map((item) => ({
    id: item.id,
    name: item.name,
    ingredients: item.ingredients,
    allergens: profileToArray(item.allergen_profile),
    price: item.price,
    is_active: item.is_active,
  }));

let newIdCounter = 0;

// ---- hook -------------------------------------------------------------------

export function useMenuEditor(venueId: string, initial: MenuItemDB[]) {
  const [items, setItems] = useState<MenuEditorItem[]>(() => convertFromDB(initial));
  const [originalItems, setOriginalItems] = useState<MenuEditorItem[]>(() =>
    convertFromDB(initial)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isDirty = useMemo(() => {
    if (items.length !== originalItems.length) return true;
    return items.some((item) => {
      const original = originalItems.find((o) => o.id === item.id);
      if (!original) return true;
      if (item.name !== original.name) return true;
      if (item.ingredients !== original.ingredients) return true;
      if (item.price !== original.price) return true;
      if (item.is_active !== original.is_active) return true;
      const a = [...item.allergens].sort().join(",");
      const b = [...original.allergens].sort().join(",");
      return a !== b;
    });
  }, [items, originalItems]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // ---- single-item edits ----

  const updateItem = useCallback(
    (id: string, field: keyof MenuEditorItem, value: string | string[] | number | boolean | null) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  const toggleAllergen = useCallback((itemId: string, allergenId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const has = item.allergens.includes(allergenId);
        return {
          ...item,
          allergens: has
            ? item.allergens.filter((a) => a !== allergenId)
            : [...item.allergens, allergenId],
        };
      })
    );
  }, []);

  const addRow = useCallback((): string => {
    const id = `new_${++newIdCounter}`;
    setItems((prev) => [
      ...prev,
      { id, name: "", ingredients: null, allergens: [], price: null, is_active: true, isNew: true },
    ]);
    return id;
  }, []);

  const deleteRow = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // ---- selection ----

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setSelection = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ---- bulk actions (mutate state; persisted via save) ----

  const bulkSetActive = useCallback(
    (active: boolean) => {
      setItems((prev) =>
        prev.map((item) =>
          selectedIds.has(item.id) ? { ...item, is_active: active } : item
        )
      );
    },
    [selectedIds]
  );

  const bulkDelete = useCallback(() => {
    setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    clearSelection();
  }, [selectedIds, clearSelection]);

  const bulkSetAllergens = useCallback(
    (allergenIds: string[], mode: "add" | "remove") => {
      setItems((prev) =>
        prev.map((item) => {
          if (!selectedIds.has(item.id)) return item;
          const set = new Set(item.allergens);
          if (mode === "add") allergenIds.forEach((a) => set.add(a));
          else allergenIds.forEach((a) => set.delete(a));
          return { ...item, allergens: [...set] };
        })
      );
    },
    [selectedIds]
  );

  // ---- persistence ----

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      const dbItems = items.map((item) => ({
        id: item.id,
        name: item.name,
        ingredients: item.ingredients,
        allergen_profile: arrayToProfile(item.allergens),
        price: item.price,
        is_active: item.is_active,
        isNew: item.isNew,
      }));

      const response = await fetch(`/api/venues/${venueId}/menu`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: dbItems }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save menu");
      }

      const data = await response.json();
      const saved = convertFromDB(data.items);
      setItems(saved);
      setOriginalItems(saved);
      clearSelection();
    } finally {
      setIsSaving(false);
    }
  }, [items, venueId, clearSelection]);

  return {
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
  };
}
