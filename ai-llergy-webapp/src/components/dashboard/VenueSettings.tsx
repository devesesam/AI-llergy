'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Building2, Link as LinkIcon, Trash2, AlertTriangle } from 'lucide-react'

interface VenueSettingsProps {
    venueId: string
    venueName: string
    venueSlug?: string
}

export default function VenueSettings({ venueId, venueName, venueSlug }: VenueSettingsProps) {
    const router = useRouter()
    const [name, setName] = useState(venueName)
    const [slug, setSlug] = useState(venueSlug || '')
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Delete venue state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage(null)

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

            setMessage({ type: 'success', text: 'Venue settings saved successfully!' })
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save settings' })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (deleteConfirmText !== venueName) return

        setIsDeleting(true)
        try {
            const response = await fetch(`/api/venues/${venueId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to delete venue')
            }

            // Redirect to dashboard after successful deletion
            router.push('/dashboard')
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to delete venue' })
            setIsDeleting(false)
            setShowDeleteConfirm(false)
            setDeleteConfirmText('')
        }
    }

    return (
        <div className="max-w-2xl">
            <div className="bg-white rounded-2xl shadow-card p-8">
                <h2 className="text-xl font-heading text-gray-900 mb-6">Venue Settings</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Venue Name */}
                    <div>
                        <label htmlFor="venueName" className="block text-sm font-medium text-gray-700 mb-2">
                            Venue Name
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Building2 className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                id="venueName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                placeholder="My Restaurant"
                                required
                            />
                        </div>
                    </div>

                    {/* Venue Slug */}
                    <div>
                        <label htmlFor="venueSlug" className="block text-sm font-medium text-gray-700 mb-2">
                            Public URL Slug
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <LinkIcon className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                id="venueSlug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                placeholder="my-restaurant"
                                required
                            />
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                            Your public submission URL will be: <span className="font-mono text-primary">/{slug}</span>
                        </p>
                    </div>

                    {/* Status Message */}
                    {message && (
                        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="btn-base btn-md bg-primary text-white hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-5 h-5" />
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </form>
            </div>

            {/* Danger Zone - Delete Venue */}
            {/* TODO: Consider hiding this in production or adding additional safeguards */}
            <div className="mt-8 bg-white rounded-2xl shadow-card p-8 border-2 border-red-100">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-heading text-red-900">Danger Zone</h2>
                        <p className="text-sm text-red-700 mt-1">
                            Actions here are irreversible. Proceed with caution.
                        </p>
                    </div>
                </div>

                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="btn-base btn-md bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    >
                        <Trash2 className="w-5 h-5" />
                        Delete Venue
                    </button>
                ) : (
                    <div className="space-y-4 p-4 bg-red-50 rounded-xl">
                        <p className="text-sm text-red-800">
                            This will permanently delete <strong>{venueName}</strong> and all its data including menu items and submissions.
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-red-800 mb-2">
                                Type <span className="font-mono bg-red-100 px-1 rounded">{venueName}</span> to confirm:
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="w-full px-4 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400"
                                placeholder="Type venue name to confirm"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDelete}
                                disabled={deleteConfirmText !== venueName || isDeleting}
                                className="btn-base btn-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Trash2 className="w-5 h-5" />
                                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false)
                                    setDeleteConfirmText('')
                                }}
                                className="btn-base btn-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
