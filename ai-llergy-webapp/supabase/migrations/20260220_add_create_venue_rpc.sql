-- Migration: Add create_venue RPC function
-- Run this in Supabase SQL Editor to fix venue creation

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
