// GitHub-driven target discovery. Instead of bundling repo clones, the
// scanner asks GitHub (via the authed `gh` CLI) what exists in the org:
//   - repos with a `.storybook/` directory  -> component-library surfaces
//   - repos with a homepage URL set          -> live web surfaces
// New repos are picked up automatically on the next scan.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export const ORG = process.env.WATCHDOG_ORG || "Trilogy-Care";

async function gh(args) {
  const { stdout } = await exec("gh", args, { maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

async function ghJson(args) {
  return JSON.parse(await gh(args));
}

let repoCache = null;

async function listRepos() {
  if (repoCache) return repoCache;
  repoCache = (
    await ghJson([
      "repo",
      "list",
      ORG,
      "--limit",
      "300",
      "--json",
      "name,description,homepageUrl,isArchived,primaryLanguage",
    ])
  ).filter((r) => !r.isArchived);
  return repoCache;
}

async function hasStorybook(repo) {
  try {
    await gh(["api", `repos/${ORG}/${repo}/contents/.storybook`, "--silent"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Repos that ship a Storybook. Override discovery with
 * WATCHDOG_REPOS=repo1,repo2 to scan a fixed set.
 */
export async function discoverStorybookRepos() {
  if (process.env.WATCHDOG_REPOS)
    return process.env.WATCHDOG_REPOS.split(",").map((s) => s.trim()).filter(Boolean);

  const jsLangs = new Set(["TypeScript", "JavaScript", "Vue", "HTML"]);
  const candidates = (await listRepos()).filter((r) =>
    jsLangs.has(r.primaryLanguage?.name)
  );

  const found = [];
  const queue = [...candidates];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      let r;
      while ((r = queue.pop())) {
        if (await hasStorybook(r.name)) found.push(r.name);
      }
    })
  );
  return found.sort();
}

/** Live sites advertised by repos via GitHub's homepage field. */
export async function discoverHomepageTargets() {
  return (await listRepos())
    .filter((r) => r.homepageUrl && /^https?:\/\//.test(r.homepageUrl))
    .map((r) => ({
      surface: r.name,
      name: "Home",
      url: r.homepageUrl,
    }));
}

export function cloneUrl(repo) {
  return `https://github.com/${ORG}/${repo}.git`;
}

// ---------- Page auto-discovery (per site) ----------

// Assets and non-page links we never want to scan.
const NON_PAGE = /\.(pdf|zip|jpe?g|png|gif|svg|webp|ico|css|js|mjs|json|xml|mp4|webm|woff2?)$/i;

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "A11yWatchdog/1.0 (internal accessibility audit)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Normalise to a comparable page URL (same-origin, no hash/query, no trailing slash). */
function normalisePage(href, base) {
  try {
    const u = new URL(href, base);
    if (u.origin !== new URL(base).origin) return null;
    if (NON_PAGE.test(u.pathname)) return null;
    u.hash = "";
    u.search = "";
    return u.href.replace(/\/$/, "") || u.origin;
  } catch {
    return null;
  }
}

/** Human name from a URL path: "/services/self-managed" -> "Services / Self Managed". */
export function pageName(url) {
  const { pathname } = new URL(url);
  if (pathname === "/" || pathname === "") return "Home";
  return pathname
    .split("/")
    .filter(Boolean)
    .map((seg) =>
      seg.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    )
    .join(" / ");
}

/**
 * Auto-discover a site's pages: sitemap.xml when available, otherwise (and
 * additionally) same-origin links found on the homepage. Shallow paths are
 * preferred so the cap lands on the site's main pages, not deep articles.
 * Returns up to `cap` URLs, homepage first.
 */
export async function discoverSitePages(homeUrl, cap = 10) {
  const home = normalisePage(homeUrl, homeUrl) ?? homeUrl.replace(/\/$/, "");
  const found = new Set();

  try {
    const xml = await fetchText(new URL("/sitemap.xml", home).href);
    for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      const u = normalisePage(m[1], home);
      if (u) found.add(u);
    }
  } catch {
    /* no sitemap — fall through to homepage links */
  }

  try {
    const html = await fetchText(home);
    for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
      if (/^(mailto:|tel:|javascript:)/i.test(m[1])) continue;
      const u = normalisePage(m[1], home);
      if (u) found.add(u);
    }
  } catch {
    /* unreachable homepage — caller filters via reachable() */
  }

  found.delete(home);
  const depth = (u) => new URL(u).pathname.split("/").filter(Boolean).length;
  const pages = [...found].sort((a, b) => depth(a) - depth(b) || a.length - b.length);
  return [home, ...pages].slice(0, cap);
}
