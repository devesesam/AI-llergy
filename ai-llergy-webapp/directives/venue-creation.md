# Venue Creation Pattern

## Overview

Venue creation uses an RPC function (`create_venue`) instead of direct table INSERT to handle edge cases atomically.

## Why RPC Instead of Direct INSERT

The original approach used:
```typescript
await supabase.from('venues').insert({ name, slug })
```

This relied on two database triggers:
1. `handle_new_venue()` (BEFORE INSERT) - Generate invite code
2. `add_venue_owner()` (AFTER INSERT) - Add creator as owner in `venue_members`

**Problem:** The `add_venue_owner()` trigger could fail silently if the user's profile didn't exist in `user_profiles` (FK constraint violation). This happened for:
- Users who signed up before the `handle_new_user()` trigger was added
- Users who signed up via OAuth where the trigger didn't fire correctly
- Any other edge case where user profile creation failed

## Solution

The `create_venue` RPC function handles everything atomically:
1. Validates user is logged in
2. Checks slug uniqueness
3. Creates missing user profile if needed (fixes the edge case)
4. Generates invite code
5. Creates venue
6. Adds user as owner
7. Returns structured JSON response with success/error

## Files

- **SQL Function:** `supabase/schema.sql` (lines 289-345)
- **Migration:** `supabase/migrations/20260220_add_create_venue_rpc.sql`
- **TypeScript Types:** `src/lib/supabase/types.ts` (Functions interface)
- **Frontend:** `src/app/dashboard/venues/new/page.tsx`

## Usage Pattern

```typescript
interface CreateVenueResponse {
  success?: boolean
  error?: string
  venue_id?: string
  invite_code?: string
}

const { data, error: rpcError } = await supabase.rpc('create_venue', {
  venue_name: name,
  venue_slug: slug
} as never) as { data: CreateVenueResponse | null; error: Error | null }

if (data?.error) {
  // Handle business logic error (e.g., slug taken)
  setError(data.error)
  return
}

if (data?.success && data.venue_id) {
  // Success - redirect to venue
  router.push(`/dashboard/venues/${data.venue_id}`)
}
```

Note: Uses `as never` pattern per `supabase-rpc-typing.md` directive.

## Key Learning

When database triggers depend on related table data (like `venue_members` depending on `user_profiles`), prefer RPC functions that:
1. Check prerequisites exist
2. Create missing data if needed
3. Perform the main operation
4. Return structured errors instead of throwing

This avoids silent failures from FK constraint violations in triggers.

## Important: Trigger Removed

The `on_venue_created_add_owner` trigger was **dropped** from the database because it conflicts with the RPC function (both try to add the owner, causing a duplicate key error).

If re-deploying the full schema.sql, make sure to drop this trigger afterward:
```sql
DROP TRIGGER IF EXISTS on_venue_created_add_owner ON venues;
```

## Related Issues

- **RLS Recursion:** If you see error `42P17 - infinite recursion detected`, check `supabase-rls-policies.md`
- **RPC Typing:** See `supabase-rpc-typing.md` for the `as never` workaround
