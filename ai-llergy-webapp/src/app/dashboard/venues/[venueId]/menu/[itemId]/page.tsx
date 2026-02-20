import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MenuItemForm from '@/components/dashboard/MenuItemForm'
import type { MenuItem } from '@/lib/supabase/types'

interface PageProps {
  params: Promise<{ venueId: string; itemId: string }>
}

interface VenueBasic {
  id: string
  name: string
}

export default async function EditMenuItemPage({ params }: PageProps) {
  const { venueId, itemId } = await params
  const supabase = await createClient()

  // Verify venue exists and user has access
  const { data: venueData, error: venueError } = await supabase
    .from('venues')
    .select('id, name')
    .eq('id', venueId)
    .single() as { data: VenueBasic | null; error: unknown }

  if (venueError || !venueData) {
    notFound()
  }

  const venue = venueData

  // Get the menu item
  const { data: menuItemData, error: itemError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', itemId)
    .eq('venue_id', venueId)
    .single() as { data: MenuItem | null; error: unknown }

  if (itemError || !menuItemData) {
    notFound()
  }

  const menuItem = menuItemData

  return (
    <div className="dashboard-content">
      <Link href={`/dashboard/venues/${venueId}`} className="dashboard-back">
        &larr; Back to {venue.name}
      </Link>

      <div className="dashboard-content__header">
        <h1>Edit Menu Item</h1>
        <p className="dashboard-content__subtitle">
          {menuItem.name}
        </p>
      </div>

      <MenuItemForm venueId={venueId} menuItem={menuItem} mode="edit" />
    </div>
  )
}
