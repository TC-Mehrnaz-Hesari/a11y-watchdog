import type { Metadata } from "next";
import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import "./globals.css";

export const metadata: Metadata = {
  title: "A11y Watchdog — Trilogy Care",
  description:
    "Accessibility scanner and dashboard for Trilogy Care's public surfaces and component library.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans">
        <header className="sticky top-0 z-10 bg-linear-to-r from-navy-deep to-navy text-white shadow-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
            <Link href="/" className="group flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-xl shadow-inner transition-transform group-hover:-rotate-6"
              >
                🐕‍🦺
              </span>
              <span>
                <span className="block text-lg font-bold leading-tight">A11y Watchdog</span>
                <span className="block text-xs leading-tight text-slate-300">
                  Trilogy Care accessibility monitor
                </span>
              </span>
            </Link>
            <nav aria-label="Main" className="flex items-center gap-1">
              <NavLink href="/">Overview</NavLink>
              <NavLink href="/scans">All Scans</NavLink>
              <NavLink href="/top-fixes">Quest Board</NavLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
        <footer className="border-t border-slate-200 bg-white/60">
          <div className="mx-auto max-w-6xl px-6 py-5 text-xs text-slate-400">
            Automated axe-core scans (WCAG 2.1 A/AA + best practices). Scores are indicative —
            manual keyboard and screen-reader testing is still required for full conformance.
          </div>
        </footer>
      </body>
    </html>
  );
}
