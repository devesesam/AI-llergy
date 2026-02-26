import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface RouteContext {
  params: Promise<{ venueId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
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

  // Only owners and admins can update settings
  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Parse request body
  const body = await request.json()
  const { name, slug } = body

  // Validate slug format
  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: 'Slug can only contain lowercase letters, numbers, and hyphens' },
      { status: 400 }
    )
  }

  // Check if slug is already taken by another venue
  if (slug) {
    const { data: existingVenue } = await supabase
      .from('venues')
      .select('id')
      .eq('slug', slug)
      .neq('id', venueId)
      .single()

    if (existingVenue) {
      return NextResponse.json(
        { error: 'This URL slug is already taken' },
        { status: 400 }
      )
    }
  }

  // Update venue
  const updateData: { name?: string; slug?: string } = {}
  if (name) updateData.name = name
  if (slug) updateData.slug = slug

  const { data: updatedVenue, error: updateError } = await supabase
    .from('venues')
    .update(updateData)
    .eq('id', venueId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update venue' },
      { status: 500 }
    )
  }

  return NextResponse.json({ venue: updatedVenue })
}

export async function DELETE(request: Request, context: RouteContext) {
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

  // Check if user is the owner of this venue (only owners can delete)
  const { data: membership, error: membershipError } = await supabase
    .from('venue_members')
    .select('role')
    .eq('venue_id', venueId)
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Only owners can delete venues
  if (membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only venue owners can delete venues' }, { status: 403 })
  }

  // Delete venue (cascading deletes should handle related data)
  const { error: deleteError } = await supabase
    .from('venues')
    .delete()
    .eq('id', venueId)

  if (deleteError) {
    return NextResponse.json(
      { error: 'Failed to delete venue' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
