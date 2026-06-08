'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Field, Input, Button, useToast } from '@/components/ui'

interface ProfileFormProps {
  userId: string
  email: string
  fullName: string
}

export default function ProfileForm({ userId, email, fullName: initialFullName }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialFullName)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('user_profiles')
        .update({ full_name: fullName })
        .eq('id', userId)

      if (updateError) throw updateError

      toast.success('Profile updated')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Email" help="Email cannot be changed">
        <Input type="email" value={email} disabled />
      </Field>

      <Field label="Full name">
        <Input
          placeholder="Your name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={loading}
        />
      </Field>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>
          Save changes
        </Button>
      </div>
    </form>
  )
}
