# Directive: Confidence-Based Allergen Filtering

**Goal**: Use allergen severity levels (preference/allergy/life_threatening) to set confidence thresholds for menu filtering. Only display meals above the user's required confidence level based on how serious their allergen restriction is.

> **⚠️ DORMANT (v4.7)**: The UI **no longer collects severity** — the submit-time
> slider was removed (see `allergen_management.md` §6). Every selection now arrives
> as `type: "allergy"` (`SeverityModal.tsx` `DEFAULT_TYPE`). This system only runs
> for Supabase venues that have `allergen_confidence` scores (currently paused), so
> in practice it is inactive; if reactivated it would apply the single `"allergy"`
> threshold (>80%) to everything until per-selection severity collection is
> reintroduced. The code below is retained and accurate for that future case.

## 1. Overview

The confidence scoring system enables severity-aware filtering:

- **Preference** (>25%): Low bar - show most items, user just prefers to avoid
- **Allergy/Intolerance** (>80%): High bar - must be fairly certain item is safe
- **Life-threatening** (>95%): Near certainty required - only explicitly verified safe items

This replaces the previous binary YES/NO filtering with a nuanced confidence-based approach.

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONFIDENCE SCORING FLOW                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  DATA ENTRY TIME (async, can use LLM)                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Menu Item Created/Updated                                        │  │
│  │     ↓                                                            │  │
│  │ compute-confidence.ts (background job)                           │  │
│  │     ↓                                                            │  │
│  │ For each allergen:                                               │  │
│  │   - explicit_flag (allergen_free: true/false)                    │  │
│  │   - ingredient_score (keyword match in ingredients)              │  │
│  │   - cross_contamination_risk (from venue settings)               │  │
│  │     ↓                                                            │  │
│  │ Store: allergen_confidence JSONB on menu_items                   │  │
│  │   { "dairy": 0.95, "gluten": 0.75, "peanuts": 0.30, ... }       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  QUERY TIME (fast, no LLM)                                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ User submits: [{id: "dairy", type: "life_threatening"}, ...]     │  │
│  │     ↓                                                            │  │
│  │ filter-menu.ts                                                   │  │
│  │     ↓                                                            │  │
│  │ For each menu item, for each user allergen:                      │  │
│  │   threshold = SEVERITY_THRESHOLDS[severity]                      │  │
│  │   confidence = item.allergen_confidence[allergenId]              │  │
│  │   if (confidence >= threshold) → SAFE                            │  │
│  │   else if (confidence >= threshold * 0.8) → CAUTION              │  │
│  │   else → EXCLUDED                                                │  │
│  │     ↓                                                            │  │
│  │ Return: safeItems, cautionItems, excludedCount                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 3. File Reference

### Core Modules (`ai-llergy-webapp/src/lib/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `confidence.ts` | Threshold constants and helpers | `SEVERITY_THRESHOLDS`, `getFilterCategory()`, `AllergenWithSeverity` |
| `compute-confidence.ts` | Rule-based confidence calculation | `computeAllergenConfidence()`, `ALLERGEN_KEYWORDS` |
| `filter-menu.ts` | Filtering with confidence | `filterMenuWithConfidence()`, `hasConfidenceScores()` |
| `ai-filter.ts` | AI filtering with confidence | Extended `AIFilterResponse` with confidence field |

### Database (`supabase/`)

| File | Purpose |
|------|---------|
| `schema.sql` | Full schema with `allergen_confidence` column |
| `migrations/20260219_add_allergen_confidence.sql` | Migration for existing databases |

## 4. Severity Thresholds

```typescript
// In confidence.ts
export const SEVERITY_THRESHOLDS: Record<SeverityType, number> = {
  preference: 0.25,        // >25% confidence = safe
  allergy: 0.80,           // >80% confidence = safe
  life_threatening: 0.95,  // >95% confidence = safe
};
```

### Category Mapping

| Score vs Threshold | Category | User Action |
|--------------------|----------|-------------|
| >= threshold | Safe | Can order |
| >= threshold * 0.8 | Caution | Ask staff |
| < threshold * 0.8 | Excluded | Don't order |

### Example: Life-Threatening (95% threshold)

| Confidence | Category |
|------------|----------|
| >= 95% | Safe |
| 76-94% | Caution |
| < 76% | Excluded |

## 5. Confidence Calculation

### Base Scores (Rule-Based, No LLM)

| Data Source | Confidence |
|-------------|------------|
| Explicit `allergen_free: true` | 95% |
| Explicit `allergen_free: false` | 5% |
| No allergen keyword in ingredients | 60% |
| Allergen keyword found in ingredients | 10% |
| No ingredient data | 30% |

### Cross-Contamination Adjustments

| Risk Level | Adjustment | Meaning |
|------------|------------|---------|
| `none` | +20% | Dedicated equipment |
| `low` | +10% | Separate prep areas |
| `medium` | 0% | Standard kitchen |
| `high` | -20% | Shared equipment |

### Keyword Detection

The system scans ingredient text for allergen-related keywords:

```typescript
// In compute-confidence.ts
export const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein', 'lactose'],
  gluten: ['wheat', 'flour', 'bread', 'pasta', 'barley', 'rye', 'oats', 'semolina'],
  peanuts: ['peanut', 'groundnut', 'arachis'],
  // ... full list in compute-confidence.ts
};
```

## 6. Hybrid Approach

### Standard Allergens (Pre-Computed)

