"use client";

import {
  DIETARY_PREFERENCES,
  PRIMARY_ALLERGENS,
  SECONDARY_ALLERGENS,
  Allergen,
  SelectedAllergen,
  SeverityType,
} from "@/lib/allergens";
import AllergenButton from "./AllergenButton";
import AllergenGroup from "./AllergenGroup";

interface AllergenGridProps {
  pendingAllergenIds: string[];
  selectedAllergens: SelectedAllergen[];
  onAllergenClick: (allergen: Allergen) => void;
}

export default function AllergenGrid({
  pendingAllergenIds,
  selectedAllergens,
  onAllergenClick,
}: AllergenGridProps) {
  // Check if an allergen is pending (selected but no severity assigned)
  const isPending = (id: string): boolean => {
    return pendingAllergenIds.includes(id);
  };

  // Check if an allergen is confirmed (has severity assigned)
  const isConfirmed = (id: string): boolean => {
    return selectedAllergens.some(s => s.id === id);
  };

  // Get selection type for a confirmed allergen
  const getSelectionType = (id: string): SeverityType | undefined => {
    const selection = selectedAllergens.find(s => s.id === id);
    return selection?.type;
  };

  return (
    <div className="allergen-grid">
      {/* Dietary Preferences */}
      <div className="allergen-grid__section">
        <h3 className="allergen-grid__section-title">Dietary Preferences</h3>
        <div className="allergen-grid__rows">
          {DIETARY_PREFERENCES.map((allergen) => (
            <AllergenButton
              key={allergen.id}
              allergen={allergen}
              variant="row"
              isSelected={isConfirmed(allergen.id)}
              isPending={isPending(allergen.id)}
              selectionType={getSelectionType(allergen.id)}
              onToggle={() => onAllergenClick(allergen)}
            />
          ))}
        </div>
      </div>

      {/* Common Allergens — shown directly, each on its own row */}
      <div className="allergen-grid__section">
        <h3 className="allergen-grid__section-title">Common Allergens</h3>
        <div className="allergen-grid__rows">
          {PRIMARY_ALLERGENS.map((allergen) => (
            <AllergenButton
              key={allergen.id}
              allergen={allergen}
              variant="row"
              isSelected={isConfirmed(allergen.id)}
              isPending={isPending(allergen.id)}
              selectionType={getSelectionType(allergen.id)}
              onToggle={() => onAllergenClick(allergen)}
            />
          ))}
        </div>
      </div>

      {/* Everything else — collapsed into a single dropdown */}
      <div className="allergen-grid__section">
        <AllergenGroup
          group={{
            id: "more",
            label: "More allergens",
            icon: "➕",
            members: SECONDARY_ALLERGENS.map((a) => a.id),
          }}
          pendingAllergenIds={pendingAllergenIds}
          selectedAllergens={selectedAllergens}
          onAllergenClick={onAllergenClick}
        />
      </div>
    </div>
  );
}
