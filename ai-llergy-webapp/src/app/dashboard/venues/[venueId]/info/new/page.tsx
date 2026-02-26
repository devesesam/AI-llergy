import Link from 'next/link'
import { ArrowLeft, Construction } from 'lucide-react'

interface PageProps {
    params: Promise<{ venueId: string }>
}

export default async function AddVenueInfoPage({ params }: PageProps) {
    const { venueId } = await params

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-2xl mx-auto">
                <Link
                    href={`/dashboard/venues/${venueId}`}
                    className="inline-flex items-center gap-2 mb-8 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Venue
                </Link>

                <div className="bg-white rounded-2xl shadow-card p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
                        <Construction className="w-8 h-8 text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-heading text-gray-900 mb-3">Coming Soon</h1>
                    <p className="text-gray-500 max-w-md mx-auto mb-8">
                        The venue information form is currently under development.
                        You&apos;ll be able to add equipment, allergen handling procedures,
                        and other venue details here.
                    </p>
                    <Link
                        href={`/dashboard/venues/${venueId}`}
                        className="btn-base btn-md bg-primary text-white hover:bg-primary/90 shadow-sm"
                    >
                        Return to Venue
                    </Link>
                </div>
            </div>
        </div>
    )
}
