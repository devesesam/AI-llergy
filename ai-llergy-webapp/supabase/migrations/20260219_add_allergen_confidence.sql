-- Migration: Add allergen confidence scoring system
-- This enables severity-based filtering with confidence thresholds

-- ============================================
-- 1. ADD allergen_confidence TO menu_items
-- ============================================

-- Add column to store pre-computed confidence scores per allergen
-- Format: { "dairy": 0.95, "gluten": 0.75, "peanuts": 0.30, ... }
-- Values are 0-1 representing probability item is FREE of that allergen
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS allergen_confidence JSONB DEFAULT '{}';

COMMENT ON COLUMN menu_items.allergen_confidence IS
  'Pre-computed confidence scores (0-1) that item is FREE of each allergen. Higher = safer.';

-- ============================================
-- 2. CREATE venue_cross_contamination TABLE
-- ============================================

-- Tracks cross-contamination risk levels per allergen for each venue
-- Used to adjust confidence scores based on kitchen practices
CREATE TABLE IF NOT EXISTS venue_cross_contamination (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  allergen_id TEXT NOT NULL,  -- e.g., "peanuts", "dairy", "gluten"
  risk_level TEXT CHECK (risk_level IN ('none', 'low', 'medium', 'high')) DEFAULT 'medium',
  notes TEXT,  -- Optional: "Shared fryer with breaded items"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, allergen_id)
);

-- Risk level meanings:
-- none: Dedicated equipment, no cross-contamination possible (confidence boost: +20%)
-- low: Separate prep areas, careful handling (confidence boost: +10%)
-- medium: Standard kitchen, some risk (no adjustment)
-- high: Shared equipment, high risk (confidence penalty: -20%)

COMMENT ON TABLE venue_cross_contamination IS
  'Cross-contamination risk levels per allergen for each venue. Adjusts confidence scores.';

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_cross_contamination_venue
  ON venue_cross_contamination(venue_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_confidence
  ON menu_items USING gin(allergen_confidence);

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE venue_cross_contamination ENABLE ROW LEVEL SECURITY;

-- Members can view cross contamination settings for their venues
CREATE POLICY "Members can view cross contamination" ON venue_cross_contamination
  FOR SELECT USING (
    venue_id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid())
  );

-- Owners and admins can create cross contamination settings
CREATE POLICY "Owners and admins can create cross contamination" ON venue_cross_contamination
  FOR INSERT WITH CHECK (
    venue_id IN (
      SELECT venue_id FROM venue_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Owners and admins can update cross contamination settings
CREATE POLICY "Owners and admins can update cross contamination" ON venue_cross_contamination
  FOR UPDATE USING (
    venue_id IN (
      SELECT venue_id FROM venue_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Owners and admins can delete cross contamination settings
CREATE POLICY "Owners and admins can delete cross contamination" ON venue_cross_contamination
  FOR DELETE USING (
    venue_id IN (
      SELECT venue_id FROM venue_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Trigger for cross_contamination updated_at
DROP TRIGGER IF EXISTS on_cross_contamination_updated ON venue_cross_contamination;
CREATE TRIGGER on_cross_contamination_updated
  BEFORE UPDATE ON venue_cross_contamination
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 6. HELPER FUNCTION: Recompute confidence for a menu item
-- ============================================

-- This function can be called to recompute confidence scores
-- when menu item data or cross-contamination settings change
CREATE OR REPLACE FUNCTION compute_menu_item_confidence(item_id UUID)
RETURNS JSONB AS $$
DECLARE
  item_record RECORD;
  venue_risks RECORD;
  confidence JSONB := '{}';
  allergen_id TEXT;
  base_score NUMERIC;
  risk_adjustment NUMERIC;
  final_score NUMERIC;
  allergen_ids TEXT[] := ARRAY[
    'dairy', 'gluten', 'peanuts', 'treenuts', 'eggs', 'soy',
    'fish', 'shellfish', 'sesame', 'wheat', 'almond', 'walnut',
    'pistachio', 'mustard', 'sulfites', 'garlic', 'onion',
    'celery', 'chili', 'capsicum', 'lupin', 'molluscs',
    'vegetarian', 'vegan'
  ];
BEGIN
  -- Get the menu item
  SELECT * INTO item_record FROM menu_items WHERE id = item_id;

  IF NOT FOUND THEN
    RETURN '{}'::JSONB;
  END IF;

  -- Process each allergen
  FOREACH allergen_id IN ARRAY allergen_ids LOOP
    -- Get base score from allergen_profile
    -- Check for explicit _free flag
    IF (item_record.allergen_profile->(allergen_id || '_free'))::BOOLEAN = true THEN
      base_score := 0.95;
    ELSIF (item_record.allergen_profile->(allergen_id || '_free'))::BOOLEAN = false THEN
      base_score := 0.05;
    ELSE
      -- No explicit flag - default to uncertain
      base_score := 0.30;
    END IF;

    -- Get cross-contamination adjustment for this venue/allergen
    SELECT
      CASE risk_level
        WHEN 'none' THEN 0.20
        WHEN 'low' THEN 0.10
        WHEN 'medium' THEN 0.00
        WHEN 'high' THEN -0.20
        ELSE 0.00
      END INTO risk_adjustment
    FROM venue_cross_contamination
    WHERE venue_id = item_record.venue_id AND allergen_id = allergen_id;

    IF NOT FOUND THEN
      risk_adjustment := 0.00;
    END IF;

    -- Calculate final score (clamped to 0-1)
    final_score := GREATEST(0, LEAST(1, base_score + risk_adjustment));

    -- Add to confidence object
    confidence := confidence || jsonb_build_object(allergen_id, ROUND(final_score::NUMERIC, 2));
  END LOOP;

  RETURN confidence;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compute_menu_item_confidence IS
  'Computes allergen confidence scores for a menu item based on allergen_profile and cross-contamination settings.';
