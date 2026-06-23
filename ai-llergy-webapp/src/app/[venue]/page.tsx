import { notFound } from "next/navigation";
import VenueApp from "@/components/VenueApp";
import { VENUES, getVenueBySlug } from "@/lib/venues";

interface PageProps {
  params: Promise<{ venue: string }>;
}

// Pre-render the known venue pages at build time.
export function generateStaticParams() {
  return VENUES.map((v) => ({ venue: v.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { venue: slug } = await params;
  const venue = getVenueBySlug(slug);
  return {
    title: venue ? `${venue.name} | AI-lergy` : "Menu | AI-lergy",
    description: `Filter the menu at ${venue?.name || "this venue"} by your dietary requirements and allergies`,
  };
}

export default async function VenuePage({ params }: PageProps) {
  const { venue: slug } = await params;
  const venue = getVenueBySlug(slug);

  if (!venue) {
    notFound();
  }

  return <VenueApp venue={venue} />;
}
