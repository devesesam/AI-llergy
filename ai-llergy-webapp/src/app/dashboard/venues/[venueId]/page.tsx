import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ venueId: string }>
}

export default async function VenueDetailPage({ params }: PageProps) {
  const { venueId } = await params
  redirect(`/dashboard/venues/${venueId}/menu`)
}
