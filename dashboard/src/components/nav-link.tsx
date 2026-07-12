"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Which top-level nav item "owns" each route prefix.
const SECTIONS: Record<string, string[]> = {
  "/": ["/surfaces"],
  "/scans": ["/detail"],
  "/top-fixes": [],
};

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const owned = SECTIONS[href] ?? [];
  const active =
    (href === "/" ? pathname === "/" : pathname.startsWith(href)) ||
    owned.some((p) => pathname.startsWith(p));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
