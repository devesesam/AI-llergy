'use client'

import { useState } from 'react'
import { Plus, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui'
import JoinVenueForm from './JoinVenueForm'

export default function VenueActions() {
  const [showJoinForm, setShowJoinForm] = useState(false)

  return (
    <div className="flex flex-col items-stretch gap-3 sm:items-end">
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => setShowJoinForm((s) => !s)}
          icon={<KeyRound className="w-4 h-4" />}
        >
          {showJoinForm ? 'Cancel' : 'Join with code'}
        </Button>
        <Button href="/dashboard/venues/new" icon={<Plus className="w-4 h-4" />}>
          New venue
        </Button>
      </div>

      {showJoinForm && (
        <div className="w-full sm:w-80">
          <JoinVenueForm compact />
        </div>
      )}
    </div>
  )
}
