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

interface ModifiedItemData {
  name: string;
  ingredients: string;
  price: number;
  modifications: string[];
}

interface MenuResultsProps {
  safeItems: MenuItemData[];
  cautionItems: MenuItemData[];
  modifiedItems?: ModifiedItemData[];
  excludedCount: number;
  selectedAllergens: SelectedAllergen[];
  customAllergenIds?: string[];
  customTags?: CustomTag[];
  onStartOver: () => void;
}

export default function MenuResults({
  safeItems,
  cautionItems,
  modifiedItems = [],
  excludedCount,
  selectedAllergens,
  customAllergenIds = [],
  customTags = [],
  onStartOver,
}: MenuResultsProps) {
  const totalSafe = safeItems.length + cautionItems.length;
  const totalAvailable = totalSafe + modifiedItems.length;

  return (
    <div className="results-container">
      <SelectionSummary
        selectedAllergens={selectedAllergens}
        customAllergenIds={customAllergenIds}
        customTags={customTags}
      />

      <header className="results-header">
        <h2 className="results-title">
          {totalAvailable > 0
            ? `${totalAvailable} item${totalAvailable !== 1 ? "s" : ""} available for you`
            : "No items match your criteria"}
        </h2>
        {totalAvailable > 0 && (
          <p className="results-subtitle">
            {modifiedItems.length > 0
              ? `${totalSafe} ready as-is · ${modifiedItems.length} can be modified`
              : "Based on your dietary preferences"}
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

      {modifiedItems.length > 0 && (
        <AccordionSection
          title="Can be modified for you - subject to kitchen approval"
          count={modifiedItems.length}
          variant="modified"
          defaultOpen={true}
        >
          {modifiedItems.map((item, index) => (
            <MenuItem
              key={`modified-${index}`}
              name={item.name}
              price={item.price}
              ingredients={item.ingredients}
              modifications={item.modifications}
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
