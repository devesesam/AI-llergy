'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ProfileFormProps {
  userId: string
  email: string
  fullName: string
}

export default function ProfileForm({ userId, email, fullName: initialFullName }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialFullName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('user_profiles')
        .update({ full_name: fullName })
        .eq('id', userId)

      if (updateError) throw updateError

      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="dashboard-form">
      <div className="dashboard-form__group">
        <label htmlFor="email" className="dashboard-form__label">
          Email
        </label>
        <input
          type="email"
          id="email"
          className="dashboard-form__input"
          value={email}
          disabled
          style={{ opacity: 0.6 }}
        />
        <p className="dashboard-form__help">
          Email cannot be changed
        </p>
      </div>

      <div className="dashboard-form__group">
        <label htmlFor="fullName" className="dashboard-form__label">
          Full Name
        </label>
        <input
          type="text"
          id="fullName"
          className="dashboard-form__input"
          placeholder="Your name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <div style={{
          padding: 'var(--spacing-sm)',
          background: 'rgba(220, 38, 38, 0.1)',
          border: '1px solid var(--color-severity-critical)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-severity-critical)',
          fontSize: '0.9rem',
          marginBottom: 'var(--spacing-md)'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: 'var(--spacing-sm)',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid var(--color-severity-preference)',
          borderRadius: 'var(--radius-sm)',
          color: '#16a34a',
          fontSize: '0.9rem',
          marginBottom: 'var(--spacing-md)'
        }}>
          Profile updated successfully!
        </div>
      )}

      <div className="dashboard-form__actions">
        <button
          type="submit"
          className="btn primary-btn"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
