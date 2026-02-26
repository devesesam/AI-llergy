import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Venue, MenuItem } from '@/lib/supabase/types'
import VenueTabs from '@/components/dashboard/VenueTabs'

interface PageProps {
  params: Promise<{ venueId: string }>
}

export default async function VenueDetailPage({ params }: PageProps) {
  const { venueId } = await params
  const supabase = await createClient()

  // Get venue details
  const { data: venueData, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single() as { data: Venue | null; error: unknown }

  if (error || !venueData) {
    notFound()
  }

  const venue = venueData

  // Get menu items for this venue
  const { data: menuItemsData } = await supabase
    .from('menu_items')
    .select('*')
    .eq('venue_id', venueId)
    .order('sort_order', { ascending: true }) as { data: MenuItem[] | null }

  const items = menuItemsData || []

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <Link href="/dashboard/venues" className="inline-flex items-center gap-2 mb-6 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Venues
      </Link>

      <VenueTabs venueId={venue.id} venueName={venue.name} venueSlug={venue.slug} menuItems={items} />
    </div>
  )
}
