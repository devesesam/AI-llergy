"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { LayoutDashboard, LogOut, UserCircle, ChevronDown } from "lucide-react";
import { VenueSwitcher, type SwitcherVenue } from "./VenueSwitcher";

interface AccountTopBarProps {
  user: User;
  venues: SwitcherVenue[];
}

export default function AccountTopBar({ user, venues }: AccountTopBarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-border/60">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-xl font-heading text-text flex-shrink-0"
        >
          AI-llergy
        </Link>

        <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

        <VenueSwitcher venues={venues} />

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm text-text-muted hover:text-text rounded-lg hover:bg-muted-bg transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </Link>

          <div className="relative" ref={ref}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-muted-bg transition-colors"
            >
              <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-text">
                <UserCircle className="w-5 h-5" />
              </span>
              <ChevronDown className="w-4 h-4 text-text-muted" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-surface rounded-xl border border-border shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60">
                  <p className="text-xs text-text-muted">Signed in as</p>
                  <p className="text-sm font-medium text-text truncate">
                    {user.email}
                  </p>
                </div>
                <div className="p-1">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-muted-bg rounded-lg transition-colors"
                  >
                    <UserCircle className="w-4 h-4 text-text-muted" />
                    Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-bg rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
