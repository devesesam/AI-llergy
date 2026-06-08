import { redirect } from 'next/navigation'

// The account home (/dashboard) is the canonical venue list. This legacy
// route now redirects there to avoid a duplicate listing.
export default function VenuesPage() {
  redirect('/dashboard')
}
