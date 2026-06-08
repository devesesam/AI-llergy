import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AccountTopBar from '@/components/dashboard/AccountTopBar'
import { ToastProvider } from '@/components/ui'

interface VenueMembership {
  venue_id: string
  role: string
  venues: {
    id: string
    name: string
    slug: string
    invite_code: string
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

  // Get user's venues for the switcher
  const { data: memberships } = await supabase
    .from('venue_members')
    .select(`
      venue_id,
      role,
      venues (
        id,
        name,
        slug,
        invite_code
      )
    `)
    .eq('user_id', user.id) as { data: VenueMembership[] | null }

  const venues = (memberships?.map(m => ({
    id: m.venues?.id || m.venue_id,
    name: m.venues?.name || 'Unknown',
    slug: m.venues?.slug || '',
  })) || []).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <AccountTopBar user={user} venues={venues} />
        <main className="flex-1">{children}</main>
      </div>
    </ToastProvider>
  )
}
