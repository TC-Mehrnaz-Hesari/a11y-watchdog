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
- **Curated pages** — key trilogycare.com.au pages listed in
  `scanner/targets.js`

…rendered as a gamified dashboard: scores and letter grades per surface, a
leaderboard with medals, achievement badges, and a **Quest Board** where every
issue is ranked by impact × occurrence and worth XP, each with a plain-English
"why it matters / how to fix" and the exact failing elements.

## Structure

```
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
node scan-web.js               # curated pages + GitHub-discovered live sites
node scan-storybook.js         # GitHub-discovered Storybook repos (clones/builds into work/)
```

GitHub discovery uses the `gh` CLI and needs an authenticated session with
read access to the org (`gh auth login`). Useful env vars:
`WATCHDOG_ORG` (default `Trilogy-Care`), `WATCHDOG_REPOS` (comma-separated
override for Storybook discovery), `FORCE_REBUILD=1` (rebuild Storybooks).

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
