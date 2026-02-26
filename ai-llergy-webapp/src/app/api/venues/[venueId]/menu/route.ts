import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface RouteContext {
  params: Promise<{ venueId: string }>
}

interface MenuItemInput {
  id: string
  name: string
  ingredients: string | null
  allergen_profile: Record<string, boolean> | null
  price: number | null
  is_active: boolean
  isNew?: boolean
}

export async function PUT(request: Request, context: RouteContext) {
  const { venueId } = await context.params
  const cookieStore = await cookies()

  const supabase = createServerClient(
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
            // Server component - ignore
          }
        },
      },
    }
  )

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is a member of this venue
  const { data: membership, error: membershipError } = await supabase
    .from('venue_members')
    .select('role')
    .eq('venue_id', venueId)
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Parse request body
  const body = await request.json()
  const { items }: { items: MenuItemInput[] } = body

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'Invalid request: items must be an array' }, { status: 400 })
  }

  // Get existing items for this venue
  const { data: existingItems, error: fetchError } = await supabase
    .from('menu_items')
    .select('id')
    .eq('venue_id', venueId)

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch existing items' }, { status: 500 })
  }

  const existingIds = new Set(existingItems?.map(item => item.id) || [])
  const incomingIds = new Set(items.filter(item => !item.isNew && !item.id.startsWith('new_')).map(item => item.id))

  // Find items to delete (exist in DB but not in incoming)
  const idsToDelete = [...existingIds].filter(id => !incomingIds.has(id))

  // Delete removed items
  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('menu_items')
      .delete()
      .in('id', idsToDelete)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete items' }, { status: 500 })
    }
  }

  // Separate new items and existing items
  const newItems = items.filter(item => item.isNew || item.id.startsWith('new_'))
  const updateItems = items.filter(item => !item.isNew && !item.id.startsWith('new_') && existingIds.has(item.id))

  // Insert new items
  if (newItems.length > 0) {
    const { error: insertError } = await supabase
      .from('menu_items')
      .insert(
        newItems.map((item, index) => ({
          venue_id: venueId,
          name: item.name || 'Untitled',
          ingredients: item.ingredients,
          allergen_profile: item.allergen_profile || {},
          price: item.price,
          is_active: item.is_active ?? true,
          sort_order: existingItems ? existingItems.length + index : index,
        }))
      )

    if (insertError) {
      return NextResponse.json({ error: 'Failed to insert new items' }, { status: 500 })
    }
  }

  // Update existing items
  for (const item of updateItems) {
    const { error: updateError } = await supabase
      .from('menu_items')
      .update({
        name: item.name || 'Untitled',
        ingredients: item.ingredients,
        allergen_profile: item.allergen_profile || {},
        price: item.price,
        is_active: item.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)
      .eq('venue_id', venueId)

    if (updateError) {
      return NextResponse.json({ error: `Failed to update item ${item.id}` }, { status: 500 })
    }
  }

  // Fetch all current items to return
  const { data: finalItems, error: finalError } = await supabase
    .from('menu_items')
    .select('id, name, ingredients, allergen_profile, price, is_active')
    .eq('venue_id', venueId)
    .order('sort_order', { ascending: true })

  if (finalError) {
    return NextResponse.json({ error: 'Failed to fetch updated items' }, { status: 500 })
  }

  return NextResponse.json({ items: finalItems || [] })
}
