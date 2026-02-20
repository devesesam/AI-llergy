"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { searchSynonyms, SearchResult } from "@/lib/interpret-allergy";
import { getAllergenById, CustomTag } from "@/lib/allergens";
import AllergenTag from "./AllergenTag";
import CustomTagPill from "./CustomTagPill";

interface AutocompleteInputProps {
  selectedAllergenIds: string[];
  onAllergenAdd: (id: string) => void;
  onAllergenRemove: (id: string) => void;
  onInputChange: (hasText: boolean) => void;
  customTags: CustomTag[];
  onCustomTagAdd: (tag: CustomTag) => void;
  onCustomTagRemove: (tagId: string) => void;
}

export default function AutocompleteInput({
  selectedAllergenIds,
  onAllergenAdd,
  onAllergenRemove,
  onInputChange,
  customTags,
  onCustomTagAdd,
  onCustomTagRemove,
}: AutocompleteInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const noMatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    // Clear previous timeout
    if (noMatchTimeoutRef.current) {
      clearTimeout(noMatchTimeoutRef.current);
      noMatchTimeoutRef.current = null;
    }

    if (!inputValue.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      setShowAddCustom(false);
      onInputChange(false);
      return;
    }

    onInputChange(true);

    // Search synonyms (instant, local)
    const results = searchSynonyms(inputValue);

    // Filter out already selected allergens
    const filteredResults = results.filter(
      (r) => !selectedAllergenIds.includes(r.allergenId)
    );

    setSuggestions(filteredResults);
    setShowDropdown(true);
    setShowAddCustom(false);

    // If no suggestions, show "Add as custom" option after 500ms
    if (filteredResults.length === 0) {
      noMatchTimeoutRef.current = setTimeout(() => {
        setShowAddCustom(true);
      }, 500);
    }

    return () => {
      if (noMatchTimeoutRef.current) {
        clearTimeout(noMatchTimeoutRef.current);
      }
    };
  }, [inputValue, selectedAllergenIds, onInputChange]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (allergenId: string) => {
      onAllergenAdd(allergenId);
      setInputValue("");
      setSuggestions([]);
      setShowDropdown(false);
      setShowAddCustom(false);
      inputRef.current?.focus();
    },
    [onAllergenAdd]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length === 1) {
        handleSelect(suggestions[0].allergenId);
      } else if (suggestions.length === 0 && showAddCustom) {
        // Allow Enter to add custom tag when no matches
        handleAddCustomTag();
      }
    }
  };

  const handleAddCustomTag = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const newTag: CustomTag = {
      id: `custom_${trimmed.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      text: trimmed,
      displayLabel: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
    };

    onCustomTagAdd(newTag);
    setInputValue("");
    setShowDropdown(false);
    setShowAddCustom(false);
    onInputChange(false);
    inputRef.current?.focus();
  };

  return (
    <div className="autocomplete-container">
      {/* Selected tags */}
      {(selectedAllergenIds.length > 0 || customTags.length > 0) && (
        <div className="autocomplete-tags">
          {selectedAllergenIds.map((id) => (
            <AllergenTag key={id} allergenId={id} onRemove={onAllergenRemove} />
          ))}
          {customTags.map((tag) => (
            <CustomTagPill key={tag.id} tag={tag} onRemove={onCustomTagRemove} />
          ))}
        </div>
      )}

      {/* Input with dropdown */}
      <div className="autocomplete-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className={`autocomplete-input${inputValue.trim() ? " autocomplete-input--blocking" : ""}`}
          placeholder="Type an allergen..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.trim() && setShowDropdown(true)}
        />

        {/* Dropdown */}
        {showDropdown && (suggestions.length > 0 || showAddCustom) && (
          <div ref={dropdownRef} className="autocomplete-dropdown">
            {suggestions.length > 0 ? (
              suggestions.slice(0, 5).map((result) => {
                const allergen = getAllergenById(result.allergenId);
                if (!allergen) return null;
                return (
                  <button
                    key={result.allergenId}
                    type="button"
                    className="autocomplete-option"
                    onClick={() => handleSelect(result.allergenId)}
                  >
                    <span className="autocomplete-option__icon">
                      {allergen.icon}
                    </span>
                    <span className="autocomplete-option__content">
                      <span className="autocomplete-option__name">
                        {allergen.label}
                      </span>
                      {result.matchedTerm !== result.allergenId && (
                        <span className="autocomplete-option__match">
                          ({result.matchedTerm})
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            ) : showAddCustom ? (
              <div className="autocomplete-no-match">
                <span className="autocomplete-no-match__text">
                  No matches found for &quot;{inputValue}&quot;
                </span>
                <button
                  type="button"
                  className="autocomplete-add-custom"
                  onClick={handleAddCustomTag}
                >
                  🏷️ Add as custom restriction
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="autocomplete-helper">
        Type allergens one at a time
      </p>
    </div>
  );
}
