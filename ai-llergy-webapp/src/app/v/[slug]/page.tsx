import { permanentRedirect } from 'next/navigation'

/**
 * LEGACY ROUTE — permanently redirects to the canonical `/[venue]` page.
 *
 * `/v/[slug]` was the original Supabase-backed public menu page (rendered by
 * the sibling `VenueMenuClient.tsx`, now dead code). The live public experience
 * is `/[venue]`, which reads the Google Sheet via `venues.ts` — Supabase is not
 * used for anything. Rather than serve two menu pages from two sources, this
 * route now 308s to the canonical one so any old `/v/kisa` link still lands
 * correctly.
 *
 * The slug space is shared (`/v/kisa` -> `/kisa`), so no mapping is needed.
 * Unknown slugs fall through to `notFound()` on the target route.
 */

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function LegacyVenueMenuPage({ params }: PageProps) {
  const { slug } = await params
  permanentRedirect(`/${slug}`)
}
