"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import DisclaimerModal from "@/components/DisclaimerModal";
import AllergenGrid from "@/components/AllergenGrid";
import SeverityModal from "@/components/SeverityModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import MenuResults from "@/components/MenuResults";
import AutocompleteInput from "@/components/AutocompleteInput";
import { Allergen, SelectedAllergen, CustomTag } from "@/lib/allergens";

interface MenuItemData {
  name: string;
  ingredients: string;
  price: number;
  warnings: string[];
}

interface ResultsData {
  safeItems: MenuItemData[];
  cautionItems: MenuItemData[];
  excludedCount: number;
}

export default function Home() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [pendingAllergenIds, setPendingAllergenIds] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<SelectedAllergen[]>([]);
  const [customAllergenIds, setCustomAllergenIds] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<CustomTag[]>([]);
  const [hasInputText, setHasInputText] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<ResultsData | null>(null);

  // Modal state for severity selection (shown before submit)
  const [showSeverityModal, setShowSeverityModal] = useState(false);

  useEffect(() => {
    // Show disclaimer modal after a short delay
    const timer = setTimeout(() => {
      setShowDisclaimer(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle allergen click - simple toggle (no modal)
  const handleAllergenClick = (allergen: Allergen) => {
    setPendingAllergenIds(prev => {
      if (prev.includes(allergen.id)) {
        return prev.filter(id => id !== allergen.id);
      } else {
        return [...prev, allergen.id];
      }
    });
  };

  // Handle severity modal confirmation
  const handleSeverityConfirm = async (
    allergens: SelectedAllergen[],
    tagsWithSeverity: CustomTag[]
  ) => {
    setShowSeverityModal(false);
    setSelectedAllergens(allergens);
    setCustomTags(tagsWithSeverity);

    // Now submit to API
    await submitToApi(allergens, tagsWithSeverity);
  };

  const handleCloseSeverityModal = () => {
    setShowSeverityModal(false);
  };

  const handleAddCustomAllergen = (id: string) => {
    if (!customAllergenIds.includes(id)) {
      setCustomAllergenIds((prev) => [...prev, id]);
    }
  };

  const handleRemoveCustomAllergen = (id: string) => {
    setCustomAllergenIds((prev) => prev.filter((i) => i !== id));
  };

  const handleAddCustomTag = (tag: CustomTag) => {
    // Prevent duplicates by text
    if (!customTags.some(t => t.text.toLowerCase() === tag.text.toLowerCase())) {
      setCustomTags(prev => [...prev, tag]);
    }
  };

  const handleRemoveCustomTag = (tagId: string) => {
    setCustomTags(prev => prev.filter(t => t.id !== tagId));
  };

  const handleSubmit = () => {
    // Check if anything is selected
    const hasSelections =
      pendingAllergenIds.length > 0 ||
      customAllergenIds.length > 0 ||
      customTags.length > 0;

    if (!hasSelections) {
      alert(
        "No allergens selected! Please select at least one or type a custom one if you have specific needs."
      );
      return;
    }

    // Open severity modal instead of submitting directly
    setShowSeverityModal(true);
  };

  const submitToApi = async (
    allergens: SelectedAllergen[],
    tags: CustomTag[]
  ) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          allergens: allergens,
          customAllergenIds: customAllergenIds,
          customTags: tags,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit");
      }

      const data = await response.json();

      // Store results and show results view
      setResults({
        safeItems: data.safeItems,
        cautionItems: data.cautionItems,
        excludedCount: data.excludedCount,
      });
    } catch (error) {
      console.error("Submission error:", error);
      alert("There was an error submitting your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOver = () => {
    setResults(null);
    setPendingAllergenIds([]);
    setSelectedAllergens([]);
    setCustomAllergenIds([]);
    setCustomTags([]);
    setHasInputText(false);
  };

  // Show results view if we have results
  if (results) {
    return (
      <>
        <DisclaimerModal
          isOpen={showDisclaimer}
          onAgree={() => setShowDisclaimer(false)}
        />

        <div className="app-container">
          <header>
            <Image
              src="/images/logo.png"
              alt="Mosaic Logo"
              width={60}
              height={60}
              className="logo"
            />
            <h1>AI-llergy</h1>
          </header>

          <MenuResults
            safeItems={results.safeItems}
            cautionItems={results.cautionItems}
            excludedCount={results.excludedCount}
            selectedAllergens={selectedAllergens}
            customAllergenIds={customAllergenIds}
            customTags={customTags}
            onStartOver={handleStartOver}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <DisclaimerModal
        isOpen={showDisclaimer}
        onAgree={() => setShowDisclaimer(false)}
      />

      {showSeverityModal && (
        <SeverityModal
          isOpen={true}
          pendingAllergenIds={pendingAllergenIds}
          customAllergenIds={customAllergenIds}
          customTags={customTags}
          onConfirm={handleSeverityConfirm}
          onClose={handleCloseSeverityModal}
        />
      )}

      <div className="app-container">
        <header>
          <Image
            src="/images/logo.png"
            alt="Mosaic Logo"
            width={60}
            height={60}
            className="logo"
          />
          <h1>AI-llergy</h1>
          <p className="subtitle">Select allergens to avoid</p>
        </header>

        <main>
          <AllergenGrid
            pendingAllergenIds={pendingAllergenIds}
            selectedAllergens={selectedAllergens}
            onAllergenClick={handleAllergenClick}
          />

          <div className="input-group">
            <AutocompleteInput
              selectedAllergenIds={customAllergenIds}
              onAllergenAdd={handleAddCustomAllergen}
              onAllergenRemove={handleRemoveCustomAllergen}
              onInputChange={setHasInputText}
              customTags={customTags}
              onCustomTagAdd={handleAddCustomTag}
              onCustomTagRemove={handleRemoveCustomTag}
            />
          </div>

          <div className="action-area">
            <button
              className="btn primary-btn full-width"
              onClick={handleSubmit}
              disabled={isSubmitting || hasInputText}
            >
              {isSubmitting ? <LoadingSpinner /> : "Submit"}
            </button>
            {hasInputText && (
              <div className="submit-helper">
                <span className="submit-helper__icon">⚠️</span>
                <span className="submit-helper__text">
                  Convert your search text to a tag first (select from dropdown or press Enter)
                </span>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
