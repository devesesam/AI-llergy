# Directive: Custom Allergy Input System

**Goal**: Document the autocomplete tag-based allergen input system, including local synonym search, AI fallback, custom tags, and submit validation.

## 1. Overview

The custom allergy input replaces freeform text with a structured system:
1. **Autocomplete** - Local search of 180+ synonyms as user types
2. **Fuzzy Matching** - Catches typos like "penuts" → peanuts (v2.4.1)
3. **Phrase Tokenization** - Extracts allergens from sentences like "i can't eat peanuts" (v2.4.1)
4. **Tags** - Selected allergens become removable chips
5. **Custom Tags** - Free-form text restrictions for things not in our allergen list (v2.6.1)
6. **Validation** - Submit blocked until all text is converted to tags

This approach ensures all allergens are validated IDs before submission, dramatically reducing AI API calls and preventing ambiguous/unparsable input.

**Note**: v2.6.1 simplified the UX - when no matches are found, users can directly "Add as custom restriction" without an intermediate AI step. Custom tags trigger AI-based menu filtering at submit time.

## 2. File Reference

| File | Purpose | Location |
|------|---------|----------|
| `AutocompleteInput.tsx` | Main autocomplete component | `ai-llergy-webapp/src/components/AutocompleteInput.tsx` |
| `AllergenTag.tsx` | Removable tag chip (standard allergens) | `ai-llergy-webapp/src/components/AllergenTag.tsx` |
| `CustomTagPill.tsx` | Removable tag chip (custom restrictions, v2.6) | `ai-llergy-webapp/src/components/CustomTagPill.tsx` |
| `interpret-allergy.ts` | Synonym map + search function | `ai-llergy-webapp/src/lib/interpret-allergy.ts` |
| `ai-filter.ts` | AI-powered menu filtering (v2.6) | `ai-llergy-webapp/src/lib/ai-filter.ts` |
| `api/interpret/route.ts` | AI interpretation endpoint | `ai-llergy-webapp/src/app/api/interpret/route.ts` |
| `page.tsx` | Parent state management | `ai-llergy-webapp/src/app/page.tsx` |
| `globals.css` | Component styles | `ai-llergy-webapp/src/app/globals.css` |

## 3. Architecture

### Data Flow

```
User types "lac"
      │
      ▼
┌─────────────────────────┐
│   searchSynonyms()      │  ← Local, instant (~1ms)
│   in interpret-allergy  │
└─────────────────────────┘
      │
      ▼
   Matches: ["dairy"]
      │
      ▼
┌─────────────────────────┐
│   Dropdown shows:       │
│   🥛 Dairy (lactose)    │
└─────────────────────────┘
      │
      ▼
   User clicks
      │
      ▼
┌─────────────────────────┐
│   Tag added:            │
│   [🥛 Dairy ×]          │
│   Input cleared         │
└─────────────────────────┘
```

### Custom Tags Flow (v2.6.1)

When no local matches are found, users can directly add custom restrictions:

```
User types "nightshades"
      │
      ▼
   searchSynonyms() → []
      │
      ▼
   500ms timeout
      │
      ▼
┌──────────────────────────────────────┐
│ No matches found for "nightshades"   │
│ [🏷️ Add as custom restriction]      │
└──────────────────────────────────────┘
      │
      ▼
   User clicks button (or presses Enter)
      │
      ▼
┌──────────────────────────────────────┐
│ Custom tag added:                    │
│ [🏷️ Nightshades ×]                  │
└──────────────────────────────────────┘
      │
      ▼
   On Submit: AI analyzes menu ingredients
   for custom restrictions
```

**Note**: The AI fallback for allergen interpretation (`/api/interpret`) still exists but is no longer exposed in the UI. The direct "Add as custom restriction" flow is faster and more intuitive since the AI rarely finds matches for terms not already in the synonym list.

## 4. Component API

### AutocompleteInput

