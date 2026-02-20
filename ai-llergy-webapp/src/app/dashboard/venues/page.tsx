import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import JoinVenueForm from '@/components/dashboard/JoinVenueForm'
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

export default async function VenuesPage() {
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

  return (
    <div className="dashboard-content">
      <div className="dashboard-content__header">
        <h1>Venues</h1>
        <p className="dashboard-content__subtitle">
          Manage your restaurant and cafe venues
        </p>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <h2>All Venues</h2>
          <VenueActions />
        </div>

        {venues.length === 0 ? (
          <div className="dashboard-empty">
            <p>You don&apos;t have any venues yet.</p>

            <JoinVenueForm />

            <div className="dashboard-empty__divider">
              <span>or</span>
            </div>

            <Link href="/dashboard/venues/new" className="btn primary-btn">
              Create Your First Venue
            </Link>
          </div>
        ) : (
          <div className="dashboard-venue-grid">
            {venues.map(membership => (
              <Link
                key={membership.venue_id}
                href={`/dashboard/venues/${membership.venue_id}`}
                className="dashboard-venue-card"
              >
                <h3 className="dashboard-venue-card__name">
                  {membership.venues?.name || 'Unknown Venue'}
                </h3>
                <p className="dashboard-venue-card__slug">
                  ai-llergy.co.nz/v/{membership.venues?.slug}
                </p>
                <div className="dashboard-venue-card__meta">
                  <span>
                    Created {new Date(membership.venues?.created_at || '').toLocaleDateString()}
                  </span>
                  <span className="dashboard-venue-card__role">{membership.role}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}