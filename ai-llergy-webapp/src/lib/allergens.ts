export interface Allergen {
  id: string;
  label: string;
  icon: string;
  columnName: string; // Maps to Google Sheet column header
}

// Dietary preferences
export const DIETARY_PREFERENCES: Allergen[] = [
  { id: "vegetarian", label: "Vegetarian", icon: "🥗", columnName: "Vegetarian" },
  { id: "vegan", label: "Vegan", icon: "🥦", columnName: "Vegan" },
  { id: "halal", label: "Halal", icon: "☪️", columnName: "HALAL" },
];

// Allergens (ordered by prevalence - most common first)
// Note: "Wheat" is intentionally omitted — it is covered by "Gluten".
export const ALLERGENS: Allergen[] = [
  // Tier 2: Most Common (Big 9)
  { id: "peanuts", label: "Peanuts", icon: "🥜", columnName: "PEANUT FREE" },
  { id: "treenuts", label: "Tree Nuts", icon: "🌳", columnName: "TREE NUT FREE" },
  { id: "gluten", label: "Gluten", icon: "🍞", columnName: "GLUTEN FREE" },
  { id: "dairy", label: "Dairy", icon: "🥛", columnName: "DAIRY FREE" },
  { id: "eggs", label: "Eggs", icon: "🥚", columnName: "EGG FREE" },
  { id: "soy", label: "Soy", icon: "🌱", columnName: "SOY FREE" },
  { id: "fish", label: "Fish", icon: "🐟", columnName: "FISH FREE" },
  { id: "shellfish", label: "Shellfish", icon: "🦐", columnName: "SHELLFISH FREE" },
  { id: "sesame", label: "Sesame", icon: "🥯", columnName: "SESAME FREE" },

  // Tier 3: Specific Nuts
  { id: "almond", label: "Almond", icon: "🌰", columnName: "ALMOND FREE" },
  { id: "walnut", label: "Walnut", icon: "🟤", columnName: "WALNUT FREE" },
  { id: "pistachio", label: "Pistachio", icon: "🟢", columnName: "PISTACHIO FREE" },

  // Tier 4: Less Common / Regional
  { id: "mustard", label: "Mustard", icon: "🟡", columnName: "MUSTARD FREE" },
  { id: "sulfites", label: "Sulfites", icon: "🧪", columnName: "SULFITE FREE" },
  { id: "garlic", label: "Garlic", icon: "🧄", columnName: "GARLIC FREE" },
  { id: "onion", label: "Onion", icon: "🧅", columnName: "ONION FREE" },
  { id: "celery", label: "Celery", icon: "🥬", columnName: "CELERY FREE" },
  { id: "chili", label: "Chili", icon: "🔥", columnName: "CHILI FREE" },
  { id: "capsicum", label: "Capsicum", icon: "🌶️", columnName: "CAPSICUM FREE" },
  { id: "nightshades", label: "Nightshades", icon: "🍅", columnName: "NIGHTSHADE FREE" },
  { id: "lupin", label: "Lupin", icon: "🌸", columnName: "LUPIN FREE" },
  { id: "molluscs", label: "Molluscs", icon: "🦑", columnName: "MOLLUSC FREE" },
];

// Combined list for the form
export const ALL_FILTERS: Allergen[] = [...DIETARY_PREFERENCES, ...ALLERGENS];

// Map allergen ID to column name for quick lookup
export const ALLERGEN_TO_COLUMN: Record<string, string> = Object.fromEntries(
  ALL_FILTERS.map((a) => [a.id, a.columnName])
);

// Severity type for allergen selections
export type SeverityType = "preference" | "allergy" | "life_threatening";

// Selected allergen with severity type
export interface SelectedAllergen {
  id: string;
  type: SeverityType;
}

// Severity options for the modal
export const SEVERITY_OPTIONS = [
  { value: "preference" as const, label: "Preference", shortLabel: "P", description: "I prefer to avoid this" },
  { value: "allergy" as const, label: "Intolerance/Allergy", shortLabel: "A", description: "I cannot eat this safely" },
  { value: "life_threatening" as const, label: "Life Threatening", shortLabel: "L", description: "Medical emergency risk" },
];

export interface AllergenSubmission {
  allergens: SelectedAllergen[];
  customAllergenIds?: string[];
  customTags?: CustomTag[];
}

// Custom tag for free-form text restrictions (not mapped to known allergens)
export interface CustomTag {
  id: string;           // Generated unique ID (e.g., "custom_cucumber_1234")
  text: string;         // Original user text
  displayLabel: string; // Formatted for display (capitalized)
  type?: SeverityType;  // Severity level (set in SeverityModal)
}

// Allergen group definition (used for the collapsible "More allergens" dropdown)
export interface AllergenGroup {
  id: string;
  label: string;
  icon: string;
  members: string[]; // Allergen IDs
}

// Primary allergens shown directly on the form, each on its own row.
export const PRIMARY_ALLERGEN_IDS = ["gluten", "dairy", "eggs"] as const;

export const PRIMARY_ALLERGENS: Allergen[] = PRIMARY_ALLERGEN_IDS
  .map((id) => ALLERGENS.find((a) => a.id === id))
  .filter((a): a is Allergen => a !== undefined);

// Everything else lives in the collapsible "More allergens" dropdown.
export const SECONDARY_ALLERGENS: Allergen[] = ALLERGENS.filter(
  (a) => !PRIMARY_ALLERGEN_IDS.includes(a.id as (typeof PRIMARY_ALLERGEN_IDS)[number])
);

// Helper to get allergen by ID
export const getAllergenById = (id: string): Allergen | undefined =>
  ALL_FILTERS.find(a => a.id === id);
