'use client'

import { useState, use, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ venueId: string }>
}

interface VenueData {
  id: string
  name: string
  slug: string
  created_at: string
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function VenueSettingsPage({ params }: PageProps) {
  const { venueId } = use(params)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [originalSlug, setOriginalSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadVenue() {
      const result = await supabase
        .from('venues')
        .select('*')
        .eq('id', venueId)
        .single()

      const venue = result.data as VenueData | null

      if (result.error || !venue) {
        setError('Venue not found')
        setLoading(false)
        return
      }

      setName(venue.name)
      setSlug(venue.slug)
      setOriginalSlug(venue.slug)
      setLoading(false)
    }

    loadVenue()
  }, [venueId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Check if slug changed and is unique
      if (slug !== originalSlug) {
        const { data: existing } = await supabase
          .from('venues')
          .select('id')
          .eq('slug', slug)
          .single()

        if (existing) {
          setError('This URL slug is already taken')
          setSaving(false)
          return
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('venues')
        .update({ name, slug })
        .eq('id', venueId)

      if (updateError) throw updateError

      setOriginalSlug(slug)
      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update venue')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this venue? This will also delete all menu items. This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId)

      if (deleteError) throw deleteError

      router.push('/dashboard/venues')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete venue')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-content">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-content">
      <Link href={`/dashboard/venues/${venueId}`} className="dashboard-back">
        &larr; Back to Venue
      </Link>

      <div className="dashboard-content__header">
        <h1>Venue Settings</h1>
        <p className="dashboard-content__subtitle">
          Update venue details or delete venue
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={saving || deleting}
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
            value={slug}
            onChange={(e) => setSlug(generateSlug(e.target.value))}
            required
            disabled={saving || deleting}
            pattern="[a-z0-9-]+"
          />
          <p className="dashboard-form__help">
            Public URL: ai-llergy.co.nz/v/<strong>{slug}</strong>
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
            Settings saved successfully!
          </div>
        )}

        <div className="dashboard-form__actions">
          <button
            type="submit"
            className="btn primary-btn"
            disabled={saving || deleting || !name || !slug}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <h2 style={{ color: 'var(--color-severity-critical)', marginBottom: 'var(--spacing-md)' }}>
          Danger Zone
        </h2>
        <div style={{
          border: '1px solid var(--color-severity-critical)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-md)'
        }}>
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            Deleting this venue will permanently remove all menu items and settings.
            This action cannot be undone.
          </p>
          <button
            type="button"
            className="btn"
            onClick={handleDelete}
            disabled={saving || deleting}
            style={{
              background: 'var(--color-severity-critical)',
              color: 'white',
              border: 'none'
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Venue'}
          </button>
        </div>
      </div>
    </div>
  )
}
