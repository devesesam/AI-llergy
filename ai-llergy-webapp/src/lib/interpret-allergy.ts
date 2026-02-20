/**
 * AI-powered custom allergy text interpreter
 * Uses Claude to map free-form text to known allergen IDs
 */

import Anthropic from "@anthropic-ai/sdk";
import { ALL_FILTERS } from "./allergens";

const KNOWN_ALLERGENS = ALL_FILTERS.map((a) => a.id);

// Common synonyms and related terms for each allergen
export const SYNONYM_MAP: Record<string, string[]> = {
  // Dietary preferences
  vegetarian: ["veggie", "no meat", "meatless"],
  vegan: ["plant-based", "plant based", "no animal"],

  // Big 9 allergens
  peanuts: ["peanut", "groundnut", "groundnuts", "arachis"],
  treenuts: ["tree nut", "tree nuts", "nuts", "nut allergy"],
  eggs: ["egg", "ova", "albumin", "mayonnaise", "mayo", "meringue"],
  dairy: ["milk", "lactose", "cheese", "butter", "cream", "yogurt", "whey", "casein"],
  gluten: ["barley", "rye", "celiac", "coeliac"],
  soy: ["soya", "soybean", "soybeans", "tofu", "edamame"],
  fish: ["cod", "salmon", "tuna", "anchovy", "anchovies", "sardine", "sardines", "tilapia", "halibut"],
  shellfish: ["shrimp", "crab", "lobster", "prawn", "prawns", "crawfish", "crayfish", "scampi"],
  sesame: ["tahini", "sesame seeds"],

  // Specific nuts
  almond: ["almonds"],
  walnut: ["walnuts"],
  pistachio: ["pistachios"],

  // Less common / regional
  wheat: ["semolina", "durum", "spelt", "farina", "farro", "bulgur"],
  mustard: ["dijon"],
  sulfites: ["sulfite", "sulphite", "sulphites", "so2", "preservatives"],
  garlic: [],
  onion: ["onions", "shallot", "shallots", "leek", "leeks"],
  celery: ["celeriac"],
  chili: ["chilli", "chillies", "chilies", "spicy", "hot pepper"],
  capsicum: ["bell pepper", "bell peppers", "peppers"],
  lupin: ["lupine", "lupini", "lupin beans"],
  molluscs: ["mollusk", "mollusks", "squid", "octopus", "clam", "clams", "mussel", "mussels", "oyster", "oysters", "scallop", "scallops", "snail", "snails"],
};

export interface SearchResult {
  allergenId: string;
  matchedTerm: string; // The synonym or name that matched
  isExactMatch: boolean;
  isFuzzyMatch?: boolean; // True if matched via Levenshtein distance
}

// Common stop words to filter out when tokenizing phrases
const STOP_WORDS = new Set([
  "i", "im", "i'm", "my", "me", "we", "our", "you", "your",
  "a", "an", "the", "and", "or", "but", "to", "of", "in", "on", "at", "for", "with",
  "can", "can't", "cant", "cannot", "don't", "dont", "do", "does", "doesn't",
  "have", "has", "had", "am", "is", "are", "was", "were", "be", "been",
  "eat", "eating", "consume", "consuming", "take", "taking",
  "allergic", "allergy", "allergies", "intolerant", "intolerance", "sensitive", "sensitivity",
  "no", "not", "avoid", "avoiding", "free", "without",
  "please", "need", "want", "like", "would",
]);

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if two strings are a fuzzy match (within edit distance threshold)
 * Threshold scales with word length: shorter words need closer matches
 */
function isFuzzyMatch(query: string, target: string): boolean {
  // For very short words (3 or less), require exact or 1 edit
  // For medium words (4-6), allow up to 2 edits
  // For longer words (7+), allow up to 2 edits
  const minLength = Math.min(query.length, target.length);
  const maxDistance = minLength <= 3 ? 1 : 2;

  // Quick length check - if lengths differ by more than maxDistance, can't match
  if (Math.abs(query.length - target.length) > maxDistance) {
    return false;
  }

  const distance = levenshteinDistance(query, target);
  return distance <= maxDistance && distance > 0; // distance > 0 means not exact
}

/**
 * Tokenize a phrase into individual words, filtering stop words
 */
