'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Venue {
  id: string
  name: string
  slug: string
  role: string
}

interface DashboardNavProps {
  user: User
  venues: Venue[]
}

export default function DashboardNav({ user, venues }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/dashboard/venues', label: 'Venues', icon: '🏢' },
  ]

  // Check if we are in a venue context
  const activeVenue = venues.find(v => pathname.includes(`/venues/${v.id}`))

  return (
    <>
      {/* Mobile header */}
      <header className="dashboard-mobile-header">
        <button
          className="dashboard-mobile-header__toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
        <span className="dashboard-mobile-header__brand">AI-llergy</span>
        <div style={{ width: '2rem' }} />
      </header>

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${mobileMenuOpen ? 'dashboard-sidebar--open' : ''}`}>
        <div className="dashboard-sidebar__header">
          <h2 className="dashboard-sidebar__brand">AI-llergy</h2>
          <p className="dashboard-sidebar__user">{user.email}</p>
        </div>

        <nav className="dashboard-sidebar__nav">
          {/* Main Navigation */}
          <div className="dashboard-sidebar__section">
            <p className="dashboard-sidebar__section-title">Menu</p>
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`dashboard-sidebar__link ${pathname === item.href ? 'dashboard-sidebar__link--active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="dashboard-sidebar__link-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Venues List */}
          {venues.length > 0 && (
            <div className="dashboard-sidebar__section">
              <div className="dashboard-sidebar__section-header">
                <p className="dashboard-sidebar__section-title">Your Venues</p>
                <Link href="/dashboard/venues/new" className="dashboard-sidebar__add-link">+ Add</Link>
              </div>

              {venues.map(venue => (
                <Link
                  key={venue.id}
                  href={`/dashboard/venues/${venue.id}`}
                  className={`dashboard-sidebar__link ${pathname.includes(venue.id) ? 'dashboard-sidebar__link--active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{venue.name}</span>
                  {activeVenue?.id === venue.id && <span className="dashboard-sidebar__active-dot"></span>}
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="dashboard-sidebar__footer">
          <button
            onClick={handleSignOut}
            className="dashboard-sidebar__signout"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <button
          className="dashboard-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        />
      )}
    </>
  )
}
