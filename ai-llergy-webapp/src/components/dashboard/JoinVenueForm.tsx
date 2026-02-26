'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('join_venue_by_code', {
        code: inviteCode.trim().toUpperCase()
      } as never) as { data: JoinVenueResponse | null; error: Error | null }

      if (rpcError) {
        throw rpcError
      }

      if (data?.error) {
        setError(data.error)
        return
      }

      if (data?.success) {
        setSuccess(`Joined ${data.venue_name}!`)
        setInviteCode('')
        setTimeout(() => {
          router.push(`/dashboard/venues/${data.venue_id}`)
          router.refresh()
        }, 1000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join venue')
    } finally {
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="join-venue-form join-venue-form--compact">
        <div className="join-venue-form__row">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX"
            className="join-venue-form__input"
            disabled={loading}
            maxLength={9}
          />
          <button
            type="submit"
            className="join-venue-form__btn"
            disabled={loading || !inviteCode.trim()}
          >
            {loading ? '...' : 'Join'}
          </button>
        </div>
        {error && <p className="join-venue-form__error">{error}</p>}
        {success && <p className="join-venue-form__success">{success}</p>}
      </form>
    )
  }

  return (
    <div className="join-venue-form">
      <h3 className="join-venue-form__title">Have an invite code?</h3>
      <p className="join-venue-form__desc">
        Enter the code shared by your venue owner to join their team.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="join-venue-form__row">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code (e.g., K7M2-9PQ4)"
            className="join-venue-form__input"
            disabled={loading}
            maxLength={9}
          />
          <button
            type="submit"
            className="join-venue-form__btn btn primary-btn"
            disabled={loading || !inviteCode.trim()}
          >
            {loading ? 'Joining...' : 'Join Venue'}
          </button>
        </div>
        {error && <p className="join-venue-form__error">{error}</p>}
        {success && <p className="join-venue-form__success">{success}</p>}
      </form>
    </div>
  )
}
