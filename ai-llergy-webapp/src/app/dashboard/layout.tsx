import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardNav from '@/components/dashboard/DashboardNav'

interface VenueMembership {
  venue_id: string
  role: string
  venues: {
    id: string
    name: string
    slug: string
  } | null
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's venues for the nav
  const { data: memberships } = await supabase
    .from('venue_members')
    .select(`
      venue_id,
      role,
      venues (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', user.id) as { data: VenueMembership[] | null }

  const venues = memberships?.map(m => ({
    id: m.venues?.id || m.venue_id,
    name: m.venues?.name || 'Unknown',
    slug: m.venues?.slug || '',
    role: m.role,
  })) || []

  return (
    <div className="dashboard-layout">
      <DashboardNav user={user} venues={venues} />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}
