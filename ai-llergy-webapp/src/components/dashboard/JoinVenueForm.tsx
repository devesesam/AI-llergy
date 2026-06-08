'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Input, Button, useToast } from '@/components/ui'

interface JoinVenueFormProps {
  compact?: boolean
}

interface JoinVenueResponse {
  success?: boolean
  error?: string
  venue_id?: string
  venue_name?: string
}

export default function JoinVenueForm({ compact = false }: JoinVenueFormProps) {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code')
      return
    }

    setLoading(true)

    try {
      const { data, error: rpcError } = await supabase.rpc('join_venue_by_code', {
        code: inviteCode.trim().toUpperCase(),
      } as never) as { data: JoinVenueResponse | null; error: Error | null }

      if (rpcError) throw rpcError

      if (data?.error) {
        toast.error(data.error)
        return
      }

      if (data?.success) {
        toast.success(`Joined ${data.venue_name}!`)
        setInviteCode('')
        router.push(`/dashboard/venues/${data.venue_id}/menu`)
        router.refresh()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to join venue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? '' : 'max-w-md'}>
      {!compact && (
        <>
          <h3 className="font-heading text-lg text-text mb-1">
            Have an invite code?
          </h3>
          <p className="text-sm text-text-muted mb-3">
            Enter the code shared by your venue owner to join their team.
          </p>
        </>
      )}
      <div className="flex gap-2">
        <Input
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX"
          disabled={loading}
          maxLength={9}
          className="font-mono"
        />
        <Button type="submit" loading={loading} disabled={!inviteCode.trim()}>
          Join
        </Button>
      </div>
    </form>
  )
}
