"use client";

import { useState } from "react";
import { AllergenGroup as AllergenGroupType, Allergen, SelectedAllergen, SeverityType, getAllergenById } from "@/lib/allergens";
import AllergenButton from "./AllergenButton";

interface AllergenGroupProps {
  group: AllergenGroupType;
  pendingAllergenIds: string[];
  selectedAllergens: SelectedAllergen[];
  onAllergenClick: (allergen: Allergen) => void;
}

export default function AllergenGroup({
  group,
  pendingAllergenIds,
  selectedAllergens,
  onAllergenClick,
}: AllergenGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get allergen objects for this group's members
  const memberAllergens = group.members
    .map(id => getAllergenById(id))
    .filter((a): a is Allergen => a !== undefined);

  // Check if an allergen is pending
  const isPending = (id: string): boolean => {
    return pendingAllergenIds.includes(id);
  };

  // Check if an allergen is confirmed
  const isConfirmed = (id: string): boolean => {
    return selectedAllergens.some(s => s.id === id);
  };

  // Count how many in this group are selected (pending or confirmed)
  const selectedCount = group.members.filter(id =>
    pendingAllergenIds.includes(id) || selectedAllergens.some(s => s.id === id)
  ).length;

  // Get selection type for a confirmed allergen
  const getSelectionType = (id: string): SeverityType | undefined => {
    const selection = selectedAllergens.find(s => s.id === id);
    return selection?.type;
  };

  return (
    <div className={`allergen-group ${isExpanded ? "allergen-group--expanded" : ""}`}>
      <button
        className={`allergen-group__header ${selectedCount > 0 ? "allergen-group__header--has-selection" : ""}`}
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <span className="allergen-group__icon">{group.icon}</span>
        <span className="allergen-group__label">{group.label}</span>
        {selectedCount > 0 && (
          <span className="allergen-group__count">
            {selectedCount}/{group.members.length}
          </span>
        )}
        <span className={`allergen-group__chevron ${isExpanded ? "allergen-group__chevron--up" : ""}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="allergen-group__dropdown">
          {memberAllergens.map(allergen => (
            <AllergenButton
              key={allergen.id}
              allergen={allergen}
              isSelected={isConfirmed(allergen.id)}
              isPending={isPending(allergen.id)}
              selectionType={getSelectionType(allergen.id)}
              onToggle={() => onAllergenClick(allergen)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
