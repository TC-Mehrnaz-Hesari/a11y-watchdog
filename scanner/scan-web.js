import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WEB_TARGETS, VIEWPORTS } from "./targets.js";
import { runAxe, slug } from "./scan-lib.js";
import { discoverHomepageTargets } from "./discover.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../data/scans");

/** Publicly reachable without auth? Skip login-walled internal apps. */
async function reachable(url) {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(10000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Merge curated targets with sites repos advertise on GitHub (homepage field).
  const curatedUrls = new Set(WEB_TARGETS.map((t) => t.url.replace(/\/$/, "")));
  const targets = [...WEB_TARGETS];
  const discovered = await discoverHomepageTargets().catch((e) => {
    console.error(`GitHub homepage discovery failed (${e.message}); using curated targets only.`);
    return [];
  });
  for (const t of discovered) {
    if (curatedUrls.has(t.url.replace(/\/$/, ""))) continue;
    if (!(await reachable(t.url))) {
      console.log(`[skip] ${t.surface}: ${t.url} not publicly reachable`);
      continue;
    }
    targets.push(t);
  }
  console.log(`Scanning ${targets.length} targets (${targets.length - WEB_TARGETS.length} discovered from GitHub).`);

  const browser = await chromium.launch();
  let done = 0;
  const total = targets.length * 2;

  for (const target of targets) {
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const ctx = await browser.newContext({
        viewport: vp,
        userAgent:
          "Mozilla/5.0 (A11yWatchdog/1.0; internal accessibility audit; +mehrnazh@trilogycare.com.au)",
      });
      const page = await ctx.newPage();
      const label = `${target.name} [${vpName}]`;
      try {
        // domcontentloaded (not networkidle): these sites keep analytics/chat
        // sockets open so networkidle never fires. Then settle for late content.
        await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForLoadState("load", { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2500); // let JS-rendered/late content settle
        const record = await runAxe(page, {
          surface: target.surface,
          name: target.name,
          url: target.url,
          viewport: vpName,
        });
        const fname = `${target.surface}__${slug(target.name)}__${vpName}.json`;
        await writeFile(path.join(OUT_DIR, fname), JSON.stringify(record, null, 2));
        done++;
        console.log(
          `[${done}/${total}] ${label} -> score ${record.score}, ${record.counts.violations} violations (${record.counts.violationNodes} nodes)`
        );
      } catch (err) {
        console.error(`[FAIL] ${label}: ${err.message}`);
      } finally {
        await ctx.close();
      }
    }
  }
  await browser.close();
  console.log("Web scan complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
