import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import VenueMenuClient from './VenueMenuClient'
import type { Venue, MenuItem } from '@/lib/supabase/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

interface VenueNameOnly {
  name: string
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('venues')
    .select('name')
    .eq('slug', slug)
    .single() as { data: VenueNameOnly | null }

  return {
    title: data?.name ? `${data.name} | AI-llergy` : 'Menu | AI-llergy',
    description: `Filter the menu at ${data?.name || 'this venue'} by your dietary requirements and allergies`,
  }
}

export default async function VenueMenuPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Get venue and menu items
  const { data: venueData, error: venueError } = await supabase
    .from('venues')
    .select('id, name, slug')
    .eq('slug', slug)
    .single() as { data: Venue | null; error: unknown }

  if (venueError || !venueData) {
    notFound()
  }

  const venue = venueData

  const { data: menuItemsData } = await supabase
    .from('menu_items')
    .select('*')
    .eq('venue_id', venue.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true }) as { data: MenuItem[] | null }

  return (
    <VenueMenuClient
      venue={venue}
      menuItems={menuItemsData || []}
    />
  )
}