```typescript
interface AutocompleteInputProps {
  selectedAllergenIds: string[];           // Currently selected tag IDs (standard allergens)
  onAllergenAdd: (id: string) => void;     // Called when standard tag added
  onAllergenRemove: (id: string) => void;  // Called when standard tag removed
  onInputChange: (hasText: boolean) => void; // Called when input has/lacks text
  // v2.6 Custom Tags:
  customTags: CustomTag[];                 // Currently selected custom tags
  onCustomTagAdd: (tag: CustomTag) => void;    // Called when custom tag added
  onCustomTagRemove: (tagId: string) => void;  // Called when custom tag removed
}

interface CustomTag {
  id: string;           // Generated unique ID (e.g., "custom_nightshades_1707123456")
  text: string;         // Original user text ("nightshades")
  displayLabel: string; // Formatted for display ("Nightshades")
}
```

**Usage in page.tsx:**

```typescript
const [customAllergenIds, setCustomAllergenIds] = useState<string[]>([]);
const [customTags, setCustomTags] = useState<CustomTag[]>([]);
const [hasInputText, setHasInputText] = useState(false);

<AutocompleteInput
  selectedAllergenIds={customAllergenIds}
  onAllergenAdd={(id) => setCustomAllergenIds(prev => [...prev, id])}
  onAllergenRemove={(id) => setCustomAllergenIds(prev => prev.filter(i => i !== id))}
  onInputChange={setHasInputText}
  customTags={customTags}
  onCustomTagAdd={(tag) => setCustomTags(prev => [...prev, tag])}
  onCustomTagRemove={(tagId) => setCustomTags(prev => prev.filter(t => t.id !== tagId))}
/>

// Submit button disabled while text in input
<button disabled={hasInputText}>Submit</button>
```

### CustomTagPill (v2.6)

```typescript
interface CustomTagPillProps {
  tag: CustomTag;                    // The custom tag object
  onRemove: (tagId: string) => void; // Called when × clicked
}
```

**Renders:**
```
[🏷️ Nightshades ×]
```

**Styling**: Gray/neutral theme to differentiate from standard allergen tags (seafoam green).

### AllergenTag

```typescript
interface AllergenTagProps {
  allergenId: string;                  // The allergen ID (e.g., "dairy")
  onRemove: (id: string) => void;      // Called when × clicked
}
```

**Renders:**
```
[🥛 Dairy ×]
```

## 5. Search Function

### searchSynonyms()

Located in `interpret-allergy.ts`, exported for client-side use.

```typescript
export interface SearchResult {
  allergenId: string;      // e.g., "dairy"
  matchedTerm: string;     // e.g., "lactose" (what matched)
  isExactMatch: boolean;   // true if query === matchedTerm
  isFuzzyMatch?: boolean;  // true if matched via Levenshtein distance (v2.4.1)
}

export function searchSynonyms(query: string): SearchResult[]
```

**Behavior (v2.4.1):**
1. **Tokenizes** input: splits on whitespace/punctuation, filters stop words
2. Searches each token + the full query string
3. For each token, checks in priority order:
   - **Exact matches** (token === allergen/synonym)
   - **Substring matches** (token contains or is contained in allergen/synonym)
   - **Fuzzy matches** (Levenshtein distance ≤ 1-2 edits depending on word length)
4. Returns unique allergens (one per allergen, best match wins)
5. Sorts: exact → substring → fuzzy, then alphabetically

### Fuzzy Matching Thresholds

| Word Length | Max Edit Distance | Example |
|-------------|-------------------|---------|
| 3 or less | 1 edit | "soy" ≠ "soya" (2 edits) |
| 4-6 chars | 2 edits | "penuts" → "peanuts" (1 edit) ✓ |
| 7+ chars | 2 edits | "shellfsh" → "shellfish" (1 edit) ✓ |

### Phrase Tokenization

