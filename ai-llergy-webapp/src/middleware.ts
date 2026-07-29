import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  /*
   * Scoped to the Supabase-backed dashboard/auth surface ONLY.
   *
   * This used to match every path, which meant each public menu request (the
   * QR-code destination, `/[venue]`) blocked on `supabase.auth.getUser()` — a
   * network round-trip to a DB the public pages never read, and a hang if the
   * project is paused. The public allergen experience runs entirely off the
   * Google Sheet and must not touch Supabase. See `venues.ts` / `menu-service.ts`.
   */
  matcher: ['/dashboard/:path*', '/login', '/signup', '/auth/:path*'],
}
