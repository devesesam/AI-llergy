import Image from "next/image";
import Link from "next/link";
import { VENUES } from "@/lib/venues";

export const metadata = {
  title: "AI-lergy | Mosaic",
  description: "Choose a venue to filter its menu by your dietary requirements and allergies",
};

export default function Landing() {
  return (
    <div className="app-container">
      <header>
        <Image
          src="/images/logo.png"
          alt="Mosaic Logo"
          width={60}
          height={60}
          className="logo"
        />
        <h1>AI-lergy</h1>
        <p className="subtitle">Choose your venue</p>
      </header>

      <main>
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--spacing-sm, 1rem)",
          }}
        >
          {VENUES.map((venue) => (
            <Link
              key={venue.slug}
              href={`/${venue.slug}`}
              className="btn primary-btn full-width"
              style={{ textAlign: "center", textDecoration: "none" }}
            >
              {venue.name}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
