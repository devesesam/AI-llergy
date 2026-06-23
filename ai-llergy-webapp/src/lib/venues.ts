/**
 * Venue registry — the static source of truth for which venues exist and where
 * each one's data lives in the shared Google Sheet.
 *
 * All venues are tabs in ONE spreadsheet (GOOGLE_SHEET_ID). A venue points to:
 *   - menuGid:          the gid of its MENU tab
 *   - substitutionsGid: the gid of its SUBSTITUTIONS tab (omit if it has none)
 * Find a tab's gid in its URL when the tab is open: ...#gid=<number>.
 *
 * Pattern mirrors src/lib/allergens.ts (static registry + getter).
 */

export interface VenueConfig {
  /** URL slug, e.g. "kisa" -> /kisa */
  slug: string;
  /** Display name shown in the header and landing page */
  name: string;
  /**
   * gid of this venue's MENU tab. Omit to use the spreadsheet's first/default
   * tab (only safe for the single tab that is actually first). Pinning an
   * explicit gid is recommended so tab reordering can't silently swap menus.
   */
  menuGid?: string;
  /** gid of this venue's SUBSTITUTIONS tab. Omit when the venue has none. */
  substitutionsGid?: string;
  /**
   * Optional per-venue branding. Wired through to VenueApp as CSS-variable
   * overrides but intentionally left empty for now (all venues use the default
   * theme). Fill in hex values here to re-skin a single venue later.
   */
  brand?: {
    primary?: string;
    primaryHover?: string;
    accent?: string;
    logoUrl?: string;
  };
}

export const VENUES: VenueConfig[] = [
  {
    slug: "kisa",
    name: "Kisa",
    menuGid: "1377599134",
    substitutionsGid: "1265271651",
  },
  {
    slug: "mr-gos",
    name: "Mr Go's",
    menuGid: "361708590",
    // Substitutions OFF on purpose. The tab (gid 1639397504) currently holds
    // Kisa example rows the chef is using as a reference template — they are NOT
    // Mr Go's swaps, so we must not serve them. Once the chef replaces them with
    // real Mr Go's swaps, set:  substitutionsGid: "1639397504",
    substitutionsGid: undefined,
  },
  {
    slug: "ombra",
    name: "Ombra",
    menuGid: "1466155614",
    // Substitutions OFF on purpose — the tab (gid 1976184234) holds Kisa example
    // rows kept as a chef reference template, not Ombra swaps (see Mr Go's note).
    // Once the chef fills real Ombra swaps:  substitutionsGid: "1976184234",
    substitutionsGid: undefined,
  },
];

export const getVenueBySlug = (slug: string): VenueConfig | undefined =>
  VENUES.find((v) => v.slug === slug);
