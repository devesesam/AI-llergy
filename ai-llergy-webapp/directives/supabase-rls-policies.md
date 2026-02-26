# Supabase Row Level Security (RLS) Policies

## Infinite Recursion Error

**Error:** `42P17 - infinite recursion detected in policy for relation "venue_members"`

### Cause

RLS policies that reference their own table in a subquery can cause infinite recursion:

```sql
-- BROKEN: Self-referential policy
CREATE POLICY "Users can view venue memberships" ON venue_members
  FOR SELECT USING (
    venue_id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid())
  );
```

When you query `venues` (which checks `venue_members` to verify membership), the `venue_members` policy fires and tries to query `venue_members` again, triggering itself infinitely.

### Solution

Use direct column checks instead of self-referential subqueries:

```sql
-- CORRECT: Direct check, no recursion
CREATE POLICY "Users can view venue memberships" ON venue_members
  FOR SELECT USING (user_id = auth.uid());
```

### Fix Migration

If you encounter this error, run:

```sql
DROP POLICY IF EXISTS "Users can view venue memberships" ON venue_members;

CREATE POLICY "Users can view venue memberships" ON venue_members
  FOR SELECT USING (user_id = auth.uid());
```

### When Self-Reference is Needed

If you need users to see OTHER members of their venues (not just their own membership), use an RPC function with `SECURITY DEFINER` to bypass RLS:

```sql
CREATE OR REPLACE FUNCTION get_venue_members(p_venue_id UUID)
RETURNS TABLE (user_id UUID, role TEXT, email TEXT) AS $$
BEGIN
  -- First verify the caller is a member
  IF NOT EXISTS (
    SELECT 1 FROM venue_members
    WHERE venue_id = p_venue_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this venue';
  END IF;

  -- Return all members (bypasses RLS due to SECURITY DEFINER)
  RETURN QUERY
  SELECT vm.user_id, vm.role, up.email
  FROM venue_members vm
  JOIN user_profiles up ON up.id = vm.user_id
  WHERE vm.venue_id = p_venue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Debugging RLS Issues

If queries return no data unexpectedly:

1. Check if `auth.uid()` is populated (server-side auth working)
2. Look for recursion errors in the response
3. Test the policy logic directly in SQL Editor with a specific user ID

## Related Files

- `supabase/schema.sql` - All RLS policies defined here
- `src/lib/supabase/server.ts` - Server-side Supabase client
- `src/lib/supabase/middleware.ts` - Session refresh middleware
