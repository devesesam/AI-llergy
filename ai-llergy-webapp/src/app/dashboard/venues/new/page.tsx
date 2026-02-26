'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface CreateVenueResponse {
  success?: boolean
  error?: string
  venue_id?: string
  invite_code?: string
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function NewVenuePage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugEdited) {
      setSlug(generateSlug(value))
    }
  }

  const handleSlugChange = (value: string) => {
    setSlugEdited(true)
    setSlug(generateSlug(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Use RPC function for atomic venue creation
      // The RPC handles: slug validation, user profile creation, venue creation, owner assignment
      const { data, error: rpcError } = await supabase.rpc('create_venue', {
        venue_name: name,
        venue_slug: slug
      } as never) as { data: CreateVenueResponse | null; error: Error | null }

      if (rpcError) {
        throw rpcError
      }

      if (data?.error) {
        setError(data.error)
        return
      }

      if (data?.success && data.venue_id) {
        router.push(`/dashboard/venues/${data.venue_id}`)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create venue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-content">
      <Link href="/dashboard/venues" className="dashboard-back">
        &larr; Back to Venues
      </Link>

      <div className="dashboard-content__header">
        <h1>Create New Venue</h1>
        <p className="dashboard-content__subtitle">
          Set up a new restaurant or cafe venue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="dashboard-form">
        <div className="dashboard-form__group">
          <label htmlFor="name" className="dashboard-form__label">
            Venue Name
          </label>
          <input
            type="text"
            id="name"
            className="dashboard-form__input"
            placeholder="e.g., The Blue Door Cafe"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="dashboard-form__group">
          <label htmlFor="slug" className="dashboard-form__label">
            URL Slug
          </label>
          <input
            type="text"
            id="slug"
            className="dashboard-form__input"
            placeholder="e.g., the-blue-door"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            required
            disabled={loading}
            pattern="[a-z0-9-]+"
          />
          <p className="dashboard-form__help">
            Your menu will be available at: ai-llergy.co.nz/v/<strong>{slug || 'your-venue'}</strong>
          </p>
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

        <div className="dashboard-form__actions">
          <button
            type="button"
            className="btn secondary-btn"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn primary-btn"
            disabled={loading || !name || !slug}
          >
            {loading ? 'Creating...' : 'Create Venue'}
          </button>
        </div>
      </form>
    </div>
  )
}
