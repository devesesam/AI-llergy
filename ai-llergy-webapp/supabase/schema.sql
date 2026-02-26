-- AI-llergy Dashboard Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- ============================================
-- TABLES
-- ============================================

-- Venues table
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- e.g., "the-blue-door" for URL routing
  invite_code TEXT UNIQUE NOT NULL,  -- e.g., "K7M2-9PQ4" for team invites (v4.4)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Venue memberships (many-to-many: users <-> venues)
CREATE TABLE IF NOT EXISTS venue_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'editor')) DEFAULT 'editor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, venue_id)
);

-- Menu items (replaces Google Sheet per venue)
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  ingredients TEXT,  -- comma-separated ingredients list
  allergen_profile JSONB DEFAULT '{}',  -- {dairy_free: true, gluten_free: false, ...}
  allergen_confidence JSONB DEFAULT '{}',  -- Pre-computed confidence scores {dairy: 0.95, ...}
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-contamination risk levels per venue/allergen
CREATE TABLE IF NOT EXISTS venue_cross_contamination (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  allergen_id TEXT NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('none', 'low', 'medium', 'high')) DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, allergen_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_venue_members_user ON venue_members(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_members_venue ON venue_members(venue_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_venue ON menu_items(venue_id);
CREATE INDEX IF NOT EXISTS idx_venues_slug ON venues(slug);
CREATE INDEX IF NOT EXISTS idx_venues_invite_code ON venues(invite_code);
CREATE INDEX IF NOT EXISTS idx_cross_contamination_venue ON venue_cross_contamination(venue_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_cross_contamination ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: user_profiles
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- POLICIES: venues
-- ============================================

-- Users can view venues they are members of
CREATE POLICY "Users can view their venues" ON venues
  FOR SELECT USING (
    id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid())
  );

-- Users can create venues (they become owner)
CREATE POLICY "Users can create venues" ON venues
  FOR INSERT WITH CHECK (true);

-- Owners and admins can update venues
CREATE POLICY "Owners and admins can update venues" ON venues
  FOR UPDATE USING (
    id IN (
      SELECT venue_id FROM venue_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Only owners can delete venues
CREATE POLICY "Owners can delete venues" ON venues
  FOR DELETE USING (
    id IN (
      SELECT venue_id FROM venue_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- POLICIES: venue_members
-- ============================================

-- Users can view their own venue memberships
-- NOTE: Avoid self-referential subqueries - causes infinite recursion (error 42P17)
-- See directives/supabase-rls-policies.md for details
CREATE POLICY "Users can view venue memberships" ON venue_members
  FOR SELECT USING (user_id = auth.uid());

-- Owners and admins can add members
CREATE POLICY "Owners and admins can add members" ON venue_members
  FOR INSERT WITH CHECK (
    venue_id IN (
      SELECT venue_id FROM venue_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Owners can remove members
CREATE POLICY "Owners can remove members" ON venue_members
  FOR DELETE USING (
    venue_id IN (
      SELECT venue_id FROM venue_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- POLICIES: menu_items (ADMIN)
-- ============================================

-- Venue members can view their venue's menu items
CREATE POLICY "Members can view menu items" ON menu_items
  FOR SELECT USING (
    venue_id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid())
  );

-- Owners, admins, and editors can create menu items
CREATE POLICY "Members can create menu items" ON menu_items
  FOR INSERT WITH CHECK (
    venue_id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid())
  );

-- Owners, admins, and editors can update menu items
CREATE POLICY "Members can update menu items" ON menu_items
  FOR UPDATE USING (
    venue_id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid())
  );

-- Owners and admins can delete menu items
CREATE POLICY "Owners and admins can delete menu items" ON menu_items
  FOR DELETE USING (
    venue_id IN (
      SELECT venue_id FROM venue_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- POLICIES: menu_items (PUBLIC READ)
-- ============================================

-- Anyone can read active menu items (for public venue pages)
CREATE POLICY "Public can view active menu items" ON menu_items
  FOR SELECT USING (is_active = true);

-- ============================================
-- POLICIES: venue_cross_contamination
-- ============================================

-- Members can view cross contamination settings
CREATE POLICY "Members can view cross contamination" ON venue_cross_contamination
  FOR SELECT USING (
    venue_id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid())
  );

-- Owners and admins can manage cross contamination settings
CREATE POLICY "Owners and admins can create cross contamination" ON venue_cross_contamination
  FOR INSERT WITH CHECK (
    venue_id IN (
      SELECT venue_id FROM venue_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update cross contamination" ON venue_cross_contamination
  FOR UPDATE USING (
    venue_id IN (
      SELECT venue_id FROM venue_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can delete cross contamination" ON venue_cross_contamination
  FOR DELETE USING (
    venue_id IN (
      SELECT venue_id FROM venue_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate invite code on venue creation (v4.4)
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

-- Trigger to generate invite code (BEFORE INSERT)
DROP TRIGGER IF EXISTS on_venue_created ON venues;
CREATE TRIGGER on_venue_created
  BEFORE INSERT ON venues
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_venue();

-- Function to add venue creator as owner
CREATE OR REPLACE FUNCTION public.add_venue_owner()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.venue_members (user_id, venue_id, role)
  VALUES (auth.uid(), NEW.id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-add creator as owner (AFTER INSERT)
DROP TRIGGER IF EXISTS on_venue_created_add_owner ON venues;
CREATE TRIGGER on_venue_created_add_owner
  AFTER INSERT ON venues
  FOR EACH ROW EXECUTE FUNCTION public.add_venue_owner();

-- Function to create venue with automatic ownership (atomic operation)
CREATE OR REPLACE FUNCTION public.create_venue(
  venue_name TEXT,
  venue_slug TEXT
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_venue_id UUID;
  v_invite_code TEXT;
  v_profile_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'You must be logged in to create a venue');
  END IF;

  IF EXISTS (SELECT 1 FROM venues WHERE slug = venue_slug) THEN
    RETURN json_build_object('error', 'This URL slug is already taken.');
  END IF;

  -- Ensure user profile exists (handle edge case of missing profile)
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = v_user_id) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    INSERT INTO user_profiles (id, email, full_name)
    VALUES (v_user_id, v_user_email, '');
  END IF;

  -- Generate invite code
  v_invite_code := UPPER(
    SUBSTRING(md5(random()::text) FROM 1 FOR 4) || '-' ||
    SUBSTRING(md5(random()::text) FROM 1 FOR 4)
  );

  -- Create venue
  INSERT INTO venues (name, slug, invite_code)
  VALUES (venue_name, venue_slug, v_invite_code)
  RETURNING id INTO v_venue_id;

  -- Add user as owner
  INSERT INTO venue_members (user_id, venue_id, role)
  VALUES (v_user_id, v_venue_id, 'owner');

  RETURN json_build_object(
    'success', true,
    'venue_id', v_venue_id,
    'invite_code', v_invite_code
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join venue by invite code (v4.4)
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for menu_items updated_at
DROP TRIGGER IF EXISTS on_menu_item_updated ON menu_items;
CREATE TRIGGER on_menu_item_updated
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for venue_cross_contamination updated_at
DROP TRIGGER IF EXISTS on_cross_contamination_updated ON venue_cross_contamination;
CREATE TRIGGER on_cross_contamination_updated
  BEFORE UPDATE ON venue_cross_contamination
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
