import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MenuItemForm from '@/components/dashboard/MenuItemForm'
import { PageHeader } from '@/components/ui'

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

  const { data: venue, error } = await supabase
    .from('venues')
    .select('id, name')
    .eq('id', venueId)
    .single() as { data: VenueBasic | null; error: unknown }

  if (error || !venue) {
    notFound()
  }

  return (
    <div>
      <PageHeader
        title="Add menu item"
        subtitle="Add a new item to your menu."
        backHref={`/dashboard/venues/${venueId}/menu`}
        backLabel="Back to menu"
      />
      <MenuItemForm venueId={venueId} mode="create" />
    </div>
  )
}
