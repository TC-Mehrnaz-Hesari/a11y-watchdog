import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "A11y Watchdog — Trilogy Care",
  description:
    "Accessibility scanner and dashboard for Trilogy Care's public surfaces and component library.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <header className="bg-navy text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal text-xl"
              >
                🐕‍🦺
              </span>
              <span>
                <span className="block text-lg font-bold leading-tight">
                  A11y Watchdog
                </span>
                <span className="block text-xs leading-tight text-slate-300">
                  Trilogy Care accessibility monitor
                </span>
              </span>
            </Link>
            <nav aria-label="Main" className="flex items-center gap-6 text-sm font-medium">
              <Link href="/" className="text-slate-200 hover:text-white">
                Overview
              </Link>
              <Link href="/top-fixes" className="text-slate-200 hover:text-white">
                Quest Board
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-6xl px-6 pb-10 text-xs text-slate-400">
          Automated axe-core scans (WCAG 2.1 A/AA + best practices). Scores are
          indicative — manual testing is still required for full conformance.
        </footer>
      </body>
    </html>
  );
}
