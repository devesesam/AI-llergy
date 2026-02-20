"use client";

import { useState, useEffect } from "react";
import {
  Allergen,
  SelectedAllergen,
  CustomTag,
  SeverityType,
  SEVERITY_OPTIONS,
  getAllergenById,
} from "@/lib/allergens";

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
  // Track severity for each item (default to "preference")
  const [severityMap, setSeverityMap] = useState<Record<string, SeverityType>>({});
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

  // Initialize severity map and reset agreement when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialMap: Record<string, SeverityType> = {};
      items.forEach((item) => {
        initialMap[item.id] = "preference"; // Default to preference
      });
      setSeverityMap(initialMap);
      setHasAgreed(false); // Reset agreement checkbox
    }
  }, [isOpen, pendingAllergenIds, customAllergenIds, customTags]);

  if (!isOpen || items.length === 0) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSeverityChange = (itemId: string, severity: SeverityType) => {
    setSeverityMap((prev) => ({
      ...prev,
      [itemId]: severity,
    }));
  };

  const handleConfirm = () => {
    // Build allergens array with severity
    const allergens: SelectedAllergen[] = [];

    // Combine pending and custom allergen IDs (deduplicated)
    const allAllergenIds = [...new Set([...pendingAllergenIds, ...customAllergenIds])];

    allAllergenIds.forEach((id) => {
      allergens.push({
        id,
        type: severityMap[id] || "preference",
      });
    });

    // Build custom tags with severity
    const tagsWithSeverity: CustomTag[] = customTags.map((tag) => ({
      ...tag,
      type: severityMap[tag.id] || "preference",
    }));

    onConfirm(allergens, tagsWithSeverity);
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="severity-modal">
        <div className="severity-modal__header">
          <h3 className="severity-modal__title">Set Severity Levels</h3>
          <p className="severity-modal__subtitle">
            How serious is each restriction?
          </p>
        </div>

        <div className="severity-modal__list">
          {items.map((item) => (
            <div key={item.id} className="severity-modal__item">
              <div className="severity-modal__item-info">
                <span className="severity-modal__item-icon">{item.icon}</span>
                <span className="severity-modal__item-name">{item.label}</span>
              </div>
              <div className="severity-slider">
                <div className="severity-slider__labels">
                  <span className="severity-slider__label severity-slider__label--preference">Preference</span>
                  <span className="severity-slider__label severity-slider__label--allergy">Intolerance/Allergy</span>
                  <span className="severity-slider__label severity-slider__label--life_threatening">Life Threatening</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={SEVERITY_OPTIONS.findIndex(opt => opt.value === severityMap[item.id])}
                  onChange={(e) => handleSeverityChange(item.id, SEVERITY_OPTIONS[parseInt(e.target.value)].value)}
                  className={`severity-slider__input severity-slider__input--${severityMap[item.id]}`}
                />
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
