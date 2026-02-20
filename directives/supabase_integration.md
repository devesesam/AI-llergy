# Directive: Supabase Integration

**Goal**: Document the Supabase setup, database schema, authentication flow, and usage patterns for the AI-llergy dashboard admin portal.

## 1. Overview

Supabase provides:
- **Authentication**: Email/password auth with session management
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time**: Not currently used, but available
- **Storage**: Not currently used, but available for future image uploads

## 2. Environment Setup

### Required Environment Variables
Add to `ai-llergy-webapp/.env.local`:

```bash
# Supabase Project Credentials
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Public anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # Server-side only (optional)
```

### Getting Credentials
1. Go to [supabase.com](https://supabase.com) → Your Project
2. Settings → API
3. Copy "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
4. Copy "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy "service_role" key → `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)

### Netlify/Vercel Deployment
Add the same variables in your deployment platform's environment settings.

## 3. Dependencies

```bash
cd ai-llergy-webapp
npm install @supabase/supabase-js @supabase/ssr
```

- `@supabase/supabase-js` - Core Supabase client
- `@supabase/ssr` - Server-side rendering helpers for Next.js

## 4. Supabase Clients

### Browser Client (`src/lib/supabase/client.ts`)
For client components (forms, real-time, etc.):

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Server Client (`src/lib/supabase/server.ts`)
For Server Components and Route Handlers:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  )
}
```

### Middleware Helper (`src/lib/supabase/middleware.ts`)
For session refresh in middleware:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  return { response: supabaseResponse, user }
}
```

## 5. Database Schema

### Full Schema Location
`ai-llergy-webapp/supabase/schema.sql`

### Tables

#### `venues`
Stores venue information:
```sql
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- URL-safe identifier
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `user_profiles`
Extends Supabase auth.users:
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `venue_members`
Junction table for user-venue relationships:
```sql
CREATE TABLE venue_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'editor')) DEFAULT 'editor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, venue_id)
);
```

#### `menu_items`
Stores menu items per venue:
```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  ingredients TEXT,
  allergen_profile JSONB DEFAULT '{}',  -- {"dairy_free": true, ...}
  allergen_confidence JSONB DEFAULT '{}',  -- Pre-computed confidence scores (v3.1)
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`allergen_confidence` format** (v3.1+):
```json
{ "dairy": 0.95, "gluten": 0.75, "peanuts": 0.30 }
```
Values are 0-1 representing confidence that item is FREE of that allergen.
See `directives/confidence_scoring.md` for full details.

#### `venue_cross_contamination` (v3.1)
Stores cross-contamination risk levels per allergen for each venue:
```sql
CREATE TABLE venue_cross_contamination (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  allergen_id TEXT NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('none', 'low', 'medium', 'high')) DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, allergen_id)
);
```

Risk levels adjust confidence scores:
| Level | Adjustment | Meaning |
|-------|------------|---------|
| `none` | +20% | Dedicated equipment |
| `low` | +10% | Separate prep areas |
| `medium` | 0% | Standard kitchen |
| `high` | -20% | Shared equipment |

### Triggers

#### Auto-create user profile on signup
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

#### Auto-add owner when creating venue
```sql
CREATE OR REPLACE FUNCTION handle_new_venue()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.venue_members (user_id, venue_id, role)
  VALUES (auth.uid(), NEW.id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_venue_created
  AFTER INSERT ON venues
  FOR EACH ROW EXECUTE FUNCTION handle_new_venue();
```

## 6. Row Level Security (RLS)

All tables have RLS enabled. Policies ensure users can only access their own data.

### Venues
```sql
-- Users can only see venues they're members of
CREATE POLICY "Users can view their venues" ON venues
  FOR SELECT USING (
    id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid())
  );

-- Users can create venues (trigger adds them as owner)
CREATE POLICY "Users can create venues" ON venues
  FOR INSERT WITH CHECK (true);

-- Only owners can update/delete
CREATE POLICY "Owners can update venues" ON venues
  FOR UPDATE USING (
    id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Owners can delete venues" ON venues
  FOR DELETE USING (
    id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid() AND role = 'owner')
  );
```

### Menu Items
```sql
-- Anyone can read active menu items (for public venue pages)
CREATE POLICY "Public can view active menu items" ON menu_items
  FOR SELECT USING (is_active = true);

-- Venue members can manage menu items
CREATE POLICY "Members can manage menu items" ON menu_items
  FOR ALL USING (
    venue_id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid())
  );
```

### User Profiles
```sql
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());
```

