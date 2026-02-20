"use client";

import { Allergen } from "@/lib/allergens";

interface AllergenTypeModalProps {
  allergen: Allergen;
  isOpen: boolean;
  onSelect: (type: "allergy" | "preference") => void;
  onClose: () => void;
}

export default function AllergenTypeModal({
  allergen,
  isOpen,
  onSelect,
  onClose,
}: AllergenTypeModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="type-modal">
        <div className="type-modal__header">
          <span className="type-modal__icon">{allergen.icon}</span>
          <h3 className="type-modal__title">{allergen.label}</h3>
        </div>
        <p className="type-modal__question">Is this an allergy or a preference?</p>
        <div className="type-modal__buttons">
          <button
            className="type-modal__btn type-modal__btn--allergy"
            onClick={() => onSelect("allergy")}
          >
            Allergy
            <span className="type-modal__btn-desc">I cannot eat this</span>
          </button>
          <button
            className="type-modal__btn type-modal__btn--preference"
            onClick={() => onSelect("preference")}
          >
            Preference
            <span className="type-modal__btn-desc">I prefer to avoid this</span>
          </button>
        </div>
      </div>
    </div>
  );
}