For allergens in the standard list (dairy, gluten, peanuts, etc.):
1. Confidence is pre-computed when menu items are created/updated
2. Stored in `allergen_confidence` JSONB column
3. Query-time filtering is pure arithmetic (fast, no LLM)

### Custom Tags (AI-Analyzed)

For freeform text like "corn", "nightshades", "FODMAPs":
1. AI analyzes menu item ingredients at query time
2. AI returns confidence score (0-100) with each result
3. Same severity thresholds apply

```typescript
// Extended AI response
interface AIFilterResponse {
  itemName: string;
  status: "safe" | "caution" | "excluded";
  confidence: number;  // 0-100
  warnings: string[];
  reason: string;
}
```

## 7. Database Schema

### `allergen_confidence` Column (menu_items)

```sql
ALTER TABLE menu_items
ADD COLUMN allergen_confidence JSONB DEFAULT '{}';

-- Example value:
-- { "dairy": 0.95, "gluten": 0.75, "peanuts": 0.30 }
```

### `venue_cross_contamination` Table

```sql
CREATE TABLE venue_cross_contamination (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  allergen_id TEXT NOT NULL,  -- e.g., "peanuts", "dairy"
  risk_level TEXT CHECK (risk_level IN ('none', 'low', 'medium', 'high')),
  notes TEXT,  -- Optional: "Shared fryer with breaded items"
  UNIQUE(venue_id, allergen_id)
);
```

## 8. API Changes

### Request (v3.1+)

```json
{
  "allergens": [
    { "id": "dairy", "type": "life_threatening" },
    { "id": "gluten", "type": "preference" }
  ],
  "customTags": [
    { "id": "custom_corn_123", "text": "corn", "type": "allergy" }
  ]
}
```

**Important**: Severity type is now USED for filtering, not just display.

### Filtering Paths

| Scenario | Path | Speed |
|----------|------|-------|
| Supabase venue + standard allergens | `filterMenuWithConfidence()` | ~50ms |
| Google Sheets venue | `filterMenu()` (legacy YES/NO) | ~50ms |
| Any venue + custom tags | `filterMenuWithAI()` | ~2-5s |

## 9. Triggering Confidence Re-computation

Confidence scores need re-computation when:

1. **Menu item ingredients change** - Keyword detection may change
2. **Allergen profile updated** - Explicit flags change base score
3. **Cross-contamination settings change** - Adjustments change

### Options

- **Supabase Edge Function** - Trigger on database changes (recommended)
- **Admin API route** - Manual trigger from dashboard
- **Background job** - Cron job to refresh periodically

### Helper Function

```sql
-- In the database
SELECT compute_menu_item_confidence('menu-item-uuid');
-- Returns JSONB with all confidence scores
```

## 10. Implementation Checklist

### Completed

- [x] Create `confidence.ts` with threshold constants
- [x] Create `compute-confidence.ts` with calculation logic
- [x] Add `filterMenuWithConfidence()` to filter-menu.ts
- [x] Update route.ts to pass severity through (line 63 fix)
- [x] Extend `AIFilterResponse` with confidence field
- [x] Update AI prompt to request confidence scores
- [x] Add `allergen_confidence` to Supabase types
- [x] Add `venue_cross_contamination` table types
- [x] Create database migration

### Pending

- [ ] Apply migration to production database
- [ ] Build trigger/job to compute confidence on menu changes
- [ ] Add cross-contamination UI in venue dashboard
- [ ] Test with various severity combinations

## 11. Testing

### Standard Allergens (Pre-computed)

```bash
# Create test menu items with various confidence scores
# Then test each severity level:

# Preference (25%) - Most items should pass
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"allergens": [{"id": "dairy", "type": "preference"}]}'

# Life-threatening (95%) - Only high-confidence items
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"allergens": [{"id": "dairy", "type": "life_threatening"}]}'
```

### Custom Tags (AI-analyzed)

```bash
# Corn as preference - low threshold, most items pass
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"allergens": [], "customTags": [{"id": "custom_corn", "text": "corn", "type": "preference"}]}'

# Corn as life-threatening - high threshold, few items pass
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"allergens": [], "customTags": [{"id": "custom_corn", "text": "corn", "type": "life_threatening"}]}'
```

## 12. Console Logging

```
[route] Using confidence-based filtering with severity thresholds
[ai-filter] Using severity threshold: life_threatening (95%)
Menu filtered in 2341ms: {
  allergens: ["dairy", "fish"],
  usedAI: true,
  usedConfidenceFiltering: false,
  safeCount: 5,
  cautionCount: 8,
  excludedCount: 18,
}
```

## 13. Error Handling

### No Confidence Data

If `allergen_confidence` is empty/missing:
- Default to 30% (configurable via `DEFAULT_NO_DATA_CONFIDENCE`)
- This means: preference passes, allergy/life_threatening excluded

### AI Fallback

If AI analysis fails:
- Default to 50% confidence
- Shows as caution for preference, excluded for allergy/life_threatening

## 14. Related Directives

- **Backend Menu Filter**: `directives/backend_menu_filter.md` - Full filtering documentation
- **Supabase Integration**: `directives/supabase_integration.md` - Database setup
- **Known Issues**: `directives/known_issues_and_fixes.md` - Bug tracking
- **Allergen Management**: `directives/allergen_management.md` - Adding allergens

## 15. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-19 | Initial implementation with severity thresholds |

## 16. Future Enhancements

- [ ] Confidence display in UI (progress bars per item)
- [ ] Manual override capability for staff
- [ ] Learning from AI results (training data)
- [ ] Confidence history/audit trail
- [ ] Per-item cross-contamination overrides
