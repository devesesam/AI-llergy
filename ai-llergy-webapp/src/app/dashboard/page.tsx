import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2, UtensilsCrossed, Store, Plus, ChevronRight } from 'lucide-react'

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

  // Get user's venues with menu item counts
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

  // Get menu item counts for each venue
  const venueIds = venues.map(m => m.venue_id)
  const { data: menuCounts } = await supabase
    .from('menu_items')
    .select('venue_id')
    .in('venue_id', venueIds.length > 0 ? venueIds : ['']) as { data: MenuCount[] | null }

  const countsByVenue = menuCounts?.reduce((acc, item) => {
    acc[item.venue_id] = (acc[item.venue_id] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Venues</p>
              <p className="text-3xl font-heading text-gray-900">{venues.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
              <UtensilsCrossed className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Menu Items</p>
              <p className="text-3xl font-heading text-gray-900">
                {Object.values(countsByVenue).reduce((a, b) => a + b, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Venues Section */}
      <section className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h2 className="text-2xl font-heading text-gray-900">Your Venues</h2>
          <Link href="/dashboard/venues/new" className="btn-base btn-md bg-primary text-white hover:bg-primary/90 shadow-sm">
            <Plus className="w-5 h-5" />
            New Venue
          </Link>
        </div>

        {venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 bg-white rounded-2xl shadow-card">
            <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Store className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-heading text-gray-900 mb-3">No venues yet</h3>
            <p className="text-gray-500 mb-8 max-w-md text-center leading-relaxed">
              Create your first venue to start tracking allergens and managing menus.
            </p>
            <Link href="/dashboard/venues/new" className="btn-base btn-lg bg-primary text-white hover:bg-primary/90 shadow-md">
              Create Your First Venue
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map(membership => (
              <Link
                key={membership.venue_id}
                href={`/dashboard/venues/${membership.venue_id}`}
                className="group bg-white p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Store className="w-6 h-6 text-primary" />
                  </div>
                  <span className="badge badge-neutral">{membership.role}</span>
                </div>
                <h3 className="text-xl font-heading text-gray-900 mb-1 group-hover:text-primary transition-colors">
                  {membership.venues?.name || 'Unknown Venue'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">/{membership.venues?.slug}</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-500">{countsByVenue[membership.venue_id] || 0} menu items</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
