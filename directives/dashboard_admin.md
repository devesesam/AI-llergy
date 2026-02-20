# Directive: Dashboard Admin Portal

**Goal**: Provide venue owners and staff with a protected admin portal to manage venues, menus, and menu items. This replaces the manual Google Sheets workflow with a database-driven system.

## 1. Overview

The dashboard is a protected area of the AI-llergy app accessible at `/dashboard/*` routes. It requires email/password authentication via Supabase and provides CRUD operations for venues and menu items.

### Key Features
- **Multi-venue support**: Users can manage multiple venues
- **Role-based access**: Owner, Admin, Editor roles per venue
- **Menu management**: Add, edit, delete menu items with allergen profiles
- **CSV import**: Bulk import menu items from CSV files
- **Public venue URLs**: Each venue gets a public `/v/[slug]` URL for customers

## 2. Route Structure

```
src/app/
├── login/
│   ├── page.tsx              # Suspense wrapper
│   └── LoginForm.tsx         # Email/password auth form
├── auth/
│   └── callback/route.ts     # OAuth callback handler
├── dashboard/
│   ├── layout.tsx            # Dashboard shell with nav
│   ├── page.tsx              # Dashboard home (redirects to venues)
│   └── venues/
│       ├── page.tsx          # List user's venues
│       ├── new/page.tsx      # Create new venue form
│       └── [venueId]/
│           ├── page.tsx      # Venue detail with menu items table
│           ├── settings/page.tsx   # Edit venue name/slug, delete
│           ├── import/page.tsx     # CSV import tool
│           └── menu/
│               ├── new/page.tsx    # Add menu item form
│               └── [itemId]/page.tsx  # Edit menu item form
└── v/
    └── [slug]/
        ├── page.tsx          # Public venue menu (server component)
        └── VenueMenuClient.tsx  # Client-side filtering
```

## 3. Authentication Flow

### Login Process
1. User visits `/login`
2. Can sign in or sign up with email/password
3. New users receive email confirmation
4. Successful login redirects to `/dashboard`

### Route Protection
- Middleware at `src/middleware.ts` protects all `/dashboard/*` routes
- Unauthenticated users redirected to `/login?message=Please log in`
- Auth session refreshed on each request via `updateSession()`

