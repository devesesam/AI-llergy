import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface RouteContext {
  params: Promise<{ slug: string }>
}

interface VenueData {
  id: string
  name: string
  slug: string
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Read-only for this route
        },
      },
    }
  )

  // Get venue by slug
  const { data: venueData, error: venueError } = await supabase
    .from('venues')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (venueError || !venueData) {
    return NextResponse.json(
      { error: 'Venue not found' },
      { status: 404 }
    )
  }

  const venue: VenueData = {
    id: venueData.id,
    name: venueData.name,
    slug: venueData.slug,
  }

  // Get active menu items for this venue
  const { data: menuItems, error: itemsError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('venue_id', venue.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (itemsError) {
    return NextResponse.json(
      { error: 'Failed to fetch menu items' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    venue: {
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
    },
    menuItems: menuItems || [],
  })
}