function tokenize(text: string): string[] {
  // Split on whitespace and common punctuation
  const tokens = text
    .toLowerCase()
    .split(/[\s,;.!?'"()-]+/)
    .filter(token => token.length >= 2) // Ignore single characters
    .filter(token => !STOP_WORDS.has(token));

  return [...new Set(tokens)]; // Remove duplicates
}

/**
 * Search for allergens matching a query string
 * Supports: exact matches, substring matches, fuzzy matches, and phrase tokenization
 */
export function searchSynonyms(query: string): SearchResult[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const normalized = query.toLowerCase().trim();
  const results: SearchResult[] = [];
  const seenAllergens = new Set<string>();

  // Build a list of all searchable terms: allergen IDs + all synonyms
  const allTerms: { allergenId: string; term: string }[] = [];
  for (const allergen of KNOWN_ALLERGENS) {
    allTerms.push({ allergenId: allergen, term: allergen });
  }
  for (const [allergen, synonyms] of Object.entries(SYNONYM_MAP)) {
    for (const synonym of synonyms) {
      allTerms.push({ allergenId: allergen, term: synonym });
    }
  }

  // Tokenize the input to handle phrases like "i can't eat peanuts or dairy"
  const tokens = tokenize(normalized);
  // Also search the full normalized string for multi-word matches like "tree nuts"
  const searchTerms = tokens.length > 0 ? [...tokens, normalized] : [normalized];

  // Search each token/term
  for (const searchTerm of searchTerms) {
    // 1. Exact matches (highest priority)
    for (const { allergenId, term } of allTerms) {
      if (term === searchTerm && !seenAllergens.has(allergenId)) {
        seenAllergens.add(allergenId);
        results.push({
          allergenId,
          matchedTerm: term,
          isExactMatch: true,
          isFuzzyMatch: false,
        });
      }
    }

    // 2. Substring/contains matches
    for (const { allergenId, term } of allTerms) {
      if (!seenAllergens.has(allergenId)) {
        // Check if search term is contained in the allergen/synonym
        // or if the allergen/synonym is contained in the search term
        if (term.includes(searchTerm) || searchTerm.includes(term)) {
          seenAllergens.add(allergenId);
          results.push({
            allergenId,
            matchedTerm: term,
            isExactMatch: false,
            isFuzzyMatch: false,
          });
        }
      }
    }

    // 3. Fuzzy matches (only for single words, not phrases)
    if (!searchTerm.includes(" ") && searchTerm.length >= 3) {
      for (const { allergenId, term } of allTerms) {
        // Only fuzzy match single-word terms
        if (!term.includes(" ") && !seenAllergens.has(allergenId)) {
          if (isFuzzyMatch(searchTerm, term)) {
            seenAllergens.add(allergenId);
            results.push({
              allergenId,
              matchedTerm: term,
              isExactMatch: false,
              isFuzzyMatch: true,
            });
          }
        }
      }
    }
  }

  // Sort: exact matches first, then substring matches, then fuzzy matches
  return results.sort((a, b) => {
    // Exact matches first
    if (a.isExactMatch && !b.isExactMatch) return -1;
    if (!a.isExactMatch && b.isExactMatch) return 1;
    // Then non-fuzzy (substring) matches
    if (!a.isFuzzyMatch && b.isFuzzyMatch) return -1;
    if (a.isFuzzyMatch && !b.isFuzzyMatch) return 1;
    // Then alphabetically
    return a.allergenId.localeCompare(b.allergenId);
  });
}

/**
 * Quick local matching before calling AI
 * Returns matched allergen IDs or null if AI is needed
 */
function quickMatch(text: string): string[] | null {
  const normalized = text.toLowerCase().trim();
  const matches: Set<string> = new Set();

  // Check direct allergen names
  for (const allergen of KNOWN_ALLERGENS) {
    if (normalized.includes(allergen)) {
      matches.add(allergen);
    }
  }

  // Check synonyms
  for (const [allergen, synonyms] of Object.entries(SYNONYM_MAP)) {
    for (const synonym of synonyms) {
      if (normalized.includes(synonym)) {
        matches.add(allergen);
      }
    }
  }

  // If we found matches, return them
  if (matches.size > 0) {
    return Array.from(matches);
  }

  // Return null to indicate AI should be used
  return null;
}

/**
 * Use Claude to interpret complex or misspelled allergy text
 */
async function aiInterpret(text: string): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set, skipping AI interpretation");
    return [];
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are an allergy text interpreter for a restaurant menu system.

Map the following user text to any matching allergens from this list:
${KNOWN_ALLERGENS.join(", ")}

User text: "${text}"

Rules:
- Handle spelling errors (e.g., "dary" → dairy, "glutin" → gluten)
- Handle synonyms (e.g., "lactose" → dairy, "wheat" → gluten)
- Handle related terms (e.g., "tree nuts" → pistachio, walnut, almond)
- Only return allergens from the known list
- If no matches, return empty array

Respond with ONLY a JSON array of matching allergen IDs, nothing else.
Example: ["dairy", "gluten"]`;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") return [];

    // Parse the JSON response
    const parsed = JSON.parse(content.text);
    if (!Array.isArray(parsed)) return [];

    // Validate each ID is in our known list
    return parsed.filter((id: string) => KNOWN_ALLERGENS.includes(id));
  } catch (error) {
    console.error("AI interpretation failed:", error);
    return [];
  }
}

export interface InterpretResult {
  matchedAllergens: string[];
  unmatchedText: string | null; // Text that couldn't be matched
  method: "local" | "ai" | "none";
}

/**
 * Interpret custom allergy text
 * First tries quick local matching, falls back to AI for complex cases
 */
export async function interpretCustomAllergy(text: string): Promise<InterpretResult> {
  if (!text || text.trim().length === 0) {
    return { matchedAllergens: [], unmatchedText: null, method: "none" };
  }

  const trimmed = text.trim();

  // Try quick local match first
  const quickMatches = quickMatch(trimmed);
  if (quickMatches !== null) {
    return {
      matchedAllergens: quickMatches,
      unmatchedText: null,
      method: "local",
    };
  }

  // Fall back to AI for complex/misspelled text
  const aiMatches = await aiInterpret(trimmed);

  return {
    matchedAllergens: aiMatches,
    unmatchedText: aiMatches.length === 0 ? trimmed : null,
    method: "ai",
  };
}
