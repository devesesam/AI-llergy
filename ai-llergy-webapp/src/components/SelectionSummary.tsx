"use client";

import { SelectedAllergen, getAllergenById, CustomTag } from "@/lib/allergens";

interface SelectionSummaryProps {
  selectedAllergens: SelectedAllergen[];
  customAllergenIds?: string[];
  customTags?: CustomTag[];
}

export default function SelectionSummary({
  selectedAllergens,
  customAllergenIds = [],
  customTags = [],
}: SelectionSummaryProps) {
  // Filter out custom allergen IDs that are already in selectedAllergens (to avoid duplicates)
  const selectedIds = new Set(selectedAllergens.map(s => s.id));
  const uniqueCustomIds = customAllergenIds.filter(id => !selectedIds.has(id));

  // Check if there's anything to display
  const hasSelections = selectedAllergens.length > 0 || uniqueCustomIds.length > 0 || customTags.length > 0;

  if (!hasSelections) {
    return null;
  }

  // Build a single flat list of pills. Severity grouping was removed (severity is
  // no longer collected from the user), so all selections render together.
  const pills: { key: string; icon: string; label: string }[] = [];

  // Known allergens chosen via buttons (and any custom-search allergens already merged in)
  selectedAllergens.forEach(selection => {
    const allergen = getAllergenById(selection.id);
    if (allergen) {
      pills.push({ key: `sel-${selection.id}`, icon: allergen.icon, label: allergen.label });
    }
  });

  // Known allergens added via search that weren't already in selectedAllergens
  uniqueCustomIds.forEach(id => {
    const allergen = getAllergenById(id);
    if (allergen) {
      pills.push({ key: `custom-${id}`, icon: allergen.icon, label: allergen.label });
    }
  });

  // Free-form custom restrictions
  customTags.forEach(tag => {
    pills.push({ key: `tag-${tag.id}`, icon: "🏷️", label: tag.displayLabel });
  });

  return (
    <div className="selection-summary">
      <h3 className="selection-summary__title">Your Selections</h3>
      <div className="selection-summary__pills">
        {pills.map(pill => (
          <span key={pill.key} className="selection-pill">
            <span className="selection-pill__icon">{pill.icon}</span>
            <span className="selection-pill__label">{pill.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
