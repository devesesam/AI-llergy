# API Endpoints

## Overview

This directive documents the Next.js API routes used in the AI-llergy webapp. All routes are located in `src/app/api/`.

## Authentication

All authenticated endpoints use Supabase SSR client with cookie-based sessions. The pattern:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const cookieStore = await cookies()
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch { /* Server component */ }
      },
    },
  }
)
```

## Endpoints

### GET /api/menu/[slug]

**Purpose:** Fetch public menu data for a venue by slug.

**Authentication:** None (public endpoint)

**Response:**
```json
{
  "venue": { "id": "...", "name": "...", "slug": "..." },
  "menuItems": [...]
}
```

**File:** [src/app/api/menu/[slug]/route.ts](../src/app/api/menu/[slug]/route.ts)

---

### POST /api/submit

**Purpose:** Submit allergen questionnaire responses.

**Authentication:** None (public endpoint)

**File:** [src/app/api/submit/route.ts](../src/app/api/submit/route.ts)

---

### POST /api/interpret

**Purpose:** AI interpretation of free-text allergen descriptions.

**Authentication:** None (public endpoint)

**File:** [src/app/api/interpret/route.ts](../src/app/api/interpret/route.ts)

---

### PATCH /api/venues/[venueId]

**Purpose:** Update venue settings (name, slug).

**Authentication:** Required (session cookie)

**Authorization:** User must be venue `owner` or `admin`

**Request Body:**
```json
{
  "name": "New Venue Name",
  "slug": "new-slug"
}
```

**Response:**
```json
{
  "venue": { "id": "...", "name": "...", "slug": "...", ... }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | Not a member or insufficient role |
| 400 | Invalid slug format or slug already taken |
| 500 | Database update failed |

**Validation:**
- Slug must match pattern: `^[a-z0-9-]+$`
- Slug must be unique across all venues

**File:** [src/app/api/venues/[venueId]/route.ts](../src/app/api/venues/[venueId]/route.ts)

---

### DELETE /api/venues/[venueId]

**Purpose:** Permanently delete a venue and all its data.

**Authentication:** Required (session cookie)

**Authorization:** User must be venue `owner` (admins cannot delete)

**Response:**
```json
{
  "success": true
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | Not owner (only owners can delete) |
| 500 | Database delete failed |

**Notes:**
- Cascading deletes handle related data (menu_items, venue_members, submissions)
- This action is irreversible
- Frontend requires typed confirmation (venue name) before calling

**File:** [src/app/api/venues/[venueId]/route.ts](../src/app/api/venues/[venueId]/route.ts)

---

### PUT /api/venues/[venueId]/menu

**Purpose:** Bulk save/update menu items for a venue (inline editing).

**Authentication:** Required (session cookie)

**Authorization:** User must be venue member (any role)

**Request Body:**
```json
{
  "items": [
    {
      "id": "uuid or new_timestamp",
      "name": "Dish Name",
      "ingredients": "ingredient list",
      "allergens": ["dairy", "gluten"],
      "price": null,
      "is_active": true,
      "isNew": false
    }
  ]
}
```

**Response:**
```json
{
  "items": [/* all current menu items with server-assigned IDs */]
}
```

**Behavior:**
- Items with `isNew: true` or IDs starting with `new_` are inserted
- Existing items are updated
- Items missing from the request (but exist in DB) are deleted
- Returns all items after operation with proper IDs

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | Not a venue member |
| 400 | Invalid request format |
| 500 | Database operation failed |

**File:** [src/app/api/venues/[venueId]/menu/route.ts](../src/app/api/venues/[venueId]/menu/route.ts)

## Adding New Endpoints

1. Create route file in appropriate directory under `src/app/api/`
2. Follow the naming convention: `route.ts` for the handler
3. Use `createServerClient` for authenticated routes
4. Add RLS policies in Supabase if needed (see [supabase-rls-policies.md](./supabase-rls-policies.md))
5. Document the endpoint in this directive

## Error Handling Pattern

```ts
try {
  // Operation
} catch (error) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Something went wrong' },
    { status: 500 }
  )
}
```

## Role-Based Access Pattern

```ts
// Check membership and role
const { data: membership } = await supabase
  .from('venue_members')
  .select('role')
  .eq('venue_id', venueId)
  .eq('user_id', user.id)
  .single()

if (!membership) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 })
}

if (!['owner', 'admin'].includes(membership.role)) {
  return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
}
```

## Common Issues

| Issue | Solution |
|-------|----------|
| 401 on authenticated routes | Check cookie handling, ensure SSR client is used |
| CORS errors | API routes are same-origin, no CORS config needed |
| Slug conflicts | Always check uniqueness before updating |
