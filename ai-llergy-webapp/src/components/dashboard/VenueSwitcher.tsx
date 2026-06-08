"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Search, Store } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SwitcherVenue {
  id: string;
  name: string;
  slug: string;
}

export function VenueSwitcher({ venues }: { venues: SwitcherVenue[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const match = pathname.match(/\/dashboard\/venues\/([^/]+)/);
  const activeId = match?.[1];
  const active = venues.find((v) => v.id === activeId);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);

  const filtered = venues.filter((v) =>
    v.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:bg-surface-hover transition-colors max-w-[14rem]"
      >
        <Store className="w-4 h-4 text-text-muted flex-shrink-0" />
        <span className="truncate">
          {active ? active.name : "Select venue"}
        </span>
        <ChevronsUpDown className="w-4 h-4 text-text-muted flex-shrink-0 ml-auto" />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-72 bg-surface rounded-xl border border-border shadow-lg z-50 overflow-hidden">
          {venues.length > 6 && (
            <div className="p-2 border-b border-border/60">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search venues..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-text-muted text-center">
                No venues found
              </p>
            ) : (
              filtered.map((v) => (
                <Link
                  key={v.id}
                  href={`/dashboard/venues/${v.id}/menu`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-muted-bg transition-colors"
                >
                  <Store className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <span className="truncate flex-1">{v.name}</span>
                  {v.id === activeId && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </Link>
              ))
            )}
          </div>

          <div className="border-t border-border/60 p-1">
            <Link
              href="/dashboard/venues/new"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text hover:bg-muted-bg rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New venue
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:bg-muted-bg rounded-lg transition-colors"
              )}
            >
              View all venues
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
