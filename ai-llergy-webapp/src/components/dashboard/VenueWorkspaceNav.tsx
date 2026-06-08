"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { UtensilsCrossed, QrCode, Settings } from "lucide-react";
import { cn } from "@/lib/cn";

export function VenueWorkspaceNav({ venueId }: { venueId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/venues/${venueId}`;

  const tabs = [
    { href: `${base}/menu`, label: "Menu", icon: UtensilsCrossed },
    { href: `${base}/public`, label: "Public page", icon: QrCode },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    <nav className="flex items-center gap-1 border-b border-border/60">
      {tabs.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors",
              active ? "text-text" : "text-text-muted hover:text-text"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {active && (
              <motion.div
                layoutId="venueTabUnderline"
                className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
