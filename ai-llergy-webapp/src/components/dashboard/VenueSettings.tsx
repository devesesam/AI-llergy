'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Link as LinkIcon,
  Trash2,
  AlertTriangle,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react'
import {
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Button,
  ConfirmDialog,
  useToast,
} from '@/components/ui'

interface VenueSettingsProps {
  venueId: string
  venueName: string
  venueSlug?: string
  inviteCode?: string
}

export default function VenueSettings({
  venueId,
  venueName,
  venueSlug,
  inviteCode,
}: VenueSettingsProps) {
  const router = useRouter()
  const toast = useToast()
  const [name, setName] = useState(venueName)
  const [slug, setSlug] = useState(venueSlug || '')
  const [isSaving, setIsSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const response = await fetch(`/api/venues/${venueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update venue')
      }
      toast.success('Venue settings saved')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/venues/${venueId}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete venue')
      }
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete venue')
      setIsDeleting(false)
      setShowDelete(false)
    }
  }

  const copyInvite = async () => {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    toast.success('Invite code copied')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* General settings */}
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Venue name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Restaurant"
                required
                icon={<Building2 className="w-4 h-4" />}
              />
            </Field>

            <Field
              label="Public URL slug"
              required
              help={`Public menu: /${slug || 'your-venue'}`}
            >
              <Input
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                }
                placeholder="my-restaurant"
                required
                className="font-mono"
                icon={<LinkIcon className="w-4 h-4" />}
              />
            </Field>

            <div className="flex justify-end pt-1">
              <Button type="submit" loading={isSaving}>
                Save settings
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Invite code */}
      {inviteCode && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-text-muted" />
              <h3 className="text-sm font-medium text-text">Team invite code</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-text-muted">
              Share this code so teammates can join this venue.
            </p>
            <div className="flex items-center gap-2">
              <code className="text-base font-mono bg-muted-bg rounded-lg px-3 py-2 border border-border/60 tracking-wider">
                {inviteCode}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={copyInvite}
                icon={
                  copied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )
                }
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Danger zone */}
      <Card className="border-danger/30">
        <CardBody>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-danger-bg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
            <div>
              <h3 className="font-heading text-lg text-text">Danger zone</h3>
              <p className="text-sm text-text-muted mt-0.5">
                Deleting a venue is permanent and removes all its menu data.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            onClick={() => setShowDelete(true)}
            icon={<Trash2 className="w-4 h-4" />}
          >
            Delete venue
          </Button>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete venue"
        destructive
        confirmLabel="Permanently delete"
        confirmPhrase={venueName}
        loading={isDeleting}
        description={
          <>
            This permanently deletes <strong>{venueName}</strong> and all of its
            menu items. This cannot be undone.
          </>
        }
      />
    </div>
  )
}
