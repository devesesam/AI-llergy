"use client";

import type { Allergen, SeverityType } from "@/lib/allergens";

interface AllergenButtonProps {
  allergen: Allergen;
  isSelected: boolean;
  isPending?: boolean; // Selected but no severity assigned yet
  selectionType?: SeverityType;
  variant?: "tile" | "row"; // "tile" = square grid cell, "row" = full-width row
  onToggle: (id: string) => void;
}

export default function AllergenButton({
  allergen,
  isSelected,
  isPending = false,
  selectionType,
  variant = "tile",
  onToggle,
}: AllergenButtonProps) {
  const getClassName = () => {
    let className = "allergen-option";
    if (variant === "row") {
      className += " allergen-option--row";
    }
    if (isSelected || isPending) {
      className += " selected";
      if (isPending) {
        className += " selected--pending";
      } else if (selectionType === "preference") {
        className += " selected--preference";
      } else if (selectionType === "allergy") {
        className += " selected--allergy";
      } else if (selectionType === "life_threatening") {
        className += " selected--life_threatening";
      }
    }
    return className;
  };

  const getBadgeLabel = () => {
    if (selectionType === "preference") return "P";
    if (selectionType === "allergy") return "A";
    if (selectionType === "life_threatening") return "L";
    return "";
  };

  return (
    <button
      className={getClassName()}
      onClick={() => onToggle(allergen.id)}
      type="button"
    >
      <span className="icon">{allergen.icon}</span>
      <span className="label">{allergen.label}</span>
      {isSelected && selectionType && (
        <span className={`type-badge type-badge--${selectionType}`}>
          {getBadgeLabel()}
        </span>
      )}
    </button>
  );
}
