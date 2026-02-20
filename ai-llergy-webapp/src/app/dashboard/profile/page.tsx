import { createClient } from '@/lib/supabase/server'
import ProfileForm from '@/components/dashboard/ProfileForm'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  created_at: string
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user?.id || '')
    .single() as { data: UserProfile | null }

  return (
    <div className="dashboard-content">
      <div className="dashboard-content__header">
        <h1>Profile</h1>
        <p className="dashboard-content__subtitle">
          Manage your account settings
        </p>
      </div>

      <ProfileForm
        userId={user?.id || ''}
        email={user?.email || ''}
        fullName={profile?.full_name || ''}
      />
    </div>
  )
}
