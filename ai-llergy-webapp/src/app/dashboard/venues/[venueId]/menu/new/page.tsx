import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MenuItemForm from '@/components/dashboard/MenuItemForm'

interface PageProps {
  params: Promise<{ venueId: string }>
}

interface VenueBasic {
  id: string
  name: string
}

export default async function NewMenuItemPage({ params }: PageProps) {
  const { venueId } = await params
  const supabase = await createClient()

  // Verify venue exists and user has access
  const { data: venueData, error } = await supabase
    .from('venues')
    .select('id, name')
    .eq('id', venueId)
    .single() as { data: VenueBasic | null; error: unknown }

  if (error || !venueData) {
    notFound()
  }

  const venue = venueData

  return (
    <div className="dashboard-content">
      <Link href={`/dashboard/venues/${venueId}`} className="dashboard-back">
        &larr; Back to {venue.name}
      </Link>

      <div className="dashboard-content__header">
        <h1>Add Menu Item</h1>
        <p className="dashboard-content__subtitle">
          Add a new item to your menu
        </p>
      </div>

      <MenuItemForm venueId={venueId} mode="create" />
    </div>
  )
}
