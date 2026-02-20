"use client";

import { getAllergenById } from "@/lib/allergens";

interface AllergenTagProps {
  allergenId: string;
  onRemove: (id: string) => void;
}

export default function AllergenTag({ allergenId, onRemove }: AllergenTagProps) {
  const allergen = getAllergenById(allergenId);

  if (!allergen) {
    return null;
  }

  return (
    <span className="allergen-tag">
      <span className="allergen-tag__icon">{allergen.icon}</span>
      <span className="allergen-tag__label">{allergen.label}</span>
      <button
        type="button"
        className="allergen-tag__remove"
        onClick={() => onRemove(allergenId)}
        aria-label={`Remove ${allergen.label}`}
      >
        ×
      </button>
    </span>
  );
}
