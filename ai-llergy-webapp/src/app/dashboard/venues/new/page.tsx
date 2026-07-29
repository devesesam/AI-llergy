'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardBody, Field, Input, Button, PageHeader, useToast } from '@/components/ui'

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
  const toast = useToast()

  const router = useRouter()
  const supabase = createClient()

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugEdited) setSlug(generateSlug(value))
  }

  const handleSlugChange = (value: string) => {
    setSlugEdited(true)
    setSlug(generateSlug(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error: rpcError } = await supabase.rpc('create_venue', {
        venue_name: name,
        venue_slug: slug,
      } as never) as { data: CreateVenueResponse | null; error: Error | null }

      if (rpcError) throw rpcError

      if (data?.error) {
        toast.error(data.error)
        return
      }

      if (data?.success && data.venue_id) {
        toast.success('Venue created')
        router.push(`/dashboard/venues/${data.venue_id}/menu`)
        router.refresh()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create venue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <PageHeader
        title="Create new venue"
        subtitle="Set up a new restaurant or cafe."
        backHref="/dashboard"
        backLabel="Back to venues"
      />

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Venue name" required>
              <Input
                placeholder="e.g. The Blue Door Cafe"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </Field>

            <Field
              label="URL slug"
              required
              help={`Your public menu will be at /${slug || 'your-venue'}`}
            >
              <Input
                placeholder="e.g. the-blue-door"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                disabled={loading}
                pattern="[a-z0-9-]+"
                className="font-mono"
              />
            </Field>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading} disabled={!name || !slug}>
                Create venue
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
