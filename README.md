# 🐕‍🦺 A11y Watchdog

An accessibility radar for Trilogy Care. Our end users are elderly — contrast,
focus order, touch-target size and screen-reader support decide whether a
home-care participant can actually use the product. The Watchdog measures it.

Automated axe-core (WCAG 2.1 A/AA + best practice) scans across the real
user-facing surfaces. **Targets are discovered from GitHub** — the scanner asks
the org what exists, so new repos are covered automatically on the next run:

- **Storybook repos** — every non-archived org repo with a `.storybook/`
  directory is shallow-cloned into `work/` (gitignored), built, and its stories
  sampled with axe
- **Live sites** — every repo that sets a GitHub homepage URL is scanned
  (desktop + mobile viewports) if publicly reachable; login-walled apps are
  skipped automatically
- **Pages per site** — each site's pages are auto-discovered from its
  sitemap.xml and homepage links (shallowest-first, capped by
  `WATCHDOG_PAGES_PER_SITE`, default 10), so nothing needs hand-listing
- **Curated seeds** — guaranteed-scanned pages in `scanner/targets.js`, for
  anything discovery can't find on its own (e.g. unlinked staging deploys)
- **Keyboard-navigation audit** — on desktop scans the watchdog also Tabs
  through each page with real keypresses and reports missing focus
  indicators, keyboard traps and missing skip links as scored violations
  (checks axe alone can't do)

…rendered as a gamified dashboard: an **Overview** with scores, letter grades,
a surface leaderboard with medals and achievement badges; a **surface page**
per product drilling into its own score, impact mix, top quests and scans; an
**All Scans** explorer filterable by surface and viewport; and a **Quest
Board** (filterable by impact and surface) where every issue is ranked by
impact × occurrence and worth XP, each with a plain-English "why it matters /
how to fix" and the exact failing elements. Quests can be **claimed by name**
(stored in `data/quests.json`) or turned into a **pre-filled GitHub issue**
with one click (`WATCHDOG_ISSUES_REPO` sets the target repo).

## Structure

```text
scanner/      axe-core + playwright scan scripts
data/scans/   one JSON per scanned page/component (the dashboard's data)
dashboard/    Next.js 15 dashboard (Tailwind v4, Trilogy theme)
```

## Run it

```bash
# Dashboard
cd dashboard
npm install
echo "APP_PASSWORD=<pick-a-password>" > .env.local   # access is gated by it
npm run build && npm start     # http://localhost:3000

# Re-run scans (writes data/scans/*.json)
cd scanner
npm install
npm run scan                   # everything: web pages + Storybooks
npm run scan:web               # curated seeds + GitHub-discovered sites + crawled pages
npm run scan:storybook         # GitHub-discovered Storybook repos (clones/builds into work/)
```

GitHub discovery uses the `gh` CLI and needs an authenticated session with
read access to the org (`gh auth login`). Useful env vars:
`WATCHDOG_ORG` (default `Trilogy-Care`), `WATCHDOG_REPOS` (comma-separated
override for Storybook discovery), `WATCHDOG_PAGES_PER_SITE` (default 10),
`FORCE_REBUILD=1` (rebuild Storybooks).

## Automation

- **Nightly scans** — `.github/workflows/nightly-scan.yml` re-runs the full
  scan every night (02:00 Brisbane) and commits refreshed `data/scans/*.json`,
  so the dashboard stays current without anyone remembering to scan. Set the
  `WATCHDOG_GH_TOKEN` secret (PAT with org read + clone access) for private
  discovery; without it only public repos are found.
- **Weekly digest** — `.github/workflows/weekly-digest.yml` posts a Monday
  morning summary (score movement, new criticals, completed quests, top
  quests) to Slack and/or Teams. Set `SLACK_WEBHOOK_URL` / `TEAMS_WEBHOOK_URL`
  secrets and optionally a `WATCHDOG_DASHBOARD_URL` repo variable. Movement is
  measured against `data/digest-baseline.json`, updated on each digest. Run
  locally with `npm run digest` (dry-runs to stdout without webhooks).

## Access control

All routes are protected by a shared password (the "kennel code") via Next.js
middleware and an httpOnly session cookie. The password lives only in
`APP_PASSWORD` (`.env.local`, gitignored — **never commit env files**).
Rotating the password invalidates existing sessions.

## Scoring

Per page/component: `100 - normalized penalty`, where each affected element
weighs critical=10, serious=5, moderate=2, minor=1. Scores are indicative —
automated checks catch roughly a third of WCAG issues; manual keyboard and
screen-reader testing is still required for conformance.

## Roadmap

- CI gate: fail a PR that introduces new critical/serious violations
- Trend over time (scan history + sparklines)
- Fix-PRs for the top quests
