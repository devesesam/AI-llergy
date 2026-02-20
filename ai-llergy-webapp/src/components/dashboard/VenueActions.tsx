'use client'

import { useState } from 'react'
import Link from 'next/link'
import JoinVenueForm from './JoinVenueForm'

export default function VenueActions() {
  const [showJoinForm, setShowJoinForm] = useState(false)

  return (
    <div className="venue-actions">
      <div className="venue-actions__buttons">
        <button
          className="btn secondary-btn"
          onClick={() => setShowJoinForm(!showJoinForm)}
          style={{ padding: '10px 20px' }}
        >
          {showJoinForm ? 'Cancel' : 'Join with Code'}
        </button>
        <Link href="/dashboard/venues/new" className="btn primary-btn" style={{ padding: '10px 20px' }}>
          + New Venue
        </Link>
      </div>

      {showJoinForm && (
        <div className="venue-actions__join-form">
          <JoinVenueForm compact />
        </div>
      )}
    </div>
  )
}