Stop words are automatically filtered:
- Pronouns: i, my, we, you
- Articles: a, an, the
- Verbs: eat, have, can, don't
- Allergy-related: allergic, intolerant, avoid, free

**Example:**
```
"i can't eat peanuts or dairy"
  ↓ tokenize
["peanuts", "dairy"]  (stop words removed)
  ↓ search each
🥜 Peanuts, 🥛 Dairy
```

### Examples

```typescript
// Substring match
searchSynonyms("lac")
// → [{ allergenId: "dairy", matchedTerm: "lactose", isExactMatch: false }]

// Exact match
searchSynonyms("shrimp")
// → [{ allergenId: "shellfish", matchedTerm: "shrimp", isExactMatch: true }]

// Fuzzy match (typo)
searchSynonyms("penuts")
// → [{ allergenId: "peanuts", matchedTerm: "peanuts", isFuzzyMatch: true }]

// Phrase tokenization
searchSynonyms("i can't eat peanuts or dairy")
// → [{ allergenId: "peanuts", ... }, { allergenId: "dairy", ... }]

// Multi-word synonym
searchSynonyms("tree nuts")
// → [{ allergenId: "treenuts", matchedTerm: "tree nuts", isExactMatch: true }]
```

## 6. API Endpoint

### POST /api/interpret

**Request:**
```json
{
  "text": "penuts"
}
```

**Response (success):**
```json
{
  "success": true,
  "matchedAllergens": ["peanuts"],
  "unmatchedText": null,
  "method": "ai"
}
```

**Response (no match):**
```json
{
  "success": true,
  "matchedAllergens": [],
  "unmatchedText": "fenugreek",
  "method": "ai"
}
```

**Uses:** Claude Haiku (`claude-3-5-haiku-20241022`) for interpretation. Requires `ANTHROPIC_API_KEY` in `.env`.

## 7. Submit Flow

### Before v2.4 (freeform text)
```
Submit → Backend interprets → May fail or return "ask staff" note
```

### After v2.4 (tag-based)
```
User must convert all text to tags → Submit sends validated IDs → No interpretation needed
```

### Submit Button Feedback (v2.4.2)

When text is in the input field, the submit button is disabled with visual feedback:

1. **Helper text** - Warning box appears below button:
   > ⚠️ Convert your search text to a tag first (select from dropdown or press Enter)

2. **Pulsing input border** - The autocomplete input gets a saffron-colored pulsing border animation to draw attention

**CSS Classes:**
| Class | Purpose |
|-------|---------|
| `.submit-helper` | Warning container with saffron background |
| `.submit-helper__icon` | Warning emoji icon |
| `.submit-helper__text` | Helper message text |
| `.autocomplete-input--blocking` | Pulsing border on input when blocking submit |

**Implementation in page.tsx:**
```tsx
{hasInputText && (
  <div className="submit-helper">
    <span className="submit-helper__icon">⚠️</span>
    <span className="submit-helper__text">
      Convert your search text to a tag first (select from dropdown or press Enter)
    </span>
  </div>
)}
```

### Request Format

**Old:**
```json
{
  "allergens": [{"id": "dairy", "type": "allergy"}],
  "customAllergy": "lactose intolerant and nut allergy"
}
```

**New:**
```json
{
  "allergens": [{"id": "dairy", "type": "allergy"}],
  "customAllergenIds": ["dairy", "treenuts"]
}
```

Backend simply merges `allergenIds` + `customAllergenIds` for filtering.

## 8. Styling Classes

