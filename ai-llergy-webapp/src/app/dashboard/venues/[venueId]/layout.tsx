import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Venue } from '@/lib/supabase/types'
import { VenueWorkspaceNav } from '@/components/dashboard/VenueWorkspaceNav'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ venueId: string }>
}

export default async function VenueWorkspaceLayout({
  children,
  params,
}: LayoutProps) {
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

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
      <div className="mb-1">
        <h1 className="text-2xl md:text-3xl font-heading text-text">
          {venue.name}
        </h1>
        {venue.slug && (
          <p className="text-sm text-text-muted mt-0.5">/{venue.slug}</p>
        )}
      </div>

      <div className="mt-4">
        <VenueWorkspaceNav venueId={venueId} />
      </div>

      <div className="mt-6">{children}</div>
    </div>
  )
}
