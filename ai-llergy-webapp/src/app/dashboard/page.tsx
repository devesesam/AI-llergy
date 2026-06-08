import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2, UtensilsCrossed, Store, ChevronRight } from 'lucide-react'
import { Card, Badge, EmptyState, Button } from '@/components/ui'
import VenueActions from '@/components/dashboard/VenueActions'

interface VenueMembership {
  venue_id: string
  role: string
  venues: {
    id: string
    name: string
    slug: string
    created_at: string
  } | null
}

interface MenuCount {
  venue_id: string
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: memberships } = await supabase
    .from('venue_members')
    .select(`
      venue_id,
      role,
      venues (
        id,
        name,
        slug,
        created_at
      )
    `)
    .eq('user_id', user?.id || '') as { data: VenueMembership[] | null }

  const venues = memberships || []

  const venueIds = venues.map(m => m.venue_id)
  const { data: menuCounts } = await supabase
    .from('menu_items')
    .select('venue_id')
    .in('venue_id', venueIds.length > 0 ? venueIds : ['']) as { data: MenuCount[] | null }

  const countsByVenue = menuCounts?.reduce((acc, item) => {
    acc[item.venue_id] = (acc[item.venue_id] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const totalItems = Object.values(countsByVenue).reduce((a, b) => a + b, 0)

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading text-text mb-1">Dashboard</h1>
        <p className="text-text-muted">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12 max-w-2xl">
        <Card>
          <div className="flex items-center gap-4 p-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-[#9a7400]" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted mb-1">Venues</p>
              <p className="text-3xl font-heading text-text">{venues.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4 p-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <UtensilsCrossed className="w-7 h-7 text-[#9a7400]" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted mb-1">Menu items</p>
              <p className="text-3xl font-heading text-text">{totalItems}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Venues */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-heading text-text">Your venues</h2>
          <VenueActions />
        </div>

        {venues.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Store className="w-7 h-7" />}
              title="No venues yet"
              description="Create your first venue to start managing menus and allergen data."
              action={
                <Button href="/dashboard/venues/new" size="lg">
                  Create your first venue
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {venues.map(membership => (
              <Link
                key={membership.venue_id}
                href={`/dashboard/venues/${membership.venue_id}/menu`}
                className="group"
              >
                <Card interactive className="h-full">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                        <Store className="w-6 h-6 text-[#9a7400]" />
                      </div>
                      <Badge variant="neutral" className="capitalize">
                        {membership.role}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-heading text-text mb-1 group-hover:text-primary-hover transition-colors">
                      {membership.venues?.name || 'Unknown venue'}
                    </h3>
                    <p className="text-sm text-text-muted mb-4">
                      /v/{membership.venues?.slug}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-border/60">
                      <span className="text-sm text-text-muted">
                        {countsByVenue[membership.venue_id] || 0} menu items
                      </span>
                      <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