### Venue Members
```sql
-- Users can see members of their venues
CREATE POLICY "Users can view venue members" ON venue_members
  FOR SELECT USING (
    venue_id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid())
  );

-- Only owners can manage members
CREATE POLICY "Owners can manage members" ON venue_members
  FOR ALL USING (
    venue_id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid() AND role = 'owner')
  );
```

## 7. TypeScript Types

### Location
`src/lib/supabase/types.ts`

### Key Types
```typescript
export interface Venue {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface MenuItem {
  id: string
  venue_id: string
  name: string
  description: string | null
  price: number | null
  ingredients: string | null
  allergen_profile: AllergenProfile
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type AllergenProfile = Record<string, boolean>

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  created_at: string
}

export interface VenueMember {
  id: string
  user_id: string
  venue_id: string
  role: 'owner' | 'admin' | 'editor'
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      venues: { Row: Venue; Insert: Omit<Venue, 'id' | 'created_at'>; Update: Partial<Venue> }
      menu_items: { Row: MenuItem; Insert: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>; Update: Partial<MenuItem> }
      user_profiles: { Row: UserProfile; Insert: Omit<UserProfile, 'created_at'>; Update: Partial<UserProfile> }
      venue_members: { Row: VenueMember; Insert: Omit<VenueMember, 'id' | 'created_at'>; Update: Partial<VenueMember> }
    }
  }
}
```

## 8. Common Patterns

### Fetching Data (Server Component)
```typescript
import { createClient } from '@/lib/supabase/server'
import type { Venue } from '@/lib/supabase/types'

export default async function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .single() as { data: Venue | null; error: unknown }

  if (error || !data) {
    notFound()
  }

  return <div>{data.name}</div>
}
```

### Mutating Data (Client Component)
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

async function createVenue(name: string, slug: string) {
  const supabase = createClient()

  // Type casting workaround for insert
  const { error } = await (supabase as any)
    .from('venues')
    .insert({ name, slug })

  if (error) throw error
}
```

### Auth State (Client Component)
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function useUser() {
  const [user, setUser] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => setUser(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  return user
}
```

### Sign Out
```typescript
const supabase = createClient()
await supabase.auth.signOut()
router.push('/login')
```

## 9. Type Casting Workarounds

### Problem
Without Supabase CLI-generated types, the generic `Database` type doesn't fully satisfy the Supabase client's type inference. This causes `never` type errors.

### Solution: Explicit Type Assertions

For **SELECT** operations:
```typescript
const { data, error } = await supabase
  .from('venues')
  .select('*')
  .eq('id', id)
  .single() as { data: Venue | null; error: unknown }
```

For **INSERT/UPDATE/DELETE** operations:
```typescript
// Cast supabase client to any for mutations
await (supabase as any).from('venues').insert({ name, slug })
await (supabase as any).from('menu_items').update({ name }).eq('id', itemId)
await (supabase as any).from('venues').delete().eq('id', venueId)
```

### Future Fix
Run Supabase CLI to generate proper types:
```bash
npx supabase gen types typescript --project-id [project-id] > src/lib/supabase/database.types.ts
```

## 10. Troubleshooting

### "Invalid login credentials"
- Check email/password are correct
- Ensure email is confirmed (check inbox/spam)
- Try password reset flow

### "Row Level Security policy violation"
- User doesn't have access to this resource
- Check RLS policies in Supabase dashboard
- Verify `auth.uid()` matches expected user

### "relation does not exist"
- Table hasn't been created
- Run the SQL schema in Supabase SQL editor

### Type errors with Supabase client
- Use type casting patterns from Section 9
- Consider generating types with Supabase CLI

### Cookies not setting in middleware
- Ensure `updateSession()` is returning the response object
- Check that response cookies are being set correctly

## 11. Related Directives

- **Dashboard Admin**: `directives/dashboard_admin.md` - Dashboard functionality
- **Project Overview**: `directives/project_ai_llergy.md` - Full changelog
- **Known Issues**: `directives/known_issues_and_fixes.md` - TypeScript workarounds

## 12. Migration Path

### From Google Sheets to Supabase
1. Export Google Sheet as CSV
2. Use dashboard import tool (`/dashboard/venues/[id]/import`)
3. Map columns to menu item fields
4. Verify allergen profile mapping
5. Test public venue URL

### Data Mapping
| Google Sheet Column | Supabase Field |
|---------------------|----------------|
| Menu Item Name | `name` |
| Description | `description` |
| Price | `price` |
| Ingredients | `ingredients` |
| Vegetarian | `allergen_profile.Vegetarian` |
| DAIRY FREE | `allergen_profile["DAIRY FREE"]` |
| ... | ... |
