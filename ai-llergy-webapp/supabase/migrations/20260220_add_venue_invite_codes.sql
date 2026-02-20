-- Migration: Add venue invite codes
-- Allows team members to join venues using a shareable code

-- ============================================
-- 1. Add invite_code column to venues table
-- ============================================

ALTER TABLE venues ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Generate codes for existing venues (if any)
UPDATE venues SET invite_code =
  UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 4) || '-' ||
        SUBSTRING(md5(random()::text) FROM 1 FOR 4))
WHERE invite_code IS NULL;

-- Make invite_code NOT NULL after populating existing records
ALTER TABLE venues ALTER COLUMN invite_code SET NOT NULL;

-- ============================================
-- 2. Update handle_new_venue trigger function
-- ============================================

-- Drop existing trigger (we need to change it from AFTER to BEFORE)
DROP TRIGGER IF EXISTS on_venue_created ON venues;

-- Recreate function to generate invite_code on insert
CREATE OR REPLACE FUNCTION public.handle_new_venue()
RETURNS trigger AS $$
BEGIN
  -- Generate unique invite code (8 chars: XXXX-XXXX)
  NEW.invite_code := UPPER(
    SUBSTRING(md5(random()::text) FROM 1 FOR 4) || '-' ||
    SUBSTRING(md5(random()::text) FROM 1 FOR 4)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create BEFORE INSERT trigger to set invite_code
CREATE TRIGGER on_venue_created
  BEFORE INSERT ON venues
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_venue();

-- ============================================
-- 3. Create AFTER INSERT trigger for owner membership
-- ============================================

CREATE OR REPLACE FUNCTION public.add_venue_owner()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.venue_members (user_id, venue_id, role)
  VALUES (auth.uid(), NEW.id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_venue_created_add_owner ON venues;
CREATE TRIGGER on_venue_created_add_owner
  AFTER INSERT ON venues
  FOR EACH ROW EXECUTE FUNCTION public.add_venue_owner();

-- ============================================
-- 4. Create join_venue_by_code function
-- ============================================

CREATE OR REPLACE FUNCTION public.join_venue_by_code(code TEXT)
RETURNS JSON AS $$
DECLARE
  v_venue_id UUID;
  v_venue_name TEXT;
  v_existing UUID;
BEGIN
  -- Find venue by invite code (case-insensitive)
  SELECT id, name INTO v_venue_id, v_venue_name
  FROM venues WHERE invite_code = UPPER(code);

  IF v_venue_id IS NULL THEN
    RETURN json_build_object('error', 'Invalid invite code');
  END IF;

  -- Check if already a member
  SELECT id INTO v_existing
  FROM venue_members
  WHERE venue_id = v_venue_id AND user_id = auth.uid();

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('error', 'You are already a member of this venue');
  END IF;

  -- Add user as editor
  INSERT INTO venue_members (user_id, venue_id, role)
  VALUES (auth.uid(), v_venue_id, 'editor');

  RETURN json_build_object(
    'success', true,
    'venue_id', v_venue_id,
    'venue_name', v_venue_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Add index for invite_code lookups
-- ============================================

CREATE INDEX IF NOT EXISTS idx_venues_invite_code ON venues(invite_code);
