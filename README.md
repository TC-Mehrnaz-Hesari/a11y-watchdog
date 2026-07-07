# 🐕‍🦺 A11y Watchdog

An accessibility radar for Trilogy Care. Our end users are elderly — contrast,
focus order, touch-target size and screen-reader support decide whether a
home-care participant can actually use the product. The Watchdog measures it.

Automated axe-core (WCAG 2.1 A/AA + best practice) scans across the real
user-facing surfaces:

- **Marketing site** — trilogycare.com.au key pages, desktop + mobile viewports
- **Pricing website** — the public pricing tool
- **Component library** — tc-app-theme Storybook stories

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
node scan-web.js               # public sites
node scan-storybook.js         # tc-app-theme Storybook (needs a local build)
```

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