### Code Pattern
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login?message=Please log in', request.url))
  }

  return response
}
```

## 4. Dashboard Layout

### Components
- **Header**: AI-llergy branding with user email and logout button
- **Sidebar**: Navigation links to Venues, Profile (future)
- **Main Content**: Page-specific content area

### Styling
Dashboard uses BEM-style CSS classes defined in `globals.css`. See `directives/css_styling_system.md` for complete reference.

**Layout Classes:**
- `.dashboard-layout` - Main flex container
- `.dashboard-main` - Content area with left padding for sidebar

**Sidebar Classes:**
- `.dashboard-sidebar` - Fixed left sidebar (hidden on mobile)
- `.dashboard-sidebar--open` - Mobile open state
- `.dashboard-sidebar__header` - Brand + user section
- `.dashboard-sidebar__brand` - "AI-llergy" logo text
- `.dashboard-sidebar__user` - User email display
- `.dashboard-sidebar__nav` - Navigation area
- `.dashboard-sidebar__section` - Nav group container
- `.dashboard-sidebar__section-title` - "MENU" label
- `.dashboard-sidebar__section-header` - Title + "Add" link row
- `.dashboard-sidebar__add-link` - "+ Add" link
- `.dashboard-sidebar__link` - Nav item button
- `.dashboard-sidebar__link--active` - Current page highlight
- `.dashboard-sidebar__link-icon` - Emoji icon
- `.dashboard-sidebar__active-dot` - Gold indicator dot
- `.dashboard-sidebar__footer` - Bottom section
- `.dashboard-sidebar__signout` - Sign out button

**Mobile Header Classes:**
- `.dashboard-mobile-header` - Fixed top bar (visible on mobile only)
- `.dashboard-mobile-header__toggle` - Hamburger button
- `.dashboard-mobile-header__brand` - "AI-llergy" text
- `.dashboard-overlay` - Backdrop when sidebar open

**Content Classes:**
- `.dashboard-content`, `.dashboard-content__header`, `.dashboard-content__subtitle`
- `.dashboard-section`, `.dashboard-section__header`
- `.dashboard-venue-grid`, `.dashboard-venue-card`
- `.dashboard-table`, `.dashboard-empty`
- `.dashboard-stat`, `.dashboard-stats`

**Form Classes:**
- `.dashboard-form` - Form container
- `.dashboard-form__group` - Field wrapper
- `.dashboard-form__label` - Label text
- `.dashboard-form__input` - Input/textarea styling
- `.dashboard-form__help` - Helper text below input
- `.dashboard-form__actions` - Button row

**Allergen Toggle Classes:**
- `.allergen-toggles` - Toggle grid container
- `.allergen-toggle` - Individual toggle button
- `.allergen-toggle--active` - Selected state (gold background)
- `.allergen-toggle__checkbox` - Hidden checkbox input

## 5. Venue Management

### Listing Venues
- Shows all venues where user is a member
- Displays venue name, slug, creation date, user's role
- Links to venue detail page

### Creating Venues
- Form: Name, Slug (auto-generated from name)
- On submit: Creates venue + adds user as owner
- Redirects to venue detail page

### Venue Detail Page
- Quick stats: Total items, active items, public URL link
- Menu items table with name, price, status, edit link
- Import CSV and Add Item buttons
- Link to venue settings

### Venue Settings
- Edit name and slug
- Delete venue (with confirmation)

## 6. Menu Item Management

### MenuItemForm Component
Reusable form component for create/edit modes.

**Props:**
```typescript
interface MenuItemFormProps {
  venueId: string
  mode: 'create' | 'edit'
  existingItem?: MenuItem
}
```

**Fields:**
- Name (required)
- Description (optional)
- Price (optional, decimal)
- Ingredients (optional, textarea)
- Is Active (toggle)
- Allergen Profile (toggle grid)

### Allergen Toggle Grid
- Reuses `ALL_FILTERS` from `src/lib/allergens.ts`
- Each allergen: icon + name + YES/NO toggle
- Stored as JSONB in database: `{ "DAIRY FREE": true, "GLUTEN FREE": false, ... }`

### Form Actions
- **Create**: POST to Supabase, redirect to venue detail
- **Edit**: PUT to Supabase, redirect to venue detail
- **Delete**: DELETE with confirmation, redirect to venue detail

## 7. CSV Import

### Import Page (`/dashboard/venues/[venueId]/import`)
1. User selects CSV file
2. Client-side parsing with PapaParse
3. Preview table shows first 10 rows
4. Column mapping (auto-detected or manual)
5. Confirm import → bulk insert to Supabase

### Expected CSV Format
```csv
name,description,price,ingredients,is_active
Eggs Benedict,Classic brunch dish,18.50,"eggs, hollandaise, ham",true
```

### Allergen Columns (Optional)
If CSV includes allergen columns, they're parsed into `allergen_profile`:
```csv
name,price,DAIRY FREE,GLUTEN FREE
Salad,12.00,YES,YES
```

## 8. Public Venue Routes

### URL Pattern
- `/v/[slug]` - e.g., `/v/the-blue-door`

### Data Flow
1. Server component fetches venue by slug
2. Fetches active menu items for venue
3. Passes to `VenueMenuClient` for client-side filtering
4. Uses same filtering logic as original app

### VenueMenuClient Component
- Reuses existing allergen selection components
- Filters menu items by allergen profile
- No API calls - filtering happens client-side
- Uses allergen data from `src/lib/allergens.ts`

## 9. Component Reference

### Server Components (async data fetching)
| Component | Purpose |
|-----------|---------|
| `dashboard/layout.tsx` | Dashboard shell, loads user venues for nav |
| `dashboard/venues/page.tsx` | List user's venue memberships |
| `dashboard/venues/[venueId]/page.tsx` | Venue detail with menu items |
| `v/[slug]/page.tsx` | Public venue menu loader |

### Client Components
| Component | Purpose |
|-----------|---------|
| `login/LoginForm.tsx` | Auth form with Supabase client |
| `dashboard/MenuItemForm.tsx` | Menu item create/edit form |
| `v/[slug]/VenueMenuClient.tsx` | Client-side allergen filtering |

## 10. Type Safety Patterns

### Supabase Type Casting
Due to missing generated types, use explicit type assertions:

```typescript
// For queries
const { data: venueData, error } = await supabase
  .from('venues')
  .select('*')
  .eq('id', venueId)
  .single() as { data: Venue | null; error: unknown }

// For mutations (when select fails)
await (supabase as any).from('venues').insert({ ... })
```

### Type Definitions
All types defined in `src/lib/supabase/types.ts`:
- `Venue`, `MenuItem`, `UserProfile`, `VenueMember`
- `AllergenProfile` - Record<string, boolean>
- `Database` - Full Supabase schema type

## 11. Error Handling

### Auth Errors
- Invalid credentials → Show error message in form
- Email not confirmed → Show "Check your email" message
- Session expired → Redirect to login

### Data Errors
- Venue not found → `notFound()` (404 page)
- Permission denied → Handled by RLS (returns empty/null)
- Insert/update failures → Show error message, keep form data

## 12. Related Directives

- **Supabase Integration**: `directives/supabase_integration.md` - Database schema, RLS, client setup
- **Project Overview**: `directives/project_ai_llergy.md` - Changelog, architecture
- **Allergen Management**: `directives/allergen_management.md` - Allergen definitions
- **Known Issues**: `directives/known_issues_and_fixes.md` - TypeScript workarounds

## 13. Future Enhancements

- [ ] User profile page with password change
- [ ] Invite team members to venue
- [ ] Role-based permissions (editor can't delete)
- [ ] Venue branding/logo upload
- [ ] Menu categories/sections
- [ ] Drag-and-drop menu item reordering
- [ ] Analytics dashboard (views, filters used)
- [ ] Export menu to PDF
- [ ] QR code generator for venue URL