| Class | Purpose |
|-------|---------|
| `.autocomplete-container` | Wrapper for tags + input |
| `.autocomplete-tags` | Flexbox container for tags |
| `.autocomplete-input-wrapper` | Relative container for dropdown positioning |
| `.autocomplete-input` | Text input field |
| `.autocomplete-input--blocking` | Pulsing saffron border when blocking submit (v2.4.2) |
| `.autocomplete-dropdown` | Absolute-positioned suggestion list |
| `.autocomplete-option` | Individual suggestion button |
| `.autocomplete-no-match` | "No matches found" container |
| `.autocomplete-add-custom` | "Add as custom restriction" button (v2.6.1) |
| `.autocomplete-helper` | "Type allergens one at a time" text |
| `.allergen-tag` | Tag chip styling (standard allergens) |
| `.allergen-tag__remove` | × button styling |
| `.custom-tag` | Custom tag chip styling (gray theme, v2.6) |
| `.custom-tag__icon` | 🏷️ icon |
| `.custom-tag__label` | Custom tag text |
| `.custom-tag__remove` | × button styling |
| `.submit-helper` | Helper text container below button (v2.4.2) |
| `.submit-helper__icon` | Warning emoji styling |
| `.submit-helper__text` | Helper message text styling |

## 9. Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Dropdown doesn't appear | Input not focused or empty | Check `showDropdown` state logic |
| Duplicate tags | Missing duplicate check | `onAllergenAdd` should check `!includes(id)` |
| "Add as custom" doesn't appear | Timeout not set | Ensure 500ms timeout after empty results |
| Submit button always disabled | `hasInputText` stuck true | Verify `onInputChange(false)` called on clear |
| Tag shows undefined | Invalid allergen ID | Check `getAllergenById()` returns valid allergen |
| Dropdown behind other elements | z-index issue | `.autocomplete-dropdown` needs `z-index: 100` |

## 10. Testing Checklist

After modifying the autocomplete system:

**Basic Matching:**
- [ ] Type "lac" → Dairy suggestion appears (substring)
- [ ] Type "shrimp" → Shellfish suggestion appears (exact)
- [ ] Click suggestion → Tag added, input cleared
- [ ] Press Enter with single suggestion → Tag added

**Fuzzy Matching (v2.4.1):**
- [ ] Type "penuts" → Peanuts suggestion appears (1 edit typo)
- [ ] Type "dary" → Dairy suggestion appears (1 edit typo)
- [ ] Type "glutin" → Gluten suggestion appears (1 edit typo)

**Phrase Tokenization (v2.4.1):**
- [ ] Type "i can't eat peanuts" → Peanuts suggestion appears
- [ ] Type "no dairy or gluten" → Both Dairy and Gluten appear
- [ ] Type "lactose intolerant" → Dairy suggestion appears

**Validation:**
- [ ] Click × on tag → Tag removed
- [ ] Try to submit with text in field → Button disabled
- [ ] Clear field → Button enabled
- [ ] Add tag, submit → Tag ID included in request
- [ ] Build passes: `npm run build`

**Custom Tags (v2.6.1):**
- [ ] Type unknown term (e.g., "cucumber") → "Add as custom restriction" button appears after 500ms
- [ ] Click "Add as custom restriction" → Gray tag (🏷️) added
- [ ] Press Enter when showing "Add as custom" → Tag added
- [ ] Custom tag × button removes the tag
- [ ] Submit with custom tag → AI-based filtering runs (slower, ~2-5s)
- [ ] Results show "Custom Restrictions" in SelectionSummary
- [ ] Mix standard allergens + custom tags → Both appear in results

## 11. Future Improvements

- [ ] **Learn from AI**: Log successful AI interpretations, periodically bulk-add to SYNONYM_MAP
- [ ] **Predictive caching**: Pre-cache common phrases ("I'm vegan", "nut allergy")
- [ ] **Voice input**: "I'm allergic to shellfish and nuts"
- [x] ~~**Multi-input parsing**: Handle comma-separated input ("dairy, nuts, gluten")~~ (Done in v2.4.1 via tokenization)
- [x] ~~**Fuzzy matching**: Match typos locally before triggering AI (e.g., Levenshtein distance)~~ (Done in v2.4.1)
- [ ] **Keyboard navigation**: Arrow keys to navigate dropdown, Enter to select
- [ ] **Recent selections**: Show user's recent/frequent allergens as quick picks

