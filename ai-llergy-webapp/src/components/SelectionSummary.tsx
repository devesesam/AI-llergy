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

  // Separate by severity (ordered: life threatening, allergies, preferences)
  const lifeThreatening = selectedAllergens.filter(s => s.type === "life_threatening");
  const allergies = selectedAllergens.filter(s => s.type === "allergy");
  const preferences = selectedAllergens.filter(s => s.type === "preference");

  // Separate custom tags by severity
  const lifeThreateningTags = customTags.filter(t => t.type === "life_threatening");
  const allergyTags = customTags.filter(t => t.type === "allergy");
  const preferenceTags = customTags.filter(t => t.type === "preference");
  const unclassifiedTags = customTags.filter(t => !t.type);

  return (
    <div className="selection-summary">
      <h3 className="selection-summary__title">Your Selections</h3>

      {lifeThreatening.length > 0 && (
        <div className="selection-summary__group">
          <span className="selection-summary__label selection-summary__label--life_threatening">
            Life Threatening
          </span>
          <div className="selection-summary__pills">
            {lifeThreatening.map(selection => {
              const allergen = getAllergenById(selection.id);
              if (!allergen) return null;
              return (
                <span
                  key={selection.id}
                  className="selection-pill selection-pill--life_threatening"
                >
                  <span className="selection-pill__icon">{allergen.icon}</span>
                  <span className="selection-pill__label">{allergen.label}</span>
                </span>
              );
            })}
            {lifeThreateningTags.map(tag => (
              <span
                key={tag.id}
                className="selection-pill selection-pill--life_threatening"
              >
                <span className="selection-pill__icon">🏷️</span>
                <span className="selection-pill__label">{tag.displayLabel}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {allergies.length > 0 && (
        <div className="selection-summary__group">
          <span className="selection-summary__label selection-summary__label--allergy">
            Intolerance/Allergy
          </span>
          <div className="selection-summary__pills">
            {allergies.map(selection => {
              const allergen = getAllergenById(selection.id);
              if (!allergen) return null;
              return (
                <span
                  key={selection.id}
                  className="selection-pill selection-pill--allergy"
                >
                  <span className="selection-pill__icon">{allergen.icon}</span>
                  <span className="selection-pill__label">{allergen.label}</span>
                </span>
              );
            })}
            {allergyTags.map(tag => (
              <span
                key={tag.id}
                className="selection-pill selection-pill--allergy"
              >
                <span className="selection-pill__icon">🏷️</span>
                <span className="selection-pill__label">{tag.displayLabel}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {preferences.length > 0 && (
        <div className="selection-summary__group">
          <span className="selection-summary__label selection-summary__label--preference">
            Preferences
          </span>
          <div className="selection-summary__pills">
            {preferences.map(selection => {
              const allergen = getAllergenById(selection.id);
              if (!allergen) return null;
              return (
                <span
                  key={selection.id}
                  className="selection-pill selection-pill--preference"
                >
                  <span className="selection-pill__icon">{allergen.icon}</span>
                  <span className="selection-pill__label">{allergen.label}</span>
                </span>
              );
            })}
            {preferenceTags.map(tag => (
              <span
                key={tag.id}
                className="selection-pill selection-pill--preference"
              >
                <span className="selection-pill__icon">🏷️</span>
                <span className="selection-pill__label">{tag.displayLabel}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {uniqueCustomIds.length > 0 && (
        <div className="selection-summary__group">
          <span className="selection-summary__label selection-summary__label--custom">
            Added via Search
          </span>
          <div className="selection-summary__pills">
            {uniqueCustomIds.map(id => {
              const allergen = getAllergenById(id);
              if (!allergen) return null;
              return (
                <span
                  key={id}
                  className="selection-pill selection-pill--custom"
                >
                  <span className="selection-pill__icon">{allergen.icon}</span>
                  <span className="selection-pill__label">{allergen.label}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {unclassifiedTags.length > 0 && (
        <div className="selection-summary__group">
          <span className="selection-summary__label selection-summary__label--custom-tag">
            Custom Restrictions
          </span>
          <div className="selection-summary__pills">
            {unclassifiedTags.map(tag => (
              <span
                key={tag.id}
                className="selection-pill selection-pill--custom-tag"
              >
                <span className="selection-pill__icon">🏷️</span>
                <span className="selection-pill__label">{tag.displayLabel}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
