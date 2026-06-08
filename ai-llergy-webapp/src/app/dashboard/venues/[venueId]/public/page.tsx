import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Venue } from '@/lib/supabase/types'
import { PublicPagePanel } from '@/components/dashboard/PublicPagePanel'

interface PageProps {
  params: Promise<{ venueId: string }>
}

export default async function VenuePublicPage({ params }: PageProps) {
  const { venueId } = await params
  const supabase = await createClient()

  const { data: venue, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single() as { data: Venue | null; error: unknown }

  if (error || !venue) {
    notFound()
  }

  return <PublicPagePanel slug={venue.slug} />
}
