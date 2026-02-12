# Directive: Backend Menu Filtering

**Goal**: Filter restaurant menu items based on user-selected allergens and dietary preferences. Return a customized menu with safe items, caution items (CAN BE made safe), and excluded count.

## 1. Overview

The backend replaces a previous Make.com automation that was too slow (5-15 seconds). The new implementation is deterministic where possible, only using AI for complex custom text interpretation.

### Performance Targets
| Scenario | Target | Actual |
|----------|--------|--------|
| Button selections only | <200ms | ~50-100ms |
| With custom text (local match) | <200ms | ~50-100ms |
| With custom text (AI fallback) | <2000ms | ~500-1500ms |
| With custom tags (AI filtering, v2.6) | <10000ms | ~2000-5000ms |

## 2. Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Frontend Form  │────▶│  /api/submit     │────▶│  JSON Response  │
│  (allergens[])  │     │  (Next.js API)   │     │  (filtered menu)│
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │  Menu    │ │  Filter  │ │ Interpret│
              │  Service │ │  Logic   │ │ Allergy  │
              │ (cached) │ │ (YES/NO) │ │ (AI/local│
              └──────────┘ └──────────┘ └──────────┘
                    │
                    ▼
              ┌──────────┐
              │  Google  │
              │  Sheets  │
              └──────────┘
```

## 3. File Reference

### Core Modules (`ai-llergy-webapp/src/lib/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `allergens.ts` | Allergen definitions & mappings | `ALL_FILTERS`, `ALLERGEN_TO_COLUMN`, `CustomTag` |
| `google-sheets.ts` | Fetch CSV from public Google Sheet | `fetchMenuFromSheets()` |
| `menu-service.ts` | Caching layer (10-min TTL) | `getMenu()`, `refreshMenu()` |
| `filter-menu.ts` | Deterministic YES/NO/CAN BE filtering | `filterMenu()`, `formatWarnings()` (see §4.1) |
| `ai-filter.ts` | AI-powered ingredient analysis (v2.6) | `filterMenuWithAI()` (see §14) |
| `interpret-allergy.ts` | Custom text → allergen IDs | `interpretCustomAllergy()` |

### API Route

**Endpoint**: `POST /api/submit`

**Request** (v2.6+ with custom tags):
```json
{
  "allergens": [
    { "id": "dairy", "type": "allergy" },
    { "id": "gluten", "type": "preference" }
  ],
  "customAllergenIds": ["sesame"],
  "customTags": [
    { "id": "custom_nightshades_1707123456", "text": "nightshades", "displayLabel": "Nightshades" }
  ]
}
```

**Request** (v2.3+ with allergy/preference type):
```json
{
  "allergens": [
    { "id": "dairy", "type": "allergy" },
    { "id": "gluten", "type": "preference" }
  ],
  "customAllergy": "I'm also allergic to tree nuts"
}
```

**Legacy Request** (pre-v2.3, still supported):
```json
{
  "allergens": ["dairy", "gluten"],
  "customAllergy": "I'm also allergic to tree nuts"
}
```

**Response**:
```json
{
  "success": true,
  "safeItems": [
    {
      "name": "Hummus",
      "ingredients": "Chickpeas, Tahini, ...",
      "price": 12,
      "warnings": []
    }
  ],
  "cautionItems": [
    {
      "name": "Lamb Pirzola",
      "ingredients": "...",
      "price": 29,
      "warnings": ["Can be made Dairy-free on request"]
    }
  ],
  "excludedCount": 15,
  "customAllergyNote": "Please ask staff about: ...",
  "meta": {
    "totalItems": 31,
    "allergenFilters": ["dairy", "gluten", "pistachio", "walnut", "almond"],
    "cacheStatus": { "cached": true, "age": 30000 },
    "interpretMethod": "local"
  }
}
```

## 4. Allergen Mapping

### Form ID → Sheet Column (Full List - v2.2)

| Form ID | Sheet Column | Status | Notes |
|---------|--------------|--------|-------|
| `vegetarian` | Vegetarian | **Active** | Dietary preference |
| `vegan` | Vegan | **Active** | Dietary preference |
| `peanuts` | PEANUT FREE | Pending | Big 9 - needs column in sheet |
| `treenuts` | TREE NUT FREE | Pending | Big 9 - needs column in sheet |
| `eggs` | EGG FREE | Pending | Big 9 - needs column in sheet |
| `dairy` | DAIRY FREE | **Active** | |
| `gluten` | GLUTEN FREE | **Active** | |
| `soy` | SOY FREE | **Active** | |
| `fish` | FISH FREE | Pending | Big 9 - needs column in sheet |
| `shellfish` | SHELLFISH FREE | Pending | Big 9 - needs column in sheet |
| `sesame` | SESAME FREE | **Active** | |
| `almond` | ALMOND FREE | **Active** | |
| `walnut` | WALNUT FREE | **Active** | |
| `pistachio` | PISTACHIO FREE | **Active** | |
| `wheat` | WHEAT FREE | Pending | EU allergen - needs column in sheet |
| `mustard` | MUSTARD FREE | Pending | EU allergen - needs column in sheet |
| `sulfites` | SULFITE FREE | Pending | EU allergen - needs column in sheet |
| `garlic` | GARLIC FREE | **Active** | |
| `onion` | ONION FREE | **Active** | |
| `celery` | CELERY FREE | Pending | EU allergen - needs column in sheet |
| `chili` | CHILI FREE | **Active** | |
| `capsicum` | CAPSICUM FREE | **Active** | |
| `lupin` | LUPIN FREE | Pending | EU allergen - needs column in sheet |
| `molluscs` | MOLLUSC FREE | Pending | EU allergen - needs column in sheet |

**Status Legend**:
- **Active**: Column exists in Google Sheet, filtering works
- **Pending**: Column needs to be added to Google Sheet; allergen is selectable but won't filter results

### Sheet Values

| Value | Meaning | Action |
|-------|---------|--------|
| `YES` | Item is safe for this allergen | Include in safe items |
| `NO` | Item contains this allergen | Exclude from results |
| `CAN BE` | Item can be made safe on request | Include with warning |

### 4.1 Warning Text Formatting (`formatWarnings()`)

The `formatWarnings()` function in `filter-menu.ts` converts allergen IDs to human-readable modification messages. It handles two types differently:

**Allergens** (use `-free` suffix):
```
dairy    → "Can be made Dairy-free on request"
gluten   → "Can be made Gluten-free on request"
walnut   → "Can be made Walnut-free on request"
```

**Dietary Preferences** (no suffix):
```
vegan      → "Can be made Vegan on request"
vegetarian → "Can be made Vegetarian on request"
```

**Implementation**:
```typescript
const dietaryPreferences = new Set(["vegan", "vegetarian"]);

return warnings.map((w) => {
  const label = allergenLabels[w] || w;
  if (dietaryPreferences.has(w)) {
    return `Can be made ${label} on request`;
  }
  return `Can be made ${label}-free on request`;
});
```

**Why this matters**: "Walnut-free" makes sense (removing walnuts), but "vegan-free" is nonsensical. You make something *vegan*, not *vegan-free*.

**Common mistake**: If adding new dietary preferences (e.g., "halal", "kosher"), add them to the `dietaryPreferences` set to avoid the `-free` suffix bug.

## 5. Custom Allergy Interpretation

### Local Synonym Matching (Fast Path)

The system first tries to match common terms locally without AI:

```typescript
const SYNONYM_MAP = {
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
```

### AI Fallback (Slow Path)

If local matching fails, Claude Haiku interprets the text:
- Handles spelling errors ("dary" → dairy)
- Handles complex phrases ("tree nuts" → pistachio, walnut, almond)
- Returns matched allergen IDs

**Model**: `claude-3-5-haiku-20241022`
**Max tokens**: 100
**Temperature**: 0 (deterministic)

### Unmatched Text

If AI can't match the text to known allergens, it's returned as `customAllergyNote`:
```json
{
  "customAllergyNote": "Please ask staff about: sulfites"
}
```

## 6. Google Sheets Integration

### Sheet Structure

| Column | Header | Example |
|--------|--------|---------|
| A | Item | Hummus |
| B | Ingredients | Chickpeas, Tahini, ... |
| C | Price | 12 |
| D | Vegetarian | YES |
| E | Vegan | YES |
| F | DAIRY FREE | YES |
| G-P | [Other allergens] | YES/NO/CAN BE |

### Fetching

```typescript
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
```

**Requirements**:
- Sheet must be publicly viewable ("Anyone with the link can view")
- No authentication required

### Caching

- **TTL**: 10 minutes (600,000ms)
- **Storage**: In-memory (resets on server restart)
- **Manual refresh**: Call `refreshMenu()` to invalidate cache

## 7. Environment Variables

**File**: `ai-llergy-webapp/.env.local`

```env
# Required
GOOGLE_SHEET_ID=1HNWCErJzCBRfy-oPOqPgg1UYYbhOkD5tuVrLWevryeU

# Optional (enables AI interpretation)
ANTHROPIC_API_KEY=sk-ant-...
```

## 8. Testing

### Manual API Test

```bash
# Test with button selections
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"allergens": ["dairy", "gluten"], "customAllergy": ""}'

# Test with custom text (local matching)
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"allergens": [], "customAllergy": "lactose intolerant"}'

# Test with custom text (AI fallback)
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"allergens": [], "customAllergy": "I cant eat dary or wheet"}'
```

### Expected Behaviors

| Input | Expected |
|-------|----------|
| `["dairy"]` | Excludes items with DAIRY FREE = NO |
| `["dairy", "gluten"]` | Excludes items missing either |
| `["peanuts"]` | Tracked but doesn't filter (no sheet column yet) |
| `"lactose"` (custom) | Maps to dairy via local synonyms |
| `"groundnut"` (custom) | Maps to peanuts via local synonyms |
| `"shrimp"` (custom) | Maps to shellfish via local synonyms |
| `"dary"` (misspelled) | Maps to dairy via AI |
| `"unknown allergy"` | Returns as customAllergyNote |

## 9. Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Empty menu returned | Sheet not public | Make sheet viewable to "Anyone with link" |
| AI interpretation not working | Missing API key | Add `ANTHROPIC_API_KEY` to `.env.local` |
| Stale menu data | Cache not expired | Call `refreshMenu()` or wait 10 minutes |
| Wrong items filtered | Column mismatch | Check `ALLERGEN_TO_COLUMN` mapping matches sheet headers |
| "vegan-free" / "vegetarian-free" phrasing | Dietary preference not in exclusion set | Add to `dietaryPreferences` set in `formatWarnings()` (see §4.1) |

### Debug Logging

The API logs timing and results:
```
Menu filtered in 52ms: {
  allergens: ["dairy", "gluten"],
  safeCount: 11,
  cautionCount: 5,
  excludedCount: 15
}
```

## 10. Related Directives

- **Allergen Management**: See `directives/allergen_management.md` for adding/modifying allergens
- **Frontend Display**: See `directives/frontend_results_display.md` for how results are rendered in the UI
- **Project Overview**: See `directives/project_ai_llergy.md` for full project context and changelog

## 11. Allergy/Preference Type Handling (v2.3)

The frontend now sends allergen selections with a `type` field distinguishing allergies from preferences:

```typescript
interface SelectedAllergen {
  id: string;
  type: "allergy" | "preference";
}
```

**Backend processing**:
```typescript
// In route.ts - extract just IDs for filtering
const allergenIds = allergens.map((a: SelectedAllergen) => a.id);
```

**Important**: The type distinction is **UI-only**. Both allergies and preferences are filtered identically. The distinction exists for:
1. Visual differentiation in the UI (red vs orange styling)
2. Display in SelectionSummary (grouped by type)
3. User awareness about the nature of their restrictions

## 12. Critical: Data Synchronization (v2.4.3)

### The Single Source of Truth

**`allergens.ts`** is the single source of truth for all allergen definitions. All other files must derive their allergen lists from it, never hardcode their own.

### Architecture

```
allergens.ts (SOURCE OF TRUTH)
    │
    ├── ALL_FILTERS[] ─────────────────┬──────────────────┐
    │   (id, label, icon, columnName)  │                  │
    │                                  ▼                  ▼
    │                          menu-service.ts     filter-menu.ts
    │                          (transforms data)   (filters data)
    │                                  │                  │
    │                                  └──────┬───────────┘
    │                                         ▼
    │                                 item.allergenProfile
    │                                 { "FISH FREE": "NO", ... }
    │
    └── ALLERGEN_TO_COLUMN{} ──────────────────▶ Used by filterMenu()
        (maps id → columnName)                  to look up column values
```

### The Bug That Was Fixed (v2.4.3)

**Problem**: `menu-service.ts` had a **hardcoded** `allergenColumns` array that was out of sync with `allergens.ts`:

```typescript
// BROKEN CODE (pre-v2.4.3) - DO NOT USE
const allergenColumns = [
  "Vegetarian", "Vegan", "DAIRY FREE", "PISTACHIO FREE",
  "WALNUT FREE", "ALMOND FREE", "SOY FREE", "GLUTEN FREE",
  "SESAME FREE", "GARLIC FREE", "ONION FREE", "CAPSICUM FREE", "CHILI FREE"
];  // Missing: FISH FREE, SHELLFISH FREE, PEANUT FREE, EGG FREE, etc.
```

This caused `item.allergenProfile["FISH FREE"]` to be `undefined`, which didn't match `"NO"`, so fish-containing items passed through the filter.

**Fix**: Dynamically derive columns from `ALL_FILTERS`:

```typescript
// CORRECT CODE (v2.4.3+)
import { ALL_FILTERS } from "./allergens";

for (const allergen of ALL_FILTERS) {
  const col = allergen.columnName;
  const value = raw[col]?.toUpperCase().trim() || "";
  // ... process value
}
```

### Rules for Future Development

1. **NEVER** hardcode allergen lists in any file except `allergens.ts`
2. **ALWAYS** import from `allergens.ts` when you need allergen information
3. **ALWAYS** use `ALL_FILTERS` or `ALLERGEN_TO_COLUMN` for iteration/lookup
4. When adding new allergens, only modify `allergens.ts` and `interpret-allergy.ts` (synonyms)
5. Run the full app after changes to verify filtering works end-to-end

### Testing After Allergen Changes

After any allergen-related changes, test these scenarios:

```bash
# Test each allergen tier - verify items are actually excluded
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"allergens": [{"id": "fish", "type": "allergy"}], "customAllergenIds": []}'

# Check response: "Cured Market Fish" should NOT appear in safeItems
```

## 13. Hybrid Column + AI Filtering (v2.4.4)

### Problem Solved

Allergens defined in `allergens.ts` but without corresponding Google Sheet columns (e.g., Fish, Peanuts, Shellfish) were broken:
- **v2.4.3 initial fix**: Missing columns defaulted to "NO" → excluded ALL items
- **v2.4.4 solution**: Missing columns trigger AI-based ingredient analysis

### How It Works

```typescript
// In route.ts
const availableColumns = getAvailableColumns();

// Split allergens by whether they have columns
for (const id of allAllergens) {
  const columnName = ALLERGEN_TO_COLUMN[id];
  if (columnName && availableColumns.has(columnName)) {
    columnAllergens.push(id);  // Fast path
  } else {
    aiAllergens.push(id);      // AI path
  }
}
```

### Flow Diagram

```
User selects: [dairy, fish, peanuts]
                │
                ▼
        ┌───────────────────────────┐
        │ Check which columns exist │
        │ dairy: EXISTS             │
        │ fish: MISSING             │
        │ peanuts: MISSING          │
        └───────────────────────────┘
                │
                ▼
        ┌───────────────────────────┐
        │ ALL columns exist?        │
        └───────────────────────────┘
                │
        ┌───────┴───────┐
        │ YES           │ NO (some missing)
        ▼               ▼
┌─────────────┐   ┌─────────────────────────────┐
│filterMenu() │   │ STEP 1: filterMenu()        │
│ (all items) │   │ with EXISTING columns only  │
│             │   │ [dairy]                     │
│ DONE ~50ms  │   │ → Reduces 31 items to ~20   │
└─────────────┘   └─────────────────────────────┘
                                │
                                ▼
                  ┌─────────────────────────────┐
                  │ STEP 2: AI filtering        │
                  │ on REDUCED list only        │
                  │ for [fish, peanuts]         │
                  │ → 20 items instead of 31    │
                  │ → Faster, fewer API calls   │
                  └─────────────────────────────┘
                                │
                                ▼
                        ┌─────────────┐
                        │ Final result│
                        │ ~2-5 seconds│
                        └─────────────┘
```

### Key Functions

| Function | File | Purpose |
|----------|------|---------|
| `detectAvailableColumns()` | `menu-service.ts` | Scans sheet data for non-empty columns |
| `getAvailableColumns()` | `menu-service.ts` | Returns Set of available column names |
| `filterMenu()` | `filter-menu.ts` | Column-based filtering (skips undefined) |
| `filterMenuWithAI()` | `ai-filter.ts` | AI-based ingredient analysis |

### Performance

| Scenario | Time |
|----------|------|
| All allergens have columns | ~50-100ms |
| Some allergens missing columns | ~2-5 seconds (AI) |
| Column pre-filtering optimization | Reduces AI items by ~30-50% |

### Console Logging

```
[menu-service] Available columns: ["Vegetarian", "Vegan", "DAIRY FREE", ...]
[route] Column filtering: 31 → 20 items (excluded 11)
[route] AI filtering 20 items for: ["Fish", "Peanuts"]
Menu filtered in 2341ms: {
  allergens: ["dairy", "fish", "peanuts"],
  columnAllergens: ["dairy"],
  aiAllergens: ["fish", "peanuts"],
  usedAI: true,
  ...
}
```

### When Columns Are Added

When chefs add a column (e.g., "FISH FREE") to the Google Sheet:
1. Next menu fetch detects the new column
2. Fish automatically moves from `aiAllergens` to `columnAllergens`
3. Filtering becomes instant instead of AI-based
4. No code changes required

## 14. AI-Based Menu Filtering (v2.6)

### When AI Filtering is Triggered

AI-based filtering runs when the request includes `customTags`:

```typescript
const hasCustomTags = customTags && Array.isArray(customTags) && customTags.length > 0;

const result = hasCustomTags
  ? await filterMenuWithAI(menu, allAllergens, customTags)
  : filterMenu(menu, allAllergens);
```

### How It Works

1. **Hybrid Approach**: Standard allergens still filter via columns first
2. **Pre-filtering**: Column-based filtering reduces the item count before AI
3. **AI Analysis**: Claude analyzes remaining items' ingredients against custom restrictions
4. **Batching**: Items are batched (20 per API call) to stay within token limits

### Flow Diagram

```
Request with customTags
      │
      ▼
┌──────────────────────────────┐
│  filterMenuWithAI()          │
│  in ai-filter.ts             │
└──────────────────────────────┘
      │
      ├── Standard allergens exist?
      │         │
      │         ▼ YES
      │   ┌────────────────────┐
      │   │ filterMenu()       │  ← Column-based first
      │   │ (excludes NO items)│
      │   └────────────────────┘
      │         │
      │         ▼
      │   Remaining items (safe + caution)
      │
      ▼
┌──────────────────────────────┐
│ analyzeMenuItemsWithAI()     │
│ - Batch 20 items at a time   │
│ - Claude Haiku analyzes      │
│   ingredients vs restrictions│
└──────────────────────────────┘
      │
      ▼
   For each item:
   - "safe": Ingredients clearly don't contain restriction
   - "caution": Unclear, customer should ask
   - "excluded": Ingredients contain restriction
      │
      ▼
┌──────────────────────────────┐
│ Merge results                │
│ - Combine standard warnings  │
│ - Add AI warnings            │
│ - Return FilterResult        │
└──────────────────────────────┘
```

### AI Prompt Structure

The AI receives:
- List of custom restrictions (e.g., "nightshades", "FODMAPs")
- Menu items with names and ingredients
- Instructions on common food categories

```typescript
const prompt = `You are a food safety analyzer...

RESTRICTIONS: ${restrictions.join(", ")}

MENU ITEMS:
${JSON.stringify(itemDescriptions)}

For each item, determine:
- "safe": clearly does NOT contain restricted ingredients
- "caution": MIGHT contain, customer should ask
- "excluded": DEFINITELY contains restricted ingredients

Respond with ONLY a JSON array...`;
```

### Common Restriction Knowledge

The AI prompt includes guidance on common complex restrictions:
- **FODMAPs**: onions, garlic, wheat, certain fruits, legumes, honey
- **Nightshades**: tomatoes, potatoes, peppers, eggplant, paprika
- **Cruciferous**: broccoli, cauliflower, cabbage, kale, brussels sprouts
- **Stone fruits**: peaches, plums, cherries, apricots
- **Citrus**: oranges, lemons, limes, grapefruit

### Fallback Behavior

If AI fails (API error, timeout, key missing):
1. All items are marked as "caution"
2. Warning: "AI analysis unavailable - please verify with staff"
3. User still sees results, just needs to verify manually

```typescript
function fallbackToCaution(items, restrictions) {
  return items.map(item => ({
    status: "caution",
    warnings: [`Please verify with staff regarding: ${restrictions.join(", ")}`]
  }));
}
```

### Performance Considerations

| Factor | Impact |
|--------|--------|
| Batch size | 20 items/call balances throughput vs latency |
| Model | Haiku for speed (~500-1000ms per batch) |
| Pre-filtering | Reduces AI workload significantly |
| Caching | Menu is cached; AI results are NOT cached |

### Files

| File | Purpose |
|------|---------|
| `ai-filter.ts` | Main AI filtering logic |
| `route.ts` | Detects customTags, routes to AI or standard |

## 15. Future Improvements

- [ ] Add Redis caching for multi-instance deployments
- [ ] Implement webhook to refresh cache when sheet updates
- [ ] Add rate limiting for AI interpretation
- [ ] Support multiple restaurant menus (multi-tenant)
- [x] ~~Add ingredient-level search (not just allergen columns)~~ (Done in v2.6 via AI filtering)
- [ ] Consider different filtering behavior for preferences vs allergies (e.g., show preferences in "Can Be Modified" only)
- [ ] Cache AI filtering results for common custom tag combinations
- [ ] Add timeout handling for AI filtering (show partial results)
