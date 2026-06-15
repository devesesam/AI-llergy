"use client";

import { useState, useEffect } from "react";
import {
  SelectedAllergen,
  CustomTag,
  getAllergenById,
} from "@/lib/allergens";

// Severity selection was removed from the UI (the value is no longer collected).
// We still attach a type to each selection to satisfy downstream types; "allergy"
// is the neutral default so real allergies are never shown as mere "preferences".
const DEFAULT_TYPE = "allergy" as const;

interface SeverityModalProps {
  isOpen: boolean;
  pendingAllergenIds: string[];
  customAllergenIds: string[];
  customTags: CustomTag[];
  onConfirm: (allergens: SelectedAllergen[], customTags: CustomTag[]) => void;
  onClose: () => void;
}

interface SeverityItem {
  id: string;
  icon: string;
  label: string;
  isCustomTag: boolean;
}

export default function SeverityModal({
  isOpen,
  pendingAllergenIds,
  customAllergenIds,
  customTags,
  onConfirm,
  onClose,
}: SeverityModalProps) {
  // Track responsibility acknowledgment
  const [hasAgreed, setHasAgreed] = useState(false);

  // Build list of all items to display
  const items: SeverityItem[] = [];

  // Add pending allergens (from button clicks)
  pendingAllergenIds.forEach((id) => {
    const allergen = getAllergenById(id);
    if (allergen) {
      items.push({
        id: allergen.id,
        icon: allergen.icon,
        label: allergen.label,
        isCustomTag: false,
      });
    }
  });

  // Add custom allergens (from autocomplete - known allergens)
  customAllergenIds.forEach((id) => {
    // Avoid duplicates
    if (!pendingAllergenIds.includes(id)) {
      const allergen = getAllergenById(id);
      if (allergen) {
        items.push({
          id: allergen.id,
          icon: allergen.icon,
          label: allergen.label,
          isCustomTag: false,
        });
      }
    }
  });

  // Add custom tags (free-form text)
  customTags.forEach((tag) => {
    items.push({
      id: tag.id,
      icon: "🏷️",
      label: tag.displayLabel,
      isCustomTag: true,
    });
  });

  // Reset agreement checkbox whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setHasAgreed(false);
    }
  }, [isOpen, pendingAllergenIds, customAllergenIds, customTags]);

  if (!isOpen || items.length === 0) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    // Combine pending and custom allergen IDs (deduplicated), each with the
    // default type (severity is no longer collected from the user).
    const allAllergenIds = [...new Set([...pendingAllergenIds, ...customAllergenIds])];
    const allergens: SelectedAllergen[] = allAllergenIds.map((id) => ({
      id,
      type: DEFAULT_TYPE,
    }));

    const tagsWithSeverity: CustomTag[] = customTags.map((tag) => ({
      ...tag,
      type: DEFAULT_TYPE,
    }));

    onConfirm(allergens, tagsWithSeverity);
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="severity-modal">
        <div className="severity-modal__header">
          <h3 className="severity-modal__title">Confirm your selections</h3>
          <p className="severity-modal__subtitle">
            Please review the items you&apos;d like us to avoid.
          </p>
        </div>

        <div className="severity-modal__list">
          {items.map((item) => (
            <div key={item.id} className="severity-modal__item">
              <div className="severity-modal__item-info">
                <span className="severity-modal__item-icon">{item.icon}</span>
                <span className="severity-modal__item-name">{item.label}</span>
              </div>
            </div>
          ))}
        </div>

        <label className="severity-modal__agreement">
          <input
            type="checkbox"
            checked={hasAgreed}
            onChange={(e) => setHasAgreed(e.target.checked)}
            className="severity-modal__checkbox"
          />
          <span className="severity-modal__agreement-text">
            I take full responsibility that the information submitted is as accurate as possible
          </span>
        </label>

        <div className="severity-modal__footer">
          <button
            type="button"
            className="btn secondary-btn"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn primary-btn"
            onClick={handleConfirm}
            disabled={!hasAgreed}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
