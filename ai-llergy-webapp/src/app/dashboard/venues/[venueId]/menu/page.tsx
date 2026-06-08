import { createClient } from '@/lib/supabase/server'
import type { MenuItem, Venue } from '@/lib/supabase/types'
import { MenuWorkspace } from '@/components/dashboard/menu/MenuWorkspace'
import type { MenuItemDB } from '@/components/dashboard/menu/useMenuEditor'

interface PageProps {
  params: Promise<{ venueId: string }>
}

export default async function VenueMenuPage({ params }: PageProps) {
  const { venueId } = await params
  const supabase = await createClient()

  const { data: venue } = await supabase
    .from('venues')
    .select('slug')
    .eq('id', venueId)
    .single() as { data: Pick<Venue, 'slug'> | null }

  const { data: menuItemsData } = await supabase
    .from('menu_items')
    .select('*')
    .eq('venue_id', venueId)
    .order('sort_order', { ascending: true }) as { data: MenuItem[] | null }

  const items = (menuItemsData ?? []) as unknown as MenuItemDB[]

  return (
    <MenuWorkspace
      venueId={venueId}
      venueSlug={venue?.slug ?? ''}
      menuItems={items}
    />
  )
}
