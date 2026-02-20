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

-- Users can view memberships for their venues
CREATE POLICY "Users can view venue memberships" ON venue_members
  FOR SELECT USING (
    venue_id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid())
  );

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

-- Function to add venue creator as owner
CREATE OR REPLACE FUNCTION public.handle_new_venue()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.venue_members (user_id, venue_id, role)
  VALUES (auth.uid(), NEW.id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-add creator as owner
DROP TRIGGER IF EXISTS on_venue_created ON venues;
CREATE TRIGGER on_venue_created
  AFTER INSERT ON venues
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_venue();

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
