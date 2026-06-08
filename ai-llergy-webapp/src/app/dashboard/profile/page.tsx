import { createClient } from '@/lib/supabase/server'
import ProfileForm from '@/components/dashboard/ProfileForm'
import { Card, CardBody, PageHeader } from '@/components/ui'

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
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <PageHeader
        title="Profile"
        subtitle="Manage your account settings."
        backHref="/dashboard"
        backLabel="Back to dashboard"
      />

      <Card>
        <CardBody>
          <ProfileForm
            userId={user?.id || ''}
            email={user?.email || ''}
            fullName={profile?.full_name || ''}
          />
        </CardBody>
      </Card>
    </div>
  )
}
