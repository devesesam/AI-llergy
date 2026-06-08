import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MenuItemForm from '@/components/dashboard/MenuItemForm'
import { PageHeader } from '@/components/ui'
import type { MenuItem } from '@/lib/supabase/types'

interface PageProps {
  params: Promise<{ venueId: string; itemId: string }>
}

export default async function EditMenuItemPage({ params }: PageProps) {
  const { venueId, itemId } = await params
  const supabase = await createClient()

  const { data: menuItem, error: itemError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', itemId)
    .eq('venue_id', venueId)
    .single() as { data: MenuItem | null; error: unknown }

  if (itemError || !menuItem) {
    notFound()
  }

  return (
    <div>
      <PageHeader
        title="Edit menu item"
        subtitle={menuItem.name}
        backHref={`/dashboard/venues/${venueId}/menu`}
        backLabel="Back to menu"
      />
      <MenuItemForm venueId={venueId} menuItem={menuItem} mode="edit" />
    </div>
  )
}
