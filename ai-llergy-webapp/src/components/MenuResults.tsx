"use client";

import AccordionSection from "./AccordionSection";
import MenuItem from "./MenuItem";
import SelectionSummary from "./SelectionSummary";
import { SelectedAllergen, CustomTag } from "@/lib/allergens";

interface MenuItemData {
  name: string;
  ingredients: string;
  price: number;
  warnings: string[];
}

interface MenuResultsProps {
  safeItems: MenuItemData[];
  cautionItems: MenuItemData[];
  excludedCount: number;
  selectedAllergens: SelectedAllergen[];
  customAllergenIds?: string[];
  customTags?: CustomTag[];
  onStartOver: () => void;
}

export default function MenuResults({
  safeItems,
  cautionItems,
  excludedCount,
  selectedAllergens,
  customAllergenIds = [],
  customTags = [],
  onStartOver,
}: MenuResultsProps) {
  const totalSafe = safeItems.length + cautionItems.length;

  return (
    <div className="results-container">
      <SelectionSummary
        selectedAllergens={selectedAllergens}
        customAllergenIds={customAllergenIds}
        customTags={customTags}
      />

      <header className="results-header">
        <h2 className="results-title">
          {totalSafe > 0
            ? `${totalSafe} item${totalSafe !== 1 ? "s" : ""} available for you`
            : "No items match your criteria"}
        </h2>
        {totalSafe > 0 && (
          <p className="results-subtitle">
            Based on your dietary preferences
          </p>
        )}
      </header>

      {safeItems.length > 0 && (
        <AccordionSection
          title="Safe to Eat"
          count={safeItems.length}
          variant="safe"
          defaultOpen={true}
        >
          {safeItems.map((item, index) => (
            <MenuItem
              key={`safe-${index}`}
              name={item.name}
              price={item.price}
              ingredients={item.ingredients}
            />
          ))}
        </AccordionSection>
      )}

      {cautionItems.length > 0 && (
        <AccordionSection
          title="Modification Suggestions - Subject to kitchen approval"
          count={cautionItems.length}
          variant="caution"
          defaultOpen={false}
        >
          {cautionItems.map((item, index) => (
            <MenuItem
              key={`caution-${index}`}
              name={item.name}
              price={item.price}
              ingredients={item.ingredients}
              warning={item.warnings.join(". ")}
            />
          ))}
        </AccordionSection>
      )}

      {excludedCount > 0 && (
        <p className="results-excluded">
          {excludedCount} item{excludedCount !== 1 ? "s" : ""} excluded based on
          your selections
        </p>
      )}

      <div className="action-area">
        <button
          className="btn secondary-btn full-width"
          onClick={onStartOver}
          type="button"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
