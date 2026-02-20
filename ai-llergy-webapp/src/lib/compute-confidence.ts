/**
 * Confidence score computation for menu items
 * Rule-based scoring without LLM calls (for fast query-time filtering)
 */

import { ALL_FILTERS } from "./allergens";
import {
  CrossContaminationRisk,
  CROSS_CONTAMINATION_ADJUSTMENTS,
  DEFAULT_NO_DATA_CONFIDENCE,
  AllergenConfidenceMap,
  clampConfidence,
} from "./confidence";

/**
 * Known ingredient keywords per allergen
 * Used for rule-based ingredient scanning
 */
export const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  // Dietary preferences
  vegetarian: ["meat", "chicken", "beef", "pork", "lamb", "bacon", "ham", "sausage", "fish", "seafood"],
  vegan: ["meat", "chicken", "beef", "pork", "lamb", "bacon", "ham", "fish", "seafood", "milk", "cheese", "butter", "cream", "yogurt", "egg", "honey"],

  // Big 9 allergens
  peanuts: ["peanut", "groundnut", "arachis", "monkey nut"],
  treenuts: ["almond", "walnut", "cashew", "pistachio", "pecan", "hazelnut", "macadamia", "brazil nut", "chestnut", "pine nut"],
  gluten: ["wheat", "flour", "bread", "pasta", "barley", "rye", "oats", "semolina", "spelt", "couscous", "bulgur", "farro"],
  wheat: ["wheat", "flour", "bread", "pasta", "semolina", "couscous", "bulgur", "farro", "seitan"],
  dairy: ["milk", "cheese", "butter", "cream", "yogurt", "whey", "casein", "lactose", "ghee", "curd", "paneer"],
  eggs: ["egg", "albumin", "mayonnaise", "meringue", "aioli", "hollandaise", "custard"],
  soy: ["soy", "soya", "tofu", "edamame", "miso", "tempeh", "tamari", "soybean"],
  fish: ["fish", "salmon", "tuna", "cod", "anchovy", "sardine", "mackerel", "trout", "bass", "halibut", "tilapia"],
  shellfish: ["shrimp", "crab", "lobster", "prawn", "crawfish", "scampi", "crayfish", "langoustine"],
  sesame: ["sesame", "tahini", "halvah", "hummus"],

  // Specific nuts
  almond: ["almond", "marzipan", "frangipane"],
  walnut: ["walnut"],
  pistachio: ["pistachio"],

  // Less common allergens
  mustard: ["mustard", "dijon"],
  sulfites: ["sulfite", "sulphite", "wine", "dried fruit"],
  garlic: ["garlic", "aioli"],
  onion: ["onion", "shallot", "leek", "scallion", "chive"],
  celery: ["celery", "celeriac"],
  chili: ["chili", "chilli", "jalapeno", "cayenne", "sriracha", "hot sauce", "tabasco"],
  capsicum: ["capsicum", "bell pepper", "pepper", "paprika", "pimento"],
  lupin: ["lupin", "lupini"],
  molluscs: ["squid", "octopus", "calamari", "clam", "mussel", "oyster", "scallop", "snail", "escargot"],
};

/**
 * Base confidence scores based on data source
 */
const BASE_CONFIDENCE = {
  EXPLICIT_FREE: 0.95,      // Venue explicitly marked item as free of allergen
  EXPLICIT_CONTAINS: 0.05,  // Venue explicitly marked item as containing allergen
  NO_KEYWORD_FOUND: 0.60,   // Ingredients listed, no allergen keywords found
  KEYWORD_FOUND: 0.10,      // Allergen keyword found in ingredients
  NO_INGREDIENT_DATA: DEFAULT_NO_DATA_CONFIDENCE, // No ingredient info available
} as const;

/**
 * Allergen profile from database
 * Keys are like "dairy_free", "gluten_free" etc.
 */
export interface AllergenProfile {
  [key: string]: boolean | string | undefined;
}

/**
 * Input for confidence computation
 */
export interface ComputeConfidenceInput {
  ingredients: string | null;
  allergenProfile: AllergenProfile;
  venueRisks?: Map<string, CrossContaminationRisk>;
}

/**
 * Convert allergen ID to profile key
 * e.g., "dairy" -> "dairy_free"
 */
function allergenIdToProfileKey(allergenId: string): string {
  return `${allergenId}_free`;
}

/**
 * Check if ingredients contain any allergen keywords
 */
function containsAllergenKeyword(
  ingredientsLower: string,
  allergenId: string
): boolean {
  const keywords = ALLERGEN_KEYWORDS[allergenId] || [];
  return keywords.some((kw) => ingredientsLower.includes(kw.toLowerCase()));
}

/**
 * Compute confidence score for a single allergen on a menu item
 */
function computeSingleAllergenConfidence(
  allergenId: string,
  input: ComputeConfidenceInput
): number {
  const { ingredients, allergenProfile, venueRisks } = input;
  const ingredientsLower = (ingredients || "").toLowerCase();
  const profileKey = allergenIdToProfileKey(allergenId);

  let score: number;

  // 1. Check explicit allergen profile flag (highest weight)
  const explicitFlag = allergenProfile[profileKey];

  if (explicitFlag === true) {
    // Explicitly marked as FREE of this allergen
    score = BASE_CONFIDENCE.EXPLICIT_FREE;
  } else if (explicitFlag === false) {
    // Explicitly marked as CONTAINS this allergen
    score = BASE_CONFIDENCE.EXPLICIT_CONTAINS;
  } else {
    // No explicit flag - use ingredient analysis
    if (!ingredientsLower || ingredientsLower.trim() === "") {
      // No ingredient data available
      score = BASE_CONFIDENCE.NO_INGREDIENT_DATA;
    } else if (containsAllergenKeyword(ingredientsLower, allergenId)) {
      // Allergen keyword found in ingredients
      score = BASE_CONFIDENCE.KEYWORD_FOUND;
    } else {
      // No keywords found, some confidence
      score = BASE_CONFIDENCE.NO_KEYWORD_FOUND;
    }
  }

  // 2. Apply cross-contamination adjustment if available
  if (venueRisks) {
    const riskLevel = venueRisks.get(allergenId);
    if (riskLevel) {
      const adjustment = CROSS_CONTAMINATION_ADJUSTMENTS[riskLevel] || 0;
      score = clampConfidence(score + adjustment);
    }
  }

  // Round to 2 decimal places
  return Math.round(score * 100) / 100;
}

/**
 * Compute confidence scores for all allergens on a menu item
 */
export function computeAllergenConfidence(
  input: ComputeConfidenceInput
): AllergenConfidenceMap {
  const confidence: AllergenConfidenceMap = {};

  for (const allergen of ALL_FILTERS) {
    confidence[allergen.id] = computeSingleAllergenConfidence(
      allergen.id,
      input
    );
  }

  return confidence;
}

/**
 * Batch compute confidence for multiple menu items
 */
export function computeBatchConfidence(
  items: Array<{
    id: string;
    ingredients: string | null;
    allergenProfile: AllergenProfile;
  }>,
  venueRisks?: Map<string, CrossContaminationRisk>
): Map<string, AllergenConfidenceMap> {
  const results = new Map<string, AllergenConfidenceMap>();

  for (const item of items) {
    const confidence = computeAllergenConfidence({
      ingredients: item.ingredients,
      allergenProfile: item.allergenProfile,
      venueRisks,
    });
    results.set(item.id, confidence);
  }

  return results;
}