## 12. Version History

### v2.6.1 (2026-02-13)
- **UX Simplification**: Removed "Ask AI" intermediate step
  - When no local matches found, "Add as custom restriction" button appears directly after 500ms timeout
  - Pressing Enter also adds the custom tag when showing "Add as custom" option
  - Faster user flow - no need to wait for AI interpretation that rarely finds matches
- **State Cleanup**: Removed `isAILoading`, `aiError` states from AutocompleteInput
- **Reason**: AI interpretation rarely matched terms not already in synonym list; direct custom tag flow is more intuitive

### v2.6 (2026-02-13)
- **Custom Tags Feature**: Users can add free-form text as custom restrictions
  - Custom tags display with 🏷️ icon and gray styling (distinct from standard tags)
  - Custom tags trigger AI-based menu filtering instead of column-based filtering
- **AI-Based Menu Filtering**: When custom tags exist, Claude analyzes menu ingredients
  - Batch processing (20 items per API call) for efficiency
  - Supports complex restrictions: nightshades, FODMAPs, cruciferous vegetables, etc.
  - Falls back to "caution" status if AI unavailable (safest default)
- **Files Added**:
  - `CustomTagPill.tsx` - Custom tag display component
  - `ai-filter.ts` - AI-powered menu filtering logic
- **Files Modified**:
  - `AutocompleteInput.tsx` - Added custom tag props and "Add as custom" button
  - `page.tsx` - Added customTags state and handlers
  - `allergens.ts` - Added CustomTag interface
  - `route.ts` - Added AI filtering detection and integration
  - `SelectionSummary.tsx` - Added "Custom Restrictions" display section
  - `MenuResults.tsx` - Passes customTags to SelectionSummary
  - `globals.css` - Added custom tag styling (~60 lines)
- **New CSS Classes**: `.custom-tag`, `.custom-tag__*`, `.autocomplete-add-custom`, `.selection-pill--custom-tag`

### v2.4.2 (2026-02-10)
- **Submit Button Feedback**: Added visual feedback when submit is disabled due to text in input
  - Helper text below button: "Convert your search text to a tag first"
  - Pulsing saffron border animation on autocomplete input
- **Files Modified**: `page.tsx`, `AutocompleteInput.tsx`, `globals.css`
- **New CSS Classes**: `.submit-helper`, `.autocomplete-input--blocking`

### v2.4.1 (2026-02-10)
- **Fuzzy Matching**: Added Levenshtein distance algorithm for typo tolerance
  - "penuts" → Peanuts, "dary" → Dairy, "glutin" → Gluten
  - Threshold scales with word length (1 edit for short words, 2 for longer)
- **Phrase Tokenization**: Added stop word filtering and phrase parsing
  - "i can't eat peanuts" → extracts just "peanuts"
  - "no dairy or gluten" → extracts both "dairy" and "gluten"
  - Filters 50+ common stop words (pronouns, articles, verbs, allergy-related terms)
- **Search Result Enhancement**: Added `isFuzzyMatch` field to distinguish match types
- **Sort Order**: Results now sorted by match quality (exact → substring → fuzzy)

### v2.4 (2026-02-10)
- **Initial implementation** of autocomplete tag-based input
- Replaced freeform text field with `AutocompleteInput` component
- Added `AllergenTag` component for removable chips
- Created `/api/interpret` endpoint for AI fallback
- Added `searchSynonyms()` function to `interpret-allergy.ts`
- Updated submit flow to use `customAllergenIds[]` instead of `customAllergy`
- Removed `customAllergyNote` from API response (errors handled client-side)
- Added submit validation (disabled while text in input)

## 13. Related Directives

- **Allergen Management**: See `directives/allergen_management.md` for synonym reference
- **Backend Filter**: See `directives/backend_menu_filter.md` for menu filtering logic
- **Project Overview**: See `directives/project_ai_llergy.md` for full changelog
